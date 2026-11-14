import type { ResumeBlock } from '@jobdash/shared';

const Lines = ({ text }: { text: string }) => <p className="whitespace-pre-wrap break-words">{text}</p>;

/** Font sizes per layout: standard, or compact to fit more on a page. */
const SIZES = {
  standard: { body: 'text-[10.5pt] leading-relaxed', title: 'text-[16pt]', heading: 'text-[12pt]' },
  compact: { body: 'text-[9pt] leading-normal', title: 'text-[14pt]', heading: 'text-[10.5pt]' },
};

/** HTML rendering of the resume blocks, used for the preview and for printing to PDF. */
export default function ResumeDocument({ blocks, compact = false }: { blocks: ResumeBlock[]; compact?: boolean }) {
  const size = SIZES[compact ? 'compact' : 'standard'];
  return (
    <article
      className={`jd-resume mx-auto max-w-[210mm] space-y-1 bg-white p-[15mm] ${size.body} text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none`}
    >
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'title':
            return (
              <h1 key={i} className={`mb-2 text-center ${size.title} font-bold tracking-widest`}>
                {b.text}
              </h1>
            );
          case 'meta':
            return (
              <p key={i} className="text-right">
                {b.text}
              </p>
            );
          case 'heading':
            return (
              <h2
                key={i}
                className={`mt-5 border-b border-slate-400 pb-0.5 ${size.heading} font-bold break-after-avoid`}
              >
                ■{b.text}
              </h2>
            );
          case 'company':
            return (
              <div key={i} className="mt-3 break-inside-avoid">
                <h3 className="font-bold">
                  ◆{b.name}
                  <span className="ml-2 font-normal">{b.period}</span>
                </h3>
                {b.details && <p>{b.details}</p>}
              </div>
            );
          case 'project':
            return (
              <section key={i} className="mt-2 ml-3 break-inside-avoid rounded border border-slate-300 p-2">
                <h4 className="font-bold">
                  【{b.name}】<span className="font-normal">{b.period}</span>
                </h4>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  {b.fields.map((f) => (
                    <div key={f.label} className="contents">
                      <dt className="whitespace-nowrap text-slate-600">{f.label}</dt>
                      <dd>
                        <Lines text={f.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          case 'paragraph':
            return <Lines key={i} text={b.text} />;
          default:
            return null;
        }
      })}
    </article>
  );
}
