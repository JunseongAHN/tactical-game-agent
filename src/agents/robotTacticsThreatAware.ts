import type { GameState } from "../core/types";
import type { RobotDecision } from "./robotTactics";
import {
  chooseBestMove,
  candidateDistanceToGoal,
  isThreatened,
} from "./robotTacticsCommon";

export function threatAwareDecision(state: GameState): RobotDecision {
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
