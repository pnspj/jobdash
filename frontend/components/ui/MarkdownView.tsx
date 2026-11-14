import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import ExternalLink from './ExternalLink';

// Single line breaks are kept (memos are written as plain text); URLs are linked automatically
const plugins = [remarkGfm, remarkBreaks];

const components: Components = {
  // Only http(s) links, opened in a new tab
  a: ({ href, children }) => <ExternalLink href={href}>{children}</ExternalLink>,
};

/** Markdown (GFM) rendered for display. Raw HTML in the text is not rendered. */
export default function MarkdownView({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`jd-markdown break-words text-sm text-slate-800 ${className}`}>
      <ReactMarkdown remarkPlugins={plugins} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
