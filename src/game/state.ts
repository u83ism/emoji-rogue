/* file-size-exception: GameState/Actionの型定義=ゲームの全語彙を1箇所で読める価値を優先(events.ts/balance.tsと同じ理屈、2026-07-19裁可) */
import type { RngState } from "../rng.js";
import type {
	EnemyKind,
	EquipmentItemKind,
	GameEvent,
	ItemKind,
	TrapKind,
} from "./events.js";

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
			readonly payload: {
				/** The specific HeldItem.itemId to use — not a kind, since same-kind items can now differ (equip state, enchantment). */
				readonly itemId: number;
				/**
				 * Which held sword/armor a targeted scroll (enchant-weapon,
				 * enchant-armor, protect-armor) applies to, by itemId. Absent/
				 * unheld clamps to a no-op, same as using an itemId not held.
				 * Ignored by every other kind.
				 */
				readonly targetItemId?: number;
			};
	  }
	| {
			readonly type: "drop-item";
			readonly payload: { readonly itemId: number };
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
	/** Chases wander instead of A*-pursue while positive; adjacent attacks are unaffected — see advanceEnemies and the confuse monster scroll. */
	readonly confusedTurnsRemaining: number;
};

/**
 * A sword/armor/ring's already-rolled identity (see HeldItem) minus the
 * fields meaningless on the ground (`kind` — carried by the Item itself —
 * and `equipped`, always false while lying on a tile).
 */
type SwordIdentity = Omit<
	Extract<HeldItem, { kind: "sword" }>,
	"kind" | "equipped"
>;
type ArmorIdentity = Omit<
	Extract<HeldItem, { kind: "armor" }>,
	"kind" | "equipped"
>;
type RingIdentity = Omit<
	Extract<
		HeldItem,
		{
			kind:
				| "regeneration-ring"
				| "sustenance-ring"
				| "stealth-ring"
				| "awareness-ring"
				| "aggravate-monster-ring";
		}
	>,
	"kind" | "equipped"
>;

/**
 * An item lying on the floor, waiting to be stepped on. A sword/armor/ring's
 * `identity` (curse, starting bonus, itemId) is rolled once, at floor
 * generation (floor/items.ts's drawFloorItems) — the item already "is" what
 * it is the moment it exists in the dungeon, same as original Rogue; the
 * player just doesn't know yet (see HeldItem's doc comment on when it's
 * revealed). Dropping it again (applyItemDrop) carries the same `identity`
 * along unchanged, so a dropped +2 sword or a cursed ring doesn't reroll
 * into a fresh one on re-pickup (milestone 81 follow-up).
 */
export type Item = Position &
	(
		| { readonly kind: Exclude<ItemKind, EquipmentItemKind> }
		| { readonly kind: "sword"; readonly identity: SwordIdentity }
		| { readonly kind: "armor"; readonly identity: ArmorIdentity }
		| {
				readonly kind:
					| "regeneration-ring"
					| "sustenance-ring"
					| "stealth-ring"
					| "awareness-ring"
					| "aggravate-monster-ring";
				readonly identity: RingIdentity;
		  }
	);

/**
 * One held item. `itemId` is assigned once at pickup (see GameState.nextItemId
 * / applyItemPickup) and never changes or gets reused — Actions address a
 * held item by this id, never by its position in the inventory array, so
 * replays stay correct even if the array's order or contents shift (see
 * docs/tasks/game.md's cursor-selection backlog note on index fragility).
 *
 * Consumables (potions/scrolls/wands/food) carry only their kind. A
 * sword/armor/ring carries real equip state instead: `cursed` is rolled once
 * at pickup and stays hidden from the player until the item is equipped, so
 * it can be true even while `equipped` is false. `attackBonus`/
 * `defenseBonus`/`rustProtected` are intrinsic to that specific item (raised
 * by enchant scrolls, degraded by rust) and persist whether or not the item
 * is currently worn — swapping equipment never resets them.
 */
export type HeldItem =
	| {
			readonly itemId: number;
			readonly kind: Exclude<ItemKind, EquipmentItemKind>;
	  }
	| {
			readonly itemId: number;
			readonly kind: "sword";
			readonly equipped: boolean;
			readonly cursed: boolean;
			readonly attackBonus: number;
	  }
	| {
			readonly itemId: number;
			readonly kind: "armor";
			readonly equipped: boolean;
			readonly cursed: boolean;
			readonly defenseBonus: number;
			readonly rustProtected: boolean;
	  }
	| {
			readonly itemId: number;
			readonly kind:
				| "regeneration-ring"
				| "sustenance-ring"
				| "stealth-ring"
				| "awareness-ring"
				| "aggravate-monster-ring";
			readonly equipped: boolean;
			readonly cursed: boolean;
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
	/**
	 * "Power" in the Fushigi no Dungeon sense: a permanent character stat
	 * raised only by strength potions, meaningful even unarmed. The actual
	 * attack total adds the equipped sword's own attackBonus on top — see
	 * calculatePlayerAttackDamage in items/equipment.ts.
	 */
	readonly playerPower: number;
	/** Decreases by 1 every turn; 0 causes starvation damage. See PLAYER_MAX_FOOD. */
	readonly playerFood: number;
	/** Turns left of randomized movement — see applyConfusionTick and applyMove. 0 means not confused. */
	readonly confusedTurnsRemaining: number;
	/** Turns left of floating over traps unharmed — see applyLevitationTick and applyTrapTrigger. */
	readonly levitationTurnsRemaining: number;
	/** Turns left of shrunk field of view — see applyBlindnessTick and resolveViewRadius. */
	readonly blindTurnsRemaining: number;
	/** Turns left of being unable to act at all — see applyParalysisTick and advanceTurn. */
	readonly paralyzedTurnsRemaining: number;
	/** Turns left of seeing every enemy regardless of FOV — see applyDetectMonstersTick and frame.ts. */
	readonly detectMonstersTurnsRemaining: number;
	/** Turns left of enemy glyphs being displayed as a decoy — see turnEnd/hallucination.ts and frame.ts. Cosmetic only: real kind, hp, and behavior are unaffected. */
	readonly hallucinatingTurnsRemaining: number;
	readonly enemies: readonly Enemy[];
	readonly items: readonly Item[];
	/**
	 * Items picked up but not yet used — stepping on an item no longer uses it
	 * immediately. One entry per held item (no stacking): two heal potions are
	 * two entries and cost two of INVENTORY_CAPACITY's (balance.ts) slots, not
	 * one stack of quantity 2. Equipping a sword/armor/ring does not remove it
	 * from here — the entry's own `equipped` flips instead (see HeldItem). See
	 * applyItemPickup.
	 */
	readonly inventory: readonly HeldItem[];
	/** The itemId the next picked-up item will be assigned — incremented by applyItemPickup, never reused. */
	readonly nextItemId: number;
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
