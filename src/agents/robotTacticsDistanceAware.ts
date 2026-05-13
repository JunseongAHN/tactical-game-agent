import type { GameState } from "../core/types";
import type { RobotDecision } from "./robotTactics";
import {
  cappedEnemyDistance,
  chooseBestMove,
  candidateDistanceToGoal,
  isThreatened,
} from "./robotTacticsCommon";

export function distanceAwareDecision(state: GameState): RobotDecision {
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
