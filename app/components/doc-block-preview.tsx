// Renders a before/after doc-change snippet as it would really look on
// agent-native.com/docs: plain prose through react-markdown, and recognized
// "Doc Block" JSX components (Callout, Tabs, FileTree, Mermaid, etc.) through
// the framework's own @agent-native/core/blocks registry — the same
// components the real docs site renders, so this always stays in sync.
//
// This is a small, bounded line-scanner, not a full MDX parser: it only
// recognizes a JSX tag opening on its own line and a fenced ```mermaid block,
// matching the real docs site's own detection heuristic. Anything it can't
// confidently parse (an unregistered tag, a multi-line open tag, malformed
// attributes) falls back to a clearly labeled box showing the raw source —
// never thrown away, never guessed at.
import {
  BlockRegistry,
  BlockRegistryProvider,
  BlockView,
  registerLibraryBlocks,
  type BlockAttrReader,
  type BlockRenderContext,
} from "@agent-native/core/blocks";
import Markdown from "react-markdown";
import { useMemo } from "react";

const registry = new BlockRegistry();
registerLibraryBlocks(registry);

// Deliberately conservative, not a full sanitizer library: this is a
// preview-only surface, but "after" text is LLM-generated (grounded in
// trusted source, not arbitrary user input) so a defensive minimum is worth
// the few lines. Strips script tags and inline event-handler attributes.
function basicSanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

const previewCtx: BlockRenderContext = {
  visualFrame: "show",
  sanitizeHtml: basicSanitizeHtml,
  renderMarkdown: (markdown, options) => (
    <div className={options?.className}>
      <Markdown>{markdown}</Markdown>
    </div>
  ),
};

type Segment =
  | { kind: "markdown"; text: string }
  | { kind: "jsx-block"; tag: string; tagSource: string; children: string }
  | { kind: "mermaid-fence"; source: string };

function splitDocBlockSegments(text: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];
  let buffer: string[] = [];

  const flushMarkdown = () => {
    const joined = buffer.join("\n");
    if (joined.trim()) segments.push({ kind: "markdown", text: joined });
    buffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const jsxOpenMatch = line.match(/^\s*<([A-Z][A-Za-z0-9-]*)\b/);
    const mermaidFenceMatch = line.match(/^\s*(```+|~~~+)\s*mermaid\s*$/);

    if (mermaidFenceMatch) {
      flushMarkdown();
      const fenceMarker = mermaidFenceMatch[1];
      const closeRe = new RegExp(`^\\s*${fenceMarker}\\s*$`);
      let j = i + 1;
      const body: string[] = [];
      while (j < lines.length && !closeRe.test(lines[j])) {
        body.push(lines[j]);
        j++;
      }
      segments.push({ kind: "mermaid-fence", source: body.join("\n") });
      i = j + 1;
      continue;
    }

    if (jsxOpenMatch) {
      flushMarkdown();
      const tag = jsxOpenMatch[1];
      if (/\/>\s*$/.test(line)) {
        segments.push({ kind: "jsx-block", tag, tagSource: line, children: "" });
        i++;
        continue;
      }
      const closeRe = new RegExp(`</${tag}>\\s*$`);
      let j = i + 1;
      const childLines: string[] = [];
      while (j < lines.length && !closeRe.test(lines[j])) {
        childLines.push(lines[j]);
        j++;
      }
      segments.push({ kind: "jsx-block", tag, tagSource: line, children: childLines.join("\n") });
      i = j + 1;
      continue;
    }

    buffer.push(line);
    i++;
  }
  flushMarkdown();
  return segments;
}

function parseJsxAttrs(tagSource: string): Record<string, unknown> {
  const inner = tagSource.replace(/^\s*<[A-Za-z0-9-]+/, "").replace(/\/?>\s*$/, "");
  const attrs: Record<string, unknown> = {};
  const attrRe = /([a-zA-Z_][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(inner))) {
    const [, name, dq, sq, expr] = match;
    if (dq !== undefined) attrs[name] = dq;
    else if (sq !== undefined) attrs[name] = sq;
    else if (expr !== undefined) {
      const trimmed = expr.trim();
      try {
        attrs[name] = JSON.parse(trimmed);
      } catch {
        if (trimmed === "true") attrs[name] = true;
        else if (trimmed === "false") attrs[name] = false;
        else if (trimmed !== "" && !Number.isNaN(Number(trimmed))) attrs[name] = Number(trimmed);
        else attrs[name] = trimmed;
      }
    } else {
      attrs[name] = true;
    }
  }
  return attrs;
}

function createAttrReader(values: Record<string, unknown>): BlockAttrReader {
  return {
    string: (name) => (typeof values[name] === "string" ? (values[name] as string) : undefined),
    number: (name) => (typeof values[name] === "number" ? (values[name] as number) : undefined),
    bool: (name) => (typeof values[name] === "boolean" ? (values[name] as boolean) : undefined),
    array: <T,>(name: string) => (Array.isArray(values[name]) ? (values[name] as T[]) : undefined),
    object: <T,>(name: string) =>
      values[name] && typeof values[name] === "object" && !Array.isArray(values[name])
        ? (values[name] as T)
        : undefined,
    raw: (name) => values[name],
  };
}

function RawBlockFallback({ label, source }: { label: string; source: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
        {source}
      </pre>
    </div>
  );
}

function DocBlockSegmentView({ segment, index }: { segment: Segment; index: number }) {
  if (segment.kind === "markdown") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <Markdown>{segment.text}</Markdown>
      </div>
    );
  }

  if (segment.kind === "mermaid-fence") {
    const spec = registry.get("mermaid");
    if (spec) {
      try {
        const data = spec.schema.parse({ source: segment.source });
        return (
          <BlockView
            spec={spec}
            block={{ id: `preview-${index}`, data }}
            editing={false}
            ctx={previewCtx}
          />
        );
      } catch {
        // fall through to raw fallback below
      }
    }
    return (
      <RawBlockFallback label="Unrenderable mermaid diagram" source={"```mermaid\n" + segment.source + "\n```"} />
    );
  }

  // segment.kind === "jsx-block"
  const raw = segment.tagSource + (segment.children ? `\n${segment.children}\n</${segment.tag}>` : "");
  const spec = registry.getByTag(segment.tag);
  if (!spec) {
    return <RawBlockFallback label={`Unsupported block: <${segment.tag}>`} source={raw} />;
  }
  try {
    const attrs = createAttrReader(parseJsxAttrs(segment.tagSource));
    const data = spec.mdx.fromAttrs(attrs, segment.children);
    spec.schema.parse(data);
    return (
      <BlockView
        spec={spec}
        block={{ id: `preview-${index}`, data }}
        editing={false}
        ctx={previewCtx}
      />
    );
  } catch {
    return <RawBlockFallback label={`Could not parse <${segment.tag}> block`} source={raw} />;
  }
}

export function DocBlockPreview({ markdown }: { markdown: string }) {
  const segments = useMemo(() => splitDocBlockSegments(markdown), [markdown]);

  return (
    <BlockRegistryProvider registry={registry} ctx={previewCtx}>
      <div className="flex flex-col gap-2">
        {segments.map((segment, index) => (
          <DocBlockSegmentView key={index} segment={segment} index={index} />
        ))}
      </div>
    </BlockRegistryProvider>
  );
}
