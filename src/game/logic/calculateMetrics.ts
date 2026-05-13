import {
  DANGER_DAMAGE,
  DANGER_RADIUS,
  dist,
  isInEnemyZone,
  type World,
} from "./game";

export type Metrics = {
  step: number;
  hp: number;
  goalDistance: number;
  enemyDistance: number;
  healDistance: number | null;
  inDanger: boolean;
  dangerRadius: number;
  dangerDamage: number;
  reachedGoal: boolean;
  failed: boolean;
  done: boolean;
};

export function calculateMetrics(world: World): Metrics {
  return {
    step: world.step,
    hp: world.hp,
    goalDistance: dist(world.player, world.goal),
    enemyDistance: dist(world.player, world.enemy),
    healDistance: world.heal ? dist(world.player, world.heal) : null,
    inDanger: isInEnemyZone(world),
    dangerRadius: DANGER_RADIUS,
    dangerDamage: DANGER_DAMAGE,
    reachedGoal: world.reachedGoal,
    failed: world.hp <= 0,
    done: world.done,
  };
}

export function formatMetrics(metrics: Metrics): string {
  return [
    `step:   ${metrics.step}`,
    `hp:     ${metrics.hp}`,
    `goal:   ${metrics.goalDistance}`,
    `enemy:  ${metrics.enemyDistance}`,
    `heal:   ${metrics.healDistance ?? "none"}`,
    `danger: ${metrics.inDanger ? "yes" : "no"}`,
    `zone:   radius ${metrics.dangerRadius}, damage ${metrics.dangerDamage}`,
    `done:   ${metrics.done ? "yes" : "no"}`,
  ].join("\n");
}
