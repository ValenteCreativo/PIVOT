# Track compliance

## Linkup — Deep Research

- [x] Search/retrieve provider adapter
- [x] Separate first-party target-event retrieval from idea-landscape retrieval
- [x] Carry normalized findings between research rounds and include them in the report
- [DISCLOSED LIMITATION] No separate Round 1 database checkpoint; optional D1 writes occur only after the local runner completes
- [x] Identify evidence gaps after Round 1
- [x] Generate Round 2 from those gaps
- [x] Display source titles, URLs, round queries, summaries, claims, and confidence; retain retrieval time in the domain model
- [x] Display unresolved uncertainty
- [x] Executed both rounds with a real Linkup key through the production workflow

## Nebius — Applied AI

- [x] Token Factory inference wired into the live main flow
- [x] Structured JSON request and Zod validation
- [x] Fifteen-case representative mentor benchmark
- [x] Quality, time, schema, and estimated-cost metrics
- [x] Known disagreement cases and limitations displayed
- [x] Executed the main evaluation path with GLM-5.3-Flash and strict structured output
- [DISCLOSED LIMITATION] The displayed 15-case benchmark remains a directional fixture baseline; it was not rerun as fifteen paid final-model calls

## Render — Workflows

- [x] Multi-step Render SDK task graph
- [x] Honest remote wait state with elapsed time and explicitly labeled UI anticipation
- [x] Controlled, explicitly simulated evaluation failure in Demo Mode
- [x] Transient provider retries at the inference boundary; deterministic format failures fail fast
- [x] Idempotency key propagation, stable analysis IDs, and process-local request deduplication
- [DISCLOSED LIMITATION] The terminal Render task returns the report without writing to D1; D1 upserts belong to the local runner
- [x] Final report returned by the terminal task
- [x] Error returned visibly instead of fake fallback in live mode
- [x] Deployed and triggered successfully from the Vercel application

## NERDCONF — Fun Build

- [x] Complete, zero-key public demo experience
- [x] Original “hackathon idea casino” interaction
- [x] Constructive near-miss mechanic
- [x] Responsive, keyboard-accessible, reduced-motion-aware experience
- [x] Serious mentor report beneath the playful metaphor
