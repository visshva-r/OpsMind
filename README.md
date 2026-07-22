# OpsMind — Industrial Knowledge Intelligence Platform

**ET AI Hackathon 2026 | Problem Statement 8**  
*AI for Industrial Knowledge Intelligence: Unified Asset & Operations Brain*

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

## Features Built

1. **Universal Document Ingestion** — 12 seeded industrial records across SOPs, work orders, inspections, incidents, manuals, and regulatory excerpts
2. **Expert Knowledge Copilot** — RAG chat with source citations and confidence scores
3. **Maintenance RCA Agent** — Root cause analysis with prioritized corrective actions and knowledge graph links
4. **Compliance Intelligence Agent** — Maps Factory Act / OISD / PESO requirements to current records and flags audit gaps

## Architecture

```
Documents → Chunking → Retrieval (RAG) → Copilot / Agents → Actions + Citations
                              ↓
                     Knowledge Graph Links
```

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS
- **AI Layer:** Local RAG retrieval + optional Gemini API
- **Knowledge:** Equipment tags, regulatory refs, cross-document entity linking

## Demo Script (3–4 min video)

1. **Dashboard** — Show indexed corpus and stats
2. **Copilot** — Ask: "Why is pump P-101 experiencing repeat seal failures?"
3. **RCA Agent** — Run analysis for P-101 high vibration + seal leakage
4. **Compliance Agent** — Run Unit-2 audit scope check
5. **Documents** — Show heterogeneous sources unified

## Team / Submission

- **Problem Statement:** PS-8
- **GitHub:** Public repository required for Unstop submission
- **Deliverables:** Working prototype, architecture diagram, demo video, detailed document

## Impact

- Reduces time searching for operational knowledge (McKinsey: 35% of industrial professional time)
- Connects repeat failures across work orders and inspections
- Surfaces compliance gaps before statutory audits

Built for Octave-aligned industrial intelligence: Design, Build, Operate, Protect.
