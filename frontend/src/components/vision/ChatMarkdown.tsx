import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-[#e6e9ef] mt-4 mb-2 first:mt-0 tracking-[0.2px]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-bold text-[#e6e9ef] mt-4 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-[#e6e9ef] mt-4 mb-2 first:mt-0 border-b border-[#1f2533] pb-1.5">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[13px] font-semibold text-[#22c55e] mt-3 mb-1.5">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 text-[#c7cedb]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-2 space-y-1.5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1.5">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[#c7cedb] leading-[1.55]">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#e6e9ef]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-[#8a93a6] italic">{children}</em>
  ),
  hr: () => <hr className="border-0 border-t border-[#1f2533] my-3" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#22c55e]/40 pl-3 my-2 text-[#8a93a6] italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#22c55e] underline underline-offset-2 hover:text-[#4ade80]"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-[#0a0d14] border border-[#1f2533] px-3 py-2 my-2 text-[12px] text-[#c7cedb]">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-[#0a0d14] border border-[#1f2533] px-1 py-0.5 text-[12px] text-[#22c55e]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto my-2">{children}</pre>
  ),
};

interface ChatMarkdownProps {
  content: string;
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="chat-markdown min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
