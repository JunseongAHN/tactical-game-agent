import type { Enemy, Position } from "../core/types";
import type { RobotTactic } from "../agents/robotTactics";

export type ReplayLogItem = {
  turn: number;
  tactic: RobotTactic;
  action: string;
  reason: string;
  hp: number;
  robotPos: Position;
  enemyPositions?: Array<{
    id: string;
    position: Position;
  }>;
};

type ReplayLogProps = {
  logs: ReplayLogItem[];
  enemies?: Enemy[];
};

export default function ReplayLog({ logs, enemies = [] }: ReplayLogProps) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        height: 320,
        minHeight: 320,
        maxHeight: 320,
        overflowY: "auto",
        overflowX: "hidden",
        background: "#fafafa",
        boxSizing: "border-box",
      }}
    >
      {logs.length === 0 ? (
        <p style={{ color: "#666", margin: 0 }}>
          No replay logs yet. Current E: {formatCurrentEnemies(enemies)}
        </p>
      ) : (
        logs.map((log, index) => (
          <div
            key={`${log.turn}-${index}-${log.action}`}
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              marginBottom: 8,
              lineHeight: 1.45,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            Turn {log.turn}: {log.action} — {log.reason} | HP {log.hp} | P(
            {log.robotPos.x}, {log.robotPos.y}) | E:{" "}
            {formatEnemyPositions(log.enemyPositions)}
          </div>
        ))
      )}
    </div>
  );
}

function formatEnemyPositions(
  enemyPositions?: ReplayLogItem["enemyPositions"],
): string {
  if (!enemyPositions || enemyPositions.length === 0) return "none";

  return enemyPositions
    .map((enemy) => `${enemy.id}(${enemy.position.x}, ${enemy.position.y})`)
    .join(", ");
}

function formatCurrentEnemies(enemies: Enemy[]): string {
  if (enemies.length === 0) return "none";

  return enemies
    .map((enemy) => `${enemy.id}(${enemy.position.x}, ${enemy.position.y})`)
    .join(", ");
}
