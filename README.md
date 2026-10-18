# Tailor — ATS CV Studio

Upload a baseline CV, paste a job link (or the description), and get a CV tailored to that role.
Left: inputs and editor. Right: live A4 preview. Export to PDF, DOCX, or plain text.

## Deploy to Vercel (≈3 minutes)

1. Push this folder to a GitHub repo:
   ```bash
   git init && git add -A && git commit -m "CV Tailor"
   gh repo create cv-tailor --private --source=. --push
   ```
2. Go to https://vercel.com/new → import the repo (framework is auto-detected as Next.js).
3. Add environment variables **before** deploying:
   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your key from https://console.anthropic.com |
   | `ACCESS_CODE` | any secret string (recommended — stops strangers from spending your credits) |
   | `ANTHROPIC_MODEL` | optional, default `claude-sonnet-5-5` |
4. Deploy. Open the app → Settings (sliders icon) → enter the same `ACCESS_CODE`.

Or with the CLI: `npx vercel` then `npx vercel env add ANTHROPIC_API_KEY` and `npx vercel --prod`.

## Run locally

```bash
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## How it works

- **Upload** — PDF (read natively by Claude), DOCX (text via mammoth) or TXT → structured JSON.
- **Job link** — server fetches the page (prefers `JobPosting` structured data). LinkedIn/Glints/Jobstreet often need login or JavaScript; if the fetch comes back thin, paste the description instead.
- **Tailor** — Claude rewrites headline, summary, bullets and skill order for the posting.
- **Integrity guard** (`lib/integrity.ts`) — after every tailoring run, employers, titles, dates, schools, awards, certifications and skills are checked against the baseline. Invented items are dropped, changed facts restored, and new numbers flagged for review.
- **Keyword match** — estimated locally from the posting text; it is a guide, not a real ATS score.
- **Versions** — every tailored CV is stored in the browser (localStorage); the baseline is never overwritten.

## Notes

- Upload limit is ~4 MB (Vercel request body limit).
- Data lives in the browser; the server stores nothing. CV text is sent to the Anthropic API for processing.
- The PDF is produced with the browser's print dialog ("Save as PDF"), which keeps real selectable text — what ATS parsers need.
