"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { ComponentPropsWithoutRef } from "react";

interface ExamOutputProps {
  content: string;
  isStreaming?: boolean;
}

export function ExamOutput({ content, isStreaming }: ExamOutputProps) {
  return (
    <div className="exam-output text-body leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-snow mb-4 mt-2 pb-2 border-b border-line-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-teal mb-3 mt-6 pb-1 border-b border-teal/30">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-teal mb-2 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-snow mb-1 mt-3">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <div className="text-snow mb-3 leading-relaxed">{children}</div>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal text-snow mb-3 space-y-1.5 pl-6">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc text-snow mb-3 space-y-1.5 pl-6">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-snow leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-body">{children}</em>
          ),
          hr: () => <hr className="border-line-2 my-6" />,

          // ── Tables — scroll horizontally on small screens ────────────
          table: ({ children }) => (
            <div className="overflow-x-auto mb-5 rounded-lg border border-line w-full">
              <table className="border-collapse text-sm text-snow w-full min-w-max">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-ink-3/90">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-line">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-ink-3/40 transition-colors even:bg-ink-2/30">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-line-2 px-4 py-2.5 text-left font-semibold text-teal align-middle bg-ink-3 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-line/60 px-4 py-2 text-left text-snow align-middle">
              {children}
            </td>
          ),

          code: ({
            children,
            className,
            ...props
          }: ComponentPropsWithoutRef<"code">) => {
            const isBlock = Boolean(className?.includes("language-"));
            return isBlock ? (
              <code
                className="block bg-ink-2 rounded-lg p-4 text-good text-sm font-mono my-3 overflow-x-auto"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="bg-ink-3 rounded px-1.5 py-0.5 text-gold text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-ink-2 rounded-lg overflow-x-auto my-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-teal pl-4 italic text-body my-3 bg-ink-3/30 py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-teal animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  );
}
