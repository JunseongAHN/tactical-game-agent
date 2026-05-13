import type { Action, Enemy, GameResult, GameState, StepLog } from "./types";
import {
  isBlockedForEnemy,
  isBlockedForRobot,
  isInThreatBox,
  movePosition,
  samePosition,
} from "./grid";

export function createInitialState(params: {
  gridSize: number;
  robotPosition: { x: number; y: number };
  goal: { x: number; y: number };
  enemies: Array<{ id: string; x: number; y: number; hp?: number }>;
  obstacles: Array<{ x: number; y: number }>;
  robotHp?: number;
  maxTurns?: number;
}): GameState {
  return {
    gridSize: params.gridSize,
    robot: {
      id: "robot",
      position: params.robotPosition,
      hp: params.robotHp ?? 5,
      maxHp: params.robotHp ?? 5,
      attackDamage: 0,
      attackRange: 1,
      healAmount: 1,
    },
    enemies: params.enemies.map((enemy) => ({
      id: enemy.id,
      position: { x: enemy.x, y: enemy.y },
      hp: enemy.hp ?? 1,
      attackDamage: 999,
      attackRange: 1,
    })),
    obstacles: params.obstacles,
    goal: params.goal,
    turn: 0,
    maxTurns: params.maxTurns ?? 50,
    result: "running",
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    robot: {
      ...state.robot,
      position: { ...state.robot.position },
    },
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      position: { ...enemy.position },
    })),
    obstacles: state.obstacles.map((obstacle) => ({ ...obstacle })),
    goal: { ...state.goal },
  };
}

export function evaluateResult(state: GameState): GameResult {
  if (state.robot.hp <= 0) return "loss";
  if (samePosition(state.robot.position, state.goal)) return "win";
  if (state.turn >= state.maxTurns) return "timeout";
  return "running";
}

export function applyRobotAction(state: GameState, action: Action): GameState {
  const nextState = cloneState(state);

  if (nextState.result !== "running") return nextState;

  if (action.type === "move") {
    const nextPosition = movePosition(
      nextState.robot.position,
      action.direction,
    );

    if (!isBlockedForRobot(nextPosition, nextState)) {
      nextState.robot.position = nextPosition;
    }

    return nextState;
  }

  if (action.type === "heal") {
    nextState.robot.hp = Math.min(
      nextState.robot.maxHp,
      nextState.robot.hp + nextState.robot.healAmount,
    );

    return nextState;
  }

  return nextState;
}

export function applyEnemyAction(
  state: GameState,
  enemyId: string,
  action: Action,
): GameState {
  const nextState = cloneState(state);
  const enemy = nextState.enemies.find((e) => e.id === enemyId);

  if (!enemy || enemy.hp <= 0 || nextState.result !== "running") {
    return nextState;
  }

  if (action.type === "attack") {
    if (
      action.targetId === nextState.robot.id &&
      isInThreatBox(enemy.position, nextState.robot.position, enemy.attackRange)
    ) {
      enemy.position = { ...nextState.robot.position };
      nextState.robot.hp = 0;
    }

    return nextState;
  }

  if (action.type === "move") {
    const nextPosition = movePosition(enemy.position, action.direction);

    if (!isBlockedForEnemy(nextPosition, nextState, enemy.id)) {
      enemy.position = nextPosition;
    }

    return nextState;
  }

  return nextState;
}

export function stepGame(
  state: GameState,
  robotAction: Action,
  enemyPolicy: (enemy: Enemy, state: GameState) => Action,
): {
  state: GameState;
  log: StepLog;
} {
  let nextState = cloneState(state);

  if (nextState.result !== "running") {
    return {
      state: nextState,
      log: {
        turn: nextState.turn,
        robotAction,
        enemyActions: [],
        result: nextState.result,
        robotHp: nextState.robot.hp,
        robotPosition: nextState.robot.position,
      },
    };
  }

  nextState = applyRobotAction(nextState, robotAction);
  nextState.result = evaluateResult(nextState);

  const enemyActions: StepLog["enemyActions"] = [];

  if (nextState.result === "running") {
    const enemiesSnapshot = [...nextState.enemies];

    for (const enemy of enemiesSnapshot) {
      const liveEnemy = nextState.enemies.find((e) => e.id === enemy.id);

      if (!liveEnemy || liveEnemy.hp <= 0) continue;

      const enemyAction = enemyPolicy(liveEnemy, nextState);

      enemyActions.push({
        enemyId: liveEnemy.id,
        action: enemyAction,
      });

      nextState = applyEnemyAction(nextState, liveEnemy.id, enemyAction);
      nextState.result = evaluateResult(nextState);

      if (nextState.result !== "running") break;
    }
  }

  nextState.turn += 1;
  nextState.result = evaluateResult(nextState);

  return {
    state: nextState,
    log: {
      turn: nextState.turn,
      robotAction,
      enemyActions,
      result: nextState.result,
      robotHp: nextState.robot.hp,
      robotPosition: nextState.robot.position,
    },
  };
}

export function runGame(params: {
  initialState: GameState;
  robotPolicy: (state: GameState) => Action;
  enemyPolicy: (enemy: Enemy, state: GameState) => Action;
}): {
  finalState: GameState;
  logs: StepLog[];
} {
  let state = cloneState(params.initialState);
  const logs: StepLog[] = [];

  while (state.result === "running") {
    const robotAction = params.robotPolicy(state);

    const step = stepGame(state, robotAction, params.enemyPolicy);

    state = step.state;
    logs.push(step.log);
  }

  return {
    finalState: state,
    logs,
  };
}
