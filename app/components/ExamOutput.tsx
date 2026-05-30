"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { ComponentPropsWithoutRef } from "react";

interface ExamOutputProps {
  content: string;
  isStreaming?: boolean;
}

export function ExamOutput({ content, isStreaming }: ExamOutputProps) {
  return (
    <div className="exam-output text-gray-100 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 mt-2 pb-2 border-b border-gray-600">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-indigo-300 mb-3 mt-6 pb-1 border-b border-indigo-900/50">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-indigo-200 mb-2 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-gray-200 mb-1 mt-3">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <div className="text-gray-200 mb-3 leading-relaxed">{children}</div>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal text-gray-200 mb-3 space-y-1.5 pl-6">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc text-gray-200 mb-3 space-y-1.5 pl-6">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-gray-200 leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-amber-300">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-300">{children}</em>
          ),
          hr: () => <hr className="border-gray-600 my-6" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4 rounded-lg border border-gray-700">
              <table className="border-collapse text-sm text-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-800">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="hover:bg-gray-800/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-gray-600 px-3 py-2 text-center font-semibold text-indigo-300 align-middle bg-gray-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-700 px-3 py-2 text-center text-gray-200 align-middle">
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
                className="block bg-gray-900 rounded-lg p-4 text-green-300 text-sm font-mono my-3 overflow-x-auto"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="bg-gray-800 rounded px-1.5 py-0.5 text-amber-300 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 rounded-lg overflow-x-auto my-3">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 my-3 bg-gray-800/30 py-2 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  );
}
