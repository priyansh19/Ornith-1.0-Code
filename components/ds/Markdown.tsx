import * as React from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Element, ElementContent } from "hast";

export interface MarkdownProps {
  /** Markdown source. */
  children: string;
  className?: string;
}

/** Collect the raw text of a hast subtree (code text survives highlighting). */
function hastText(node: ElementContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}

/** Fenced code block — header row with language label + copy button. */
function PreBlock({
  node,
  children,
  ...rest
}: React.HTMLAttributes<HTMLPreElement> & ExtraProps) {
  const codeEl = node?.children.find(
    (c): c is Element => c.type === "element" && c.tagName === "code",
  );
  const classes = codeEl?.properties?.className;
  const langClass = Array.isArray(classes)
    ? classes.find(
        (c): c is string => typeof c === "string" && c.startsWith("language-"),
      )
    : undefined;
  const lang = langClass ? langClass.slice("language-".length) : "code";
  const text = hastText(codeEl);

  // Empty/whitespace-only fenced blocks render nothing instead of an empty box.
  if (text.trim() === "") return null;

  return (
    <PreBlockBody lang={lang} text={text} rest={rest}>
      {children}
    </PreBlockBody>
  );
}

function PreBlockBody({
  lang,
  text,
  rest,
  children,
}: {
  lang: string;
  text: string;
  rest: React.HTMLAttributes<HTMLPreElement>;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState<"idle" | "copied" | "failed">("idle");
  const timer = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const onCopy = () => {
    // Reflect the actual clipboard promise outcome — never optimistic.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(() => setCopied("copied"))
      .catch(() => setCopied("failed"));
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied("idle"), 1500);
  };

  return (
    <div className="lm-md__pre">
      <div className="lm-md__prehead">
        <span className="lm-md__lang">{lang}</span>
        <button type="button" className="lm-md__copy" onClick={onCopy}>
          {copied === "copied" ? "Copied" : copied === "failed" ? "Failed" : "Copy"}
        </button>
      </div>
      <pre {...rest}>{children}</pre>
    </div>
  );
}

const components: Components = {
  pre: PreBlock,
  code({ node, className, children, ...rest }) {
    void node; // hast node — not rendered
    // Block code (inside pre) carries a language-*/hljs class; inline doesn't.
    const isBlock = /\blanguage-|\bhljs\b/.test(className ?? "");
    const cls = isBlock
      ? className
      : ["lm-md__code", className].filter(Boolean).join(" ");
    return (
      <code className={cls} {...rest}>
        {children}
      </code>
    );
  },
  a({ node, children, ...rest }) {
    void node; // hast node — not rendered
    return (
      <a target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  },
  table({ node, children, ...rest }) {
    void node; // hast node — not rendered
    return (
      <div className="lm-md__tablewrap">
        <table {...rest}>{children}</table>
      </div>
    );
  },
};

/** Markdown renderer for assistant chat messages — GFM + syntax highlight. */
export function Markdown({ children, className = "" }: MarkdownProps) {
  const cls = ["lm-md", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
