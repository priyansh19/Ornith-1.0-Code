import type { InspectorState, Step } from '../hooks/useChat'
import './Inspector.css'

export default function Inspector({ state, steps }: { state: InspectorState; steps: Step[] }) {
  return (
    <aside className="inspector">
      <div className="inspector-title">── Inspector ──</div>
      <div className="inspector-body">
        <InspectorContent state={state} steps={steps} />
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="insp-row">
      <span className="insp-label">{label}</span>
      <span className="insp-value">{value}</span>
    </div>
  )
}

function StepFeed({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null
  return (
    <div className="insp-steps">
      {steps.map((s, i) =>
        s.type === 'thought' ? (
          <div key={i} className="insp-step insp-step-thought">
            <span className="insp-step-tag">Step {s.round} · {s.action}</span>
            <p className="insp-step-text">{s.thought}</p>
          </div>
        ) : (
          <div key={i} className="insp-step insp-step-tool">
            <span className="insp-step-tag">Tool · {s.tool}</span>
            <p className="insp-step-input">{s.input}</p>
            <p className="insp-step-result">{s.result}</p>
          </div>
        )
      )}
    </div>
  )
}

function InspectorContent({ state, steps }: { state: InspectorState; steps: Step[] }) {
  if (state.status === 'idle')
    return <p className="insp-dim">Waiting for input…</p>

  if (state.status === 'running')
    return (
      <>
        <Row label="Mode" value={state.mode === 'direct' ? 'Direct → Ollama' : 'Harness → ReAct'} />
        <p className="insp-dim insp-mt">{steps.length === 0 ? 'Thinking…' : `${steps.filter(s => s.type === 'thought').length} steps so far`}</p>
        <StepFeed steps={steps} />
      </>
    )

  if (state.status === 'error')
    return <p className="insp-error">{state.message}</p>

  if (state.mode === 'direct')
    return (
      <>
        <Row label="Mode"  value="Direct → Ollama" />
        <Row label="Model" value={state.model} />
        <Row label="Time"  value={`${state.elapsed.toFixed(1)}s`} />
        <Row label="Chars" value={String(state.chars)} />
      </>
    )

  return (
    <>
      <Row label="Mode"    value="Harness → ReAct" />
      <Row label="Session" value={state.sessionId ? `${state.sessionId.slice(0, 8)}…` : '—'} />
      <Row label="Time"    value={`${state.elapsed.toFixed(1)}s`} />
      <Row label="Steps"   value={String(state.steps?.length ?? 0)} />
      <p className="insp-dim insp-mt">Full trace → localhost:3000</p>
      <StepFeed steps={state.steps ?? []} />
    </>
  )
}
