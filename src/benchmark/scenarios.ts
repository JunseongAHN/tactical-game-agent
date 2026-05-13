import type { GameState, Position } from "../core/types";
import { createInitialState } from "../core/simulator";

export type ScenarioId =
  | "open-field"
  | "enemy-near-goal"
  | "wall-corridor"
  | "chokepoint"
  | "multi-enemy-pressure";

export type Scenario = {
  id: ScenarioId;
  name: string;
  description: string;
  purpose: string;
  createState: () => GameState;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "open-field",
    name: "Open Field",
    description:
      "No obstacles. Enemy starts far enough that greedy navigation should succeed.",
    purpose: "Validate greedy-goal baseline in a simple environment.",
    createState: () =>
      createInitialState({
        gridSize: 12,
        robotPosition: { x: 11, y: 0 },
        goal: { x: 11, y: 11 },
        enemies: [{ id: "enemy-1", x: 0, y: 0 }],
        obstacles: [],
        robotHp: 1,
        maxTurns: 40,
      }),
  },

  {
    id: "enemy-near-goal",
    name: "Enemy Near Goal",
    description:
      "Enemy starts close to the goal, making the shortest path dangerous.",
    purpose:
      "Show greedy-goal getting pulled into enemy pressure near the goal.",
    createState: () =>
      createInitialState({
        gridSize: 10,
        robotPosition: { x: 0, y: 0 },
        goal: { x: 9, y: 9 },
        enemies: [{ id: "enemy-1", x: 8, y: 8 }],
        obstacles: [
          { x: 3, y: 3 },
          { x: 4, y: 3 },
          { x: 5, y: 3 },
          { x: 5, y: 4 },
          { x: 5, y: 5 },
          { x: 6, y: 5 },
        ],
        robotHp: 1,
        maxTurns: 45,
      }),
  },

  {
    id: "wall-corridor",
    name: "Wall Corridor",
    description:
      "A corridor gives the robot a tactical route that can delay enemy pursuit.",
    purpose:
      "Test whether wall-aware and composite tactics can use obstacle geometry without making the scenario impossible.",
    createState: () =>
      createInitialState({
        gridSize: 12,
        robotPosition: { x: 0, y: 5 },
        goal: { x: 11, y: 6 },
        enemies: [{ id: "enemy-1", x: 10, y: 2 }],
        obstacles: createPositions([
          [3, 1],
          [3, 2],
          [3, 3],
          [3, 4],
          [3, 7],
          [3, 8],
          [3, 9],

          [6, 2],
          [6, 3],
          [6, 4],
          [6, 5],
          [6, 8],
          [6, 9],
          [6, 10],

          [8, 4],
          [8, 5],
          [8, 8],

          [9, 8],
        ]),
        robotHp: 1,
        maxTurns: 55,
      }),
  },

  {
    id: "chokepoint",
    name: "Chokepoint",
    description:
      "The shortest path goes through a risky chokepoint, but an obstacle before the choke creates a playable detour.",
    purpose:
      "Show that the robot can survive by using the obstacle before the chokepoint to delay enemy pursuit.",
    createState: () =>
      createInitialState({
        gridSize: 12,
        robotPosition: { x: 0, y: 5 },
        goal: { x: 11, y: 5 },
        enemies: [{ id: "enemy-1", x: 8, y: 5 }],
        obstacles: createPositions([
          // main chokepoint wall
          [5, 0],
          [5, 1],
          [5, 2],
          [5, 3],
          [5, 4],
          [5, 6],
          [5, 7],
          [5, 8],
          [5, 9],
          [5, 10],
          [5, 11],

          // second pressure wall near goal side
          [8, 0],
          [8, 1],
          [8, 2],
          [8, 3],
          [8, 7],
          [8, 8],
          [8, 9],
          [8, 10],
          [8, 11],

          // object before chokepoint
          // robot can go around this to force enemy to detour
          [3, 4],
          [3, 5],
          [3, 6],

          // small lower detour cover
          [4, 8],
          [6, 8],
        ]),
        robotHp: 1,
        maxTurns: 65,
      }),
  },

  {
    id: "multi-enemy-pressure",
    name: "Multi Enemy Pressure",
    description:
      "Two enemies pressure different routes while obstacle clusters create playable tactical detours.",
    purpose:
      "Compare tactic robustness when the robot must use obstacle geometry instead of direct shortest-path movement.",
    createState: () =>
      createInitialState({
        gridSize: 12,
        robotPosition: { x: 0, y: 0 },
        goal: { x: 11, y: 11 },
        enemies: [
          { id: "enemy-1", x: 10, y: 8 },
          { id: "enemy-2", x: 7, y: 2 },
        ],
        obstacles: createPositions([
          [2, 2],
          [2, 3],
          [2, 4],

          [4, 1],
          [4, 2],

          [4, 6],
          [5, 6],
          [6, 6],

          [3, 8],
          [4, 8],
          [5, 8],

          [8, 3],
          [8, 4],
          [8, 5],

          [9, 7],
          [9, 8],
          [9, 9],

          [6, 9],
          [7, 9],
          [8, 9],

          [10, 3],
          [10, 4],
        ]),
        robotHp: 1,
        maxTurns: 70,
      }),
  },
];

export function getScenario(id: ScenarioId): Scenario {
  const scenario = SCENARIOS.find((item) => item.id === id);

  if (!scenario) {
    throw new Error(`Unknown scenario id: ${id}`);
  }

  return scenario;
}

export function createScenarioState(id: ScenarioId): GameState {
  return getScenario(id).createState();
}

function createPositions(points: Array<[number, number]>): Position[] {
  return points.map(([x, y]) => ({ x, y }));
}
