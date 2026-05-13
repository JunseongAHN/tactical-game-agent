import type {
  Action,
  Direction,
  Enemy,
  GameState,
  Position,
} from "../core/types";
import {
  getManhattanDistance,
  getValidEnemyMoves,
  isInThreatBox,
  movePosition,
} from "../core/grid";
import { bfsDistance } from "../core/pathfinding";

export type EnemyDecision = {
  action: Action;
  reason: string;
};

export function chaseAndAttackEnemyPolicy(
  enemy: Enemy,
  state: GameState,
): Action {
  return getChaseAndAttackEnemyDecision(enemy, state).action;
}

export function getChaseAndAttackEnemyDecision(
  enemy: Enemy,
  state: GameState,
): EnemyDecision {
  if (isInThreatBox(enemy.position, state.robot.position, enemy.attackRange)) {
    return {
      action: {
        type: "attack",
        targetId: state.robot.id,
      },
      reason: "capture robot inside 3x3 threat box",
    };
  }

  const validMoves = getValidEnemyMoves(state, enemy.id);
  const bestMove = chooseBestChaseMove(enemy.position, state, validMoves);

  if (!bestMove) {
    return {
      action: {
        type: "wait",
      },
      reason: "blocked: no valid enemy move",
    };
  }

  return {
    action: {
      type: "move",
      direction: bestMove,
    },
    reason: "chase robot by closing the dominant axis",
  };
}

function chooseBestChaseMove(
  enemyPosition: Position,
  state: GameState,
  validMoves: Direction[],
): Direction | null {
  if (validMoves.length === 0) return null;

  let bestDirection: Direction | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const direction of validMoves) {
    const nextPosition = movePosition(enemyPosition, direction);
    const score = getChaseScore(enemyPosition, nextPosition, state);

    if (score < bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function getChaseScore(
  currentEnemyPosition: Position,
  nextEnemyPosition: Position,
  state: GameState,
): number {
  const robotPosition = state.robot.position;

  const currentDx = Math.abs(currentEnemyPosition.x - robotPosition.x);
  const currentDy = Math.abs(currentEnemyPosition.y - robotPosition.y);

  const nextDx = Math.abs(nextEnemyPosition.x - robotPosition.x);
  const nextDy = Math.abs(nextEnemyPosition.y - robotPosition.y);

  const currentManhattan = getManhattanDistance(
    currentEnemyPosition,
    robotPosition,
  );

  const nextManhattan = getManhattanDistance(nextEnemyPosition, robotPosition);

  const bfsToRobot = bfsDistance(nextEnemyPosition, robotPosition, state, {
    ignoreRobot: true,
    ignoreEnemies: true,
    allowGoal: true,
  });

  const normalizedBfs = Number.isFinite(bfsToRobot)
    ? bfsToRobot
    : state.gridSize * state.gridSize;

  const dominantAxisBonus = getDominantAxisBonus({
    currentDx,
    currentDy,
    nextDx,
    nextDy,
  });

  const progressBonus = currentManhattan - nextManhattan;

  return (
    normalizedBfs * 100 +
    nextManhattan * 10 -
    progressBonus * 5 -
    dominantAxisBonus
  );
}

function getDominantAxisBonus(params: {
  currentDx: number;
  currentDy: number;
  nextDx: number;
  nextDy: number;
}): number {
  const { currentDx, currentDy, nextDx, nextDy } = params;

  if (currentDx > currentDy && nextDx < currentDx) {
    return 20;
  }

  if (currentDy > currentDx && nextDy < currentDy) {
    return 20;
  }

  return 0;
}
