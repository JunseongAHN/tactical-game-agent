import { chooseEnemyMove } from "./enemy";
import { chooseRobotMove } from "./robot";

export type Pos = {
  r: number;
  c: number;
};

export type Action = "up" | "down" | "left" | "right" | "wait";

export type World = {
  player: Pos;
  goal: Pos;
  enemy: Pos;
  heal: Pos | null;
  walls: Pos[];
  hp: number;
  step: number;
  done: boolean;
  reachedGoal: boolean;
};

export type RobotDecision = {
  observation: string;
  stateSummary: string;
  action: Action;
  tactic: string;
  reason: string;
};

export type StepResult = {
  world: World;
  result: string;
};

export const GRID_SIZE = 8;
export const DANGER_RADIUS = 1;
export const DANGER_DAMAGE = 15;

export const startWorld: World = {
  player: { r: 0, c: 0 },
  goal: { r: 7, c: 7 },
  enemy: { r: 3, c: 4 },
  heal: { r: 1, c: 5 },
  walls: [
    { r: 2, c: 2 },
    { r: 2, c: 3 },
    { r: 2, c: 4 },
    { r: 5, c: 3 },
    { r: 5, c: 4 },
    { r: 5, c: 5 },
  ],
  hp: 100,
  step: 0,
  done: false,
  reachedGoal: false,
};

export function dist(a: Pos, b: Pos) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

export function same(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}

export function nextPos(pos: Pos, action: Action): Pos {
  if (action === "up") return { r: pos.r - 1, c: pos.c };
  if (action === "down") return { r: pos.r + 1, c: pos.c };
  if (action === "left") return { r: pos.r, c: pos.c - 1 };
  if (action === "right") return { r: pos.r, c: pos.c + 1 };
  return pos;
}

export function blocked(pos: Pos, world: World) {
  if (pos.r < 0 || pos.r >= GRID_SIZE || pos.c < 0 || pos.c >= GRID_SIZE) {
    return true;
  }

  return world.walls.some((wall) => same(wall, pos));
}

export function isInEnemyZone(world: World, pos: Pos = world.player) {
  return dist(pos, world.enemy) <= DANGER_RADIUS;
}

export function observeRobot(world: World): string {
  const goalDist = dist(world.player, world.goal);
  const enemyDist = dist(world.player, world.enemy);
  const healDist = world.heal ? dist(world.player, world.heal) : null;
  const danger = isInEnemyZone(world) ? "yes" : "no";

  return [
    `hp=${world.hp}`,
    `goal=${goalDist}`,
    `enemy=${enemyDist}`,
    world.heal ? `heal=${healDist}` : "heal=none",
    `danger=${danger}`,
  ].join(" | ");
}

export function summarizeRobotState(world: World): string {
  const enemyDist = dist(world.player, world.enemy);

  if (isInEnemyZone(world)) {
    return "inside threat zone → escape";
  }

  if (world.hp < 60 && world.heal) {
    return "low hp → heal first";
  }

  if (enemyDist <= DANGER_RADIUS + 1) {
    return "enemy nearby → keep distance";
  }

  return "safe enough → push goal";
}

export function explainRobotDecision(
  world: World,
  action: Action,
  tactic: string,
): string {
  if (tactic === "escape") return `${action}: leave enemy threat zone`;
  if (tactic === "heal-first")
    return `${action}: recover before pushing objective`;
  if (tactic === "keep-distance")
    return `${action}: avoid entering threat zone`;
  if (tactic === "risky-dash")
    return `${action}: goal is close enough to commit`;
  return `${action}: make safe progress toward goal`;
}

export function makeRobotDecision(world: World): RobotDecision {
  const move = chooseRobotMove(world);

  return {
    observation: observeRobot(world),
    stateSummary: summarizeRobotState(world),
    action: move.action,
    tactic: move.tactic,
    reason: explainRobotDecision(world, move.action, move.tactic),
  };
}

function applyEnemyAction(world: World): StepResult {
  const move = chooseEnemyMove(world);
  const nextEnemy = nextPos(world.enemy, move.action);

  if (blocked(nextEnemy, world)) {
    return {
      world,
      result: "enemy waited",
    };
  }

  return {
    world: {
      ...world,
      enemy: nextEnemy,
    },
    result:
      move.action === "wait"
        ? `enemy waited (${move.tactic})`
        : `enemy moved ${move.action} (${move.tactic})`,
  };
}

export function applyRobotAction(world: World, action: Action): StepResult {
  if (world.done) {
    return {
      world,
      result: "already done",
    };
  }

  const beforePlayer = world.player;
  const wantedPlayer = nextPos(world.player, action);
  const hitWall = blocked(wantedPlayer, world);
  const player = hitWall ? beforePlayer : wantedPlayer;

  const gotHeal = world.heal !== null && same(player, world.heal);
  const reachedGoal = same(player, world.goal);

  let hp = world.hp;
  const result: string[] = [];

  if (hitWall) result.push("robot blocked");
  else result.push(`robot moved ${action}`);

  if (gotHeal) {
    hp = Math.min(100, hp + 35);
    result.push("+heal");
  }

  if (reachedGoal) result.push("goal reached");

  let nextWorld: World = {
    ...world,
    player,
    heal: gotHeal ? null : world.heal,
    hp,
    step: world.step + 1,
    done: reachedGoal || hp <= 0,
    reachedGoal,
  };

  if (!nextWorld.done) {
    const enemyStep = applyEnemyAction(nextWorld);
    nextWorld = enemyStep.world;
    result.push(enemyStep.result);
  }

  if (!nextWorld.reachedGoal && isInEnemyZone(nextWorld)) {
    const nextHp = Math.max(0, nextWorld.hp - DANGER_DAMAGE);

    nextWorld = {
      ...nextWorld,
      hp: nextHp,
      done: nextHp <= 0,
    };

    result.push(`threat zone -${DANGER_DAMAGE}hp`);
  }

  if (nextWorld.hp <= 0) {
    result.push("failed");
  }

  return {
    world: nextWorld,
    result: result.join(", "),
  };
}

export function getCell(world: World, pos: Pos) {
  if (same(world.player, pos)) return "P";
  if (same(world.goal, pos)) return "G";
  if (same(world.enemy, pos)) return "E";
  if (world.heal && same(world.heal, pos)) return "H";
  if (world.walls.some((wall) => same(wall, pos))) return "#";
  if (isInEnemyZone(world, pos)) return "!";
  return ".";
}
