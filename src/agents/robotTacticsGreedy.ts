import type { GameState } from "../core/types";
import type { RobotDecision } from "./robotTactics";
import { chooseBestMove, candidateDistanceToGoal } from "./robotTacticsCommon";

export function greedyGoalDecision(state: GameState): RobotDecision {
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
