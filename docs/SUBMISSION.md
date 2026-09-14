# PIVOT! — submission material

## One-line description

An evidence-driven AI hackathon mentor that tells teams when to fold, pivot, double down, or go all in—and exactly what to build next.

## Short description

Hackathon teams lose their weekend to ideas that sound exciting but are vague, weakly differentiated, or impossible to demo. PIVOT! researches the event and idea in two evidence rounds before Nebius evaluates ten mentor dimensions and deterministic code returns a verdict, scoped build, and demo plan through an idempotent Render Workflow.

## Sponsor implementation

### Linkup

Linkup runs in the main analysis path, not as decoration. PIVOT searches the supplied event domain separately from the project landscape, carries Round 1 sources between tasks, identifies material unknowns, and generates Round 2 searches directly from those gaps; missing first-party evidence remains UNKNOWN.

### Nebius Token Factory

GLM-5.3-Flash produces a strict structured assessment across ten mentor dimensions. Zod enforces the domain contract, and application code independently calculates the score, Hackathon Edge, Real-World Edge, verdict tier, and near-miss distance.

### Render Workflows

Render executes the production analysis as seven chained child tasks and returns the terminal report to Vercel. Retries occur at the smallest useful boundary, deterministic schema failures fail fast, and the propagated idempotency key derives a stable analysis ID and deduplicates requests within the web process.

## Long description

Hackers rarely lack ideas. They lose weekends to ideas that are broad, weakly differentiated, impossible to demo, or loaded with sponsor tools at the last minute. PIVOT! turns the judgment of an experienced hackathon mentor into a repeatable workflow.

A team enters its hackathon, rough idea, and optional constraints. Linkup gathers evidence recursively: the first research pass is carried into gap analysis, its gaps become new questions, and a second pass resolves or exposes uncertainty. Nebius Token Factory receives the complete evidence trail and produces a structured, conservatively scored mentor assessment. Render Workflows splits the work into retryable, idempotent stages. The result separates **Hackathon Edge** from **Real-World Edge**, because a winning demo and a durable startup are not always the same bet.

The casino metaphor is used as decision language, not compulsion. A near miss teaches the exact changes with the highest expected score impact. Every verdict includes strengths, failure points, evidence, uncertainty, novelty and adoption analysis, sponsor fit, a rewritten pivot, the five-feature MVP, what to cut, an execution plan, and one hard truth.

## Problem

Teams burn scarce hackathon time on vague users, superficial differentiation, impossible scope, weak validation, and demos that obscure the core value.

## Solution

A demanding but constructive mentor that researches before judging, exposes uncertainty, separates weekend competitiveness from product credibility, and turns criticism into an executable plan.

## How it works

1. Validate the idea and team constraints.
2. Research the event, sponsors, market, and alternatives.
3. Carry Round 1 findings forward and identify missing signals.
4. Generate follow-up questions and run Round 2.
5. Evaluate ten weighted dimensions with structured inference.
6. Calculate the score, edge scores, verdict, and near miss deterministically from canonical dimension scores.
7. Return and present the stronger pivot, scope, plan, and demo.

## Sponsor technologies

- **Linkup:** essential recursive evidence gathering; Round 1 directly determines Round 2.
- **Nebius Token Factory:** essential structured inference in the live mentor path and a transparent 15-case evaluation benchmark.
- **Render Workflows:** essential multi-step execution, retries, fault visibility, and idempotency.
- **NERDCONF Fun Build:** the original casino mentor interface turns uncertainty and near misses into an educational interaction.

## What is novel

Most idea generators increase scope. PIVOT! is a subtraction engine: it researches before scoring, distinguishes a good startup from a good hackathon entry, and converts the casino “near miss” into explicit mentoring rather than a manipulation loop.

## What was challenging

Keeping fixture mode honest while making it feel production-grade; designing confidence-aware scoring; preserving provenance between research rounds; and showing workflow recovery without duplicating effects.

## What we learned

The most useful mentor output is not a score. It is the causal chain from evidence → risk → subtraction → a specific next build.

## Future work

Run and publish the live model benchmark, add signed share links, tune category-specific rubric weights with more mentors, and add exportable review packets without adding account complexity.

## Challenge requirement map

- **Linkup / Deep Research:** real recursive research, Round 1 findings carried between tasks, gap-derived Round 2 queries, inspectable sources, and explicit uncertainty.
- **Nebius / Applied AI:** Token Factory in the main decision path, strict structured output, ten-dimension evaluation, deterministic downstream scoring, disclosed failure behavior, and a 15-case directional fixture benchmark.
- **Render / Workflows:** real multi-step background task graph, child-level retry policy, idempotency, final result polling, visible remote provenance, and no local fallback in Live Mode.
- **Fun Build:** a tactile “Hackathon Idea Casino” that uses betting language to teach a serious resource-allocation decision without turning mentor output into a joke.

The Vercel → Render → Linkup → Nebius production path has completed successfully. Demo Mode remains an explicitly labeled, zero-key judging fallback.

## Compact form copy

**Project:** PIVOT!  
**Tagline:** Before you spend 36 hours building it, check the odds.  
**Problem:** Hackathon teams lose time to broad, undifferentiated, unbuildable ideas.  
**Solution:** Recursive research plus structured AI mentorship that scores the bet, identifies what breaks, and prescribes a smaller winning build.  
**Built with:** Next.js, TypeScript, Linkup, Nebius Token Factory, Render Workflows, D1, and Zod.
