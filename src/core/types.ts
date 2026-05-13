export type Position = {
  x: number;
  y: number;
};

export type EntityId = string;

export type Direction = "up" | "down" | "left" | "right";

export type MoveAction = {
  type: "move";
  direction: Direction;
};

export type AttackAction = {
  type: "attack";
  targetId: EntityId;
};

export type HealAction = {
  type: "heal";
};

export type WaitAction = {
  type: "wait";
};

export type Action = MoveAction | AttackAction | HealAction | WaitAction;

export type Robot = {
  id: EntityId;
  position: Position;
  hp: number;
  maxHp: number;
  attackDamage: number;
  attackRange: number;
  healAmount: number;
};

export type Enemy = {
  id: EntityId;
  position: Position;
  hp: number;
  attackDamage: number;
  attackRange: number;
};

export type GameState = {
  gridSize: number;
  robot: Robot;
  enemies: Enemy[];
  obstacles: Position[];
  goal: Position;
  turn: number;
  maxTurns: number;
  result: GameResult;
};

export type GameResult = "running" | "win" | "loss" | "timeout";

export type StepLog = {
  turn: number;
  robotAction: Action;
  enemyActions: Array<{
    enemyId: EntityId;
    action: Action;
  }>;
  result: GameResult;
  robotHp: number;
  robotPosition: Position;
};

export const DIRECTIONS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
