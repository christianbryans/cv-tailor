import type Anthropic from '@anthropic-ai/sdk';
import { ApiError, MODEL, extractJSON, fail, getClient, guard, textOf } from '@/lib/server';
import { normalizeCV } from '@/lib/cv';

export const runtime = 'nodejs';
export const maxDuration = 90;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel serverless request bodies are capped at ~4.5 MB

const SYSTEM = `You convert resumes into structured JSON. You are a faithful transcriber, not an editor.

Rules:
- Copy wording exactly as written. Do not improve, summarise, translate or invent anything.
- If a field is not present, use an empty string or empty array.
- Remove formatting artefacts (stray asterisks, duplicated spaces, broken line wraps) but keep the words.
- Keep every bullet, award, certification and organisation that appears.
- "start"/"end" are date strings exactly as written (e.g. "Mar 2026", "2022", "Present").
- Put the person's own job-title style line under "headline" only if the resume has one; otherwise leave it empty.
- Skills: group them under the labels used in the resume; "items" is ONE comma-separated string.
- Education "details": every extra line (GPA, thesis, coursework, activities) as its own string.
- Awards and certifications: one string per entry, keeping the issuer text.
- Organizations / volunteering / leadership go to "organizations" with role, org, period, description.

Return ONLY a JSON object with this exact shape:
{
  "name": "", "headline": "", "email": "", "phone": "", "location": "",
  "links": [{"label": "LinkedIn", "url": ""}],
  "summary": "",
  "experience": [{"role": "", "company": "", "location": "", "start": "", "end": "", "bullets": [""]}],
  "education": [{"school": "", "degree": "", "location": "", "start": "", "end": "", "details": [""]}],
  "skills": [{"label": "", "items": ""}],
  "awards": [""],
  "certifications": [""],
  "organizations": [{"role": "", "org": "", "period": "", "description": ""}]
}`;

export async function POST(req: Request) {
  try {
    guard(req);
    const ctype = req.headers.get('content-type') || '';
    let text = '';
    let pdf: string | null = null;

    if (ctype.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new ApiError(400, 'No file received.');
      if (file.size > MAX_BYTES) throw new ApiError(413, 'File is larger than 4 MB. Export a smaller PDF or paste the text instead.');
      const name = file.name.toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());
      if (name.endsWith('.pdf')) {
        pdf = buf.toString('base64');
      } else if (name.endsWith('.docx')) {
        const mod: any = await import('mammoth');
        const extract = mod.extractRawText ?? mod.default?.extractRawText;
        text = (await extract({ buffer: buf })).value || '';
      } else if (name.endsWith('.txt') || name.endsWith('.md')) {
        text = buf.toString('utf8');
      } else {
        throw new ApiError(415, 'Unsupported file type. Upload a PDF, DOCX, TXT or MD file.');
      }
    } else {
      const body = await req.json().catch(() => ({}));
      text = String(body?.text || '');
    }

    if (!pdf && text.trim().length < 80) throw new ApiError(400, 'That file looks empty or unreadable. If it is a scanned image, paste the text instead.');

    const content: Anthropic.ContentBlockParam[] = [];
    if (pdf) {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf } });
      content.push({ type: 'text', text: 'Convert the attached resume into the JSON structure.' });
    } else {
      content.push({ type: 'text', text: `Convert this resume into the JSON structure.\n\n<resume>\n${text.slice(0, 40000)}\n</resume>` });
    }

    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });

    const cv = normalizeCV(extractJSON(textOf(msg)));
    if (!cv.name && !cv.experience.length && !cv.education.length) {
      throw new ApiError(422, 'Could not find resume content in that file.');
    }
    return Response.json({ cv });
  } catch (e) {
    return fail(e);
  }
}
