import type { GameResult, GameState, Position } from "../core/types";
import { runGame } from "../core/simulator";
import { chaseAndAttackEnemyPolicy } from "../agents/enemy";
import {
  getRobotPolicyByTactic,
  ROBOT_TACTICS,
  type RobotTactic,
} from "../agents/robotTactics";
import { SCENARIOS, type Scenario, type ScenarioId } from "./scenarios";

export type BenchmarkMetrics = {
  scenarioId: ScenarioId;
  scenarioName: string;
  tactic: RobotTactic;
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

export type TacticSummaryMetrics = {
  tactic: RobotTactic;
  scenarios: number;
  trials: number;
  wins: number;
  deaths: number;
  timeouts: number;
  winRate: number;
  deathRate: number;
  timeoutRate: number;
  avgTurns: number;
  avgHpRemaining: number;
  score: number;
};

export type ScenarioSummaryMetrics = {
  scenarioId: ScenarioId;
  scenarioName: string;
  tactics: number;
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

export type BenchmarkSummary = {
  tacticSummary: TacticSummaryMetrics[];
  scenarioSummary: ScenarioSummaryMetrics[];
  bestTactic: TacticSummaryMetrics | null;
  hardestScenario: ScenarioSummaryMetrics | null;
};

export type BenchmarkResult = {
  scenario: Scenario;
  metrics: BenchmarkMetrics[];
};

export type BenchmarkReport = {
  results: BenchmarkResult[];
  rows: BenchmarkMetrics[];
  summary: BenchmarkSummary;
};

export type SingleRunResult = {
  result: GameResult;
  turns: number;
  hpRemaining: number;
};

export function runSingleSimulation(
  initialState: GameState,
  tactic: RobotTactic,
): SingleRunResult {
  const { finalState } = runGame({
    initialState,
    robotPolicy: getRobotPolicyByTactic(tactic),
    enemyPolicy: chaseAndAttackEnemyPolicy,
  });

  return {
    result: finalState.result,
    turns: finalState.turn,
    hpRemaining: Math.max(0, finalState.robot.hp),
  };
}

export function runScenarioBenchmark(params: {
  scenario: Scenario;
  tactics?: RobotTactic[];
  trials?: number;
  randomizeEnemies?: boolean;
  seed?: number;
}): BenchmarkResult {
  const tactics = params.tactics ?? ROBOT_TACTICS;
  const trials = params.trials ?? 10;
  const randomizeEnemies = params.randomizeEnemies ?? true;
  const seed = params.seed ?? 0;

  const metrics = tactics.map((tactic) =>
    runTacticBenchmark({
      scenario: params.scenario,
      tactic,
      trials,
      randomizeEnemies,
      seed,
    }),
  );

  return {
    scenario: params.scenario,
    metrics,
  };
}

export function runAllBenchmarks(params?: {
  tactics?: RobotTactic[];
  trials?: number;
  randomizeEnemies?: boolean;
  seed?: number;
}): BenchmarkResult[] {
  const baseSeed = params?.seed ?? 0;

  return SCENARIOS.map((scenario, scenarioIndex) =>
    runScenarioBenchmark({
      scenario,
      tactics: params?.tactics,
      trials: params?.trials ?? 10,
      randomizeEnemies: params?.randomizeEnemies ?? true,
      seed: baseSeed + scenarioIndex * 10000,
    }),
  );
}

export function runBenchmarkReport(params?: {
  tactics?: RobotTactic[];
  trials?: number;
  randomizeEnemies?: boolean;
  seed?: number;
}): BenchmarkReport {
  const results = runAllBenchmarks({
    tactics: params?.tactics,
    trials: params?.trials ?? 10,
    randomizeEnemies: params?.randomizeEnemies ?? true,
    seed: params?.seed ?? Date.now(),
  });

  const rows = createBenchmarkTableRows(results);
  const summary = summarizeBenchmarkRows(rows);

  return {
    results,
    rows,
    summary,
  };
}
function runTacticBenchmark(params: {
  scenario: Scenario;
  tactic: RobotTactic;
  trials: number;
  randomizeEnemies: boolean;
  seed: number;
}): BenchmarkMetrics {
  const runs: SingleRunResult[] = [];

  for (let i = 0; i < params.trials; i += 1) {
    const state = params.scenario.createState();

    runs.push(
      runSingleSimulation(
        params.randomizeEnemies
          ? randomizeEnemyPositions(state, params.seed + i)
          : state,
        params.tactic,
      ),
    );
  }

  const wins = runs.filter((run) => run.result === "win").length;
  const deaths = runs.filter((run) => run.result === "loss").length;
  const timeouts = runs.filter((run) => run.result === "timeout").length;

  return {
    scenarioId: params.scenario.id,
    scenarioName: params.scenario.name,
    tactic: params.tactic,
    trials: params.trials,
    wins,
    deaths,
    timeouts,
    winRate: wins / params.trials,
    deathRate: deaths / params.trials,
    timeoutRate: timeouts / params.trials,
    avgTurns: average(runs.map((run) => run.turns)),
    avgHpRemaining: average(runs.map((run) => run.hpRemaining)),
  };
}

// start

function randomizeEnemyPositions(state: GameState, seed: number): GameState {
  const nextState: GameState = {
    ...state,
    robot: {
      ...state.robot,
      position: { ...state.robot.position },
    },
    goal: { ...state.goal },
    obstacles: state.obstacles.map((obstacle) => ({ ...obstacle })),
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      position: { ...enemy.position },
    })),
  };

  // Open Field는 기존 위치 유지
  if (isOpenFieldState(nextState)) {
    return nextState;
  }

  const rng = createSeededRandom(
    seed + hashString(`${state.gridSize}-${state.goal.x}-${state.goal.y}`),
  );

  nextState.enemies = nextState.enemies.map((enemy, index) => {
    const position = getRandomGoalAreaEnemyPosition(nextState, rng, index);

    return {
      ...enemy,
      position,
    };
  });

  return nextState;
}

function getRandomGoalAreaEnemyPosition(
  state: GameState,
  rng: () => number,
  enemyIndex: number,
): Position {
  const candidates: Position[] = [];

  const goalRadius = Math.max(3, Math.floor(state.gridSize * 0.35));

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const position = { x, y };

      if (!isValidGoalAreaEnemySpawn(position, state, enemyIndex)) continue;

      const goalDistance = getManhattan(position, state.goal);

      if (goalDistance <= goalRadius) {
        candidates.push(position);
      }
    }
  }

  if (candidates.length === 0) {
    return state.enemies[enemyIndex].position;
  }

  candidates.sort((a, b) => {
    const aScore = getGoalAreaSpawnScore(a, state);
    const bScore = getGoalAreaSpawnScore(b, state);

    return aScore - bScore;
  });

  const poolSize = Math.max(1, Math.ceil(candidates.length * 0.7));
  const easierGoalAreaPool = candidates.slice(0, poolSize);

  return easierGoalAreaPool[Math.floor(rng() * easierGoalAreaPool.length)];
}

function isValidGoalAreaEnemySpawn(
  position: Position,
  state: GameState,
  enemyIndex: number,
): boolean {
  if (!isInsideGridLocal(position, state.gridSize)) return false;
  if (samePosition(position, state.robot.position)) return false;
  if (samePosition(position, state.goal)) return false;

  if (state.obstacles.some((obstacle) => samePosition(obstacle, position))) {
    return false;
  }

  const robotDistance = getManhattan(position, state.robot.position);

  // 시작하자마자 죽는 spawn 방지
  if (robotDistance < Math.max(6, Math.floor(state.gridSize * 0.45))) {
    return false;
  }

  const goalDistance = getManhattan(position, state.goal);

  // goal 바로 위에 있으면 너무 불공정함
  if (goalDistance < 2) {
    return false;
  }

  return !state.enemies.some((enemy, index) => {
    if (index >= enemyIndex) return false;
    return samePosition(enemy.position, position);
  });
}

function getGoalAreaSpawnScore(position: Position, state: GameState): number {
  const goalDistance = getManhattan(position, state.goal);
  const robotDistance = getManhattan(position, state.robot.position);
  const obstacleAdjacency = getObstacleAdjacency(position, state);

  // score 낮을수록 선택 우선
  // goal 근처이되, robot과는 충분히 멀고, 약간 장애물 주변이면 좋음
  return goalDistance * 3 - robotDistance * 0.4 - obstacleAdjacency * 1.5;
}

function getObstacleAdjacency(position: Position, state: GameState): number {
  const neighbors: Position[] = [
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
  ];

  return neighbors.filter(
    (neighbor) =>
      isInsideGridLocal(neighbor, state.gridSize) &&
      state.obstacles.some((obstacle) => samePosition(obstacle, neighbor)),
  ).length;
}

function getManhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isOpenFieldState(state: GameState): boolean {
  return state.obstacles.length === 0;
}

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function createSeededRandom(seed: number): () => number {
  let value = seed || 1;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function isInsideGridLocal(position: Position, gridSize: number): boolean {
  return (
    position.x >= 0 &&
    position.x < gridSize &&
    position.y >= 0 &&
    position.y < gridSize
  );
}

//end

export function summarizeBenchmarkRows(
  rows: BenchmarkMetrics[],
): BenchmarkSummary {
  const tacticSummary = summarizeByTactic(rows);
  const scenarioSummary = summarizeByScenario(rows);

  const bestTactic =
    tacticSummary.length > 0
      ? [...tacticSummary].sort((a, b) => b.score - a.score)[0]
      : null;

  const hardestScenario =
    scenarioSummary.length > 0
      ? [...scenarioSummary].sort((a, b) => a.winRate - b.winRate)[0]
      : null;

  return {
    tacticSummary,
    scenarioSummary,
    bestTactic,
    hardestScenario,
  };
}

function summarizeByTactic(rows: BenchmarkMetrics[]): TacticSummaryMetrics[] {
  const grouped = new Map<RobotTactic, BenchmarkMetrics[]>();

  for (const row of rows) {
    grouped.set(row.tactic, [...(grouped.get(row.tactic) ?? []), row]);
  }

  return [...grouped.entries()]
    .map(([tactic, tacticRows]) => {
      const trials = sum(tacticRows.map((row) => row.trials));
      const wins = sum(tacticRows.map((row) => row.wins));
      const deaths = sum(tacticRows.map((row) => row.deaths));
      const timeouts = sum(tacticRows.map((row) => row.timeouts));

      const avgTurns = weightedAverage(
        tacticRows.map((row) => ({
          value: row.avgTurns,
          weight: row.trials,
        })),
      );

      const avgHpRemaining = weightedAverage(
        tacticRows.map((row) => ({
          value: row.avgHpRemaining,
          weight: row.trials,
        })),
      );

      const winRate = safeRate(wins, trials);
      const deathRate = safeRate(deaths, trials);
      const timeoutRate = safeRate(timeouts, trials);

      return {
        tactic,
        scenarios: tacticRows.length,
        trials,
        wins,
        deaths,
        timeouts,
        winRate,
        deathRate,
        timeoutRate,
        avgTurns,
        avgHpRemaining,
        score: calculateTacticScore({
          winRate,
          deathRate,
          timeoutRate,
          avgTurns,
          avgHpRemaining,
        }),
      };
    })
    .sort((a, b) => b.score - a.score);
}

function summarizeByScenario(
  rows: BenchmarkMetrics[],
): ScenarioSummaryMetrics[] {
  const grouped = new Map<ScenarioId, BenchmarkMetrics[]>();

  for (const row of rows) {
    grouped.set(row.scenarioId, [...(grouped.get(row.scenarioId) ?? []), row]);
  }

  return [...grouped.entries()]
    .map(([scenarioId, scenarioRows]) => {
      const trials = sum(scenarioRows.map((row) => row.trials));
      const wins = sum(scenarioRows.map((row) => row.wins));
      const deaths = sum(scenarioRows.map((row) => row.deaths));
      const timeouts = sum(scenarioRows.map((row) => row.timeouts));

      return {
        scenarioId,
        scenarioName: scenarioRows[0]?.scenarioName ?? scenarioId,
        tactics: scenarioRows.length,
        trials,
        wins,
        deaths,
        timeouts,
        winRate: safeRate(wins, trials),
        deathRate: safeRate(deaths, trials),
        timeoutRate: safeRate(timeouts, trials),
        avgTurns: weightedAverage(
          scenarioRows.map((row) => ({
            value: row.avgTurns,
            weight: row.trials,
          })),
        ),
        avgHpRemaining: weightedAverage(
          scenarioRows.map((row) => ({
            value: row.avgHpRemaining,
            weight: row.trials,
          })),
        ),
      };
    })
    .sort((a, b) => a.winRate - b.winRate);
}

function calculateTacticScore(params: {
  winRate: number;
  deathRate: number;
  timeoutRate: number;
  avgTurns: number;
  avgHpRemaining: number;
}): number {
  return (
    params.winRate * 100 -
    params.deathRate * 45 -
    params.timeoutRate * 20 +
    params.avgHpRemaining * 4 -
    params.avgTurns * 0.25
  );
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedAverage(
  values: Array<{ value: number; weight: number }>,
): number {
  const totalWeight = sum(values.map((item) => item.weight));

  if (totalWeight === 0) return 0;

  return (
    values.reduce((total, item) => total + item.value * item.weight, 0) /
    totalWeight
  );
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function safeRate(value: number, total: number): number {
  if (total === 0) return 0;
  return value / total;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export function formatBenchmarkResult(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push(`Scenario: ${result.scenario.name}`);
  lines.push("");

  for (const metric of result.metrics) {
    lines.push(
      [
        metric.tactic.padEnd(18, " "),
        `win ${formatPercent(metric.winRate)}`.padEnd(10, " "),
        `death ${formatPercent(metric.deathRate)}`.padEnd(12, " "),
        `timeout ${formatPercent(metric.timeoutRate)}`.padEnd(14, " "),
        `avg turns ${formatNumber(metric.avgTurns)}`.padEnd(16, " "),
        `avg hp ${formatNumber(metric.avgHpRemaining)}`,
      ].join(""),
    );
  }

  return lines.join("\n");
}

export function formatAllBenchmarkResults(results: BenchmarkResult[]): string {
  return results.map(formatBenchmarkResult).join("\n\n");
}

export function createBenchmarkTableRows(
  results: BenchmarkResult[],
): BenchmarkMetrics[] {
  return results.flatMap((result) => result.metrics);
}

export function runAndPrintBenchmarks(params?: {
  tactics?: RobotTactic[];
  trials?: number;
  randomizeEnemies?: boolean;
  seed?: number;
}): string {
  const results = runAllBenchmarks({
    tactics: params?.tactics,
    trials: params?.trials ?? 10,
    randomizeEnemies: params?.randomizeEnemies ?? true,
    seed: params?.seed ?? Date.now(),
  });

  return formatAllBenchmarkResults(results);
}
