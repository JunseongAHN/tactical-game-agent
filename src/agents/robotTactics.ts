import type { Action, Direction, GameState, Position } from "../core/types";
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

export type RobotTactic =
  | "greedy-goal"
  | "distance-aware"
  | "threat-aware"
  | "wall-aware"
  | "composite";

export type RobotDecision = {
  action: Action;
  tactic: RobotTactic;
  reason: string;
  score?: number;
};

type CandidateMove = {
  direction: Direction;
  position: Position;
};

export const ROBOT_TACTICS: RobotTactic[] = [
  "greedy-goal",
  "distance-aware",
  "threat-aware",
  "wall-aware",
  "composite",
];

export function robotPolicy(state: GameState, tactic: RobotTactic): Action {
  return getRobotDecision(state, tactic).action;
}

export function getRobotDecision(
  state: GameState,
  tactic: RobotTactic,
): RobotDecision {
  if (tactic === "greedy-goal") return greedyGoalDecision(state);
  if (tactic === "distance-aware") return distanceAwareDecision(state);
  if (tactic === "threat-aware") return threatAwareDecision(state);
  if (tactic === "wall-aware") return wallAwareDecision(state);

  return compositeDecision(state);
}

function greedyGoalDecision(state: GameState): RobotDecision {
  const best = chooseBestMove(state, (candidate) =>
    candidateDistanceToGoal(candidate.position, state),
  );

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "greedy-goal",
    reason: best
      ? "move: greedily reduce distance to goal"
      : "wait: blocked with no valid move",
    score: best?.score,
  };
}

function distanceAwareDecision(state: GameState): RobotDecision {
  const best = chooseBestMove(state, (candidate) => {
    const goalDistance = candidateDistanceToGoal(candidate.position, state);
    const enemyDistance = cappedEnemyDistance(candidate.position, state);
    const threatPenalty = isThreatened(candidate.position, state) ? 90 : 0;

    return goalDistance * 2.2 - enemyDistance * 0.7 + threatPenalty;
  });

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "distance-aware",
    reason: best
      ? "move: balance goal progress and enemy distance"
      : "wait: blocked with no valid move",
    score: best?.score,
  };
}

function threatAwareDecision(state: GameState): RobotDecision {
  const best = chooseBestMove(state, (candidate) => {
    const currentGoalDistance = candidateDistanceToGoal(
      state.robot.position,
      state,
    );
    const nextGoalDistance = candidateDistanceToGoal(candidate.position, state);
    const progress = currentGoalDistance - nextGoalDistance;

    const threatPenalty = isThreatened(candidate.position, state) ? 260 : 0;
    const backwardPenalty = progress < 0 ? 50 : 0;
    const noProgressPenalty = progress === 0 ? 20 : 0;

    return (
      nextGoalDistance * 2.5 +
      threatPenalty +
      backwardPenalty +
      noProgressPenalty
    );
  });

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "threat-aware",
    reason: best
      ? "move: avoid entering enemy threat zone"
      : "wait: blocked with no valid move",
    score: best?.score,
  };
}

function wallAwareDecision(state: GameState): RobotDecision {
  const best = chooseBestMove(state, (candidate) =>
    getWallAwareScore(candidate.position, state),
  );

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "wall-aware",
    reason: best
      ? getWallAwareReason(best.position, state)
      : "wait: blocked with no valid move",
    score: best?.score,
  };
}

function compositeDecision(state: GameState): RobotDecision {
  if (isThreatened(state.robot.position, state)) {
    return escapeDecision(state);
  }

  if (hasSafePathToGoal(state)) {
    return goalCommitDecision(state);
  }

  if (isDirectPathEnemyControlled(state)) {
    return wallAwareDecisionAsComposite(state);
  }

  return safeProgressDecision(state);
}

function escapeDecision(state: GameState): RobotDecision {
  const bestEscape = chooseBestMove(state, (candidate) => {
    const currentGoalDistance = candidateDistanceToGoal(
      state.robot.position,
      state,
    );
    const nextGoalDistance = candidateDistanceToGoal(candidate.position, state);
    const progress = currentGoalDistance - nextGoalDistance;

    const threatPenalty = isThreatened(candidate.position, state) ? 500 : 0;
    const enemyDistance = cappedEnemyDistance(candidate.position, state);
    const deadEndPenalty = isDeadEnd(candidate.position, state) ? 180 : 0;
    const backwardPenalty = progress < 0 ? 20 : 0;
    const obstacleCoverBonus =
      getAdjacentObstacleCount(candidate.position, state) * 6;

    return (
      threatPenalty +
      nextGoalDistance * 2.2 -
      enemyDistance * 1.6 +
      deadEndPenalty +
      backwardPenalty -
      obstacleCoverBonus
    );
  });

  return {
    action: bestEscape
      ? { type: "move", direction: bestEscape.direction }
      : { type: "wait" },
    tactic: "composite",
    reason: bestEscape
      ? "move: escape immediate capture zone"
      : "wait: blocked with no valid escape",
    score: bestEscape?.score,
  };
}

function goalCommitDecision(state: GameState): RobotDecision {
  const best = chooseBestMove(state, (candidate) => {
    const goalDistance = candidateDistanceToGoal(candidate.position, state);
    const threatPenalty = isThreatened(candidate.position, state) ? 600 : 0;
    const deadEndPenalty = isDeadEnd(candidate.position, state) ? 120 : 0;

    return goalDistance * 6 + threatPenalty + deadEndPenalty;
  });

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "composite",
    reason: best
      ? "move: commit to goal because enemy cannot intercept path"
      : "wait: blocked with no safe goal path",
    score: best?.score,
  };
}

function wallAwareDecisionAsComposite(state: GameState): RobotDecision {
  const best = chooseBestMove(state, (candidate) =>
    getWallAwareScore(candidate.position, state),
  );

  return {
    action: best
      ? { type: "move", direction: best.direction }
      : { type: "wait" },
    tactic: "composite",
    reason: best
      ? "move: use wall-aware route because direct path is enemy-controlled"
      : "wait: blocked with no valid wall-aware move",
    score: best?.score,
  };
}

function safeProgressDecision(state: GameState): RobotDecision {
  const bestSafeProgress = chooseBestMove(state, (candidate) => {
    const currentPosition = state.robot.position;

    const currentGoalDistance = candidateDistanceToGoal(currentPosition, state);
    const nextGoalDistance = candidateDistanceToGoal(candidate.position, state);
    const progress = currentGoalDistance - nextGoalDistance;

    const currentEnemyDistance = cappedEnemyDistance(currentPosition, state);
    const nextEnemyDistance = cappedEnemyDistance(candidate.position, state);
    const enemyDistanceGain = nextEnemyDistance - currentEnemyDistance;

    const enemyIsVeryNear = currentEnemyDistance <= 3;
    const enemyIsNear = currentEnemyDistance <= 5;

    const threatPenalty = isThreatened(candidate.position, state) ? 420 : 0;

    const noProgressPenalty =
      progress === 0 && enemyIsNear ? 8 : progress === 0 ? 35 : 0;

    const backwardPenalty =
      progress < 0 && enemyIsNear ? 12 : progress < 0 ? 75 : 0;

    const centerEntryBonus = getCenterEntryBonus(
      currentPosition,
      candidate.position,
      state,
    );

    const obstacleDetourBonus = getObstacleDetourBonus(
      currentPosition,
      candidate.position,
      state,
    );

    const enemyDistanceGainBonus = enemyIsNear
      ? Math.max(0, enemyDistanceGain) * 42
      : 0;

    const enemyCloserPenalty = enemyIsNear && enemyDistanceGain < 0 ? 55 : 0;

    const obstacleCoverBonus =
      getAdjacentObstacleCount(candidate.position, state) *
      (enemyIsNear ? 5.0 : 3.0);

    const boundaryPenalty =
      isBoundary(candidate.position, state) && enemyIsNear ? 55 : 25;

    const goalWeight = enemyIsVeryNear ? 3.2 : enemyIsNear ? 2.9 : 2.6;

    return (
      nextGoalDistance * goalWeight +
      threatPenalty +
      noProgressPenalty +
      backwardPenalty +
      boundaryPenalty +
      enemyCloserPenalty -
      centerEntryBonus -
      obstacleDetourBonus -
      enemyDistanceGainBonus -
      obstacleCoverBonus
    );
  });

  return {
    action: bestSafeProgress
      ? { type: "move", direction: bestSafeProgress.direction }
      : { type: "wait" },
    tactic: "composite",
    reason: bestSafeProgress
      ? getCompositeReason(
          state.robot.position,
          bestSafeProgress.position,
          state,
        )
      : "wait: blocked with no valid move",
    score: bestSafeProgress?.score,
  };
}

function getCandidateMoves(state: GameState): CandidateMove[] {
  return getValidRobotMoves(state).map((direction) => ({
    direction,
    position: movePosition(state.robot.position, direction),
  }));
}

function chooseBestMove(
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

function normalizeScore(score: number): number {
  if (Number.isNaN(score)) return Number.POSITIVE_INFINITY;
  return score;
}

function cappedEnemyDistance(position: Position, state: GameState): number {
  const distance = nearestEnemyDistanceToPosition(position, state);

  if (!Number.isFinite(distance)) {
    return state.gridSize * state.gridSize;
  }

  return distance;
}

function isThreatened(position: Position, state: GameState): boolean {
  return state.enemies.some(
    (enemy) =>
      enemy.hp > 0 &&
      isInThreatBox(enemy.position, position, enemy.attackRange),
  );
}

function hasSafePathToGoal(state: GameState): boolean {
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

function getWallAwareScore(position: Position, state: GameState): number {
  const current = state.robot.position;

  const currentGoalDistance = candidateDistanceToGoal(current, state);
  const nextGoalDistance = candidateDistanceToGoal(position, state);
  const progress = currentGoalDistance - nextGoalDistance;

  const currentEnemyDistance = cappedEnemyDistance(current, state);
  const nextEnemyDistance = cappedEnemyDistance(position, state);
  const enemyDistanceGain = nextEnemyDistance - currentEnemyDistance;

  const currentDepth = getInteriorDepth(current, state);
  const nextDepth = getInteriorDepth(position, state);
  const interiorGain = nextDepth - currentDepth;

  const currentlyThreatened = isThreatened(current, state);
  const nextThreatened = isThreatened(position, state);

  const goalScore = nextGoalDistance * 3.2;
  const threatPenalty = nextThreatened ? 500 : 0;

  const boundaryPenalty = isBoundary(position, state) ? 80 : 0;
  const inwardMoveBonus = Math.max(0, interiorGain) * 65;

  const backwardPenalty = progress < 0 ? 95 : 0;
  const noProgressPenalty = progress === 0 ? 18 : 0;

  const shouldEscape = currentlyThreatened || currentEnemyDistance <= 2;

  const enemyGainBonus = shouldEscape ? Math.max(0, enemyDistanceGain) * 28 : 0;

  const enemyCloserPenalty = shouldEscape && enemyDistanceGain < 0 ? 60 : 0;

  const obstacleCoverBonus = getAdjacentObstacleCount(position, state) * 3.0;
  const deadEndPenalty = isDeadEnd(position, state) ? 180 : 0;

  return (
    goalScore +
    threatPenalty +
    boundaryPenalty +
    backwardPenalty +
    noProgressPenalty +
    enemyCloserPenalty +
    deadEndPenalty -
    inwardMoveBonus -
    enemyGainBonus -
    obstacleCoverBonus
  );
}

function getWallAwareReason(position: Position, state: GameState): string {
  const current = state.robot.position;

  const currentGoalDistance = candidateDistanceToGoal(current, state);
  const nextGoalDistance = candidateDistanceToGoal(position, state);
  const progress = currentGoalDistance - nextGoalDistance;

  const currentEnemyDistance = cappedEnemyDistance(current, state);
  const nextEnemyDistance = cappedEnemyDistance(position, state);

  const currentDepth = getInteriorDepth(current, state);
  const nextDepth = getInteriorDepth(position, state);

  if (isThreatened(position, state)) {
    return "move: avoid enemy capture zone";
  }

  if (
    (isThreatened(current, state) || currentEnemyDistance <= 2) &&
    nextEnemyDistance > currentEnemyDistance
  ) {
    return "move: escape immediate enemy pressure";
  }

  if (nextDepth > currentDepth) {
    return "move: move inward to avoid boundary trap";
  }

  if (isBoundary(position, state)) {
    return "move: avoid boundary trap";
  }

  if (progress > 0) {
    return "move: progress toward goal from safer inner route";
  }

  if (getAdjacentObstacleCount(position, state) > 0) {
    return "move: use nearby obstacle as cover";
  }

  return "move: reposition toward safer inner route";
}

function getCompositeReason(
  current: Position,
  next: Position,
  state: GameState,
): string {
  if (isThreatened(next, state)) {
    return "move: avoid immediate capture zone";
  }

  const currentEnemyDistance = cappedEnemyDistance(current, state);
  const nextEnemyDistance = cappedEnemyDistance(next, state);

  if (currentEnemyDistance <= 5 && nextEnemyDistance > currentEnemyDistance) {
    return "move: increase distance from nearby enemy";
  }

  const currentGoalDistance = candidateDistanceToGoal(current, state);
  const nextGoalDistance = candidateDistanceToGoal(next, state);

  if (currentEnemyDistance <= 5 && nextGoalDistance < currentGoalDistance) {
    return "move: escape pressure while progressing toward goal";
  }

  if (getObstacleDetourBonus(current, next, state) > 0) {
    return "move: use obstacle detour against enemy pressure";
  }

  if (getCenterEntryBonus(current, next, state) > 0) {
    return "move: enter central corridor to avoid boundary trap";
  }

  if (nextGoalDistance < currentGoalDistance) {
    return "move: make safe progress toward goal";
  }

  return "move: tactical reposition under enemy pressure";
}

function getCenterEntryBonus(
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

function getObstacleDetourBonus(
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

function getLinePressureEscapeBonus(
  current: Position,
  next: Position,
  state: GameState,
): number {
  const nearestEnemy = getNearestEnemyPosition(current, state);

  if (!nearestEnemy) return 0;

  const sameColumn = current.x === nearestEnemy.x;
  const sameRow = current.y === nearestEnemy.y;

  if (!sameColumn && !sameRow) return 0;

  const currentEnemyDistance = cappedEnemyDistance(current, state);
  const nextEnemyDistance = cappedEnemyDistance(next, state);

  if (currentEnemyDistance > 5) return 0;

  const breaksColumn = sameColumn && next.x !== current.x;
  const breaksRow = sameRow && next.y !== current.y;

  if (!breaksColumn && !breaksRow) return 0;

  const hasObstacleCover = getAdjacentObstacleCount(next, state) > 0;
  const doesNotGetCloser = nextEnemyDistance >= currentEnemyDistance;

  if (hasObstacleCover && doesNotGetCloser) return 85;
  if (doesNotGetCloser) return 40;

  return 0;
}

function getNearestEnemyPosition(
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

function getAdjacentObstacleCount(
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

function getClippedCenterPenalty(position: Position, state: GameState): number {
  const centerDistance = getCenterDistance(position, state);
  const centerClipRadius = state.gridSize * 0.28;

  if (centerDistance <= centerClipRadius) return 0;

  return (centerDistance - centerClipRadius) * 0.55;
}

function getCenterDistance(position: Position, state: GameState): number {
  const center = (state.gridSize - 1) / 2;

  return Math.abs(position.x - center) + Math.abs(position.y - center);
}

function getInteriorDepth(position: Position, state: GameState): number {
  return Math.min(
    position.x,
    position.y,
    state.gridSize - 1 - position.x,
    state.gridSize - 1 - position.y,
  );
}

function isBoundary(position: Position, state: GameState): boolean {
  return (
    position.x === 0 ||
    position.y === 0 ||
    position.x === state.gridSize - 1 ||
    position.y === state.gridSize - 1
  );
}

function isDeadEnd(position: Position, state: GameState): boolean {
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

function isEnemyControlledChokepoint(
  position: Position,
  state: GameState,
): boolean {
  const adjacentObstacleCount = getAdjacentObstacleCount(position, state);
  const enemyDistance = cappedEnemyDistance(position, state);

  return adjacentObstacleCount >= 2 && enemyDistance <= 3;
}

function isGoalCloseAndSafe(state: GameState): boolean {
  const distanceToGoal = bfsDistance(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (distanceToGoal > 2) return false;

  const path = shortestPath(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length === 0) return false;

  return path.every((position) => !isThreatened(position));
}

function isDirectPathEnemyControlled(state: GameState): boolean {
  const path = shortestPath(state.robot.position, state.goal, state, {
    ignoreRobot: true,
    allowGoal: true,
  });

  if (path.length === 0) return true;

  return path.some((position) => isThreatened(position, state));
}

function getDominantGoalAxisBonus(
  current: Position,
  next: Position,
  goal: Position,
): number {
  const currentDx = Math.abs(goal.x - current.x);
  const currentDy = Math.abs(goal.y - current.y);

  const nextDx = Math.abs(goal.x - next.x);
  const nextDy = Math.abs(goal.y - next.y);

  if (currentDx > currentDy && nextDx < currentDx) return 18;
  if (currentDy > currentDx && nextDy < currentDy) return 18;

  return 0;
}

export function describeRobotAction(decision: RobotDecision): string {
  const action = formatAction(decision.action);

  if (decision.tactic === "greedy-goal") {
    return `${action}: greedily reduce distance to goal`;
  }

  if (decision.tactic === "distance-aware") {
    return `${action}: balance goal progress and enemy distance`;
  }

  if (decision.tactic === "threat-aware") {
    return `${action}: avoid entering enemy threat zone`;
  }

  if (decision.tactic === "wall-aware") {
    return `${action}: use obstacle geometry while progressing toward goal`;
  }

  return `${action}: combine escape, obstacle cover, and goal progress`;
}

function formatAction(action: Action): string {
  if (action.type === "move") return `move ${action.direction}`;
  if (action.type === "attack") return `attack ${action.targetId}`;
  if (action.type === "heal") return "heal";
  return "wait";
}

export function getRobotPolicyByTactic(
  tactic: RobotTactic,
): (state: GameState) => Action {
  return (state) => robotPolicy(state, tactic);
}
