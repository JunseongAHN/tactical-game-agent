import type { GameState, Position } from "./types";
import { DIRECTIONS, type Direction } from "./types";

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function addPosition(a: Position, b: Position): Position {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

export function movePosition(
  position: Position,
  direction: Direction,
): Position {
  return addPosition(position, DIRECTIONS[direction]);
}

export function isInsideGrid(position: Position, gridSize: number): boolean {
  return (
    position.x >= 0 &&
    position.x < gridSize &&
    position.y >= 0 &&
    position.y < gridSize
  );
}

export function isObstacle(position: Position, state: GameState): boolean {
  return state.obstacles.some((obstacle) => samePosition(obstacle, position));
}

export function isEnemyPosition(position: Position, state: GameState): boolean {
  return state.enemies.some(
    (enemy) => enemy.hp > 0 && samePosition(enemy.position, position),
  );
}

export function isRobotPosition(position: Position, state: GameState): boolean {
  return samePosition(state.robot.position, position);
}

export function isGoalPosition(position: Position, state: GameState): boolean {
  return samePosition(state.goal, position);
}

export function isBlockedForRobot(
  position: Position,
  state: GameState,
): boolean {
  if (!isInsideGrid(position, state.gridSize)) return true;
  if (isObstacle(position, state)) return true;
  if (isEnemyPosition(position, state)) return true;
  return false;
}

export function isBlockedForEnemy(
  position: Position,
  state: GameState,
  selfEnemyId?: string,
): boolean {
  if (!isInsideGrid(position, state.gridSize)) return true;
  if (isObstacle(position, state)) return true;
  if (isRobotPosition(position, state)) return true;
  if (isGoalPosition(position, state)) return true;

  return state.enemies.some(
    (enemy) =>
      enemy.hp > 0 &&
      enemy.id !== selfEnemyId &&
      samePosition(enemy.position, position),
  );
}

export function getManhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getChebyshevDistance(a: Position, b: Position): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function isInRange(
  from: Position,
  to: Position,
  range: number,
): boolean {
  return getManhattanDistance(from, to) <= range;
}

export function isInThreatBox(
  from: Position,
  to: Position,
  range = 1,
): boolean {
  return getChebyshevDistance(from, to) <= range;
}

export function getValidRobotMoves(state: GameState): Direction[] {
  return Object.keys(DIRECTIONS).filter((direction) => {
    const next = movePosition(state.robot.position, direction as Direction);
    return !isBlockedForRobot(next, state);
  }) as Direction[];
}

export function getValidEnemyMoves(
  state: GameState,
  enemyId: string,
): Direction[] {
  const enemy = state.enemies.find((e) => e.id === enemyId);

  if (!enemy) return [];

  return Object.keys(DIRECTIONS).filter((direction) => {
    const next = movePosition(enemy.position, direction as Direction);
    return !isBlockedForEnemy(next, state, enemyId);
  }) as Direction[];
}
