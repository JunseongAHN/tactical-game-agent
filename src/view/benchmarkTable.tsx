import type { BenchmarkMetrics } from "../benchmark/runBenchmark";
import { formatNumber, formatPercent } from "../benchmark/runBenchmark";

type BenchmarkTableProps = {
  rows: BenchmarkMetrics[];
};

export default function BenchmarkTable({ rows }: BenchmarkTableProps) {
  if (rows.length === 0) {
    return <p style={{ color: "#666" }}>No benchmark results yet.</p>;
  }

  return (
    <div style={{ marginTop: 24, overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: 14,
        }}
      >
        <thead>
          <tr>
            <Th>Scenario</Th>
            <Th>Tactic</Th>
            <Th>Trials</Th>
            <Th>Win</Th>
            <Th>Death</Th>
            <Th>Timeout</Th>
            <Th>Avg Turns</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.scenarioId}-${row.tactic}`}>
              <Td>{row.scenarioName}</Td>
              <Td>{row.tactic}</Td>
              <Td>{row.trials}</Td>
              <Td>{formatPercent(row.winRate)}</Td>
              <Td>{formatPercent(row.deathRate)}</Td>
              <Td>{formatPercent(row.timeoutRate)}</Td>
              <Td>{formatNumber(row.avgTurns)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        border: "1px solid #ddd",
        padding: "8px 10px",
        background: "#f9fafb",
        textAlign: "left",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        border: "1px solid #ddd",
        padding: "8px 10px",
      }}
    >
      {children}
    </td>
  );
}
