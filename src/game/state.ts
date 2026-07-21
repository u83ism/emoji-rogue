import type { RngState } from "../rng.js";
import type { EnemyKind, GameEvent, ItemKind, TrapKind } from "./events.js";

export type Direction = "north" | "south" | "west" | "east";

/**
 * Everything the player (or an AI actor) can do in one turn, as a plain
 * discriminated union. The reducer (`advanceTurn`) is the only interpreter.
 */
export type Action =
	| {
			readonly type: "move";
			readonly payload: { readonly direction: Direction };
	  }
	| { readonly type: "wait" }
	| {
			readonly type: "use-item";
			readonly payload: { readonly kind: ItemKind };
	  }
	| { readonly type: "save" }
	| { readonly type: "quit" };

/**
 * "suspended" is the request to suspend-save: the reducer only marks it, and
 * the shell reacts by writing the save file and exiting (no I/O in the core).
 */
export type GameStatus = "playing" | "dead" | "exited" | "suspended" | "won";

export interface Position {
	readonly x: number;
	readonly y: number;
}

/**
 * A live enemy. Intersects Position so existing position-shaped code
 * (pathfinding, drawing) keeps reading `enemy.x` / `enemy.y` directly.
 */
export type Enemy = Position & {
	readonly kind: EnemyKind;
	readonly hp: number;
	/** Sleeping enemies take no action at all until woken — see advanceEnemies. */
	readonly awake: boolean;
	/** Frozen (no movement, no attack) while positive — see advanceEnemies and the slow wand. */
	readonly slowedTurnsRemaining: number;
};

/** An item lying on the floor, waiting to be stepped on. */
export type Item = Position & {
	readonly kind: ItemKind;
};

/**
 * A pile of gold lying on the floor. Unlike Item, gold is never held or
 * used — stepping on it immediately adds its amount to goldCollected and
 * removes the pile, so it needs no ItemKind or inventory entry.
 */
export type GoldPile = Position & {
	readonly amount: number;
};

/**
 * The floor's single staircase. Its direction decides what stepping on it
 * does (see advanceTurn's applyMove): "down" descends deeper, "up" climbs
 * back toward the surface. Every floor but GOAL_FLOOR starts with a "down"
 * staircase; GOAL_FLOOR always has an "up" one (there is nothing deeper),
 * and every floor generated while retracing with the amulet also gets "up".
 */
export type Stairs = Position & {
	readonly direction: "up" | "down";
};

/**
 * A hidden trap, sprung once stepped on and then removed — never drawn, even
 * after triggering (no discovery/marking mechanic; see docs/tasks/game-history.md
 * milestone 22).
 */
export type Trap = Position & {
	readonly kind: TrapKind;
};

/** One stack of a held item kind. No capacity limit (yet) — see the backlog. */
export interface InventoryEntry {
	readonly kind: ItemKind;
	readonly quantity: number;
}

/**
 * The complete, serializable game state. Contains only data — no functions —
 * so a save file is just `JSON.stringify(state)` and a replay is the initial
 * state plus an action log. The RNG lives here as a value (`rng`), so every
 * turn's randomness is a pure function of the state.
 */
export interface GameState {
	readonly width: number;
	readonly height: number;
	/**
	 * Column-major terrain grid (`terrain[x][y]`), matching the shape every
	 * `map/` generator fills in: 0 = floor, 1 = wall.
	 */
	readonly terrain: readonly (readonly number[])[];
	/**
	 * Column-major grid of cells the player has ever seen. This is real state
	 * (it accumulates over the run); the currently-visible set is not stored —
	 * it is derived from terrain + player on demand (src/game/vision.ts).
	 */
	readonly explored: readonly (readonly boolean[])[];
	readonly player: Position;
	readonly playerHp: number;
	/** Current ceiling on playerHp — grows on level-up. See applyExperienceGain. */
	readonly playerMaxHp: number;
	/** Starts at 1. See applyExperienceGain. */
	readonly playerLevel: number;
	/** Cumulative kills-based experience. See applyExperienceGain and LEVEL_EXPERIENCE_THRESHOLDS. */
	readonly playerExperience: number;
	/** Base damage plus any permanent bonus from swords used so far. */
	readonly playerAttackDamage: number;
	/**
	 * Damage reduction from shields used so far (0 initially) — can go negative
	 * from a cursed shield (see MIN_DAMAGE_TAKEN, which floors damage taken
	 * regardless).
	 */
	readonly playerDefense: number;
	/** Decreases by 1 every turn; 0 causes starvation damage. See PLAYER_MAX_FOOD. */
	readonly playerFood: number;
	/** Once equipped, heals HP over time — see applyRegenerationTick. Never turns back off. */
	readonly hasRingOfRegeneration: boolean;
	/** Once equipped, may skip a hunger tick — see applyHungerTick. Never turns back off. */
	readonly hasRingOfSustenance: boolean;
	/** Turns left of randomized movement — see applyConfusionTick and applyMove. 0 means not confused. */
	readonly confusedTurnsRemaining: number;
	/** Turns left of floating over traps unharmed — see applyLevitationTick and applyTrapTrigger. */
	readonly levitationTurnsRemaining: number;
	/** Once set, an aquator's rust roll never triggers — see advanceEnemies. */
	readonly armorProtected: boolean;
	/** Turns left of shrunk field of view — see applyBlindnessTick and resolveViewRadius. */
	readonly blindTurnsRemaining: number;
	/** Turns left of being unable to act at all — see applyParalysisTick and advanceTurn. */
	readonly paralyzedTurnsRemaining: number;
	/** Turns left of seeing every enemy regardless of FOV — see applyDetectMonstersTick and frame.ts. */
	readonly detectMonstersTurnsRemaining: number;
	readonly enemies: readonly Enemy[];
	readonly items: readonly Item[];
	/** Items picked up but not yet used — stepping on an item no longer uses it immediately. */
	readonly inventory: readonly InventoryEntry[];
	/** Potion kinds identified this run (by drinking one) — see POTION_KINDS. */
	readonly identifiedPotionKinds: readonly ItemKind[];
	readonly goldPiles: readonly GoldPile[];
	/** Running total of gold collected across the whole run — also the de facto final score. */
	readonly goldCollected: number;
	readonly traps: readonly Trap[];
	/** 1-based; grows as the player descends. */
	readonly floor: number;
	/** Turns spent on the current floor since arriving — see applyWindsOfKronTick. Resets to 0 on every floor transition. */
	readonly turnsOnCurrentFloor: number;
	/**
	 * The staircase. An entity on top of the (still binary floor/wall)
	 * terrain, like enemies — not a third terrain value, which would ripple
	 * through every passability/visibility/rendering `=== 0` check.
	 */
	readonly stairs: Stairs;
	/** The Amulet of Yendor, present only on GOAL_FLOOR until picked up. */
	readonly amulet: Position | undefined;
	/** Set for good once the amulet is picked up — see applyAmuletPickup. */
	readonly hasAmulet: boolean;
	/** Set for good on the first landed attack — a "pacifist" conduct flag, see calculateScore. */
	readonly hasAttacked: boolean;
	/** Set for good on the first food ration eaten — a "foodless" conduct flag, see calculateScore. */
	readonly hasEaten: boolean;
	/**
	 * Recent combat events, newest last, capped at EVENT_LOG_LIMIT. Pure data
	 * (no strings) — the shell turns these into log lines. Part of the state
	 * so saves and replays reproduce the log.
	 */
	readonly events: readonly GameEvent[];
	readonly rng: RngState;
	readonly status: GameStatus;
}
