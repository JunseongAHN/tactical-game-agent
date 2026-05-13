import type { GameState, Position } from "../core/types";
import type { RobotDecision } from "./robotTactics";
import { bfsDistance, shortestPath } from "../core/pathfinding";
import {
  cappedEnemyDistance,
  candidateDistanceToGoal,
  chooseBestMove,
  getAdjacentObstacleCount,
  getInteriorDepth,
  getObstacleDetourBonus,
  hasSafePathToGoal,
  isBoundary,
  isDeadEnd,
  isDirectPathEnemyControlled,
  isThreatened,
} from "./robotTacticsCommon";

type Phase =
  | "escape"
  | "commit-goal"
  | "middle-control"
  | "wall-route"
  | "safe-progress";

type AIContext = {
  phase: Phase;
  currentGoalDistance: number;
  currentEnemyDistance: number;
  directPathControlled: boolean;
  safePathToGoal: boolean;
  enemyCount: number;
  mapDifficulty: number;
};

export function aiPureDecision(state: GameState): RobotDecision {
  const context = analyzeState(state);

  const best = chooseBestMove(state, (candidate) =>
    scoreAIMove(candidate.position, state, context),
  );

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "ai-adaptive",
    reason: best
      ? getAIReason(best.position, state, context)
      : "wait: blocked with no valid AI move",
    score: best?.score,
  };
}

function analyzeState(state: GameState): AIContext {
  const current = state.robot.position;

  const currentGoalDistance = candidateDistanceToGoal(current, state);
  const currentEnemyDistance = cappedEnemyDistance(current, state);
  const directPathControlled = isDirectPathEnemyControlled(state);
  const safePathToGoal = hasSafePathToGoal(state);
  const enemyCount = state.enemies.filter((enemy) => enemy.hp > 0).length;

  const mapDifficulty = estimateMapDifficulty({
    state,
    currentGoalDistance,
    currentEnemyDistance,
    directPathControlled,
    safePathToGoal,
    enemyCount,
  });

  return {
    phase: choosePhase({
      state,
      currentEnemyDistance,
      directPathControlled,
      safePathToGoal,
      enemyCount,
      mapDifficulty,
    }),
    currentGoalDistance,
    currentEnemyDistance,
    directPathControlled,
    safePathToGoal,
    enemyCount,
    mapDifficulty,
  };
}

function choosePhase(params: {
  state: GameState;
  currentEnemyDistance: number;
  directPathControlled: boolean;
  safePathToGoal: boolean;
  enemyCount: number;
  mapDifficulty: number;
}): Phase {
  const { state, currentEnemyDistance, directPathControlled, safePathToGoal } =
    params;

  if (isThreatened(state.robot.position, state) || currentEnemyDistance <= 2) {
    return "escape";
  }

  if (safePathToGoal) {
    return "commit-goal";
  }

  if (directPathControlled && currentEnemyDistance <= 6) {
    return "wall-route";
  }

  if (isBoundary(state.robot.position, state) && params.enemyCount >= 2) {
    return "middle-control";
  }

  if (params.mapDifficulty >= 55) {
    return "wall-route";
  }

  return "safe-progress";
}

function scoreAIMove(
  next: Position,
  state: GameState,
  context: AIContext,
): number {
  const current = state.robot.position;

  const nextGoalDistance = candidateDistanceToGoal(next, state);
  const progress = context.currentGoalDistance - nextGoalDistance;

  const nextEnemyDistance = cappedEnemyDistance(next, state);
  const enemyDistanceGain = nextEnemyDistance - context.currentEnemyDistance;

  const currentDepth = getInteriorDepth(current, state);
  const nextDepth = getInteriorDepth(next, state);
  const interiorGain = nextDepth - currentDepth;

  const threatPenalty = isThreatened(next, state) ? 1000 : 0;
  const deadEndPenalty = isDeadEnd(next, state) ? 300 : 0;
  const boundaryPenalty = isBoundary(next, state)
    ? getBoundaryPenalty(context)
    : 0;

  const adjacentObstacleCount = getAdjacentObstacleCount(next, state);
  const obstacleCoverBonus =
    adjacentObstacleCount * getObstacleCoverWeight(context);

  const detourBonus = getObstacleDetourBonus(current, next, state);
  const pathInterceptPenalty = getPathInterceptPenalty(next, state);

  const goalWeight = getGoalWeight(context);
  const enemyGainWeight = getEnemyGainWeight(context);
  const interiorWeight = getInteriorWeight(context);

  const backwardPenalty = progress < 0 ? getBackwardPenalty(context) : 0;
  const noProgressPenalty = progress === 0 ? getNoProgressPenalty(context) : 0;

  const enemyGainBonus = Math.max(0, enemyDistanceGain) * enemyGainWeight;
  const enemyCloserPenalty =
    enemyDistanceGain < 0 && context.currentEnemyDistance <= 6
      ? getEnemyCloserPenalty(context)
      : 0;

  const interiorBonus = Math.max(0, interiorGain) * interiorWeight;
  const commitPathBonus = getCommitPathBonus(next, state, context);

  return (
    nextGoalDistance * goalWeight +
    threatPenalty +
    deadEndPenalty +
    boundaryPenalty +
    backwardPenalty +
    noProgressPenalty +
    enemyCloserPenalty +
    pathInterceptPenalty -
    enemyGainBonus -
    interiorBonus -
    obstacleCoverBonus -
    detourBonus -
    commitPathBonus
  );
}

function getGoalWeight(context: AIContext): number {
  if (context.phase === "commit-goal") return 7.5;
  if (context.phase === "escape") return 2.0;
  if (context.phase === "wall-route") return 3.0;
  if (context.phase === "middle-control") return 2.7;
  return 4.0;
}

function getEnemyGainWeight(context: AIContext): number {
  if (context.phase === "escape") return 70;
  if (context.phase === "wall-route") return 38;
  if (context.phase === "middle-control") return 20;
  if (context.phase === "commit-goal") return 8;
  return 18;
}

function getInteriorWeight(context: AIContext): number {
  if (context.phase === "middle-control") return 85;
  if (context.phase === "wall-route") return 38;
  if (context.phase === "escape") return 20;
  return 25;
}

function getObstacleCoverWeight(context: AIContext): number {
  if (context.phase === "wall-route") return 14;
  if (context.phase === "escape") return 10;
  if (context.phase === "middle-control") return 6;
  return 4;
}

function getBoundaryPenalty(context: AIContext): number {
  if (context.phase === "middle-control") return 120;
  if (context.phase === "escape") return 80;
  if (context.enemyCount >= 2) return 75;
  return 35;
}

function getBackwardPenalty(context: AIContext): number {
  if (context.phase === "escape") return 15;
  if (context.phase === "wall-route") return 30;
  if (context.phase === "middle-control") return 25;
  if (context.phase === "commit-goal") return 140;
  return 80;
}

function getNoProgressPenalty(context: AIContext): number {
  if (context.phase === "escape") return 8;
  if (context.phase === "wall-route") return 12;
  if (context.phase === "middle-control") return 12;
  if (context.phase === "commit-goal") return 80;
  return 28;
}

function getEnemyCloserPenalty(context: AIContext): number {
  if (context.phase === "escape") return 130;
  if (context.phase === "wall-route") return 75;
  if (context.phase === "middle-control") return 60;
  if (context.phase === "commit-goal") return 20;
  return 45;
}

function getCommitPathBonus(
  next: Position,
  state: GameState,
  context: AIContext,
): number {
  if (!context.safePathToGoal) return 0;

  const path = shortestPath(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length < 2) return 0;

  const nextPathCell = path[1];

  if (samePosition(next, nextPathCell)) {
    return 120;
  }

  return 0;
}

function getPathInterceptPenalty(next: Position, state: GameState): number {
  const path = shortestPath(next, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length === 0) return 200;

  let penalty = 0;

  for (let i = 0; i < Math.min(path.length, 6); i += 1) {
    const cell = path[i];
    const robotTurns = i;

    const enemyTurns = getNearestEnemyTurnsToCell(cell, state);

    if (enemyTurns <= robotTurns) {
      penalty += 90;
    } else if (enemyTurns === robotTurns + 1) {
      penalty += 35;
    }
  }

  return penalty;
}

function getNearestEnemyTurnsToCell(cell: Position, state: GameState): number {
  let best = Number.POSITIVE_INFINITY;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;

    const distance = bfsDistance(enemy.position, cell, state, {
      ignoreRobot: true,
      ignoreEnemies: true,
      allowGoal: true,
    });

    if (distance < best) {
      best = distance;
    }
  }

  return best;
}

function estimateMapDifficulty(params: {
  state: GameState;
  currentGoalDistance: number;
  currentEnemyDistance: number;
  directPathControlled: boolean;
  safePathToGoal: boolean;
  enemyCount: number;
}): number {
  let difficulty = 0;

  if (!params.safePathToGoal) difficulty += 30;
  if (params.directPathControlled) difficulty += 25;
  if (params.currentEnemyDistance <= 3) difficulty += 30;
  else if (params.currentEnemyDistance <= 5) difficulty += 18;
  if (params.enemyCount >= 2) difficulty += 18;
  if (isBoundary(params.state.robot.position, params.state)) difficulty += 10;
  if (
    getAdjacentObstacleCount(params.state.robot.position, params.state) === 0
  ) {
    difficulty += 5;
  }

  return difficulty;
}

function getAIReason(
  next: Position,
  state: GameState,
  context: AIContext,
): string {
  if (isThreatened(next, state)) {
    return "move: AI rejects capture zone and chooses least risky option";
  }

  if (context.phase === "escape") {
    return "move: AI prioritizes survival under immediate enemy pressure";
  }

  if (context.phase === "commit-goal") {
    return "move: AI commits to goal because interception risk is low";
  }

  if (context.phase === "middle-control") {
    return "move: AI moves inward to avoid multi-enemy boundary trap";
  }

  if (context.phase === "wall-route") {
    return "move: AI uses obstacle-aware route to reduce interception risk";
  }

  return "move: AI balances goal progress and enemy interception risk";
}

function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}
