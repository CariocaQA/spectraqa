import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isGherkin = match && match[1] === 'gherkin';
            return isGherkin || codeClassName?.includes('gherkin') ? (
              <pre className="bg-[hsl(var(--muted))] border border-border/50 p-4 rounded-lg overflow-x-auto text-sm">
                <code className="text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                  {String(children).replace(/\n$/, '')}
                </code>
              </pre>
            ) : (
              <code className={`${codeClassName} bg-muted px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mt-6 mb-3 text-foreground">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-medium mt-4 mb-2 text-foreground">{children}</h3>;
          },
          p({ children }) {
            return <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1">{children}</ul>;
          },
          li({ children }) {
            return <li className="text-muted-foreground">{children}</li>;
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse border border-border text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-muted/50">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="border-b border-border">{children}</tr>;
          },
          th({ children }) {
            return (
              <th className="border border-border bg-muted/50 px-3 py-2 text-left font-medium text-foreground">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-border px-3 py-2 text-muted-foreground">
                {children}
              </td>
            );
          },
          hr() {
            return <hr className="my-6 border-border/50" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}