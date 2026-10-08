import Link from "next/link";

export const dynamic = "force-static";

const STEPS = [
  { n: 1, title: "Get to know the team", body: "Build the relationship first. Sit in, listen, learn how the store runs and who does what." },
  { n: 2, title: "Observe and explore the reporting", body: "Watch the work and read the numbers until the patterns are clear, not just the one-offs." },
  { n: 3, title: "Identify the opportunities", body: "Pick the behaviors that will move results. Variable ops first: phone, internet, appointments." },
  { n: 4, title: "Introduce and train to solutions", body: "Teach the skill, give the tools (templates, word tracks, strategy), practice it with them." },
  { n: 5, title: "Verify with management", body: "Confirm with the managers that the behavior changed, and that the numbers followed." },
];

/** Laura's overall game plan: a cycle, not a checklist. Once something is fixed it starts over on the next opportunity. */
export default function BigPicturePage() {
  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">The big picture</div>
          <h1>How the training cycle works</h1>
        </div>
      </div>
      <p className="muted" style={{ maxWidth: 640, marginBottom: 18 }}>
        Every store runs through the same loop. When a behavior is fixed and verified, the loop starts over on the next opportunity. That is how the initiatives on the home page get picked, trained, and retired.
      </p>
      <ol className="cycle">
        {STEPS.map((s) => (
          <li key={s.n} className="cycle-step">
            <span className="cycle-n">{s.n}</span>
            <div>
              <h3>{s.title}</h3>
              <p className="muted small">{s.body}</p>
            </div>
          </li>
        ))}
        <li className="cycle-step loop">
          <span className="cycle-n">↻</span>
          <div>
            <h3>Start over with what's fixed</h3>
            <p className="muted small">Sustain the win, then go back to step 2 on the next pattern in the reporting.</p>
          </div>
        </li>
      </ol>
      <div className="small faint" style={{ marginTop: 18 }}>
        On the initiative cards, the stage bar (Planning, Rolling out, Training, Coaching execution, Measuring, Sustaining) shows where each one is in this loop.
      </div>
      <p style={{ marginTop: 18 }}><Link href="/" className="btn ghost">Back to the hub</Link></p>
    </>
  );
}
