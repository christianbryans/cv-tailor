import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from 'docx';
import type { CV, Layout } from './types';
import { SECTION_LABELS } from './types';
import { dateRange, linkText } from './cv';

const FONT = 'Arial';
const MARGIN = 800; // twips (~14 mm)
const WIDTH = 11906 - MARGIN * 2;

type RunOpts = { size?: number; bold?: boolean; italics?: boolean; color?: string };
const run = (text: string, o: RunOpts = {}) => new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics, color: o.color });

function heading(text: string) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '222222', space: 1 } },
    children: [run(text.toUpperCase(), { bold: true, size: 20 })],
  });
}

function row(left: TextRun[], right: string) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 80, after: 20 },
    tabStops: [{ type: TabStopType.RIGHT, position: WIDTH }],
    children: [...left, new TextRun({ children: [new Tab(), right], font: FONT, size: 19, color: '444444' })],
  });
}

const bullet = (text: string) =>
  new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 30 }, children: [run(text)] });

const para = (text: string, after = 40) => new Paragraph({ spacing: { after }, children: [run(text)] });

export async function buildDocx(cv: CV, layout: Layout): Promise<Blob> {
  const kids: Paragraph[] = [];

  kids.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 20 }, children: [run(cv.name || 'Your Name', { bold: true, size: 40 })] }));
  if (cv.headline) kids.push(new Paragraph({ spacing: { after: 40 }, children: [run(cv.headline, { size: 22, color: '333333' })] }));
  const contact = [cv.phone, cv.email, cv.location, ...cv.links.map(linkText)].filter(Boolean).join('  |  ');
  if (contact) kids.push(new Paragraph({ spacing: { after: 60 }, children: [run(contact, { size: 19, color: '333333' })] }));

  for (const k of layout.order) {
    if (layout.hidden.includes(k)) continue;
    const title = SECTION_LABELS[k];
    if (k === 'summary' && cv.summary) {
      kids.push(heading(title), para(cv.summary));
    }
    if (k === 'experience' && cv.experience.length) {
      kids.push(heading(title));
      cv.experience.forEach((e) => {
        kids.push(
          row(
            [run(e.role, { bold: true }), ...(e.company ? [run(`, ${e.company}`)] : []), ...(e.location ? [run(`, ${e.location}`, { color: '555555' })] : [])],
            dateRange(e.start, e.end)
          )
        );
        e.bullets.forEach((b) => kids.push(bullet(b)));
      });
    }
    if (k === 'education' && cv.education.length) {
      kids.push(heading(title));
      cv.education.forEach((e) => {
        kids.push(row([run(e.school, { bold: true }), ...(e.location ? [run(`, ${e.location}`, { color: '555555' })] : [])], dateRange(e.start, e.end)));
        if (e.degree) kids.push(para(e.degree, 20));
        e.details.forEach((d) => kids.push(bullet(d)));
      });
    }
    if (k === 'skills' && cv.skills.length) {
      kids.push(heading(title));
      cv.skills.forEach((g) => kids.push(new Paragraph({ spacing: { after: 30 }, children: [run(`${g.label}: `, { bold: true }), run(g.items)] })));
    }
    if (k === 'awards' && cv.awards.length) {
      kids.push(heading(title));
      cv.awards.forEach((a) => kids.push(bullet(a)));
    }
    if (k === 'certifications' && cv.certifications.length) {
      kids.push(heading(title));
      cv.certifications.forEach((a) => kids.push(bullet(a)));
    }
    if (k === 'organizations' && cv.organizations.length) {
      kids.push(heading(title));
      cv.organizations.forEach((o) => {
        kids.push(row([run(o.role, { bold: true }), ...(o.org ? [run(`, ${o.org}`)] : [])], o.period));
        if (o.description) kids.push(para(o.description));
      });
    }
  }

  const doc = new Document({
    creator: cv.name,
    title: `${cv.name} CV`,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: {
      config: [
        {
          reference: 'bul',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 680, bottom: 680, left: MARGIN, right: MARGIN } } },
        children: kids,
      },
    ],
  });
  return Packer.toBlob(doc);
}
