import type { RobotTactic } from "../agents/robotTactics";

type TacticDescriptionsProps = {
  selectedTactic: RobotTactic;
};

type TacticDescription = {
  tactic: RobotTactic;
  title: string;
  short: string;
  logic: string;
  strength: string;
  weakness: string;
};

const TACTIC_DESCRIPTIONS: TacticDescription[] = [
  {
    tactic: "greedy-goal",
    title: "Greedy Goal",
    short: "Always move toward the goal by shortest BFS distance.",
    logic: "score = goalDistance",
    strength: "Fast in open and easy maps.",
    weakness: "Ignores enemy pressure and can walk into capture zones.",
  },
  {
    tactic: "distance-aware",
    title: "Distance Aware",
    short: "Move toward the goal while keeping distance from enemies.",
    logic: "score = goalDistance - enemyDistance",
    strength: "Better than greedy when enemy pressure is simple.",
    weakness: "Does not understand wall geometry or chokepoints.",
  },
  {
    tactic: "threat-aware",
    title: "Threat Aware",
    short: "Strongly avoids enemy 3x3 capture zones.",
    logic: "score = goalDistance + threatPenalty",
    strength: "Avoids immediate death more reliably than greedy.",
    weakness: "Can become too conservative and fail to exploit obstacles.",
  },
  {
    tactic: "wall-aware",
    title: "Wall Aware",
    short: "Uses obstacle geometry and inner routes while progressing.",
    logic:
      "score = goal progress + boundary penalty + obstacle cover + enemy delay",
    strength:
      "Good in easier maps where obstacle geometry creates safe routes.",
    weakness:
      "Can overvalue inner movement or wall cover in hard pressure cases.",
  },
  {
    tactic: "composite",
    title: "Composite",
    short:
      "Switches between escape, goal-commit, wall-aware, and safe progress.",
    logic:
      "if threatened → escape; if path safe → commit; if direct path controlled → wall route",
    strength: "More robust on harder maps where one fixed rule is not enough.",
    weakness:
      "Can be less efficient than wall-aware when the map is already easy.",
  },
  {
    tactic: "ai-adaptive",
    title: "AI Adaptive",
    short:
      "A meta-policy designed with AI assistance that selects between existing tactical modes.",
    logic:
      "switch between wall-aware and composite based on enemy pressure, path safety, and map difficulty",
    strength:
      "Performs well when the map difficulty varies, because it can use wall-aware on easier cases and composite on harder cases.",
    weakness:
      "Still depends on the quality of the underlying hand-designed tactics.",
  },
  {
    tactic: "ai-pure",
    title: "AI Pure",
    short:
      "A standalone AI-designed scoring policy that evaluates candidate moves directly.",
    logic:
      "score each move using goal progress, enemy distance, threat risk, boundary risk, obstacle cover, and dead-end penalty",
    strength:
      "Independent from other tactics and easier to extend with new scoring features.",
    weakness:
      "Requires careful weight tuning and can behave unexpectedly in edge cases.",
  },
];

export default function TacticDescriptions({
  selectedTactic,
}: TacticDescriptionsProps) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 10,
      }}
    >
      {TACTIC_DESCRIPTIONS.map((item) => {
        const selected = item.tactic === selectedTactic;

        return (
          <article
            key={item.tactic}
            style={{
              padding: 12,
              border: selected ? "2px solid #111827" : "1px solid #e5e7eb",
              borderRadius: 12,
              background: selected ? "#ffffff" : "#f9fafb",
              boxShadow: selected ? "0 6px 18px rgba(0,0,0,0.08)" : "none",
              minHeight: 210,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                marginBottom: 6,
              }}
            >
              {item.title}
            </div>

            <p
              style={{
                margin: "0 0 8px",
                fontSize: 12,
                color: "#374151",
                lineHeight: 1.4,
              }}
            >
              {item.short}
            </p>

            <Info label="Logic" value={item.logic} />
            <Info label="Good" value={item.strength} />
            <Info label="Weak" value={item.weakness} />
          </article>
        );
      })}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#6b7280",
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#111827",
          lineHeight: 1.35,
        }}
      >
        {value}
      </div>
    </div>
  );
}
