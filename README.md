# OpsMind — Industrial Knowledge Intelligence Platform

**ET AI Hackathon 2026 | Problem Statement 8**  
*AI for Industrial Knowledge Intelligence: Unified Asset & Operations Brain*

## Submission Snapshot

Round 2 was submitted on **22 July 2026**. The submission-day codebase is tagged:

```bash
git checkout v1.0-submission
```

**Post-submission enhancements** (23 July 2026+) on `main` add:

- Real `.txt` / `.md` upload → chunk → query in Copilot
- Metadata-derived **knowledge graph** view (`/graph`)
- Citation deep-links to source documents
- Computed dashboard metrics (no hardcoded stats)
- Honest architecture documentation

## Problem We Solve

Industrial plants operate across 7–12 disconnected document systems — SOPs, work orders, inspection reports, OEM manuals, and regulatory submissions. OpsMind unifies this fragmented knowledge into one AI intelligence layer so maintenance, safety, and compliance teams can query, act, and audit faster.

## Live Demo

```bash
npm install
npm run dev
```

Open [http://localhost:3010](http://localhost:3010)

> OpsMind uses port **3010** by default so it won't clash with other Next.js projects on 3000/3001.

Optional: add `GEMINI_API_KEY` in `.env.local` for richer LLM responses. The demo works without any API key using local RAG synthesis.

## Features

1. **Document Ingestion** — 12 seeded industrial records + live `.txt`/`.md` upload with equipment/regulatory entity extraction
2. **Expert Knowledge Copilot** — RAG chat with source citations, confidence scores, and click-through document links
3. **Maintenance RCA Agent** — Root cause analysis with prioritized corrective actions and knowledge graph links
4. **Compliance Intelligence Agent** — Maps Factory Act / OISD / PESO requirements to current records and flags audit gaps
5. **Knowledge Graph** — Visual graph of equipment → documents → regulations → failure modes

## Architecture

```
Documents (+ Upload) → Chunking → Keyword RAG → Copilot / Agents → Citations + Actions
                         ↓
              Knowledge Graph (metadata-derived)
```

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **AI Layer:** Local keyword-scored RAG + optional Gemini API
- **Knowledge:** Equipment tags, regulatory refs, graph linking from ingested metadata

## Demo Script

1. **Dashboard** — Show computed stats and indexed corpus
2. **Documents** — Upload a `.txt` SOP mentioning equipment tags (e.g. P-101)
3. **Copilot** — Ask a question about the uploaded content; click a citation
4. **Knowledge Graph** — Show equipment/regulation/failure links
5. **RCA Agent** — Run analysis for P-101 high vibration + seal leakage
6. **Compliance Agent** — Run Unit-2 audit scope check

## Team / Submission

- **Problem Statement:** PS-8
- **GitHub:** https://github.com/visshva-r/OpsMind
- **Submission tag:** `v1.0-submission`

## Impact

- Reduces time searching for operational knowledge (McKinsey: 35% of industrial professional time)
- Connects repeat failures across work orders and inspections
- Surfaces compliance gaps before statutory audits

Built for Octave-aligned industrial intelligence: Design, Build, Operate, Protect.
