"use client";
import { useEffect, useRef, useState } from "react";
import { benchmarkCases, benchmarkSummary } from "@/lib/benchmark";
import { workflowOrdinal } from "@/lib/workflow-progress";
import type {
  AnalysisInput,
  MentorReport,
  StepState,
  WorkflowStep,
} from "@/lib/types";

const examples = [
  {
    label: "AI CLIMATE APP",
    idea: "An AI app that helps people reduce their carbon footprint.",
    tag: "PIVOT",
  },
  {
    label: "ONCHAIN REPUTATION",
    idea: "An onchain reputation system for open-source contributors.",
    tag: "DOUBLE DOWN",
  },
  {
    label: "TIKTOK INTELLIGENCE",
    idea: "An AI tool that tells TikTok creators what content to make next.",
    tag: "DOUBLE DOWN",
  },
  {
    label: "MULTIPLAYER FOCUS",
    idea: "A multiplayer focus room where remote teams race to finish one task together.",
    tag: "NEAR MISS",
  },
  {
    label: "RIDICULOUS PITCH DEALER",
    idea: "A ridiculous live pitch dealer that turns rambling hackathon ideas into a sharp 20-second pitch.",
    tag: "ALL IN",
  },
];
const stepLabels = [
  "Reading target event",
  "Mapping tracks & sponsors",
  "Research round 1",
  "Finding evidence gaps",
  "Research round 2",
  "Evaluating 10 dimensions",
  "Calculating the odds",
  "Designing your pivot",
  "Preparing the build plan",
  "Persisting report",
];
const reelLabels = [
  "PROBLEM",
  "USER",
  "NOVELTY",
  "FEASIBILITY",
  "SCOPE",
  "DEMO",
  "SPONSOR",
  "ADOPTION",
  "IMPACT",
  "EVIDENCE",
];
const defaultForm: AnalysisInput & { goal: string } = {
  hackathonUrl: "",
  idea: "",
  teamSize: 3,
  hours: 36,
  strengths: "TypeScript, product design",
  goal: "Win sponsor track",
  simulateFailure: false,
};
type Execution = {
  kind: "demo-local" | "render";
  taskSlug?: string;
  workflowRunId?: string;
  status: string;
};

function Meter({
  label,
  value,
  max,
  note,
}: {
  label: string;
  value: number;
  max: number;
  note: string;
}) {
  const percentage = Math.round((value / max) * 100);
  return (
    <div className="meter">
      <div className="meter-heading">
        <span>{label}</span>
        <b>
          {value}<small>/{max}</small>
        </b>
      </div>
      <div className="meter-track">
        <i style={{ width: `${percentage}%` }} />
      </div>
      <p>{note}</p>
    </div>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>;
}

export default function PivotApp({
  initialMode,
}: {
  initialMode: "demo" | "live";
}) {
  const [form, setForm] = useState(defaultForm);
  const [view, setView] = useState<
    "home" | "processing" | "landing" | "report"
  >("home");
  const [report, setReport] = useState<MentorReport | null>(null);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>(
    stepLabels.map((label, i) => ({
      id: `step-${i + 1}`,
      label,
      state: "pending",
    })),
  );
  const [mentor, setMentor] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sound, setSound] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [leverPull, setLeverPull] = useState(0);
  const [leverSnap, setLeverSnap] = useState(false);
  const intakeRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const dragStart = useRef(0);
  const dragPull = useRef(0);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const starting = useRef(false);
  const canRun = form.idea.trim().length >= 12;
  useEffect(() => {
    if (view !== "processing") return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [view]);
  useEffect(() => {
    const submitIdea = (event: KeyboardEvent) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        event.target instanceof HTMLTextAreaElement &&
        event.target.id === "idea"
      ) {
        event.preventDefault();
        document
          .querySelector<HTMLButtonElement>(".run-button:not(:disabled)")
          ?.click();
      }
    };
    document.addEventListener("keydown", submitIdea);
    return () => document.removeEventListener("keydown", submitIdea);
  }, []);
  function updateStep(
    index: number,
    state: StepState,
    detail?: string,
    attempt?: number,
  ) {
    setSteps((current) =>
      current.map((s, i) =>
        i === index ? { ...s, state, detail, attempt } : s,
      ),
    );
  }
  function mechanicalTone(frequency: number, duration = 0.045) {
    if (!sound) return;
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + duration,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close());
  }
  async function run() {
    if (!canRun) return;
    setError("");
    setReport(null);
    setExecution(null);
    setElapsed(0);
    startedAt.current = Date.now();
    setView("processing");
    setSteps(
      stepLabels.map((label, i) => ({
        id: `step-${i + 1}`,
        label,
        state: "pending",
      })),
    );
    const key = crypto.randomUUID();
    const request = fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(form),
    }).then(async (r) => {
      const data = (await r.json()) as {
        error?: string;
        report?: MentorReport;
        execution?: Execution;
      };
      if (!r.ok || !data.report || !data.execution)
        throw new Error(data.error ?? "Analysis failed");
      return { report: data.report, execution: data.execution };
    });
    if (initialMode === "demo")
      for (let i = 0; i < stepLabels.length; i++) {
        updateStep(i, "running");
        await new Promise((r) => setTimeout(r, i === 3 || i === 4 ? 430 : 270));
        if (form.simulateFailure && i === 5) {
          updateStep(i, "failed", "Simulated HTTP 503 · attempt 1/3", 1);
          await new Promise((r) => setTimeout(r, 700));
          updateStep(
            i,
            "retrying",
            "Retrying safely · previous research preserved",
            2,
          );
          await new Promise((r) => setTimeout(r, 650));
          updateStep(
            i,
            "recovered",
            "Simulated recovery · no duplicate report",
            2,
          );
        } else updateStep(i, "completed");
      }
    try {
      const data = await request;
      setReport(data.report);
      setExecution(data.execution);
      setView("landing");
      mechanicalTone(118, 0.08);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.setTimeout(
        () => {
          setView("report");
          window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        },
        reduced ? 180 : 6800,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setView("home");
      setTimeout(
        () => intakeRef.current?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    }
  }
  function activateLever() {
    if (!canRun || starting.current) return;
    starting.current = true;
    setLeverSnap(true);
    setLeverPull(1);
    mechanicalTone(92, 0.06);
    void run();
    window.setTimeout(() => {
      setLeverPull(0);
      mechanicalTone(148, 0.04);
    }, 170);
    window.setTimeout(() => {
      setLeverSnap(false);
      starting.current = false;
    }, 390);
  }
  function handleLeverDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!canRun || starting.current) return;
    dragging.current = true;
    dragPull.current = 0;
    suppressClick.current = false;
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handleLeverMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const pull = Math.max(
      0,
      Math.min(1, (event.clientY - dragStart.current) / 112),
    );
    dragPull.current = pull;
    setLeverPull(pull);
  }
  function handleLeverUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragPull.current >= 0.68) {
      suppressClick.current = true;
      activateLever();
    } else {
      suppressClick.current = dragPull.current > 0.04;
      setLeverPull(0);
    }
  }
  function handleLeverClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (event.detail === 0 || canRun) activateLever();
  }
  async function copy() {
    if (!report) return;
    await navigator.clipboard.writeText(
      `PIVOT! — ${report.verdict}\nPIVOT SCORE ${report.score}/100\n${report.summary}\n\nTHE PIVOT\n${report.pivot}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  const active = steps.findIndex(
    (s) =>
      s.state === "running" || s.state === "retrying" || s.state === "failed",
  );
  const completed = steps.filter((s) =>
    ["completed", "recovered"].includes(s.state),
  ).length;
  const anticipated = Math.min(stepLabels.length - 1, Math.floor(elapsed / 4));
  const reelIndex = Math.floor(elapsed / 0.8);

  if (view === "landing" && report) {
    const landingReels = ["Novelty", "Hackathon scope", "Evidence"].map((key) =>
      report.dimensions.find((d) => d.key === key),
    );
    return (
      <main className="site-shell landing-page">
        <Header sound={sound} setSound={setSound} mode={report.mode} />
        <section className="landing-wrap">
          <p className="landing-kicker">MACHINE STOPPED · ANALYSIS LOCKED</p>
          <div className="landing-machine">
            <div className="landing-reels" aria-label="Final scores">
              <div>
                {landingReels.map((dimension, index) => (
                  <div
                    className="landed-reel"
                    style={{ animationDelay: `${index * 0.22}s` }}
                    key={dimension?.key ?? index}
                  >
                    <span>{dimension?.key.toUpperCase() ?? "DIMENSION"}</span>
                    <b>{dimension?.score ?? "—"}</b>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="verdict-shutter"
              style={
                {
                  "--landing-color":
                    report.verdict === "FOLD"
                      ? "#f06a61"
                      : report.verdict === "ALL IN"
                        ? "#73dc8d"
                        : report.verdict === "DOUBLE DOWN"
                          ? "#70cddd"
                          : "#efb83e",
                } as React.CSSProperties
              }
            >
              <small>THE ODDS SAY</small>
              <strong>{report.verdict}</strong>
              <b>{report.score}<span>/100</span></b>
            </div>
          </div>
          <MentorReceipt report={report} />
          <button
            className="open-report"
            onClick={() => {
              setView("report");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            OPEN THE FULL MENTOR REPORT →
          </button>
        </section>
      </main>
    );
  }

  if (view === "processing")
    return (
      <main className="site-shell process-page">
        <Header sound={sound} setSound={setSound} mode={initialMode} />
        <section className="process-wrap">
          <div className="process-kicker">
            {initialMode === "live"
              ? "REMOTE ANALYSIS IN FLIGHT"
              : `DEMO WORKFLOW / ${workflowOrdinal(completed, steps.length)} OF ${steps.length}`}
          </div>
          <h1>
            THE MACHINE IS
            <br />
            <em>WEIGHING THE BET.</em>
          </h1>
          <div className="process-layout">
            <div className="process-machine">
              <div className="machine-plate">
                PIVOT! / ODDS COMPUTER <span>UNIT 001</span>
              </div>
              <MachineReels
                values={[
                  reelLabels[reelIndex % reelLabels.length],
                  reelLabels[(reelIndex + 3) % reelLabels.length],
                  reelLabels[(reelIndex + 7) % reelLabels.length],
                ]}
                spinning
                labels={["IDEA", "EDGE", "RISK"]}
              />
              <StatusBank elapsed={elapsed} mode="running" />
              <p className="researching-signal">
                <i /> REQUEST ACTIVE · AWAITING VERIFIED RESULT
              </p>
            </div>
            <div className="workflow" aria-live="polite">
              {steps.map((step, i) => {
                const liveState =
                  initialMode === "live"
                    ? i === anticipated
                      ? "anticipated"
                      : "pending"
                    : step.state;
                return (
                  <div className={`workflow-step ${liveState}`} key={step.id}>
                    <span className="step-num">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="step-name">
                      {step.label}
                      <small>
                        {initialMode === "live" && i === anticipated
                          ? "UI anticipation · awaiting final Render confirmation"
                          : step.detail}
                      </small>
                    </span>
                    <span className="step-state">
                      {initialMode === "live"
                        ? i === anticipated
                          ? "NEXT CHECK"
                          : "QUEUED"
                        : step.state === "completed"
                          ? "DONE"
                          : step.state.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className={`progress-line ${initialMode === "live" ? "indeterminate" : ""}`}
          >
            <i
              style={
                initialMode === "live"
                  ? undefined
                  : {
                      width: `${Math.max(4, (completed / steps.length) * 100)}%`,
                    }
              }
            />
          </div>
          <p className="process-note">
            {steps[active]?.state === "failed"
              ? "EVALUATION INTERRUPTED."
              : initialMode === "live"
                ? "REAL REMOTE EXECUTION · STATUS DISCLOSURE"
                : "DEMO EXECUTION · CURATED FIXTURES"}{" "}
            <span>
              {steps[active]?.state === "retrying"
                ? "Retrying safely. Previous research preserved."
                : initialMode === "live"
                  ? "The moving phase marker is anticipation, not a claim that a child task completed. PIVOT will show only the confirmed final Render result."
                  : "Round 2 is selected from the gaps saved in Round 1."}
            </span>
          </p>
        </section>
      </main>
    );

  if (view === "report" && report)
    return (
      <main
        className={`site-shell report-page verdict-${report.verdict.toLowerCase().replace(" ", "-")}`}
      >
        <Header sound={sound} setSound={setSound} mode={report.mode} />
        <section className="report-hero">
          <div className="report-id">
            ANALYSIS {report.analysisId.slice(0, 8).toUpperCase()} ·{" "}
            {report.mode.toUpperCase()} EVIDENCE
          </div>
          <div className="verdict-grid">
            <div>
              <p>THE VERDICT</p>
              <h1>{report.verdict}</h1>
              <div className="verdict-summary">{report.summary}</div>
            </div>
            <div className="score-dial">
              <span>PIVOT SCORE</span>
              <b>{report.score}</b>
              <small>/ 100</small>
            </div>
          </div>
          <div className="hero-hard-truth">
            <small>THE HARD TRUTH</small>
            <p>“{report.hardTruth}”</p>
          </div>
          {report.nearMiss && (
            <div className="near-miss">
              <strong>NEAR MISS</strong>
              <span>
                You are{" "}
                <b>
                  {report.nearMiss.points} point
                  {report.nearMiss.points === 1 ? "" : "s"}
                </b>{" "}
                from {report.nearMiss.nextVerdict}.
              </span>
              {report.nearMiss.moves.map((m) => (
                <em key={m.action}>
                  +{m.impact} {m.action}
                </em>
              ))}
            </div>
          )}
          <div className="score-ribbon">
            <div>
              <small>HACKATHON EDGE</small>
              <b>{report.hackathonEdge}</b>
            </div>
            <div>
              <small>REAL-WORLD EDGE</small>
              <b>{report.realWorldEdge}</b>
            </div>
            <div>
              <small>CONFIDENCE</small>
              <b>{report.confidence}%</b>
            </div>
            <div>
              <small>EVIDENCE COVERAGE</small>
              <b>{report.evidenceCoverage}%</b>
            </div>
            <div>
              <small>RISK</small>
              <b>{report.risk}</b>
            </div>
          </div>
          {report.uncertainties.length > 0 && (
            <div className="uncertainty-strip">
              <strong>UNCONFIRMED</strong>
              <span>{report.uncertainties[0]}</span>
            </div>
          )}
        </section>
        <section className="report-body">
          <div className="report-main">
            <ReportSection
              number="01"
              title="What works"
              intro="The strongest evidence in the bet"
            >
              <CardList items={report.strengths} tone="good" />
            </ReportSection>
            <ReportSection
              number="02"
              title="What breaks"
              intro="Assumptions most likely to cost the weekend"
            >
              <CardList items={report.weaknesses} tone="bad" />
            </ReportSection>
            <ReportSection
              number="03"
              title="The pivot"
              intro="The version of this project worth building"
            >
              <div className="original">
                <small>ORIGINAL</small>“{report.originalIdea}”
              </div>
              <div className="pivot-copy">
                <small>PIVOT</small>
                {report.pivot}
              </div>
            </ReportSection>
            <ReportSection
              number="04"
              title="MVP & scope"
              intro="Exactly what ships — and what stays out"
            >
              <div className="split">
                <div>
                  <h3>MUST BUILD</h3>
                  <CardList items={report.mvp} tone="good" />
                </div>
                <div>
                  <h3>DO NOT BUILD</h3>
                  <CardList items={report.doNotBuild} tone="bad" />
                </div>
              </div>
            </ReportSection>
            <ReportSection
              number="05"
              title="24–36h plan"
              intro="A critical path, not a wish list"
            >
              <div className="timeline">
                {report.plan.map((p) => (
                  <div key={p.time}>
                    <b>{p.time}</b>
                    <span>{p.milestone}</span>
                  </div>
                ))}
              </div>
            </ReportSection>
            <ReportSection
              number="06"
              title="60-second demo"
              intro="Show transformation, not features"
            >
              <div className="demo-timeline">
                {report.demoPlan.map((d) => (
                  <div key={d.time}>
                    <b>{d.time}</b>
                    <p>{d.beat}</p>
                  </div>
                ))}
              </div>
            </ReportSection>
            <ReportSection
              number="07"
              title="The odds board"
              intro="Ten judgments, with the reasoning left visible"
            >
              <div className="dimension-board">
                {report.dimensions.map((d) => (
                  <Meter
                    key={d.key}
                    label={d.key}
                    value={d.score}
                    max={d.max}
                    note={d.note}
                  />
                ))}
              </div>
            </ReportSection>
            <ReportSection
              number="08"
              title="Research trail"
              intro="Inspect the evidence, gaps, and gap-directed follow-up"
            >
              <details className="report-disclosure">
                <summary>
                  OPEN RESEARCH TRAIL{" "}
                  <b>
                    {report.research.reduce(
                      (sum, round) => sum + round.findings.length,
                      0,
                    )}{" "}
                    SOURCES ·{" "}
                    {report.research.flatMap((round) => round.gaps).length}{" "}
                    UNKNOWNS
                  </b>
                </summary>
                <div className="research-trail">
                  {report.research.map((round, idx) => (
                    <article className="round" key={round.round}>
                      <header>
                        <Pill>ROUND {round.round}</Pill>
                        <h3>{round.focus}</h3>
                        <strong>{round.findings.length} SOURCES</strong>
                      </header>
                      <div className="queries">
                        {round.queries.map((q) => (
                          <span key={q}>↳ {q}</span>
                        ))}
                      </div>
                      {round.findings.map((f) => {
                        const evidenceState = f.demo
                          ? "fixture"
                          : f.confidence >= 85 &&
                              f.relationship.includes("first-party")
                            ? "verified"
                            : f.confidence >= 65
                              ? "relevant"
                              : "uncertain";
                        return (
                          <div
                            className={`evidence ${evidenceState}`}
                            key={f.id}
                          >
                            <div>
                              <span className="demo-tag">
                                {f.demo
                                  ? "DEMO FIXTURE"
                                  : evidenceState === "verified"
                                    ? "VERIFIED / FIRST-PARTY"
                                    : evidenceState === "relevant"
                                      ? "RELEVANT EVIDENCE"
                                      : "UNCERTAIN SOURCE"}
                              </span>
                              <b>{f.title}</b>
                              <p>{f.summary}</p>
                              <small className="claim">
                                CLAIM · {f.claimSupported}
                              </small>
                              <a href={f.url} target="_blank" rel="noreferrer">
                                {f.url}
                              </a>
                            </div>
                            <span className="confidence">
                              {f.confidence}%<small>CONF.</small>
                            </span>
                          </div>
                        );
                      })}
                      <div className="gap">
                        <b>
                          {idx === 0
                            ? "WE STILL DON’T KNOW"
                            : "UNCONFIRMED AFTER FOLLOW-UP"}
                        </b>
                        {round.gaps.map((g) => (
                          <span key={g}>• {g}</span>
                        ))}
                      </div>
                      {idx === 0 && (
                        <div className="round-arrow">
                          ↓ THESE GAPS SHAPED ROUND 2
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            </ReportSection>
            {mentor && (
              <>
                <ReportSection
                  number="09"
                  title="Mentor view"
                  intro="Feasibility and sponsor fit"
                >
                  <div className="sponsor-list">
                    {report.sponsorFit.map((s) => (
                      <div key={s.name}>
                        <Pill>{s.fit}</Pill>
                        <b>{s.name}</b>
                        <p>{s.reason}</p>
                      </div>
                    ))}
                  </div>
                  <h3>REAL-WORLD CONSTRAINTS</h3>
                  <CardList items={report.feasibility} />
                </ReportSection>
                <ReportSection
                  number="10"
                  title="Novelty & adoption"
                  intro="Good hackathon idea ≠ good startup idea"
                >
                  <div className="two-col">
                    <div>
                      <h3>DIFFERENTIATING WEDGE</h3>
                      <p>{report.novelty.wedge}</p>
                      <p className="muted">{report.novelty.judgment}</p>
                    </div>
                    <div>
                      <h3>FIRST 100 USERS</h3>
                      <p>{report.adoption.first100}</p>
                      <p className="muted">User: {report.adoption.user}</p>
                    </div>
                  </div>
                </ReportSection>
              </>
            )}
          </div>
          <aside className="report-aside">
            <div className="sticky-card">
              <span className="aside-label">MENTOR CONTROLS</span>
              <button
                className={mentor ? "toggle active" : "toggle"}
                onClick={() => setMentor(!mentor)}
              >
                <span /> MENTOR VIEW <b>{mentor ? "ON" : "OFF"}</b>
              </button>
              <button className="outline-btn" onClick={copy}>
                {copied ? "COPIED ✓" : "COPY RESULT"}
              </button>
              <button
                className="outline-btn"
                onClick={() => {
                  setView("home");
                  setTimeout(
                    () =>
                      intakeRef.current?.scrollIntoView({ behavior: "smooth" }),
                    50,
                  );
                }}
              >
                DEAL ANOTHER IDEA
              </button>
              <hr />
              <h3>HOW THIS ANALYSIS RAN</h3>
              <div className="provenance">
                <p>
                  <b>RESEARCH</b>{" "}
                  {report.mode === "live" ? "Linkup" : "Curated demo fixtures"}
                </p>
                <p>
                  <b>INFERENCE</b>{" "}
                  {report.mode === "live"
                    ? "Nebius Token Factory"
                    : "Deterministic demo engine"}
                </p>
                <p>
                  <b>ORCHESTRATION</b>{" "}
                  {execution?.kind === "render"
                    ? "Render Workflows"
                    : "Local demo runner"}
                </p>
                {execution?.workflowRunId && (
                  <p>
                    <b>RUN</b> {execution.workflowRunId.slice(0, 18)}
                  </p>
                )}
                <p>
                  <b>STATUS</b> {execution?.status ?? "completed"}
                </p>
              </div>
              <hr />
              <h3>RECOMMENDED STACK</h3>
              {report.stack.map((x) => (
                <p key={x}>◆ {x}</p>
              ))}
              <hr />
              <h3>NEXT VALIDATION</h3>
              {report.nextValidation.map((x, i) => (
                <p key={x}>
                  {i + 1}. {x}
                </p>
              ))}
            </div>
          </aside>
        </section>
      </main>
    );

  return (
    <main className="site-shell">
      <Header sound={sound} setSound={setSound} mode={initialMode} />
      <section id="top" className="hero">
        <div className="eyebrow">
          <span>01</span> AI MENTOR FOR HACKATHON IDEAS
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              CHECK THE ODDS
              <br />
              <em>BEFORE</em> YOU BUILD.
            </h1>
            <p className="hero-lede">
              Most hackathon ideas die Sunday night. PIVOT tells you Saturday
              morning.
            </p>
            <p className="hero-detail">
              Research the room, pressure-test the build, and find the version
              worth your next 36 hours.
            </p>
            <button
              className="text-link"
              onClick={() =>
                intakeRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              ↓ STEP UP TO THE MACHINE
            </button>
            <div className="credibility">
              Built from real hackathon mentoring workflows.
            </div>
          </div>
          <div
            className={`machine-stage ${canRun ? "machine-ready" : "machine-idle"}`}
            ref={intakeRef}
          >
            <form
              className="terminal intake-machine"
              aria-label="Idea analysis form"
              onSubmit={(event) => {
                event.preventDefault();
                activateLever();
              }}
            >
              <div className="machine-cap">
                <span>PIVOT! // IDEA VALIDATION MACHINE</span>
                <b>UNIT 001</b>
              </div>
              <div className="machine-screws" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <MachineReels
                values={["?", "?", "?"]}
                labels={["IDEA", "EDGE", "RISK"]}
              />
              <div className="machine-deck">
                <div className="terminal-head">
                  <span>FEED THE MACHINE</span>
                  <span className="live-label">
                    <i /> {canRun ? "READY" : "STANDBY"}
                  </span>
                </div>
                <label htmlFor="demo-idea">DEMO TICKET</label>
                <select
                  id="demo-idea"
                  value=""
                  onChange={(event) => {
                    const selected = examples.find(
                      (example) => example.label === event.target.value,
                    );
                    if (selected) setForm({ ...form, idea: selected.idea });
                  }}
                >
                  <option value="">Choose a sample idea…</option>
                  {examples.map((example) => (
                    <option key={example.label} value={example.label}>
                      {example.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="hackathon">
                  HACKATHON <small>OPTIONAL IN DEMO</small>
                </label>
                <input
                  id="hackathon"
                  type="url"
                  value={form.hackathonUrl}
                  onChange={(e) =>
                    setForm({ ...form, hackathonUrl: e.target.value })
                  }
                  placeholder="https://your-hackathon.com"
                />
                <label htmlFor="idea">YOUR BET</label>
                <textarea
                  id="idea"
                  value={form.idea}
                  onChange={(e) => setForm({ ...form, idea: e.target.value })}
                  placeholder="Describe the rough idea you are betting the weekend on…"
                  rows={3}
                />
                <div className="constraint-readout" aria-hidden="true">
                  <span>
                    <b>TEAM</b>
                    {form.teamSize}
                  </span>
                  <span>
                    <b>TIME</b>
                    {form.hours}h
                  </span>
                  <span>
                    <b>GOAL</b>
                    {form.goal
                      .replace("Win sponsor track", "WIN TRACK")
                      .toUpperCase()}
                  </span>
                </div>
                <details>
                  <summary>
                    ADJUST BUILD CONSTRAINTS <span>OPEN +</span>
                  </summary>
                  <div className="constraint-grid">
                    <label>
                      TEAM SIZE
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={form.teamSize}
                        onChange={(e) =>
                          setForm({ ...form, teamSize: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      HOURS AVAILABLE
                      <input
                        type="number"
                        min="4"
                        max="168"
                        value={form.hours}
                        onChange={(e) =>
                          setForm({ ...form, hours: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label className="wide">
                      TECHNICAL STRENGTHS
                      <input
                        value={form.strengths}
                        onChange={(e) =>
                          setForm({ ...form, strengths: e.target.value })
                        }
                      />
                    </label>
                    <label className="wide">
                      GOAL
                      <select
                        value={form.goal}
                        onChange={(e) =>
                          setForm({ ...form, goal: e.target.value })
                        }
                      >
                        <option>Win sponsor track</option>
                        <option>Build something viral</option>
                        <option>Validate startup idea</option>
                        <option>Learn a technology</option>
                        <option>Build public good</option>
                        <option>Ship fastest possible MVP</option>
                      </select>
                    </label>
                  </div>
                </details>
                {initialMode === "demo" && (
                  <label className="failure-toggle">
                    <input
                      type="checkbox"
                      checked={form.simulateFailure}
                      onChange={(e) =>
                        setForm({ ...form, simulateFailure: e.target.checked })
                      }
                    />
                    <span /> SIMULATE RECOVERY
                  </label>
                )}
                <StatusBank elapsed={0} mode={canRun ? "ready" : "standby"} />
                <button className="run-button" type="submit" disabled={!canRun}>
                  <span className="run-icon">↵</span>
                  <span>
                    <small>KEYBOARD / ACCESSIBLE CONTROL</small>RUN THE ODDS
                  </span>
                  <span className="arrow">→</span>
                </button>
                {error && <p className="form-error">{error}</p>}
              </div>
            </form>
            <div className="lever-label">
              PULL TO RUN
              <br />
              THE ODDS
            </div>
            <button
              className={`machine-lever ${leverSnap ? "snapping" : ""}`}
              type="button"
              disabled={!canRun}
              aria-label="Pull lever to run the odds"
              aria-describedby="lever-instructions"
              style={{ "--lever-pull": leverPull } as React.CSSProperties}
              onPointerDown={handleLeverDown}
              onPointerMove={handleLeverMove}
              onPointerUp={handleLeverUp}
              onPointerCancel={handleLeverUp}
              onClick={handleLeverClick}
            >
              <span className="lever-handle" />
              <span className="lever-arm" />
              <span className="lever-joint">
                <i />
              </span>
              <span className="lever-bracket" />
            </button>
            <span id="lever-instructions" className="sr-only">
              Drag the lever downward, click it, or use the Run the Odds button.
              Enter submits the form.
            </span>
          </div>
        </div>
      </section>
      <section className="demo-hands">
        <div className="section-kicker">TRY A DEMO IDEA</div>
        <h2>
          EVERY IDEA GETS
          <br />A DIFFERENT HAND.
        </h2>
        <div className="hand-grid">
          {examples.map((x, i) => (
            <button
              key={x.label}
              onClick={() => {
                setForm({ ...form, idea: x.idea });
                intakeRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span>0{i + 1}</span>
              <b>{x.label}</b>
              <small>{x.tag}</small>
              <i>→</i>
            </button>
          ))}
        </div>
      </section>
      <section id="method" className="method">
        <div>
          <div className="section-kicker">THE MENTORING ENGINE</div>
          <h2>
            RESEARCH.
            <br />
            PRESSURE-TEST.
            <br />
            <em>SUBTRACT.</em>
          </h2>
        </div>
        <div className="method-steps">
          <article>
            <span>01</span>
            <h3>READ THE ROOM</h3>
            <p>
              Map tracks, judging criteria, sponsors, and the ecosystem around
              the idea.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>SEARCH THE LANDSCAPE</h3>
            <p>
              Collect comparable products, real user signals, and first-party
              evidence before making a call.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>CHASE THE GAPS</h3>
            <p>
              Save Round 1, find what is missing, then run a second search
              shaped by those gaps.
            </p>
          </article>
          <article>
            <span>04</span>
            <h3>MAKE THE CALL</h3>
            <p>
              Score hackathon edge and real-world edge separately. Then
              prescribe the version worth shipping.
            </p>
          </article>
        </div>
      </section>
      <section id="benchmark" className="benchmark">
        <div className="section-kicker">
          MENTOR BENCHMARK / DIRECTIONAL FIXTURE BASELINE
        </div>
        <div className="benchmark-head">
          <h2>
            WE MEASURE THE MENTOR,
            <br />
            NOT JUST THE MODEL.
          </h2>
          <p>
            This is a directional expert-judgment benchmark, not scientific
            ground truth. Fifteen representative ideas test whether the
            mentoring engine behaves sensibly, with disagreements left visible.
          </p>
        </div>
        <div className="metric-grid">
          <div>
            <b>{benchmarkSummary.agreement}%</b>
            <span>VERDICT AGREEMENT</span>
          </div>
          <div>
            <b>{benchmarkSummary.averageDeviation}</b>
            <span>AVG SCORE DEVIATION</span>
          </div>
          <div>
            <b>{(benchmarkSummary.medianMs / 1000).toFixed(1)}s</b>
            <span>FIXTURE MEDIAN</span>
          </div>
          <div>
            <b>{benchmarkSummary.schemaSuccess}%</b>
            <span>SCHEMA VALID</span>
          </div>
        </div>
        <div className="benchmark-table">
          <div className="table-row table-head">
            <span>CASE</span>
            <span>EXPECTED</span>
            <span>MODEL</span>
            <span>PRIMARY WEAKNESS</span>
          </div>
          {benchmarkCases.map((c) => (
            <div
              className={`table-row ${c.expected !== c.model ? "miss" : ""}`}
              key={c.name}
            >
              <b>{c.name}</b>
              <span>{c.expected}</span>
              <span>{c.model}</span>
              <p>{c.weakness}</p>
            </div>
          ))}
        </div>
        <p className="cost-note">
          Checked-in fixture baseline; it has not been rerun as a 15-call live
          benchmark against the final model. Estimated live inference cost /
          evaluation: {benchmarkSummary.estimatedCost}; actual cost varies by
          model and token use.
        </p>
      </section>
      <Footer />
    </main>
  );
}

function MachineReels({
  values,
  labels,
  spinning = false,
}: {
  values: string[];
  labels: string[];
  spinning?: boolean;
}) {
  return (
    <div
      className={`machine-reels ${spinning ? "is-spinning" : ""}`}
      aria-label="Idea odds reels"
    >
      {values.map((value, index) => (
        <div className="machine-reel" key={`${labels[index]}-${index}`}>
          <div className="reel-window">
            <span>{value}</span>
          </div>
          <b>{labels[index]}</b>
        </div>
      ))}
    </div>
  );
}
function StatusBank({
  elapsed,
  mode,
}: {
  elapsed: number;
  mode: "standby" | "ready" | "running";
}) {
  return (
    <div className="status-bank">
      <div className="bank-lines">
        <span>
          <i className={mode === "running" ? "warm" : ""} /> RESEARCH BANK{" "}
          <b>{mode === "running" ? "REQUESTED" : "STANDBY"}</b>
        </span>
        <span>
          <i className={mode === "running" ? "warm" : ""} /> MODEL BANK{" "}
          <b>{mode === "running" ? "AWAITING" : "STANDBY"}</b>
        </span>
        <span>
          <i
            className={mode === "ready" || mode === "running" ? "active" : ""}
          />{" "}
          WORKFLOW{" "}
          <b>
            {mode === "running"
              ? "RUNNING"
              : mode === "ready"
                ? "READY"
                : "LOCKED"}
          </b>
        </span>
      </div>
      <div className="elapsed-readout">
        <small>ELAPSED</small>
        <b>
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
          {String(elapsed % 60).padStart(2, "0")}
        </b>
      </div>
    </div>
  );
}
function Header({
  sound,
  setSound,
  mode,
}: {
  sound: boolean;
  setSound: (v: boolean) => void;
  mode: "demo" | "live";
}) {
  return (
    <nav className="topbar" aria-label="Primary navigation">
      <a className="brand" href="#top">
        <span className="brand-mark">P!</span>
        <span>PIVOT!</span>
      </a>
      <div className="header-links">
        <a href="#method">METHOD</a>
        <a href="#benchmark">BENCHMARK</a>
      </div>
      <div className="nav-meta">
        <span className="status-dot" />
        <span>{mode.toUpperCase()} MODE</span>
        <button
          aria-label={`${sound ? "Mute" : "Enable"} sounds`}
          onClick={() => setSound(!sound)}
        >
          {sound ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>
    </nav>
  );
}
function ReportSection({
  number,
  title,
  intro,
  children,
}: {
  number: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section">
      <header>
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{intro}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
function CardList({
  items,
  tone = "neutral",
}: {
  items: string[];
  tone?: string;
}) {
  return (
    <div className={`card-list ${tone}`}>
      {items.map((x, i) => (
        <div key={x}>
          <span>
            {tone === "good"
              ? "+"
              : tone === "bad"
                ? "×"
                : String(i + 1).padStart(2, "0")}
          </span>
          <p>{x}</p>
        </div>
      ))}
    </div>
  );
}
function MentorReceipt({ report }: { report: MentorReport }) {
  return (
    <article className="mentor-receipt" aria-label="Printed mentor receipt">
      <div className="receipt-teeth" aria-hidden="true" />
      <header>
        <span>PIVOT! MENTOR RECEIPT</span>
        <b>#{report.analysisId.slice(0, 8).toUpperCase()}</b>
      </header>
      <div className="receipt-verdict">
        <small>DECISION</small>
        <strong>{report.verdict}</strong>
        <b>{report.score}/100</b>
      </div>
      <div className="receipt-odds">
        <span>HACKATHON EDGE <b>{report.hackathonEdge}</b></span>
        <span>REAL-WORLD EDGE <b>{report.realWorldEdge}</b></span>
        <span>CONFIDENCE <b>{report.confidence}%</b></span>
      </div>
      <section>
        <small>THE HARD TRUTH</small>
        <p>{report.hardTruth}</p>
      </section>
      <section className="receipt-pivot">
        <small>BUILD THIS VERSION</small>
        <p>{report.pivot}</p>
      </section>
      <div className="receipt-footer">
        <span>INPUT → EVIDENCE → JUDGMENT → OUTPUT</span>
        <b>KEEP THIS RECEIPT.</b>
      </div>
    </article>
  );
}
function Footer() {
  return (
    <>
      <section className="infrastructure" aria-labelledby="infrastructure-title">
        <div>
          <div className="section-kicker">THE REAL MACHINE ROOM</div>
          <h2 id="infrastructure-title">THREE SYSTEMS.<br />ONE HONEST VERDICT.</h2>
        </div>
        <div className="infrastructure-grid">
          <article><span>01</span><h3>LINKUP</h3><p>Researches the event, landscape, competitors, and missing evidence.</p></article>
          <article><span>02</span><h3>NEBIUS</h3><p>Turns grounded evidence into ten mentor judgments and clear advice.</p></article>
          <article><span>03</span><h3>RENDER</h3><p>Runs the multi-step workflow with task-level retries and idempotency.</p></article>
        </div>
      </section>
      <footer>
        <div className="brand">
          <span className="brand-mark">P!</span>
          <span>PIVOT!</span>
        </div>
        <p>Before you spend 36 hours building it, check the odds.</p>
        <span>BUILT FOR HACKERS WHO WOULD RATHER SHIP THE RIGHT THING.</span>
      </footer>
    </>
  );
}
