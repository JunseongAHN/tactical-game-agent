import type { BenchmarkMetrics } from "../benchmark/runBenchmark";
import { formatNumber, formatPercent } from "../benchmark/runBenchmark";

type BenchmarkSummaryProps = {
  rows: BenchmarkMetrics[];
};

export default function BenchmarkSummary({ rows }: BenchmarkSummaryProps) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 14,
          border: "1px dashed #d1d5db",
          borderRadius: 10,
          color: "#666",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        No benchmark results yet.
      </div>
    );
  }

  const tacticRows = summarizeByTactic(rows);
  const scenarioRows = summarizeByScenario(rows);
  const best = tacticRows[0];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "190px 1fr",
        gap: 14,
        alignItems: "start",
      }}
    >
      <div
        style={{
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fafafa",
          minHeight: 122,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "#666" }}>Best Tactic</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
          {best?.label ?? "-"}
        </div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>
          Win {formatPercent(best?.winRate ?? 0)}
        </div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
          Death {formatPercent(best?.deathRate ?? 0)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto auto",
          gap: 12,
          minWidth: 0,
        }}
      >
        <SummaryStrip title="By Tactic" rows={tacticRows} />
        <SummaryStrip title="By Map" rows={scenarioRows} />
      </div>
    </div>
  );
}

function SummaryStrip({ title, rows }: { title: string; rows: SummaryRow[] }) {
  return (
    <section
      style={{
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fafafa",
        overflow: "hidden",
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 15, textAlign: "center" }}>
        {title}
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length}, minmax(95px, 1fr))`,
          gap: 8,
        }}
      >
        {rows.map((row) => (
          <SummaryMiniCard
            key={`${title}-${row.label}`}
            label={row.label}
            value={row.winRate}
            detail={`D ${formatPercent(row.deathRate)} · T ${formatNumber(
              row.avgTurns,
            )}`}
          />
        ))}
      </div>
    </section>
  );
}

type SummaryRow = {
  label: string;
  trials: number;
  wins: number;
  deaths: number;
  timeouts: number;
  winRate: number;
  deathRate: number;
  timeoutRate: number;
  avgTurns: number;
  avgHpRemaining: number;
};

function summarizeByTactic(rows: BenchmarkMetrics[]): SummaryRow[] {
  const groups = new Map<string, BenchmarkMetrics[]>();

  for (const row of rows) {
    groups.set(row.tactic, [...(groups.get(row.tactic) ?? []), row]);
  }

  return [...groups.entries()]
    .map(([tactic, group]) => summarizeGroup(group, tactic))
    .sort((a, b) => b.winRate - a.winRate || a.deathRate - b.deathRate);
}

function summarizeByScenario(rows: BenchmarkMetrics[]): SummaryRow[] {
  const groups = new Map<string, BenchmarkMetrics[]>();

  for (const row of rows) {
    groups.set(row.scenarioName, [
      ...(groups.get(row.scenarioName) ?? []),
      row,
    ]);
  }

  return [...groups.entries()]
    .map(([scenarioName, group]) => summarizeGroup(group, scenarioName))
    .sort((a, b) => a.winRate - b.winRate || b.deathRate - a.deathRate);
}

function summarizeGroup(rows: BenchmarkMetrics[], label: string): SummaryRow {
  const trials = sum(rows.map((row) => row.trials));
  const wins = sum(rows.map((row) => row.wins));
  const deaths = sum(rows.map((row) => row.deaths));
  const timeouts = sum(rows.map((row) => row.timeouts));

  return {
    label,
    trials,
    wins,
    deaths,
    timeouts,
    winRate: safeRate(wins, trials),
    deathRate: safeRate(deaths, trials),
    timeoutRate: safeRate(timeouts, trials),
    avgTurns: weightedAverage(
      rows.map((row) => ({
        value: row.avgTurns,
        weight: row.trials,
      })),
    ),
    avgHpRemaining: weightedAverage(
      rows.map((row) => ({
        value: row.avgHpRemaining,
        weight: row.trials,
      })),
    ),
  };
}

function SummaryMiniCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div
      style={{
        padding: 8,
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        background: "white",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 6,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <strong
          style={{
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={label}
        >
          {label}
        </strong>
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>
          {formatPercent(value)}
        </span>
      </div>

      <div
        style={{
          height: 7,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, value * 100))}%`,
            borderRadius: 999,
            background: "#111827",
          }}
        />
      </div>

      <div
        style={{
          fontSize: 10,
          color: "#555",
          marginTop: 5,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={detail}
      >
        {detail}
      </div>
    </div>
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function safeRate(value: number, total: number): number {
  if (total === 0) return 0;
  return value / total;
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  const totalWeight = sum(values.map((item) => item.weight));

  if (totalWeight === 0) return 0;

  return (
    values.reduce((total, item) => total + item.value * item.weight, 0) /
    totalWeight
  );
}
