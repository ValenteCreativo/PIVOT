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
    label: "CLIMATE AI\nFOR CITIES",
    idea: "An AI app that helps people reduce their carbon footprint.",
    tag: "PIVOT",
  },
  {
    label: "ONCHAIN\nREPUTATION",
    idea: "An onchain reputation system for open-source contributors.",
    tag: "DOUBLE DOWN",
  },
  {
    label: "TIKTOK TOOL\nFOR CREATORS",
    idea: "An AI tool that tells TikTok creators what content to make next.",
    tag: "DOUBLE DOWN",
  },
  {
    label: "MULTIPLAYER\nSTUDY APP",
    idea: "A multiplayer focus room where remote teams race to finish one task together.",
    tag: "NEAR MISS",
  },
  {
    label: "DEVINFRA FOR\nHACKATHONS",
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
const anticipationLabels = [
  "READING THE ROOM",
  "SEARCHING THE LANDSCAPE",
  "LOOKING FOR THE WEAK LINK",
  "CHECKING THE EVIDENCE",
  "PRESSURE-TESTING THE BUILD",
];
const benchmarkPreview = [
  benchmarkCases[1],
  benchmarkCases[2],
  benchmarkCases[6],
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
          {value}
          <small>/{max}</small>
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

// American-traditional / screenprint influenced inline icons (no icon library)
function ReelIcon({ name }: { name: "idea" | "viability" | "impact" }) {
  if (name === "idea")
    return (
      <svg viewBox="0 0 48 48" className="reel-glyph" aria-hidden="true">
        <path
          d="M24 6c-8 0-14 6-14 13 0 5 2 8 5 11 2 2 3 4 3 7h12c0-3 1-5 3-7 3-3 5-6 5-11 0-7-6-13-14-13z"
          fill="#c9932d"
          stroke="#151513"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M18 37h12M19 41h10"
          stroke="#151513"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M24 15v10M20 20l4 5 4-5"
          stroke="#151513"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M8 12l4 2M40 12l-4 2M24 2v4"
          stroke="#8f2425"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "viability")
    return (
      <svg viewBox="0 0 48 48" className="reel-glyph" aria-hidden="true">
        <path
          d="M27 4L11 27h9l-3 17 20-25h-10l3-15z"
          fill="#c9932d"
          stroke="#151513"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 48 48" className="reel-glyph" aria-hidden="true">
      <path
        d="M24 4l5.3 12.5L43 17.6l-10.4 8.9 3.3 13.6L24 32.8 12.1 40l3.3-13.6L5 17.6l13.7-1.1z"
        fill="#8f2425"
        stroke="#151513"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M24 14l2.6 6.2 6.7.5-5.1 4.4 1.6 6.6L24 28.6 18.2 32l1.6-6.6-5.1-4.4 6.7-.5z"
        fill="#f3eadb"
        stroke="#151513"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CredIcon({ name }: { name: "research" | "eval" | "run" }) {
  if (name === "research")
    return (
      <svg viewBox="0 0 32 32" className="cred-glyph" aria-hidden="true">
        <circle
          cx="14"
          cy="14"
          r="8"
          fill="none"
          stroke="#8f2425"
          strokeWidth="2.6"
        />
        <path
          d="M20 20l7 7"
          stroke="#8f2425"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "eval")
    return (
      <svg viewBox="0 0 32 32" className="cred-glyph" aria-hidden="true">
        <path
          d="M16 4c5 0 9 3 9 8 0 3-2 5-2 8 0 2 1 3 1 5H8c0-2 1-3 1-5 0-3-2-5-2-8 0-5 4-8 9-8z"
          fill="none"
          stroke="#8f2425"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M12 25h8"
          stroke="#8f2425"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32" className="cred-glyph" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="#8f2425"
        strokeWidth="2.6"
      />
      <path
        d="M16 8v8l6 4"
        fill="none"
        stroke="#8f2425"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const credibility = [
  { icon: "research", title: "WEB RESEARCH", via: "via Linkup" },
  { icon: "eval", title: "AI EVALUATION", via: "via Nebius" },
  { icon: "run", title: "RELIABLE EXECUTION", via: "via Render" },
] as const;

const processSteps = [
  {
    n: "01",
    title: "UNDERSTAND\nTHE EVENT",
    body: "Tracks, sponsors, judging criteria.",
  },
  {
    n: "02",
    title: "RESEARCH\nTHE LANDSCAPE",
    body: "Find evidence, competitors, precedent.",
  },
  {
    n: "03",
    title: "FIND\nTHE GAPS",
    body: "Identify what is missing.",
  },
  {
    n: "04",
    title: "EVALUATE\n10 DIMENSIONS",
    body: "From problem clarity to impact.",
  },
  {
    n: "05",
    title: "GET YOUR\nVERDICT",
    body: "Fold, Pivot, Double Down or All In.",
  },
];

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
  const anticipationLabel =
    anticipationLabels[Math.floor(elapsed / 6) % anticipationLabels.length];

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
              <b>
                {report.score}
                <span>/100</span>
              </b>
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
            <div className="intake-machine process-machine">
              <div className="machine-plate">
                <b>PIVOT!</b>
                <span>WEIGHING THE BET</span>
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
                <i /> {anticipationLabel}
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
RUN ANOTHER IDEA
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
      <section id="top" className="hero poster">
        <div className="poster-headline">
          <span className="headline-star" aria-hidden="true">
            ✦
          </span>
          <h1>
            CHECK THE <em>ODDS</em>
            <br />
            BEFORE YOU BUILD.
          </h1>
          <p className="headline-sub">
            Most hackathon ideas die Sunday night. PIVOT tells you Saturday
            morning.
          </p>
        </div>

        <div className="poster-grid">
          <aside className="poster-left" aria-label="Why PIVOT">
            <div className="margin-list" aria-hidden="true">
              <span>IDEAS</span>
              <span>HACKATHONS</span>
              <span>BUILDERS</span>
              <span>A BRIGHTER TOMORROW</span>
            </div>
            <h2 className="editorial-head">
              REAL
              <br />
              RESEARCH.
              <br />
              REAL
              <br />
              ADVICE.
            </h2>
            <p className="editorial-body">
              PIVOT researches the hackathon, investigates your idea, and
              pressure-tests the build before giving you a clear verdict and
              plan.
            </p>
            <ul className="cred-markers">
              {credibility.map((c) => (
                <li key={c.title}>
                  <CredIcon name={c.icon} />
                  <div>
                    <b>{c.title}</b>
                    <span>{c.via}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="margin-script" aria-hidden="true">
              Better ideas build
              <br />a brighter tomorrow.
            </p>
          </aside>

          <div
            className={`machine-stage ${canRun ? "machine-ready" : "machine-idle"}`}
            ref={intakeRef}
          >
            <form
              className="intake-machine"
              aria-label="Idea analysis form"
              onSubmit={(event) => {
                event.preventDefault();
                activateLever();
              }}
            >
              <div className="machine-cap">
                <span className="cap-star" aria-hidden="true">
                  ✦
                </span>
                <span className="cap-title">
                  <b>PIVOT!</b>
                  <span className="cap-sub">IDEA VALIDATION MACHINE</span>
                </span>
                <span className="cap-star" aria-hidden="true">
                  ✦
                </span>
              </div>
              <div className="machine-screws" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <MachineReels
                values={["IDEA", "VIABILITY", "IMPACT"]}
                labels={["IDEA", "VIABILITY", "IMPACT"]}
                glyphs={["idea", "viability", "impact"]}
              />
              <p className="machine-motto" aria-hidden="true">
                YOUR NEXT 36 HOURS ARE A BET. MAKE IT A GOOD ONE.
              </p>
              <div className="machine-deck">
                <label htmlFor="idea" className="deck-lead">
                  <span>YOUR IDEA</span>
                  <span
                    className="ready-lamp"
                    aria-label={canRun ? "Ready" : "Waiting for an idea"}
                  >
                    <i className={canRun ? "active" : ""} />
                  </span>
                </label>
                <textarea
                  id="idea"
                  value={form.idea}
                  onChange={(e) => setForm({ ...form, idea: e.target.value })}
                  placeholder="Describe the rough idea you are betting the weekend on…"
                  rows={2}
                />
                <div className="deck-controls">
                  <label className="deck-url">
                    HACKATHON / EVENT
                    <input
                      id="hackathon"
                      type="url"
                      value={form.hackathonUrl}
                      onChange={(e) =>
                        setForm({ ...form, hackathonUrl: e.target.value })
                      }
                      placeholder="https://your-hackathon.com"
                    />
                  </label>
                  <label className="deck-num">
                    TEAM
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
                  <label className="deck-num">
                    HOURS
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
                </div>
                <details className="more-constraints">
                  <summary>
                    MORE CONSTRAINTS <span aria-hidden="true">+</span>
                  </summary>
                  <div className="constraint-grid">
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
                    {initialMode === "demo" && (
                      <label className="failure-toggle wide">
                        <input
                          type="checkbox"
                          checked={form.simulateFailure}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              simulateFailure: e.target.checked,
                            })
                          }
                        />
                        <span /> SIMULATE RECOVERY
                      </label>
                    )}
                  </div>
                </details>
                <button className="run-button" type="submit" disabled={!canRun}>
                  <span>RUN THE ODDS</span>
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </button>
                <div className="ticket-slot" aria-hidden="true">
                  <span>MENTOR REPORT</span>
                </div>
                {error && <p className="form-error">{error}</p>}
              </div>
            </form>
            <div className="lever-label" aria-hidden="true">
              PULL
              <br />
              TO RUN
              <br />
              THE ODDS
              <svg viewBox="0 0 40 34" className="lever-arrow">
                <path
                  d="M4 6c14 2 24 10 28 22"
                  fill="none"
                  stroke="#151513"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M32 28l1-9M32 28l-9 2"
                  fill="none"
                  stroke="#151513"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
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

          <aside className="poster-right" aria-label="How PIVOT thinks">
            <div className="margin-list right" aria-hidden="true">
              <span>CLEARER IDEAS</span>
              <span>STRONGER BUILDS</span>
              <span>HAPPIER HACKERS</span>
            </div>
            <ol className="process-column">
              {processSteps.map((s) => (
                <li key={s.n}>
                  <span className="process-num" aria-hidden="true">
                    {s.n}
                  </span>
                  <div>
                    <b>
                      {s.title.split("\n").map((line, li) => (
                        <span className="process-line" key={li}>
                          {line}
                        </span>
                      ))}
                    </b>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <div className="poster-rail" aria-label="Demo ideas">
          <span className="rail-lead">OR TRY A DEMO IDEA</span>
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
                <b>
                  {x.label.split("\n").map((line, li) => (
                    <span className="ticket-line" key={li}>
                      {line}
                    </span>
                  ))}
                </b>
                <small>{x.tag}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="poster-flash" aria-hidden="true" />
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
              Map tracks, judging criteria, sponsors, comparable products, and
              real user signals before judging the idea.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>CHASE THE GAPS</h3>
            <p>
              Save Round 1, find what is missing, then run a second search
              shaped by those gaps.
            </p>
          </article>
          <article>
            <span>03</span>
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
            <b>{benchmarkSummary.cases}</b>
            <span>CASES</span>
          </div>
          <div>
            <b>{benchmarkSummary.schemaSuccess}%</b>
            <span>SCHEMA VALID</span>
          </div>
        </div>
        <BenchmarkLedger cases={benchmarkPreview} />
        <details className="benchmark-disclosure">
          <summary>
            VIEW ALL 15 BENCHMARK CASES <span>↓</span>
          </summary>
          <BenchmarkLedger cases={benchmarkCases} />
        </details>
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

function BenchmarkLedger({ cases }: { cases: typeof benchmarkCases }) {
  return (
    <div className="benchmark-table">
      <div className="table-row table-head">
        <span>CASE</span>
        <span>EXPECTED</span>
        <span>MODEL</span>
        <span>PRIMARY WEAKNESS</span>
      </div>
      {cases.map((benchmarkCase) => (
        <div
          className={`table-row ${benchmarkCase.expected !== benchmarkCase.model ? "miss" : ""}`}
          key={benchmarkCase.name}
        >
          <b>{benchmarkCase.name}</b>
          <span>{benchmarkCase.expected}</span>
          <span>{benchmarkCase.model}</span>
          <p>{benchmarkCase.weakness}</p>
        </div>
      ))}
    </div>
  );
}

function MachineReels({
  values,
  labels,
  spinning = false,
  glyphs,
}: {
  values: string[];
  labels: string[];
  spinning?: boolean;
  glyphs?: ("idea" | "viability" | "impact")[];
}) {
  return (
    <div
      className={`machine-reels ${spinning ? "is-spinning" : ""}`}
      aria-label="Idea odds reels"
    >
      {values.map((value, index) => (
        <div className="machine-reel" key={`${labels[index]}-${index}`}>
          <div className="reel-window">
            {glyphs ? (
              <span className="reel-face">
                <ReelIcon name={glyphs[index]} />
                <b className="reel-name">{labels[index]}</b>
              </span>
            ) : (
              <span>{value}</span>
            )}
          </div>
          {!glyphs && <b>{labels[index]}</b>}
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
          <i className={mode === "running" ? "warm" : ""} /> RESEARCH{" "}
          <b>{mode === "running" ? "ACTIVE" : "WAITING"}</b>
        </span>
        <span>
          <i className={mode === "running" ? "warm" : ""} /> MENTOR{" "}
          <b>{mode === "running" ? "ACTIVE" : "WAITING"}</b>
        </span>
        <span>
          <i
            className={mode === "ready" || mode === "running" ? "active" : ""}
          />{" "}
          WORKFLOW{" "}
          <b>
            {mode === "running"
              ? "ACTIVE"
              : mode === "ready"
                ? "READY"
                : "WAITING"}
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
      <div className="brand-lockup">
        <a className="brand" href="#top">
          PIVOT!
        </a>
        <span className="brand-rule" aria-hidden="true" />
        <span className="brand-tag">
          AI MENTOR
          <br />
          FOR HACKATHON
          <br />
          IDEAS
        </span>
      </div>
      <div className="nav-right">
        <div className="header-links">
          <a href="#method">HOW IT WORKS</a>
          <a href="#benchmark">BENCHMARK</a>
          <a href="#about">ABOUT</a>
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
        <a className="try-demo" href="#top">
          TRY A DEMO
        </a>
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
        <span>
          HACKATHON EDGE <b>{report.hackathonEdge}</b>
        </span>
        <span>
          REAL-WORLD EDGE <b>{report.realWorldEdge}</b>
        </span>
        <span>
          CONFIDENCE <b>{report.confidence}%</b>
        </span>
      </div>
      <section>
        <small>THE HARD TRUTH</small>
        <p>{report.hardTruth}</p>
      </section>
      <section className="receipt-pivot">
        <small>BUILD THIS VERSION</small>
        <p>{report.pivot}</p>
      </section>
      <div className="receipt-actions">
        {report.nearMiss && (
          <span>
            <small>THE NEAR MISS</small>
            {report.nearMiss.points} point
            {report.nearMiss.points === 1 ? "" : "s"} from{" "}
            {report.nearMiss.nextVerdict}
          </span>
        )}
        <span>
          <small>NEXT MOVE</small>
          {report.nextValidation[0]}
        </span>
      </div>
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
      <section
        id="about"
        className="infrastructure"
        aria-labelledby="infrastructure-title"
      >
        <div>
          <div className="section-kicker">THE REAL MACHINE ROOM</div>
          <h2 id="infrastructure-title">
            THREE SYSTEMS.
            <br />
            ONE HONEST VERDICT.
          </h2>
        </div>
        <div className="infrastructure-grid">
          <article>
            <span>01</span>
            <h3>LINKUP</h3>
            <p>
              Researches the event, landscape, competitors, and missing
              evidence.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>NEBIUS</h3>
            <p>
              Turns grounded evidence into ten mentor judgments and clear
              advice.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>RENDER</h3>
            <p>
              Runs the multi-step workflow with task-level retries and
              idempotency.
            </p>
          </article>
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
