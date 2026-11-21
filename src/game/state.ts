/* file-size-exception: GameState/Actionの型定義=ゲームの全語彙を1箇所で読める価値を優先(events.ts/balance.tsと同じ理屈、2026-07-19裁可) */
import type { RngState } from "../rng.js";
import type { ItemAppearances } from "./appearances.js";
import type {
	ArmorKind,
	EnemyKind,
	EquipmentItemKind,
	GameEvent,
	ItemKind,
	RingKind,
	TrapKind,
	ValuedRingKind,
	WandKind,
	WeaponKind,
} from "./events.js";

export type Direction =
	| "north"
	| "south"
	| "west"
	| "east"
	| "northwest"
	| "northeast"
	| "southwest"
	| "southeast";

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
	/** Look for hidden traps on the eight tiles around (original Rogue's `s`) — see search.ts. */
	| { readonly type: "search" }
	/** Take the staircase under the player down (original Rogue's `>`) — see advanceTurn's applyStairs. */
	| { readonly type: "descend" }
	/** Take the staircase under the player up, which needs the amulet (`<`). */
	| { readonly type: "ascend" }
	| {
			readonly type: "use-item";
			readonly payload: {
				/** The specific HeldItem.itemId to use — not a kind, since same-kind items can now differ (equip state, enchantment). */
				readonly itemId: number;
				/**
				 * Which held item a targeted scroll (the identify scroll — see
				 * inventoryKeymap.ts's filterScrollTargets) applies to, by
				 * itemId. Absent, unheld or the wrong kind wastes the scroll.
				 * Ignored by every other kind.
				 */
				readonly targetItemId?: number;
			};
	  }
	| {
			readonly type: "drop-item";
			readonly payload: { readonly itemId: number };
	  }
	| {
			/** Throws one of the held weapon `itemId` toward `direction` — see throw.ts. */
			readonly type: "throw-item";
			readonly payload: {
				readonly itemId: number;
				readonly direction: Direction;
			};
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
export type EnemySpeed =
	| "normal"
	| "hasted"
	| "slowed-acting"
	| "slowed-resting";

export type Enemy = Position & {
	readonly kind: EnemyKind;
	readonly hp: number;
	/** What `hp` was rolled as at spawn (level d8, see floor/enemies.ts) — the cap for regeneration and lifesteal, and part of the experience it is worth. */
	readonly maxHp: number;
	/** Sleeping enemies take no action at all until woken — see advanceEnemies. */
	readonly awake: boolean;
	/**
	 * How often it acts (original Rogue's ISHASTE/ISSLOW, enemies/enemySpeed.ts):
	 * "hasted" twice per move (every monster born from HASTED_ENEMY_FLOOR down),
	 * a slowed one (the slow monster wand) every other move — "slowed-acting"
	 * on the move it acts (the original's t_turn), "slowed-resting" on the one
	 * it skips.
	 */
	readonly speed: EnemySpeed;
	/** Stopped where it stands by a hold monster scroll (original Rogue's ISHELD) until the player attacks or zaps it — see advanceEnemies. */
	readonly held: boolean;
	/** What it carries (original Rogue's t_pack) — dropped where it dies (enemies/enemyPack.ts). Positions are meaningless until then. */
	readonly carried: readonly Item[];
	/** Original Rogue's ISMEAN — may wake when the player comes close (enemies/wakeMonster.ts). From its kind (ENEMY_IS_MEAN), or set for a treasure room's monsters. */
	readonly mean: boolean;
	/** Original Rogue's ISFOUND on a medusa: its one gaze is spent (enemies/medusaGaze.ts). */
	readonly gazeUsed: boolean;
	/** Original Rogue's ISHUH: four moves in five go a random way, and each such stumble may clear it (one in twenty) — enemies/action.ts. A hit while the player's hands glow (nextHitConfuses) sets it. */
	readonly confused: boolean;
};

/**
 * A weapon/armor/ring's already-rolled identity (see HeldItem) minus the
 * fields meaningless on the ground (`kind` — carried by the Item itself —
 * and `equipped`, always false while lying on a tile).
 */
type WeaponIdentity = Omit<
	Extract<HeldItem, { kind: "weapon" }>,
	"kind" | "equipped"
>;
type ArmorIdentity = Omit<
	Extract<HeldItem, { kind: "armor" }>,
	"kind" | "equipped"
>;
type PlainRingIdentity = Omit<
	Extract<HeldItem, { kind: Exclude<RingKind, ValuedRingKind> }>,
	"kind" | "equipped"
>;
type ValuedRingIdentity = Omit<
	Extract<HeldItem, { kind: ValuedRingKind }>,
	"kind" | "equipped"
>;

/**
 * An item lying on the floor, waiting to be stepped on. A weapon/armor/ring's
 * `identity` (curse, starting bonus, itemId) is rolled once, at floor
 * generation (floor/items.ts's drawFloorItems) — the item already "is" what
 * it is the moment it exists in the dungeon, same as original Rogue; the
 * player just doesn't know yet (see HeldItem's doc comment on when it's
 * revealed). Dropping it again (applyItemDrop) carries the same `identity`
 * along unchanged, so a dropped +2 weapon or a cursed ring doesn't reroll
 * into a fresh one on re-pickup (milestone 81 follow-up).
 */
export type Item = Position &
	(
		| { readonly kind: Exclude<ItemKind, EquipmentItemKind | WandKind> }
		| {
				readonly kind: WandKind;
				readonly identity: {
					readonly itemId: number;
					readonly charges: number;
				};
		  }
		| { readonly kind: "weapon"; readonly identity: WeaponIdentity }
		| { readonly kind: "armor"; readonly identity: ArmorIdentity }
		| {
				readonly kind: Exclude<RingKind, ValuedRingKind>;
				readonly identity: PlainRingIdentity;
		  }
		| { readonly kind: ValuedRingKind; readonly identity: ValuedRingIdentity }
	);

/**
 * One held item. `itemId` is assigned once at pickup (see GameState.nextItemId
 * / applyItemPickup) and never changes or gets reused — Actions address a
 * held item by this id, never by its position in the inventory array, so
 * replays stay correct even if the array's order or contents shift (see
 * docs/tasks/game-notes.md's cursor-selection note on index fragility).
 *
 * Consumables (potions/scrolls/wands/food) carry only their kind. A
 * weapon/armor/ring carries real equip state instead: `cursed` is decided once
 * at floor generation and stays hidden from the player until the item is
 * equipped, so it can be true even while `equipped` is false. `weaponKind`/
 * `armorKind` say which of original Rogue's weapons/armors it is (see
 * items/equipmentKinds.ts). `hitBonus`/`damageBonus`/
 * `defenseBonus`/`rustProtected` are intrinsic to that specific item (raised
 * by enchant scrolls, degraded by rust, negative on a cursed find) and
 * persist whether or not the item is currently worn — swapping equipment
 * never resets them.
 */
export type HeldItem =
	| {
			readonly itemId: number;
			readonly kind: Exclude<ItemKind, EquipmentItemKind | WandKind>;
	  }
	| {
			readonly itemId: number;
			readonly kind: WandKind;
			/** Zaps left (original Rogue's o_charges, fix_stick()). At 0 the wand stays in the pack and nothing happens when zapped. */
			readonly charges: number;
	  }
	| {
			readonly itemId: number;
			readonly kind: "weapon";
			readonly weaponKind: WeaponKind;
			readonly equipped: boolean;
			readonly cursed: boolean;
			/** Added to the to-hit roll — what a found weapon's curse lowers. */
			readonly hitBonus: number;
			/** Added to the damage roll. */
			readonly damageBonus: number;
			/** How many this one slot holds — above 1 only for the kinds that come in bundles (arrows, darts, shuriken, daggers; see items/equipmentKinds.ts). Throwing takes one off. */
			readonly quantity: number;
	  }
	| {
			readonly itemId: number;
			readonly kind: "armor";
			readonly armorKind: ArmorKind;
			readonly equipped: boolean;
			readonly cursed: boolean;
			/** This armor's own points better (positive) or worse (negative) than its kind's armor class. */
			readonly defenseBonus: number;
			readonly rustProtected: boolean;
	  }
	| {
			readonly itemId: number;
			readonly kind: Exclude<RingKind, ValuedRingKind>;
			readonly equipped: boolean;
			readonly cursed: boolean;
	  }
	| {
			readonly itemId: number;
			readonly kind: ValuedRingKind;
			readonly equipped: boolean;
			readonly cursed: boolean;
			/** The ring's value (original Rogue's o_arm): +1 or +2, or -1 on a cursed one — what it adds to armor class, strength, to-hit or damage. */
			readonly bonus: number;
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
 * The floor's single staircase, as in original Rogue: it leads both ways.
 * Standing on it, "descend" (`>`) always goes one floor deeper and "ascend"
 * (`<`) climbs one floor — but only while carrying the amulet (see
 * advanceTurn's applyStairs). Stepping onto it does nothing by itself.
 */
export type Stairs = Position;

/**
 * One room of the floor (its floor tiles x1..x2, y1..y2; its walls and
 * doors lie one tile outside) — kept for original Rogue's sight rules
 * (vision.ts): a lit room shows whole to a player inside it, a dark one
 * only around them.
 */
export interface DungeonRoom {
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
	readonly dark: boolean;
}

/**
 * A hidden trap, sprung once stepped on and then removed — never drawn, even
 * after triggering (no discovery/marking mechanic; see docs/tasks/game-history.md
 * milestone 22).
 */
export type Trap = Position & {
	readonly kind: TrapKind;
	/** Found (stepped on, or searched out) — drawn on the map from then on, and still armed. */
	readonly seen: boolean;
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
	/** Original Rogue's strength (3-31, starting at 16): adds to every to-hit and damage roll of the player's (strength.ts). Raised by gain strength potions, lowered by poison. */
	readonly playerStrength: number;
	/** The highest playerStrength reached this run — original Rogue's max_stats.s_str, shown beside it and what a drained strength can be restored to. */
	readonly playerMaxStrength: number;
	/** Starts at PLAYER_START_FOOD and drops every turn; once empty it keeps counting below zero toward starvation at -STARVATION_TURNS. See turnEnd/hunger.ts. */
	readonly playerFood: number;
	/** Turns left of randomized movement — see applyStatusCountdownTicks and applyMove. 0 means not confused. */
	readonly confusedTurnsRemaining: number;
	/** Turns left of floating over traps unharmed — see applyStatusCountdownTicks and applyTrapTrigger. */
	readonly levitationTurnsRemaining: number;
	/** Turns left of shrunk field of view — see applyStatusCountdownTicks and resolveViewRadius. */
	readonly blindTurnsRemaining: number;
	/** Turns left of being unable to act at all — see applyStatusCountdownTicks and advanceTurn. */
	readonly paralyzedTurnsRemaining: number;
	/**
	 * Original Rogue's ISRUN flag on the player, which roll_em() reads: while
	 * it is off, every monster attack gets NOT_RUNNING_HIT_BONUS. It starts
	 * off, comes on when a paralysis wears off ("you can move again"), and
	 * goes off again when the player is frozen or put to sleep, or the hunger
	 * stage changes — see combat/hitChance.ts.
	 */
	readonly playerRunFlag: boolean;
	/** Original Rogue's CANHUH: the player's hands glow from a confuse monster scroll, and the next monster they hit is confused (combat/combat.ts's applyEnemyHit). */
	readonly nextHitConfuses: boolean;
	/** Move attempts left before a bear trap lets go (original Rogue's no_move) — each attempt uses one up. */
	readonly stuckTurnsRemaining: number;
	/** Turns left of a see invisible potion — invisible monsters show while it lasts (vision.ts's canSeeInvisible). */
	readonly seeInvisibleTurnsRemaining: number;
	/** Turns left of a haste self potion — two player moves to every monster turn (advanceTurn). */
	readonly hasteTurnsRemaining: number;
	/** While hasted: the first of this turn's two moves is spent, so the next one ends the turn. */
	readonly hasteMoveSpent: boolean;
	/** Turns left of seeing every enemy regardless of FOV — see applyStatusCountdownTicks and frame.ts. */
	readonly detectMonstersTurnsRemaining: number;
	/** Turns left of enemy glyphs being displayed as a decoy — see turnEnd/statusCountdowns.ts and frame.ts. Cosmetic only: real kind, hp, and behavior are unaffected. */
	readonly hallucinatingTurnsRemaining: number;
	readonly enemies: readonly Enemy[];
	readonly items: readonly Item[];
	/**
	 * Items picked up but not yet used — stepping on an item no longer uses it
	 * immediately. One entry per held item (no stacking): two heal potions are
	 * two entries and cost two of INVENTORY_CAPACITY's (balance.ts) slots, not
	 * one stack of quantity 2. Equipping a weapon/armor/ring does not remove it
	 * from here — the entry's own `equipped` flips instead (see HeldItem). See
	 * applyItemPickup.
	 */
	readonly inventory: readonly HeldItem[];
	/** The itemId the next picked-up item will be assigned — incremented by applyItemPickup, never reused. */
	readonly nextItemId: number;
	/** How the run's unidentified kinds look (appearances.ts) — rolled once at the start. */
	readonly appearances: ItemAppearances;
	/** Item kinds identified this run — by using one (drinking a potion, wearing a ring, zapping a wand; see items/use.ts) or by an identify scroll. The shell shows a potion/ring/wand by its real name only once its kind is here. */
	readonly identifiedItemKinds: readonly ItemKind[];
	readonly goldPiles: readonly GoldPile[];
	/** Running total of gold collected across the whole run — also the de facto final score. */
	readonly goldCollected: number;
	readonly traps: readonly Trap[];
	/** 1-based; grows as the player descends. */
	readonly floor: number;
	/** The deepest floor ever stood on this run — original Rogue's `max_level`. Below it (climbing back with the amulet) floors hold no gold and a thief drops none. */
	readonly deepestFloor: number;
	/** Turns since the player last fought (swung at an enemy or was swung at) — original Rogue's `quiet`. Natural healing waits on it and resets it; see turnEnd/regeneration.ts. */
	readonly quietTurns: number;
	/** HP a venus-flytrap's hold costs per turn right now — original Rogue's `vf_hit`. Grows by one with every bite that lands and is back to 0 as soon as no awake flytrap is adjacent. See enemies/flytrapHold.ts. */
	readonly flytrapHoldDamage: number;
	/** Turns left before the wandering-monster rolls begin (again) — see turnEnd/wanderer.ts. */
	readonly wandererDelayTurns: number;
	/** Turns since the last wandering-monster roll, while the rolls are running. */
	readonly wandererRollTurns: number;
	/** Floors generated since one last held a food ration — original Rogue's `no_food`, which guarantees a ration after a drought. See floor/food.ts. */
	readonly floorsWithoutFood: number;
	/** Turns spent on the current floor since arriving. Resets to 0 on every floor transition; drives the hallucination decoy glyph cycling in frame.ts. */
	readonly turnsOnCurrentFloor: number;
	/**
	 * The staircase. An entity on top of the (still binary floor/wall)
	 * terrain, like enemies — not a third terrain value, which would ripple
	 * through every passability/visibility/rendering `=== 0` check.
	 */
	readonly stairs: Stairs;
	/** The floor's rooms — see DungeonRoom and vision.ts. */
	readonly rooms: readonly DungeonRoom[];
	/** The Amulet of Yendor, lying on every floor from AMULET_FLOOR down until picked up. */
	readonly amulet: Position | undefined;
	/** Set for good once the amulet is picked up — see applyAmuletPickup. */
	readonly hasAmulet: boolean;
	/**
	 * Recent combat events, newest last, capped at EVENT_LOG_LIMIT. Pure data
	 * (no strings) — the shell turns these into log lines. Part of the state
	 * so saves and replays reproduce the log.
	 */
	readonly events: readonly GameEvent[];
	readonly rng: RngState;
	readonly status: GameStatus;
}
