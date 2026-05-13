import type { GameState, Position } from "../core/types";
import type { RobotDecision } from "./robotTactics";
import {
  cappedEnemyDistance,
  chooseBestMove,
  candidateDistanceToGoal,
  getAdjacentObstacleCount,
  getInteriorDepth,
  isBoundary,
  isDeadEnd,
  isThreatened,
} from "./robotTacticsCommon";

export function wallAwareDecision(state: GameState): RobotDecision {
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

export function getWallAwareScore(
  position: Position,
  state: GameState,
): number {
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

export function getWallAwareReason(
  position: Position,
  state: GameState,
): string {
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
