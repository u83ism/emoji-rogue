import type { GameEvent } from "../game/events.js";
import type { Action, GameState } from "../game/state.js";
import type { BotGoal } from "./goals.js";

/**
 * One structured, pure-data line per turn for offline analysis — the driver
 * script (scripts/run-bot.mjs) is the only place that turns this into JSONL
 * or console output. `recentEvents` is an approximation (the last couple of
 * log entries after this turn, not a precise before/after diff): GameEvent's
 * own log is capped (see EVENT_LOG_LIMIT), so a precise diff would need
 * special-casing the cap; close enough for spotting what just happened.
 */
export interface TurnLogEntry {
	readonly turn: number;
	readonly floor: number;
	readonly playerX: number;
	readonly playerY: number;
	readonly playerHp: number;
	readonly playerMaxHp: number;
	readonly playerFood: number;
	readonly goldCollected: number;
	readonly hasAmulet: boolean;
	readonly status: GameState["status"];
	readonly action: Action;
	readonly goalKind: BotGoal["kind"] | undefined;
	readonly stagnantTurns: number;
	readonly inventoryCount: number;
	readonly lootRemainingOnFloor: number;
	readonly recentEvents: readonly GameEvent[];
}

export const buildTurnLogEntry = (
	turn: number,
	nextState: GameState,
	action: Action,
	goal: BotGoal | undefined,
	stagnantTurns: number,
): TurnLogEntry => ({
	turn,
	floor: nextState.floor,
	playerX: nextState.player.x,
	playerY: nextState.player.y,
	playerHp: nextState.playerHp,
	playerMaxHp: nextState.playerMaxHp,
	playerFood: nextState.playerFood,
	goldCollected: nextState.goldCollected,
	hasAmulet: nextState.hasAmulet,
	status: nextState.status,
	action,
	goalKind: goal?.kind,
	stagnantTurns,
	inventoryCount: nextState.inventory.length,
	lootRemainingOnFloor: nextState.items.length + nextState.goldPiles.length,
	recentEvents: nextState.events.slice(-2),
});
