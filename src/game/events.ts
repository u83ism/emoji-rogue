/** Events carry it so the shell can name the attacker. */
export type EnemyKind = "zombie" | "bat";

export type ItemKind =
	| "potion"
	| "sword"
	| "shield"
	| "food"
	| "poison"
	| "scroll"
	| "mapping";

/**
 * Kinds with a potion effect — visually identical (same glyph, same generic
 * name) until identified. See GameState.identifiedPotionKinds.
 */
export const POTION_KINDS: readonly ItemKind[] = ["potion", "poison"];

/** Hidden until stepped on — see advanceTurn.ts's trap trigger. */
export type TrapKind = "dart";

/** What killed the player — an enemy kind, starvation, a trap, or a poison potion. */
export type DeathCause = EnemyKind | "hunger" | "trap" | "poison";

/**
 * What happened inside the game world during a turn (diegetic events only —
 * app/session concerns like "saved" or input warnings are shell notices,
 * never events), as plain data. No human-readable strings live here —
 * turning events into prose is the shell's job, concentrated in one module
 * (src/messages.ts) so a future locale swap touches a single file.
 * See the i18n discipline in docs/tasks/game.md.
 */
export type GameEvent =
	| {
			readonly type: "player-hit";
			readonly payload: { readonly by: EnemyKind; readonly damage: number };
	  }
	| {
			readonly type: "enemy-hit";
			readonly payload: { readonly target: EnemyKind; readonly damage: number };
	  }
	| {
			readonly type: "enemy-defeated";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			readonly type: "player-died";
			readonly payload: { readonly by: DeathCause };
	  }
	| {
			readonly type: "floor-descended";
			readonly payload: { readonly floor: number };
	  }
	| {
			/** amount is the actual hp gained — 0 when drunk at full health. */
			readonly type: "player-healed";
			readonly payload: { readonly by: ItemKind; readonly amount: number };
	  }
	| {
			readonly type: "item-picked-up";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			readonly type: "game-won";
			readonly payload: { readonly floor: number };
	  }
	| {
			readonly type: "weapon-equipped";
			readonly payload: { readonly kind: ItemKind; readonly bonus: number };
	  }
	| {
			readonly type: "armor-equipped";
			readonly payload: { readonly kind: ItemKind; readonly bonus: number };
	  }
	| {
			/** Fired once, the turn playerFood crosses the warning threshold going down. */
			readonly type: "player-hungry";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Fired every turn spent at 0 food, alongside the HP loss it causes. */
			readonly type: "player-starved";
			readonly payload: { readonly damage: number };
	  }
	| {
			/** amount is the actual food gained — clipped at PLAYER_MAX_FOOD. */
			readonly type: "player-ate";
			readonly payload: { readonly amount: number };
	  }
	| {
			readonly type: "gold-collected";
			readonly payload: { readonly amount: number };
	  }
	| {
			readonly type: "trap-triggered";
			readonly payload: { readonly kind: TrapKind; readonly damage: number };
	  }
	| {
			readonly type: "player-poisoned";
			readonly payload: { readonly damage: number };
	  }
	| {
			readonly type: "player-teleported";
			readonly payload: { readonly x: number; readonly y: number };
	  }
	| {
			readonly type: "floor-mapped";
			readonly payload: Record<string, never>;
	  };

/**
 * Cap on GameState.events: plenty for the shell's log lines while keeping
 * saves (a serialized GameState) from growing without bound.
 */
export const EVENT_LOG_LIMIT = 20;

/** The event log with new entries appended, oldest entries dropped past the cap. */
export const buildEventLog = (
	log: readonly GameEvent[],
	appended: readonly GameEvent[],
): readonly GameEvent[] => {
	if (appended.length === 0) {
		return log;
	}
	return [...log, ...appended].slice(-EVENT_LOG_LIMIT);
};
