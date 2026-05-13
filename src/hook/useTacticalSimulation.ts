import { useEffect, useMemo, useRef, useState } from "react";
import type { Action, GameState } from "../core/types";
import { stepGame } from "../core/simulator";
import { chaseAndAttackEnemyPolicy } from "../agents/enemy";
import { getRobotDecision, type RobotTactic } from "../agents/robotTactics";
import {
  createScenarioState,
  SCENARIOS,
  type ScenarioId,
} from "../benchmark/scenarios";
import {
  createBenchmarkTableRows,
  runBenchmarkReport,
  runScenarioBenchmark,
  type BenchmarkMetrics,
} from "../benchmark/runBenchmark";
import type { ReplayLogItem } from "../view/replayLog";

const ANIMATION_DELAY_MS = 350;

export function useTacticalSimulation() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("open-field");
  const [tactic, setTactic] = useState<RobotTactic>("greedy-goal");
  const [state, setState] = useState<GameState>(() =>
    createScenarioState("open-field"),
  );
  const [logs, setLogs] = useState<ReplayLogItem[]>([]);
  const [benchmarkRows, setBenchmarkRows] = useState<BenchmarkMetrics[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>(state);
  const tacticRef = useRef<RobotTactic>(tactic);

  const scenario = useMemo(
    () => SCENARIOS.find((item) => item.id === scenarioId),
    [scenarioId],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    tacticRef.current = tactic;
  }, [tactic]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  function stopAnimation() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsAnimating(false);
  }

  function reset(nextScenarioId?: ScenarioId) {
    stopAnimation();

    const targetScenarioId = nextScenarioId ?? scenarioId;
    const nextState = createScenarioState(targetScenarioId);

    stateRef.current = nextState;
    setState(nextState);
    setLogs([]);
    setBenchmarkRows([]);
  }

  function setScenario(nextScenarioId: ScenarioId) {
    stopAnimation();

    const nextState = createScenarioState(nextScenarioId);

    setScenarioId(nextScenarioId);
    stateRef.current = nextState;
    setState(nextState);
    setLogs([]);
    setBenchmarkRows([]);
  }

  function step() {
    stopAnimation();

    const currentState = stateRef.current;

    if (currentState.result !== "running") return;

    const { nextState, replayLog } = runOneStep(
      currentState,
      tacticRef.current,
    );

    stateRef.current = nextState;
    setState(nextState);
    setLogs((prev) => [...prev, replayLog]);
  }

  function runSimulation() {
    stopAnimation();

    if (stateRef.current.result !== "running") return;

    setIsAnimating(true);

    intervalRef.current = window.setInterval(() => {
      const currentState = stateRef.current;

      if (currentState.result !== "running") {
        stopAnimation();
        return;
      }

      const { nextState, replayLog } = runOneStep(
        currentState,
        tacticRef.current,
      );

      stateRef.current = nextState;
      setState(nextState);
      setLogs((prev) => [...prev, replayLog]);

      if (nextState.result !== "running") {
        stopAnimation();
      }
    }, ANIMATION_DELAY_MS);
  }

  function runBenchmark() {
    stopAnimation();

    const report = runBenchmarkReport({
      trials: 10,
      randomizeEnemies: true,
      seed: Date.now(),
    });

    setBenchmarkRows(report.rows);
  }
  return {
    scenarioId,
    tactic,
    state,
    logs,
    benchmarkRows,
    scenario,
    isAnimating,
    setScenario,
    setTactic,
    step,
    runSimulation,
    reset,
    runBenchmark,
  };
}

function runOneStep(
  currentState: GameState,
  tactic: RobotTactic,
): {
  nextState: GameState;
  replayLog: ReplayLogItem;
} {
  const decision = getRobotDecision(currentState, tactic);

  const { state: nextState, log } = stepGame(
    currentState,
    decision.action,
    chaseAndAttackEnemyPolicy,
  );

  return {
    nextState,
    replayLog: createReplayLogItem({
      turn: log.turn,
      tactic,
      action: decision.action,
      reason: decision.reason,
      state: nextState,
    }),
  };
}

function createReplayLogItem(params: {
  turn: number;
  tactic: RobotTactic;
  action: Action;
  reason: string;
  state: GameState;
}): ReplayLogItem {
  return {
    turn: params.turn,
    tactic: params.tactic,
    action: formatAction(params.action),
    reason: params.reason,
    hp: params.state.robot.hp,
    robotPos: {
      x: params.state.robot.position.x,
      y: params.state.robot.position.y,
    },
    enemyPositions: params.state.enemies.map((enemy) => ({
      id: enemy.id,
      position: {
        x: enemy.position.x,
        y: enemy.position.y,
      },
    })),
  };
}

function formatAction(action: Action): string {
  if (action.type === "move") return `move ${action.direction}`;
  if (action.type === "attack") return `attack ${action.targetId}`;
  if (action.type === "heal") return "heal";
  return "wait";
}
