import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { ResumeBlock } from '@jobdash/shared';

const FONT = 'Yu Gothic';

/** Paragraphs for a multi-line value (one paragraph per line keeps Word editing natural). */
const lines = (text: string, indent = 0) =>
  text.split('\n').map((line) => new Paragraph({ children: [new TextRun(line)], indent: { left: indent } }));

/** Build a simple .docx from the neutral resume blocks. */
export function resumeToDocx(blocks: ResumeBlock[]): Promise<Blob> {
  const children: Paragraph[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'title':
        children.push(new Paragraph({ text: b.text, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
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
        if (b.details) children.push(new Paragraph({ text: b.details }));
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
          children.push(new Paragraph({ children: [new TextRun({ text: `＜${f.label}＞`, bold: true })], indent: { left: 240 } }));
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
      default: { document: { run: { font: FONT, size: 21 } } }, // 10.5pt
      paragraphStyles: [
        { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: FONT, size: 32, bold: true } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', run: { font: FONT, size: 24, bold: true } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', run: { font: FONT, size: 22 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', run: { font: FONT, size: 21 } },
      ],
    },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }], // 20mm
  });
  return Packer.toBlob(doc);
}
