import { useState } from "react";
import { calculateMetrics, formatMetrics } from "./logic/calculateMetrics";
import {
  GRID_SIZE,
  applyRobotAction,
  getCell,
  makeRobotDecision,
  startWorld,
  type Action,
} from "./logic/game";

type Trace = {
  obs: string;
  note: string;
  action: Action;
  tactic: string;
  reason: string;
  result: string;
};

const firstDecision = makeRobotDecision(startWorld);

const firstTrace: Trace = {
  obs: firstDecision.observation,
  note: firstDecision.stateSummary,
  action: firstDecision.action,
  tactic: firstDecision.tactic,
  reason: firstDecision.reason,
  result: "ready",
};

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ borderTop: "1px solid #ddd", paddingTop: 12 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

function cellStyle(value: string): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    border: "1px solid #ccc",
    display: "grid",
    placeItems: "center",
    fontWeight: value === "." || value === "!" ? 400 : 700,
    color: value === "!" ? "#999" : "inherit",
  };
}

export default function TacticalGameAgentView() {
  const [world, setWorld] = useState(startWorld);
  const [trace, setTrace] = useState<Trace>(firstTrace);
  const [log, setLog] = useState<string[]>([]);

  const metrics = calculateMetrics(world);

  function runStep() {
    const startedAt = performance.now();

    const decision = makeRobotDecision(world);
    const { world: nextWorld, result } = applyRobotAction(
      world,
      decision.action,
    );
    const latency = (performance.now() - startedAt).toFixed(2);

    setWorld(nextWorld);

    setTrace({
      obs: decision.observation,
      note: decision.stateSummary,
      action: decision.action,
      tactic: decision.tactic,
      reason: decision.reason,
      result: `${result} (${latency}ms)`,
    });

    setLog((prev) => [
      `${world.step + 1}. ${decision.tactic} → ${decision.action} | ${result}`,
      ...prev.slice(0, 8),
    ]);
  }

  function reset() {
    setWorld(startWorld);
    setTrace(firstTrace);
    setLog([]);
  }

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: 20 }}>
      <a href="/">← Back</a>

      <h1>Tactical Agent Loop</h1>

      <p>
        Tiny grid-world experiment: robot chooses a tactic, enemy controls a
        threat zone, and each step is evaluated.
      </p>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        <section>
          <h2>World</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_SIZE}, 34px)`,
              gap: 4,
              fontFamily: "monospace",
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
              const pos = {
                r: Math.floor(index / GRID_SIZE),
                c: index % GRID_SIZE,
              };

              const value = getCell(world, pos);

              return (
                <div key={index} style={cellStyle(value)}>
                  {value}
                </div>
              );
            })}
          </div>

          <p style={{ fontFamily: "monospace" }}>
            P robot · G goal · E enemy · H heal · # wall · ! threat zone
          </p>

          <button onClick={runStep} disabled={world.done}>
            step
          </button>

          <button onClick={reset} style={{ marginLeft: 8 }}>
            reset
          </button>

          <h2 style={{ fontSize: 18, marginTop: 24 }}>Metrics</h2>
          <pre>{formatMetrics(metrics)}</pre>
        </section>

        <section style={{ flex: 1, display: "grid", gap: 16 }}>
          <Panel title="Observation Panel">
            <pre>{trace.obs}</pre>
          </Panel>

          <Panel title="State Summary Panel">
            <p>{trace.note}</p>
          </Panel>

          <Panel title="Action Panel">
            <pre>{`tactic: ${trace.tactic}
action: ${trace.action}
reason: ${trace.reason}`}</pre>
          </Panel>

          <Panel title="Evaluation Panel">
            <pre>{trace.result}</pre>
          </Panel>

          <Panel title="History Panel">
            {log.length === 0 ? (
              <p>No steps yet.</p>
            ) : (
              <ol>
                {log.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ol>
            )}
          </Panel>
        </section>
      </div>
    </main>
  );
}
