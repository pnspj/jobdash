import type { ResumeBlock } from '@jobdash/shared';
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const FONT = 'Yu Gothic';

/** Paragraphs for a multi-line value (one paragraph per line keeps Word editing natural). */
const lines = (text: string, indent = 0) =>
  text.split('\n').map((line) => new Paragraph({ children: [new TextRun(line)], indent: { left: indent } }));

/** Font sizes in half-points: standard (10.5pt body) or compact (9pt body). */
const SIZES = {
  standard: { body: 21, title: 32, h1: 24, h2: 22, h3: 21 },
  compact: { body: 18, title: 28, h1: 21, h2: 19, h3: 18 },
};

/** Build a simple .docx from the neutral resume blocks. */
export function resumeToDocx(blocks: ResumeBlock[], { compact = false } = {}): Promise<Blob> {
  const size = SIZES[compact ? 'compact' : 'standard'];
  const children: Paragraph[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'title':
        children.push(
          new Paragraph({
            text: b.text,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        );
        break;
      case 'meta':
        children.push(new Paragraph({ text: b.text, alignment: AlignmentType.RIGHT }));
        break;
      case 'heading':
        children.push(
          new Paragraph({
            text: `■${b.text}`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 2 } },
          }),
        );
        break;
      case 'company':
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200 },
            children: [new TextRun({ text: b.name, bold: true }), new TextRun({ text: `　${b.period}` })],
          }),
        );
        for (const d of b.details) children.push(new Paragraph({ text: d }));
        break;
      case 'project':
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160 },
            children: [new TextRun({ text: `【${b.name}】`, bold: true }), new TextRun({ text: b.period })],
          }),
        );
        for (const f of b.fields) {
          children.push(
            new Paragraph({ children: [new TextRun({ text: `＜${f.label}＞`, bold: true })], indent: { left: 240 } }),
          );
          children.push(...lines(f.value, 480));
        }
        break;
      case 'paragraph':
        children.push(...lines(b.text));
        break;
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: size.body } } },
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: FONT, size: size.title, bold: true } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', run: { font: FONT, size: size.h1, bold: true } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', run: { font: FONT, size: size.h2 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', run: { font: FONT, size: size.h3 } },
      ],
    },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }], // 20mm
  });
  return Packer.toBlob(doc);
}
