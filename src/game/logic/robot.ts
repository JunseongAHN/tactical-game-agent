import {
  DANGER_RADIUS,
  blocked,
  dist,
  isInEnemyZone,
  nextPos,
  type Action,
  type Pos,
  type World,
} from "./game";

export type RobotTactic =
  | "escape"
  | "heal-first"
  | "keep-distance"
  | "safe-progress"
  | "risky-dash";

export type RobotMove = {
  action: Action;
  tactic: RobotTactic;
};

const MOVE_ACTIONS: Action[] = ["up", "down", "left", "right"];

function validRobotActions(world: World): Action[] {
  return MOVE_ACTIONS.filter((action) => {
    const candidate = nextPos(world.player, action);
    return !blocked(candidate, world);
  });
}

function chooseRobotTactic(world: World): RobotTactic {
  const goalDist = dist(world.player, world.goal);
  const enemyDist = dist(world.player, world.enemy);

  if (isInEnemyZone(world)) return "escape";
  if (world.hp < 60 && world.heal) return "heal-first";
  if (enemyDist <= DANGER_RADIUS + 1) return "keep-distance";
  if (goalDist <= 2 && world.hp >= 70) return "risky-dash";

  return "safe-progress";
}

function targetForTactic(world: World, tactic: RobotTactic): Pos {
  if (tactic === "heal-first" && world.heal) return world.heal;
  return world.goal;
}

function scoreRobotAction(world: World, action: Action, tactic: RobotTactic) {
  const candidate = nextPos(world.player, action);
  const target = targetForTactic(world, tactic);

  const targetDistance = dist(candidate, target);
  const enemyDistance = dist(candidate, world.enemy);
  const dangerPenalty = isInEnemyZone(world, candidate) ? 100 : 0;

  if (tactic === "escape") {
    return -enemyDistance * 2 + targetDistance * 0.2 + dangerPenalty;
  }

  if (tactic === "heal-first") {
    return targetDistance * 1.2 - enemyDistance * 0.4 + dangerPenalty;
  }

  if (tactic === "keep-distance") {
    return -enemyDistance * 1.5 + targetDistance * 0.4 + dangerPenalty;
  }

  if (tactic === "risky-dash") {
    return targetDistance * 1.6 - enemyDistance * 0.05 + dangerPenalty * 0.8;
  }

  return targetDistance * 1.0 - enemyDistance * 0.25 + dangerPenalty;
}

export function chooseRobotMove(world: World): RobotMove {
  const tactic = chooseRobotTactic(world);
  const actions = validRobotActions(world);

  if (actions.length === 0) {
    throw new Error("Robot has no valid move actions.");
  }

  let bestAction = actions[0];
  let bestScore = Infinity;

  for (const action of actions) {
    const score = scoreRobotAction(world, action, tactic);

    if (score < bestScore) {
      bestAction = action;
      bestScore = score;
    }
  }

  return {
    action: bestAction,
    tactic,
  };
}
