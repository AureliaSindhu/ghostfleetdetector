import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  /** 'chat' uses tighter spacing for chat bubbles; 'report' uses relaxed spacing for full reports */
  variant?: 'chat' | 'report';
}

const chatComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-1.5 mt-3 font-sans text-sm font-bold tracking-wide text-cyan-200 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1 mt-2.5 font-sans text-xs font-semibold uppercase tracking-[0.1em] text-cyan-300 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 font-sans text-xs font-semibold text-slate-200 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-1.5 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-1.5 ml-3 space-y-0.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-1.5 ml-3 list-decimal space-y-0.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-1.5 text-slate-200">
      <span className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-cyan-400/60" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-cyan-100">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-300">{children}</em>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[0.8em] text-cyan-300">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-slate-800/80 p-2 font-mono text-xs text-slate-200">{children}</pre>
  ),
  hr: () => <hr className="my-2 border-slate-700" />,
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-cyan-400/40 pl-3 text-slate-300">{children}</blockquote>
  ),
};

const reportComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-5 font-sans text-base font-bold tracking-wide text-cyan-200 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-4 border-b border-slate-700/60 pb-1 font-sans text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-3 font-sans text-sm font-semibold text-slate-100 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-3 space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="flex gap-2 leading-relaxed text-gray-200">
      <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-gray-300">{children}</em>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-700/70 px-1 py-0.5 font-mono text-[0.82em] text-cyan-300">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded bg-gray-950/60 p-3 font-mono text-xs text-gray-200">{children}</pre>
  ),
  hr: () => <hr className="my-3 border-gray-700" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-cyan-400/50 pl-3 italic text-gray-300">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-700 bg-gray-800 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-cyan-200">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-gray-700/60 px-3 py-1.5 text-gray-200">{children}</td>
  ),
};

export function MarkdownContent({ content, variant = 'chat' }: MarkdownContentProps) {
  const components = variant === 'report' ? reportComponents : chatComponents;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
