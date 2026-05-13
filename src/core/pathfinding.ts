import type { GameState, Position } from "./types";
import { DIRECTIONS, type Direction } from "./types";
import { isInsideGrid, isObstacle, samePosition, addPosition } from "./grid";

function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}

function parsePositionKey(key: string): Position {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}

export function isBlocked(
  position: Position,
  state: GameState,
  options?: {
    ignoreRobot?: boolean;
    ignoreEnemies?: boolean;
    allowGoal?: boolean;
  },
): boolean {
  if (!isInsideGrid(position, state.gridSize)) return true;
  if (isObstacle(position, state)) return true;

  if (!options?.ignoreRobot && samePosition(position, state.robot.position)) {
    return true;
  }

  if (!options?.ignoreEnemies) {
    const hasEnemy = state.enemies.some(
      (enemy) => enemy.hp > 0 && samePosition(enemy.position, position),
    );

    if (hasEnemy) return true;
  }

  if (options?.allowGoal && samePosition(position, state.goal)) {
    return false;
  }

  return false;
}

export function getNeighbors(
  position: Position,
  state: GameState,
  options?: {
    ignoreRobot?: boolean;
    ignoreEnemies?: boolean;
    allowGoal?: boolean;
  },
): Position[] {
  return Object.values(DIRECTIONS)
    .map((delta) => addPosition(position, delta))
    .filter((next) => !isBlocked(next, state, options));
}

export function bfsDistance(
  from: Position,
  to: Position,
  state: GameState,
  options?: {
    ignoreRobot?: boolean;
    ignoreEnemies?: boolean;
    allowGoal?: boolean;
  },
): number {
  if (samePosition(from, to)) return 0;

  const visited = new Set<string>();
  const queue: Array<{ position: Position; distance: number }> = [
    { position: from, distance: 0 },
  ];

  visited.add(positionKey(from));

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) break;

    for (const neighbor of getNeighbors(current.position, state, options)) {
      const key = positionKey(neighbor);

      if (visited.has(key)) continue;

      if (samePosition(neighbor, to)) {
        return current.distance + 1;
      }

      visited.add(key);
      queue.push({
        position: neighbor,
        distance: current.distance + 1,
      });
    }
  }

  return Number.POSITIVE_INFINITY;
}

export function shortestPath(
  from: Position,
  to: Position,
  state: GameState,
  options?: {
    ignoreRobot?: boolean;
    ignoreEnemies?: boolean;
    allowGoal?: boolean;
  },
): Position[] {
  if (samePosition(from, to)) return [from];

  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue: Position[] = [from];

  visited.add(positionKey(from));

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) break;

    for (const neighbor of getNeighbors(current, state, options)) {
      const neighborKey = positionKey(neighbor);

      if (visited.has(neighborKey)) continue;

      visited.add(neighborKey);
      parent.set(neighborKey, positionKey(current));

      if (samePosition(neighbor, to)) {
        return reconstructPath(from, to, parent);
      }

      queue.push(neighbor);
    }
  }

  return [];
}

function reconstructPath(
  from: Position,
  to: Position,
  parent: Map<string, string>,
): Position[] {
  const path: Position[] = [];
  let currentKey = positionKey(to);
  const fromKey = positionKey(from);

  while (true) {
    path.push(parsePositionKey(currentKey));

    if (currentKey === fromKey) break;

    const parentKey = parent.get(currentKey);

    if (!parentKey) return [];

    currentKey = parentKey;
  }

  return path.reverse();
}

export function getFirstStepDirection(
  from: Position,
  to: Position,
): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === -1) return "up";
  if (dx === 0 && dy === 1) return "down";
  if (dx === -1 && dy === 0) return "left";
  if (dx === 1 && dy === 0) return "right";

  return null;
}

export function robotDistanceToGoal(state: GameState): number {
  return bfsDistance(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });
}

export function enemyDistanceToRobot(
  enemyPosition: Position,
  state: GameState,
): number {
  return bfsDistance(enemyPosition, state.robot.position, state, {
    ignoreRobot: true,
    ignoreEnemies: true,
  });
}

export function nearestEnemyDistanceToPosition(
  position: Position,
  state: GameState,
): number {
  if (state.enemies.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(
    ...state.enemies.map((enemy) =>
      bfsDistance(enemy.position, position, state, {
        ignoreRobot: true,
        ignoreEnemies: true,
      }),
    ),
  );
}

export function candidateDistanceToGoal(
  candidate: Position,
  state: GameState,
): number {
  return bfsDistance(candidate, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });
}

export function getShortestPathDirectionToGoal(
  state: GameState,
): Direction | null {
  const path = shortestPath(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length < 2) return null;

  return getFirstStepDirection(path[0], path[1]);
}

export function getShortestPathDirectionToRobot(
  enemyPosition: Position,
  state: GameState,
): Direction | null {
  const path = shortestPath(enemyPosition, state.robot.position, state, {
    ignoreRobot: true,
    ignoreEnemies: true,
  });

  if (path.length < 2) return null;

  return getFirstStepDirection(path[0], path[1]);
}
