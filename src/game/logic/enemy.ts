import type { Action, Enemy, GameState } from "../core/types";
import { getValidEnemyMoves, isInRange, movePosition } from "../core/grid";
import {
  bfsDistance,
  getShortestPathDirectionToRobot,
} from "../core/pathfinding";

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
  if (isInRange(enemy.position, state.robot.position, enemy.attackRange)) {
    return {
      action: {
        type: "attack",
        targetId: state.robot.id,
      },
      reason: "attack robot in range",
    };
  }

  const direction = getShortestPathDirectionToRobot(enemy.position, state);

  if (direction) {
    const nextPosition = movePosition(enemy.position, direction);
    const validMoves = getValidEnemyMoves(state, enemy.id);

    if (validMoves.includes(direction)) {
      return {
        action: {
          type: "move",
          direction,
        },
        reason: "chase robot using shortest path",
      };
    }

    const fallbackDirection = chooseBestFallbackMove(enemy, state, validMoves);

    if (fallbackDirection) {
      return {
        action: {
          type: "move",
          direction: fallbackDirection,
        },
        reason: "shortest path blocked, choose closest valid chase move",
      };
    }

    return {
      action: {
        type: "wait",
      },
      reason: "blocked: no valid enemy move",
    };
  }

  const validMoves = getValidEnemyMoves(state, enemy.id);
  const fallbackDirection = chooseBestFallbackMove(enemy, state, validMoves);

  if (fallbackDirection) {
    return {
      action: {
        type: "move",
        direction: fallbackDirection,
      },
      reason: "no direct path, move toward closest reachable position",
    };
  }

  return {
    action: {
      type: "wait",
    },
    reason: "blocked: no valid enemy move",
  };
}

function chooseBestFallbackMove(
  enemy: Enemy,
  state: GameState,
  validMoves: Array<"up" | "down" | "left" | "right">,
): "up" | "down" | "left" | "right" | null {
  if (validMoves.length === 0) return null;

  let bestMove: "up" | "down" | "left" | "right" | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const direction of validMoves) {
    const nextPosition = movePosition(enemy.position, direction);

    const distanceToRobot = bfsDistance(
      nextPosition,
      state.robot.position,
      state,
      {
        ignoreRobot: true,
        ignoreEnemies: true,
      },
    );

    if (distanceToRobot < bestScore) {
      bestScore = distanceToRobot;
      bestMove = direction;
    }
  }

  return bestMove;
}
