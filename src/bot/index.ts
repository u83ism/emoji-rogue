// Public API for the headless autoplay bot (scripts/run-bot.mjs), separate
// from src/game/index.ts because this is a dev/analysis tool, not part of
// the shipped game.

export { findAdjacentEnemyDirection } from "./combatPolicy.js";
export type { BotGoal, BotGoalKind } from "./goals.js";
export type { TurnLogEntry } from "./log.js";
export { buildTurnLogEntry } from "./log.js";
export type { BotMemory } from "./memory.js";
export { createInitialBotMemory } from "./memory.js";
export type { BotDecision } from "./policy.js";
export { decideAction, STAGNATION_QUIT_TURNS } from "./policy.js";
