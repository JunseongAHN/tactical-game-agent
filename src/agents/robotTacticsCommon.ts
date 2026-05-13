import type { Direction, GameState, Position } from "../core/types";
import {
  getValidRobotMoves,
  isInThreatBox,
  isInsideGrid,
  isObstacle,
  movePosition,
  samePosition,
} from "../core/grid";
import {
  bfsDistance,
  candidateDistanceToGoal,
  nearestEnemyDistanceToPosition,
  shortestPath,
} from "../core/pathfinding";

export type CandidateMove = {
  direction: Direction;
  position: Position;
};

export function getCandidateMoves(state: GameState): CandidateMove[] {
  return getValidRobotMoves(state).map((direction) => ({
    direction,
    position: movePosition(state.robot.position, direction),
  }));
}

export function chooseBestMove(
  state: GameState,
  scoreFn: (candidate: CandidateMove) => number,
): (CandidateMove & { score: number }) | null {
  const candidates = getCandidateMoves(state);

  if (candidates.length === 0) return null;

  let best: (CandidateMove & { score: number }) | null = null;

  for (const candidate of candidates) {
    const score = normalizeScore(scoreFn(candidate));

    if (!best || score < best.score) {
      best = {
        ...candidate,
        score,
      };
    }
  }

  return best;
}

export function normalizeScore(score: number): number {
  if (Number.isNaN(score)) return Number.POSITIVE_INFINITY;
  return score;
}

export function cappedEnemyDistance(
  position: Position,
  state: GameState,
): number {
  const distance = nearestEnemyDistanceToPosition(position, state);

  if (!Number.isFinite(distance)) {
    return state.gridSize * state.gridSize;
  }

  return distance;
}

export function isThreatened(position: Position, state: GameState): boolean {
  return state.enemies.some(
    (enemy) =>
      enemy.hp > 0 &&
      isInThreatBox(enemy.position, position, enemy.attackRange),
  );
}

export function hasSafePathToGoal(state: GameState): boolean {
  const path = shortestPath(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length < 2) return false;

  const safetyMargin = 1;

  return path.every((cell, index) => {
    const robotTurnsToCell = index;

    const nearestEnemyTurns = Math.min(
      ...state.enemies.map((enemy) =>
        bfsDistance(enemy.position, cell, state, {
          ignoreRobot: true,
          ignoreEnemies: true,
          allowGoal: true,
        }),
      ),
    );

    if (!Number.isFinite(nearestEnemyTurns)) return true;

    return nearestEnemyTurns > robotTurnsToCell + safetyMargin;
  });
}

export function isDirectPathEnemyControlled(state: GameState): boolean {
  const path = shortestPath(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length === 0) return true;

  return path.some((position) => isThreatened(position, state));
}

export function getAdjacentObstacleCount(
  position: Position,
  state: GameState,
): number {
  const neighbors: Position[] = [
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
  ];

  return neighbors.filter(
    (neighbor) =>
      isInsideGrid(neighbor, state.gridSize) && isObstacle(neighbor, state),
  ).length;
}

export function getInteriorDepth(position: Position, state: GameState): number {
  return Math.min(
    position.x,
    position.y,
    state.gridSize - 1 - position.x,
    state.gridSize - 1 - position.y,
  );
}

export function isBoundary(position: Position, state: GameState): boolean {
  return (
    position.x === 0 ||
    position.y === 0 ||
    position.x === state.gridSize - 1 ||
    position.y === state.gridSize - 1
  );
}

export function isDeadEnd(position: Position, state: GameState): boolean {
  const neighbors: Position[] = [
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
  ];

  const openNeighborCount = neighbors.filter((neighbor) => {
    if (!isInsideGrid(neighbor, state.gridSize)) return false;
    if (isObstacle(neighbor, state)) return false;

    const hasEnemy = state.enemies.some(
      (enemy) => enemy.hp > 0 && samePosition(enemy.position, neighbor),
    );

    return !hasEnemy;
  }).length;

  return openNeighborCount <= 1;
}

export function isEnemyControlledChokepoint(
  position: Position,
  state: GameState,
): boolean {
  const adjacentObstacleCount = getAdjacentObstacleCount(position, state);
  const enemyDistance = cappedEnemyDistance(position, state);

  return adjacentObstacleCount >= 2 && enemyDistance <= 3;
}

export function getNearestEnemyPosition(
  position: Position,
  state: GameState,
): Position | null {
  let nearest: Position | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;

    const distance = bfsDistance(enemy.position, position, state, {
      ignoreRobot: true,
      ignoreEnemies: true,
      allowGoal: true,
    });

    const normalizedDistance = Number.isFinite(distance)
      ? distance
      : state.gridSize * state.gridSize;

    if (normalizedDistance < bestDistance) {
      bestDistance = normalizedDistance;
      nearest = enemy.position;
    }
  }

  return nearest;
}

export function getObstacleDetourBonus(
  current: Position,
  next: Position,
  state: GameState,
): number {
  const currentEnemyDistance = cappedEnemyDistance(current, state);
  const nextEnemyDistance = cappedEnemyDistance(next, state);

  if (currentEnemyDistance > 5) return 0;
  if (getAdjacentObstacleCount(next, state) === 0) return 0;
  if (nextEnemyDistance < currentEnemyDistance) return 0;

  return 65;
}

export function getCenterEntryBonus(
  current: Position,
  next: Position,
  state: GameState,
): number {
  const currentDepth = getInteriorDepth(current, state);
  const nextDepth = getInteriorDepth(next, state);

  if (nextDepth <= currentDepth) return 0;

  const currentEnemyDistance = cappedEnemyDistance(current, state);

  if (currentEnemyDistance <= 3) return 0;
  if (currentEnemyDistance <= 5) return 12;

  return 28;
}

export { candidateDistanceToGoal };
