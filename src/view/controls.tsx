import type { CSSProperties } from "react";
import {
  SCENARIOS,
  type Scenario,
  type ScenarioId,
} from "../benchmark/scenarios";
import { ROBOT_TACTICS, type RobotTactic } from "../agents/robotTactics";

type ControlsProps = {
  scenarioId: ScenarioId;
  tactic: RobotTactic;
  scenario?: Scenario;
  onScenarioChange: (scenarioId: ScenarioId) => void;
  onTacticChange: (tactic: RobotTactic) => void;
  onStep: () => void;
  onRunSimulation: () => void;
  onReset: () => void;
  onRunBenchmark: () => void;
};

export default function Controls({
  scenarioId,
  tactic,
  scenario,
  onScenarioChange,
  onTacticChange,
  onStep,
  onRunSimulation,
  onReset,
  onRunBenchmark,
}: ControlsProps) {
  return (
    <>
      <section style={selectSectionStyle}>
        <label>
          <div style={labelStyle}>Scenario</div>
          <select
            value={scenarioId}
            onChange={(event) =>
              onScenarioChange(event.target.value as ScenarioId)
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
            value={tactic}
            onChange={(event) =>
              onTacticChange(event.target.value as RobotTactic)
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

      {scenario && (
        <section style={scenarioBoxStyle}>
          <strong>{scenario.name}</strong>
          <p style={{ margin: "6px 0", color: "#555" }}>
            {scenario.description}
          </p>
          <p style={{ margin: 0, color: "#555" }}>
            <strong>Purpose:</strong> {scenario.purpose}
          </p>
        </section>
      )}

      <section style={buttonSectionStyle}>
        <button type="button" style={buttonStyle} onClick={onStep}>
          Step
        </button>
        <button type="button" style={buttonStyle} onClick={onRunSimulation}>
          Run Simulation
        </button>
        <button type="button" style={buttonStyle} onClick={() => onReset()}>
          Reset
        </button>
        <button type="button" style={buttonStyle} onClick={onRunBenchmark}>
          Run Benchmark
        </button>
      </section>
    </>
  );
}

const selectSectionStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginTop: 24,
};

const labelStyle: CSSProperties = {
  fontWeight: 700,
  marginBottom: 6,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
};

const scenarioBoxStyle: CSSProperties = {
  marginTop: 16,
  padding: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#fafafa",
  minHeight: 84,
};

const buttonSectionStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 24,
  minHeight: 38,
  alignItems: "flex-start",
};

const buttonStyle: CSSProperties = {
  width: 132,
  height: 38,
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
};
