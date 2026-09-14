# OpsMind — Industrial Knowledge Intelligence

Query plant SOPs, work orders, inspections, and regulations in one place. OpsMind retrieves grounded answers, runs RCA and compliance agents, and shows how equipment, documents, and rules connect.

Originally built for ET AI Hackathon 2026 (PS-8). This repository is the product continuation of that prototype.

## Live demo

Production URL: **not published yet** (Vercel CLI is not logged in on this machine).

```bash
npx vercel login
npx vercel --prod
```

Paste the printed `https://*.vercel.app` URL here after the first production deploy. Local run works now.

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010)

Optional Gemini rewrite (Copilot checkbox only):

```bash
cp .env.example .env.local
# set GEMINI_API_KEY
```

The app is designed to work without any API key. Retrieval is local keyword RAG.

## What it does

1. **Ingestion** — 12 seeded industrial records plus `.txt` / `.md` / `.csv` / `.json` upload with entity extraction
2. **Copilot** — cited Q&A over the corpus, including session uploads
3. **RCA agent** — equipment + symptoms → evidence-backed actions and an exportable report
4. **Compliance agent** — Factory Act / OISD / PESO gap review with matching summary and actions
5. **Knowledge graph** — filterable equipment → document → regulation → failure links

Uploads are parsed by the server but **never stored** there. They persist in your browser and are replayed with each API request, which is what keeps them queryable on Vercel — serverless functions do not share in-memory state, and a shared store would leak one visitor's uploads into another visitor's results.

## Verification

The API contract is covered by a dependency-free check suite. Start the app, then in a second terminal:

```bash
npm run verify
```

It asserts 54 behaviours against the live routes, including citation uniqueness, that answers only cite retrieved documents, that isolation answers name V-101A / V-101B / LOTO CP-2B, that RCA playbooks are tag-exact (P-102 does not inherit P-101), that agent summaries and actions agree, that unsupported queries are refused rather than answered, that CSV rows are parsed into searchable prose, and that an upload in one session does not appear in another. Point it elsewhere with `BASE_URL=https://your-deployment npm run verify`.

`node scripts/demo-preview.mjs` prints the four headline Copilot answers with their scores and sources, which is handy for rehearsing a walkthrough.

## Architecture (honest)

```
Documents + session uploads
        ↓
Parse / chunk / extract tags
        ↓
Keyword RAG + metadata graph
        ↓
Copilot · RCA · Compliance
```

- Retrieval is **keyword / BM25-style scoring**, not a vector database
- Gemini is **optional and click-only**; it rewrites retrieved context, it does not replace RAG
- Agents decide a **single branch** so summary, actions, and export stay consistent. RCA playbooks are **tag-exact** (P-101, AC-07, B-401); other indexed tags get evidence review rather than a neighbouring asset's failure story
- Match percentages are **absolute**, derived from term coverage and TF-IDF weight — they are not a ranking artifact, so a weak match reads as weak
- When nothing in the corpus supports a question, the answer says so. Agents return no citations and no actions rather than inventing an analysis for an unknown asset

## Deploy (Vercel)

```bash
npx vercel --prod
```

Add `GEMINI_API_KEY` in the Vercel project if you want the optional Copilot enhancement.

## Demo path

1. Dashboard — corpus stats (refresh live from your session, not baked at build time)
2. Documents — upload `samples/p101-field-note.txt` (or `samples/ac07-inspection-log.csv` to see CSV rows flattened into searchable prose)
3. Copilot — ask for the field-note vibration reading, then click a citation to jump to the highlighted passage in the source record
4. Knowledge graph — filter `P-101`; the upload appears as a new node
5. RCA — P-101 high vibration + seal leakage; export report. Then try tag `P-102` (indexed, but no pump playbook) and `ZZ-999` (unknown) to see evidence-review vs refusal
6. Compliance — scope `Unit-2 Factory Act maintenance records`; export report

## Repository

- GitHub: https://github.com/visshva-r/OpsMind
- Hackathon snapshot tag: `v1.0-submission`
