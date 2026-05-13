# Demo Website
https://junseongahn.github.io/tactical-game-agent/

# Tactical Game Agent Benchmark

A small grid-world benchmark for comparing tactical robot agents under enemy pursuit.

The robot must reach the goal while avoiding enemies.  
Enemies chase the robot, and if they capture the robot, the run ends in loss.

## TL;DR

This project is a **pursuit-evasion benchmark** for testing different robot tactics in obstacle-aware grid maps.

It includes:

- Grid-based simulation
- BFS pathfinding
- Enemy chase and capture logic
- Multiple robot tactics
- Obstacle / wall-aware movement
- Randomized benchmark trials
- Visual board replay
- Turn-by-turn decision log

The key idea:

> Simple shortest-path movement works in easy maps, but harder maps require tactics that use obstacles, avoid boundary traps, and adapt to enemy pressure.

## Demo

GIF demo will be added soon.

The demo will use the **Try One Example** section of the app, showing:

- selected scenario
- selected tactic
- board animation
- replay log explaining each move

## Scenarios

The benchmark includes several maps:

- **Open Field** — no obstacles, simple baseline
- **Enemy Near Goal** — enemy pressure near the goal
- **Wall Corridor** — obstacle geometry can delay pursuit
- **Chokepoint** — direct path is dangerous
- **Multi Enemy Pressure** — multiple enemies pressure different routes

## Tactics

The benchmark compares several tactics:

- `greedy-goal`
- `distance-aware`
- `threat-aware`
- `wall-aware`
- `composite`
- `ai-adaptive`
- `ai-pure`

At a high level:

```txt
greedy-goal     = shortest path only
distance-aware  = goal + enemy distance
threat-aware    = avoid capture zone
wall-aware      = use obstacles and inner routes
composite       = switch behavior based on situation
ai-adaptive     = AI-assisted selector between tactics
ai-pure         = standalone AI-designed scoring policy
```
