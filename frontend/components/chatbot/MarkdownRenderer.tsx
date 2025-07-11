'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/frontend/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm max-w-none text-inherit dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with better spacing and hierarchy
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-4 mt-6 tracking-wide text-inherit first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold mb-3 mt-5 text-inherit first:mt-0 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-medium mb-2 mt-4 text-inherit first:mt-0">
              {children}
            </h3>
          ),

          // Paragraphs with consistent line height
          p: ({ children }) => (
            <p className="mb-4 last:mb-0 leading-relaxed text-inherit">
              {children}
            </p>
          ),

          // Lists with more elegant spacing
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2 text-inherit">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2 text-inherit">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-inherit">
              {children}
            </li>
          ),

          // Links with better focus styles
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-1 underline-offset-2 hover:decoration-2 transition-all duration-200 font-medium focus-visible:outline outline-2 outline-offset-2 outline-blue-500"
            >
              {children}
              <span className="inline-block ml-1 text-xs opacity-70">↗</span>
            </a>
          ),

          // Code blocks and inline code with better styling
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            if (isInline) {
              return (
                <code
                  className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-xs font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto mb-4">
                <code className="text-gray-800 dark:text-gray-200 text-xs font-mono">
                  {children}
                </code>
              </pre>
            );
          },

          // Blockquotes with clear visual hierarchy
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-400 dark:border-gray-600 pl-4 italic bg-gray-50 dark:bg-gray-800/50 rounded-md text-gray-700 dark:text-gray-300 mb-4">
              {children}
            </blockquote>
          ),

          // Strong and emphasis with better contrast
          strong: ({ children }) => (
            <strong className="font-semibold text-inherit">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-inherit">
              {children}
            </em>
          ),

          // Tables with enhanced usability
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-300 dark:border-gray-600 rounded">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-gray-700">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white dark:bg-gray-800">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-200 dark:border-gray-600">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-xs text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600 last:border-r-0">
              {children}
            </td>
          ),

          // Horizontal rule with enhanced styling
          hr: () => (
            <hr className="border-gray-300 dark:border-gray-600 my-4" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}