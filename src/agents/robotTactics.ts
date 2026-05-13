import type { Action, GameState } from "../core/types";
import { greedyGoalDecision } from "./robotTacticsGreedy";
import { distanceAwareDecision } from "./robotTacticsDistanceAware";
import { threatAwareDecision } from "./robotTacticsThreatAware";
import { wallAwareDecision } from "./robotTacticsWallAware";
import { compositeDecision } from "./robotTacticsComposite";
import { aiAdaptiveDecision } from "./robotTacticsAIAdaptive";
import { aiPureDecision } from "./robotTacticsAIPure";

export type RobotTactic =
  | "greedy-goal"
  | "distance-aware"
  | "threat-aware"
  | "wall-aware"
  | "composite"
  | "ai-adaptive"
  | "ai-pure";

export type RobotDecision = {
  action: Action;
  tactic: RobotTactic;
  reason: string;
  score?: number;
};

export const ROBOT_TACTICS: RobotTactic[] = [
  "greedy-goal",
  "distance-aware",
  "threat-aware",
  "wall-aware",
  "composite",
  "ai-adaptive",
  "ai-pure",
];

export function robotPolicy(state: GameState, tactic: RobotTactic): Action {
  return getRobotDecision(state, tactic).action;
}

export function getRobotDecision(
  state: GameState,
  tactic: RobotTactic,
): RobotDecision {
  switch (tactic) {
    case "greedy-goal":
      return greedyGoalDecision(state);

    case "distance-aware":
      return distanceAwareDecision(state);

    case "threat-aware":
      return threatAwareDecision(state);

    case "wall-aware":
      return wallAwareDecision(state);

    case "composite":
      return compositeDecision(state);

    case "ai-adaptive":
      return aiAdaptiveDecision(state);

    case "ai-pure":
      return aiPureDecision(state);

    default:
      return assertNever(tactic);
  }
}

export function getRobotPolicyByTactic(
  tactic: RobotTactic,
): (state: GameState) => Action {
  return (state) => robotPolicy(state, tactic);
}

export function describeRobotAction(decision: RobotDecision): string {
  const action = formatAction(decision.action);

  switch (decision.tactic) {
    case "greedy-goal":
      return `${action}: greedily reduce distance to goal`;

    case "distance-aware":
      return `${action}: balance goal progress and enemy distance`;

    case "threat-aware":
      return `${action}: avoid entering enemy threat zone`;

    case "wall-aware":
      return `${action}: use obstacle geometry while progressing toward goal`;

    case "composite":
      return `${action}: combine escape, obstacle cover, and goal progress`;

    case "ai-adaptive":
      return `${action}: adaptively switch between tactical modes`;

    case "ai-pure":
      return `${action}: evaluate candidate moves with pure AI scoring`;

    default:
      return assertNever(decision.tactic);
  }
}

function formatAction(action: Action): string {
  if (action.type === "move") return `move ${action.direction}`;
  if (action.type === "attack") return `attack ${action.targetId}`;
  if (action.type === "heal") return "heal";
  return "wait";
}

function assertNever(value: never): never {
  throw new Error(`Unknown robot tactic: ${value}`);
}
