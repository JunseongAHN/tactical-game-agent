import type { Action, GameState, Position } from "../core/types";
import { movePosition } from "../core/grid";
import type { RobotDecision, RobotTactic } from "./robotTactics";
import { greedyGoalDecision } from "./robotTacticsGreedy";
import { distanceAwareDecision } from "./robotTacticsDistanceAware";
import { threatAwareDecision } from "./robotTacticsThreatAware";
import { wallAwareDecision } from "./robotTacticsWallAware";
import { compositeDecision } from "./robotTacticsComposite";
import {
  cappedEnemyDistance,
  candidateDistanceToGoal,
  getAdjacentObstacleCount,
  getInteriorDepth,
  hasSafePathToGoal,
  isBoundary,
  isDeadEnd,
  isDirectPathEnemyControlled,
  isThreatened,
} from "./robotTacticsCommon";

type SourceTactic = Exclude<RobotTactic, "ai-adaptive">;

type CandidateDecision = {
  source: SourceTactic;
  decision: RobotDecision;
  position: Position;
  score: number;
};

export function aiAdaptiveDecision(state: GameState): RobotDecision {
  const difficulty = estimateDifficulty(state);
  const proposals = getTacticProposals(state);

  const scored = proposals.map((proposal) => {
    const position = getActionPosition(proposal.decision.action, state);

    return {
      ...proposal,
      position,
      score:
        evaluateAdaptiveMove({
          position,
          source: proposal.source,
          state,
          difficulty,
        }) + getTacticPrior(proposal.source, state, difficulty),
    };
  });

  const best = scored.sort((a, b) => a.score - b.score)[0];

  if (!best) {
    return {
      action: { type: "wait" },
      tactic: "ai-adaptive",
      reason: "wait: no valid adaptive tactic proposal",
    };
  }

  return {
    action: best.decision.action,
    tactic: "ai-adaptive",
    reason: getAdaptiveReason(best, difficulty, state),
    score: best.score,
  };
}

function getTacticProposals(state: GameState): Array<{
  source: SourceTactic;
  decision: RobotDecision;
}> {
  return [
    {
      source: "greedy-goal",
      decision: greedyGoalDecision(state),
    },
    {
      source: "distance-aware",
      decision: distanceAwareDecision(state),
    },
    {
      source: "threat-aware",
      decision: threatAwareDecision(state),
    },
    {
      source: "wall-aware",
      decision: wallAwareDecision(state),
    },
    {
      source: "composite",
      decision: compositeDecision(state),
    },
  ];
}

function getActionPosition(action: Action, state: GameState): Position {
  if (action.type === "move") {
    return movePosition(state.robot.position, action.direction);
  }

  return state.robot.position;
}

function evaluateAdaptiveMove(params: {
  position: Position;
  source: SourceTactic;
  state: GameState;
  difficulty: number;
}): number {
  const { position, state, difficulty } = params;

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

  const hard = difficulty >= 65;
  const medium = difficulty >= 40 && difficulty < 65;
  const safePath = hasSafePathToGoal(state);

  const goalWeight = safePath ? 6.0 : hard ? 2.4 : medium ? 3.0 : 3.8;
  const threatPenalty = isThreatened(position, state) ? 700 : 0;
  const deadEndPenalty = isDeadEnd(position, state) ? 220 : 0;

  const boundaryPenalty = isBoundary(position, state) ? (hard ? 70 : 45) : 0;

  const backwardPenalty = progress < 0 ? (hard ? 18 : 70) : 0;
  const noProgressPenalty = progress === 0 ? (hard ? 8 : 28) : 0;

  const enemyGainBonus = hard
    ? Math.max(0, enemyDistanceGain) * 45
    : Math.max(0, enemyDistanceGain) * 18;

  const enemyCloserPenalty =
    enemyDistanceGain < 0 && currentEnemyDistance <= 5 ? 65 : 0;

  const interiorBonus = Math.max(0, interiorGain) * (hard ? 28 : 40);
  const obstacleCoverBonus =
    getAdjacentObstacleCount(position, state) * (hard ? 5.5 : 3.0);

  return (
    nextGoalDistance * goalWeight +
    threatPenalty +
    deadEndPenalty +
    boundaryPenalty +
    backwardPenalty +
    noProgressPenalty +
    enemyCloserPenalty -
    enemyGainBonus -
    interiorBonus -
    obstacleCoverBonus
  );
}

function getTacticPrior(
  source: SourceTactic,
  state: GameState,
  difficulty: number,
): number {
  if (hasSafePathToGoal(state)) {
    if (source === "greedy-goal") return -45;
    if (source === "wall-aware") return -30;
    if (source === "composite") return -20;
    if (source === "distance-aware") return -10;
    return 0;
  }

  if (difficulty >= 65) {
    if (source === "composite") return -55;
    if (source === "threat-aware") return -35;
    if (source === "wall-aware") return -25;
    if (source === "distance-aware") return -10;
    return 20;
  }

  if (difficulty >= 40) {
    if (source === "wall-aware") return -40;
    if (source === "composite") return -30;
    if (source === "threat-aware") return -20;
    if (source === "distance-aware") return -10;
    return 5;
  }

  if (source === "wall-aware") return -45;
  if (source === "greedy-goal") return -25;
  if (source === "distance-aware") return -15;
  if (source === "composite") return -5;

  return 0;
}

function estimateDifficulty(state: GameState): number {
  const enemyDistance = cappedEnemyDistance(state.robot.position, state);

  let difficulty = 0;

  if (!hasSafePathToGoal(state)) difficulty += 35;
  if (isDirectPathEnemyControlled(state)) difficulty += 25;
  if (enemyDistance <= 3) difficulty += 30;
  else if (enemyDistance <= 5) difficulty += 18;
  if (state.enemies.length >= 2) difficulty += 16;
  if (isBoundary(state.robot.position, state)) difficulty += 8;
  if (getAdjacentObstacleCount(state.robot.position, state) === 0)
    difficulty += 5;

  return difficulty;
}

function getAdaptiveReason(
  best: CandidateDecision,
  difficulty: number,
  state: GameState,
): string {
  if (isThreatened(best.position, state)) {
    return `move: AI selected ${best.source} but avoids immediate capture risk`;
  }

  if (hasSafePathToGoal(state)) {
    return `move: AI selected ${best.source} because goal path is now safe`;
  }

  if (difficulty >= 65) {
    return `move: AI selected ${best.source} for hard-map survival`;
  }

  if (difficulty >= 40) {
    return `move: AI selected ${best.source} for balanced obstacle-aware routing`;
  }

  return `move: AI selected ${best.source} for efficient goal progress`;
}
