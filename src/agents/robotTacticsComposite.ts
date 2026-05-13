import type { GameState, Position } from "../core/types";
import type { RobotDecision } from "./robotTactics";
import { getWallAwareScore } from "./robotTacticsWallAware";
import {
  cappedEnemyDistance,
  chooseBestMove,
  candidateDistanceToGoal,
  getAdjacentObstacleCount,
  getCenterEntryBonus,
  getObstacleDetourBonus,
  hasSafePathToGoal,
  isBoundary,
  isDeadEnd,
  isDirectPathEnemyControlled,
  isThreatened,
} from "./robotTacticsCommon";

export function compositeDecision(state: GameState): RobotDecision {
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
