import Board from "./view/board";
import BenchmarkSummary from "./view/benchmarkSummary";
import BenchmarkTable from "./view/benchmarkTable";
import ReplayLog from "./view/replayLog";
import { SCENARIOS, type ScenarioId } from "./benchmark/scenarios";
import { ROBOT_TACTICS, type RobotTactic } from "./agents/robotTactics";
import { useTacticalSimulation } from "./hook/useTacticalSimulation";

export default function App() {
  const sim = useTacticalSimulation();

  return (
    <main
      style={{
        width: 1180,
        margin: "0 auto",
        padding: 24,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1 style={{ marginBottom: 4 }}>Wall-Aware Tactical Agent Benchmark</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Rule-based decision-making agents in obstacle-aware grid environments.
        </p>
      </header>

      <section
        style={{
          marginTop: 24,
          padding: 18,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fafafa",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 8px" }}>Benchmark</h2>

        <p
          style={{
            color: "#555",
            fontSize: 14,
            lineHeight: 1.5,
            margin: "0 0 14px",
          }}
        >
          Run 10 randomized enemy-position trials per tactic across all maps.
        </p>

        <button style={primaryButtonStyle} onClick={sim.runBenchmark}>
          Run Full Benchmark
        </button>

        <div style={{ marginTop: 18 }}>
          <BenchmarkSummary rows={sim.benchmarkRows} />
        </div>
      </section>

      <section
        style={{
          marginTop: 28,
          padding: 18,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <h2 style={{ marginTop: 0, textAlign: "center" }}>Try One Example</h2>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <label>
            <div style={labelStyle}>Scenario</div>
            <select
              value={sim.scenarioId}
              onChange={(event) =>
                sim.setScenario(event.target.value as ScenarioId)
              }
              style={selectStyle}
            >
              {SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div style={labelStyle}>Robot Tactic</div>
            <select
              value={sim.tactic}
              onChange={(event) =>
                sim.setTactic(event.target.value as RobotTactic)
              }
              style={selectStyle}
            >
              {ROBOT_TACTICS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </section>

        {sim.scenario && (
          <section
            style={{
              marginTop: 16,
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: "white",
              textAlign: "center",
            }}
          >
            <strong>{sim.scenario.name}</strong>
            <p style={{ margin: "6px 0", color: "#555" }}>
              {sim.scenario.description}
            </p>
            <p style={{ margin: 0, color: "#555" }}>
              <strong>Purpose:</strong> {sim.scenario.purpose}
            </p>
          </section>
        )}

        <section
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 16,
            minHeight: 38,
          }}
        >
          <button style={buttonStyle} onClick={sim.step}>
            Step
          </button>
          <button style={buttonStyle} onClick={sim.runSimulation}>
            Run Simulation
          </button>
          <button style={buttonStyle} onClick={() => sim.reset()}>
            Reset
          </button>
        </section>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "460px 1fr",
          gap: 24,
          alignItems: "start",
          marginTop: 24,
        }}
      >
        <div style={{ width: 460 }}>
          <Board state={sim.state} />

          <div
            style={{
              marginTop: 12,
              fontFamily: "monospace",
              fontSize: 14,
            }}
          >
            Result: <strong>{sim.state.result}</strong> | Turn: {sim.state.turn}{" "}
            / {sim.state.maxTurns} | HP: {sim.state.robot.hp}
          </div>

          <div
            style={{
              marginTop: 8,
              fontFamily: "monospace",
              fontSize: 13,
              color: "#555",
            }}
          >
            P = robot, G = goal, E = enemy, # = wall, ! = threat, . = empty
          </div>
        </div>

        <div style={{ width: "100%" }}>
          <h2 style={{ marginTop: 0 }}>Replay Log</h2>
          <ReplayLog logs={sim.logs} enemies={sim.state.enemies} />
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Benchmark Details</h2>
        <BenchmarkTable rows={sim.benchmarkRows} />
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  marginBottom: 6,
  textAlign: "center",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
};

const buttonStyle: React.CSSProperties = {
  width: 132,
  height: 38,
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const primaryButtonStyle: React.CSSProperties = {
  width: 260,
  height: 42,
  padding: "8px 12px",
  border: "1px solid #111827",
  borderRadius: 8,
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};
