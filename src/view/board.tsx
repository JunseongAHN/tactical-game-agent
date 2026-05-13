import type { GameState, Position } from "../core/types";
import { isInThreatBox, samePosition } from "../core/grid";

type BoardProps = {
  state: GameState;
};

export default function Board({ state }: BoardProps) {
  const cells: Position[] = [];

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      cells.push({ x, y });
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${state.gridSize}, 36px)`,
        gap: 4,
        marginTop: 16,
      }}
    >
      {cells.map((position) => {
        const content = getCellContent(position, state);

        return (
          <div
            key={`${position.x}-${position.y}`}
            style={{
              width: 36,
              height: 36,
              border: "1px solid #ddd",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              background: getCellBackground(content),
              fontFamily: "monospace",
            }}
            title={`(${position.x}, ${position.y})`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

function getCellContent(position: Position, state: GameState): string {
  if (
    state.enemies.some(
      (enemy) => enemy.hp > 0 && samePosition(enemy.position, position),
    )
  ) {
    return "E";
  }

  if (samePosition(position, state.robot.position)) return "P";

  if (samePosition(position, state.goal)) return "G";

  if (state.obstacles.some((obstacle) => samePosition(obstacle, position))) {
    return "#";
  }

  if (isEnemyThreatZone(position, state)) return "!";

  return ".";
}

function isEnemyThreatZone(position: Position, state: GameState): boolean {
  return state.enemies.some(
    (enemy) =>
      enemy.hp > 0 &&
      isInThreatBox(enemy.position, position, enemy.attackRange),
  );
}

function getCellBackground(content: string): string {
  if (content === "P") return "#dbeafe";
  if (content === "G") return "#dcfce7";
  if (content === "E") return "#fee2e2";
  if (content === "#") return "#e5e7eb";
  if (content === "!") return "#fef3c7";
  return "#ffffff";
}
