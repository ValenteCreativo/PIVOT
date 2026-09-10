# PIVOT!

**Before you spend 36 hours building it, check the odds.**

PIVOT! is a rigorous AI hackathon mentor inside a premium casino-analysis interface. It researches an event and the surrounding product landscape, challenges an idea across ten dimensions, separates hackathon competitiveness from real-world credibility, and prescribes the smallest stronger version worth shipping.

The project comes from repeated experience mentoring roughly 9–10 hackathons. The recurring problem was not idea generation—it was deciding which version was specific, differentiated, feasible, and demoable enough to build.

## What works now

- Complete zero-key Demo Mode with five tailored scenarios, deterministic reports, two research rounds, explicit evidence gaps, fixture-source labeling, and uncertainty.
- Ten-dimension 100-point rubric with confidence-aware verdicts: FOLD, PIVOT, DOUBLE DOWN, and ALL IN.
- Separate **Hackathon Edge** and **Real-World Edge** scores with transparent dimension weights.
- Constructive near-miss mechanic that names the changes with the highest expected point impact.
- Controlled evaluation failure, retry, recovery, and idempotency display for judge demos.
- Detailed mentor report: strengths, weaknesses, sources, novelty, adoption, feasibility, sponsor fit, stronger pivot, five-feature MVP, exclusions, 24-hour plan, and 60-second demo.
- Inspectable 15-case mentor benchmark with misses disclosed.
- Server-only Linkup and Nebius adapters, a Render Workflow task graph, D1 persistence, and validated external AI output.

## Run locally

Requires Node 22.13+.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. No environment variables are needed. Pick a demo hand, optionally enable the failure simulation, and run the odds.

Quality checks:

```bash
npm test
npm run lint
npm run build
```

## Architecture

```text
Browser UI
  → POST /api/analyze (validated input + idempotency key)
    → ResearchProvider
      → DemoResearchProvider, or LinkupResearchProvider
      → Round 1 → saved gaps → gap-derived Round 2
    → MentorInferenceProvider
      → DemoInferenceProvider, or NebiusInferenceProvider
      → Zod-validated structured response
    → D1 analysis store (analysis + deduplicated findings)

Render Workflows (live deployment option)
  parse_input → research_hackathon → identify_gaps → followup_research
  → evaluate_with_nebius → generate_pivot → persist_report
```

The UI depends only on domain types, not provider implementations. `APP_MODE=auto` uses live providers only when both research and inference credentials exist. In live mode, a provider error remains visible; the system never silently substitutes fixture evidence.

## Score formula

The PIVOT Score is the sum of ten rubric dimensions: problem clarity 10, user specificity 8, novelty 12, real-world feasibility 12, hackathon scope 12, demoability 10, sponsor fit 10, business/adoption 10, impact 8, and evidence 8.

Hackathon Edge averages normalized novelty, feasibility, scope, demoability, and sponsor-fit dimensions. Real-World Edge averages problem clarity, user specificity, feasibility, adoption, impact, and evidence. The verdict tier is then tempered when confidence or evidence coverage is weak.

## Live mode

Copy `.env.example` to `.env.local`, set the credentials below, and choose `APP_MODE=live` (or `auto`). All keys remain server-side.

### Linkup — recursive evidence gathering

1. Create an account and API key at [app.linkup.so](https://app.linkup.so/).
2. Set `LINKUP_API_KEY`.
3. Start the app with `APP_MODE=live`.
4. Run an analysis and confirm the Research Trail labels actual URLs as `LIVE SOURCE`.

PIVOT calls Linkup for Round 1, stores normalized sources and evidence gaps, then creates Round 2 from those gaps. The implementation uses the official `POST https://api.linkup.so/v1/search` endpoint with `searchResults`; see the [Linkup quickstart](https://docs.linkup.so/pages/documentation/get-started/quickstart).

### Nebius Token Factory — main-flow mentor inference

1. Create an account at [Token Factory](https://tokenfactory.nebius.com/) and create an API key.
2. Set `NEBIUS_API_KEY`.
3. Keep the default `NEBIUS_BASE_URL`, or change it for a compatible endpoint.
4. Select a current JSON-capable model in Token Factory and set `NEBIUS_MODEL`.
5. Run the 15 benchmark cases before a public demo and record actual latency/cost.

PIVOT sends the idea, constraints, hackathon context, both evidence rounds, gaps, and rubric to the OpenAI-compatible chat-completions endpoint. It requests JSON, extracts fenced or noisy JSON defensively, and validates the result with Zod. See [Nebius quickstart](https://docs.tokenfactory.nebius.com/quickstart) and [structured output guidance](https://docs.tokenfactory.nebius.com/ai-models-inference/json).

### Render Workflows — durable orchestration

1. Install the Render CLI and run `render workflows init` if you want a separate starter; this repository already contains task definitions in `render-workflow/tasks.ts`.
2. Push this repository to a supported Git provider.
3. In Render, choose **New → Workflow**, link the repository, choose Node, use `npm install` as the build command and `npm run workflow:start` as the start command.
4. Add the Linkup and Nebius variables to the Workflow service.
5. Deploy, then copy the registered task slug for `run_analysis` (format `workflow-slug/run_analysis`).
6. Create a Render API key, set it as `RENDER_API_KEY`, and set the task slug as `RENDER_WORKFLOW_ID` in the web app.
7. Trigger once and inspect the chained tasks and retry boundaries in Render’s Runs view.

The web adapter calls the official `POST https://api.render.com/v1/task-runs` endpoint. The task graph uses three retries with exponential backoff; the application sends its idempotency key into the workflow payload. See [workflow setup](https://render.com/docs/workflows-tutorial), [task definitions and retries](https://render.com/docs/workflows-defining), and [triggering runs](https://render.com/docs/workflows-running).

## Persistence

D1 stores each analysis once and findings under a unique `analysisId:findingId` key. Upserts make retries safe. Local workflow results still return if persistence is temporarily unavailable. The generated migration is committed in `drizzle/`.

## Mentor benchmark

The benchmark is intentionally labeled expert judgment, not objective truth. It spans vague climate AI, developer tools, marketplaces, hardware, public-good blockchain, wrappers, impossible scope, social impact, forced and native sponsors, consumer apps, infrastructure, research, fun builds, and deceptively simple concepts. Current demo-fixture numbers are baselines; rerun and replace time/cost metrics after live credentials are connected.

## Known limitations

- Live sponsor calls and a deployed Render task chain require the owner’s credentials and have not been executed here.
- Demo evidence is curated fixture content and uses clearly non-public `demo-evidence.local` URLs; it is never presented as web research.
- D1 persistence is device-independent when hosted, but there is intentionally no account/history interface.
- Benchmark “ground truth” reflects mentor judgment; disagreement is disclosed rather than hidden.

## Tracks

- **Linkup / Deep Research:** recursive, gap-driven research with source provenance.
- **Nebius / Applied AI:** structured main-flow mentor inference plus an inspectable benchmark.
- **Render / Workflows:** separate retryable steps, idempotency, visible failure recovery.
- **NERDCONF / Fun Build:** a memorable casino decision terminal that teaches disciplined scope.

See [track compliance](docs/TRACK-COMPLIANCE.md), [90-second and 2-minute demo scripts](docs/DEMO-SCRIPT.md), and [submission copy](docs/SUBMISSION.md).
