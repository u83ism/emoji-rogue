/* file-size-exception: 調整ノブの単一責務カタログ — 1種1エントリで、分割するとノブが散る(2026-07-18裁可) */
// Tuning knobs, all in one place. Since milestone 111 the combat numbers
// follow original Rogue 5.4 (docs/rogue-5.4-spec.md): the enemies' own table
// lives in enemies/enemyStats.ts, and what stays here is the player's side
// plus the knobs of this game's own mechanics. damage.ts's older rollDamage()
// (a normal-distribution roll tried and rolled back in game-history.md
// milestone 15) stays dormant, unrelated to the dice below.

import type { DamageDice } from "./combat/damage.js";
import type { RingKind } from "./events.js";

/** Original Rogue's starting hit points (INIT_STATS). */
export const PLAYER_MAX_HP = 12;
/** Original Rogue's starting strength (INIT_STATS) — see strength.ts for what it adds to hits. */
export const PLAYER_START_STRENGTH = 16;
/**
 * Standard deviation for damage.ts's rollDamage(), which nothing currently
 * calls — melee combat uses the discrete-dice constants below instead. Kept
 * dormant so the normal-distribution pattern is ready if wanted elsewhere.
 */
export const DAMAGE_VARIANCE_STDDEV = 0.5;

/**
 * Original Rogue's swing(): a d20 plus the attacker's to-hit bonus must
 * reach 20 - attacker level - defender armor class. Restated on the
 * percent-roll idiom used everywhere else in this file, that is this many
 * percent per point of (level + armor class + bonus) — see
 * combat/hitChance.ts. A monster attacking a player whose run flag is off
 * adds NOT_RUNNING_HIT_BONUS to the roll.
 */
export const HIT_CHANCE_PERCENT_PER_POINT = 5;
/**
 * Original Rogue's roll_em() +4 to hit a defender that is not running
 * (ISRUN off). The player's own attacks never get it: fight() wakes the
 * target (runto()) before rolling, so a monster is always running by then.
 * A monster attacking the player gets it whenever GameState.playerRunFlag
 * is off. No damage bonus: the original has no sneak-attack multiplier.
 */
export const NOT_RUNNING_HIT_BONUS = 4;
/** How many arrows a run starts with — original Rogue's `rnd(15) + 25`. */
export const STARTING_ARROWS_MIN = 25;
export const STARTING_ARROWS_MAX = 39;
/** The player's armor class with nothing worn (original Rogue's INIT_STATS) — lower is harder to hit. */
export const UNARMORED_ARMOR_CLASS = 10;
/** What a bare-handed hit rolls — original Rogue's INIT_STATS damage "1x4". */
export const UNARMED_DAMAGE_DICE: DamageDice = { count: 1, sides: 4 };

/**
 * Max items the player can hold at once — one slot per held item (no
 * stacking: two heal potions cost two slots). Any pickup is refused once at
 * capacity — see applyItemPickup. Original Rogue 5.4's MAXPACK, which counts
 * potions/scrolls/food individually the same way and pairs each slot with
 * one of the selection letters a-z (see inventoryKeymap.ts).
 */
export const INVENTORY_CAPACITY = 26;

// Enemy numbers (level, armor class, attack dice, experience) are original
// Rogue's monsters[] table — see enemies/enemyStats.ts. What follows are the
// knobs of this game's own per-kind mechanics.

// The thief is original Rogue's leprechaun under another name (the rename
// is the developer's choice — docs/design.md). It steals gold on contact
// and flees instead of fighting (see enemies/enemyFlee.ts). Both the theft
// and the gold it drops when killed first (combat.ts) are measured in gold
// piles' worth (the floor's own gold roll, see calculateGoldAmountMax): one, or
// THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME when the magic save goes the thief's way
// (failed → steals more) or the player's (passed → drops more).
export const THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME = 5;

/**
 * Original Rogue's save_throw() as a percent: a d20 that must reach
 * 14 + `which` - level/2 (rounded down) — +5 points per two levels.
 */
const calculateSaveChancePercent = (
	which: number,
	playerLevel: number,
): number =>
	Math.min(100, Math.max(0, (7 - which + Math.floor(playerLevel / 2)) * 5));

/** Percent chance a creature of `level` passes a save against magic (`save(VS_MAGIC)` / `save_throw(VS_MAGIC, tp)`, 17 - level/2): 20% at level 1. The player's decides the thief's theft/drop size; an enemy's lets it dodge a magic missile. */
export const calculateMagicSaveChancePercent = (level: number): number =>
	calculateSaveChancePercent(3, level);

/** The player's own save against magic (original Rogue's save(VS_MAGIC)): calculateMagicSaveChancePercent, each point of worn ring of protection bonus making it 5 percent easier. */
export const calculatePlayerMagicSaveChancePercent = (
	playerLevel: number,
	protectionBonus: number,
): number => calculateSaveChancePercent(3 - protectionBonus, playerLevel);

/** Percent chance the player passes a save against poison (`save(VS_POISON)`, 14 - level/2): 35% at level 1. A dart trap's dart and a scorpion's sting drain strength only when it fails. */
export const calculatePoisonSaveChancePercent = (playerLevel: number): number =>
	calculateSaveChancePercent(0, playerLevel);

/** Chance (out of 100) that a vampire's or wraith's landed hit drains the player (original Rogue's attack(): 30 for 'V', 15 for 'W') — see enemies/vitalityDrain.ts. */
export const VITALITY_DRAIN_CHANCE_PERCENT: Readonly<
	Record<"vampire" | "wraith", number>
> = { vampire: 30, wraith: 15 };
/** Max HP (and HP) a drain takes: 1d3 for a vampire, 1d10 for a wraith (which also takes a level) — original Rogue's attack(). */
export const VITALITY_DRAIN_DICE: Readonly<
	Record<
		"vampire" | "wraith",
		{ readonly count: number; readonly sides: number }
	>
> = { vampire: { count: 1, sides: 3 }, wraith: { count: 1, sides: 10 } };

/**
 * An ice monster's hit freezes the player for MIN..MAX turns (original
 * Rogue's `rnd(2) + 2`), added onto any paralysis already left; once the
 * total passes PARALYSIS_DEATH_TURNS (the original's BORE_LEVEL) the player
 * freezes to death. See enemies/iceMonsterFreeze.ts.
 */
export const ICE_MONSTER_FREEZE_TURNS_MIN = 2;
export const ICE_MONSTER_FREEZE_TURNS_MAX = 3;
export const PARALYSIS_DEATH_TURNS = 50;

/**
 * Wandering monsters (original Rogue's WANDERTIME and rollwand(), see
 * turnEnd/wanderer.ts): about WANDERER_DELAY_TURNS turns pass (67-73), then
 * every WANDERER_ROLL_INTERVAL_TURNS-th turn one face of a
 * WANDERER_ROLL_DIE_SIDES-sided die brings a new enemy hunting the player,
 * after which the delay starts over. On average one arrives every 94 turns
 * (70 of delay, then 6 rolls 4 turns apart).
 */
export const WANDERER_DELAY_TURNS = 70;
export const WANDERER_ROLL_INTERVAL_TURNS = 4;
export const WANDERER_ROLL_DIE_SIDES = 6;

/**
 * What a room holds at floor generation (original Rogue's do_rooms(), see
 * floor/rooms.ts): a pile of gold in half the rooms, then one enemy — 80%
 * of the time in a room that got gold, 25% in one that did not.
 */
export const ROOM_GOLD_CHANCE_PERCENT = 50;
export const ROOM_ENEMY_CHANCE_PERCENT_WITH_GOLD = 80;
export const ROOM_ENEMY_CHANCE_PERCENT_WITHOUT_GOLD = 25;

/** Max HP gained per level is one die of this many sides — original Rogue's check_level() `roll(levels gained, 10)`. */
export const PLAYER_LEVEL_UP_HP_DICE_SIDES = 10;
/**
 * Cumulative experience needed to reach level 2, 3, ... (index 0 = level
 * 2's threshold) — original Rogue's e_levels[]. Level 21 is the cap: no
 * further growth once playerExperience exceeds the last entry.
 */
export const LEVEL_EXPERIENCE_THRESHOLDS: readonly number[] = [
	10, 20, 40, 80, 160, 320, 640, 1300, 2600, 5200, 13000, 26000, 50000, 100000,
	200000, 400000, 800000, 2000000, 4000000, 8000000,
];

/** A heal potion restores one die of this many sides per player level (original Rogue's `roll(level, 4)`); healing past the cap raises max HP by 1 instead. */
export const HEAL_POTION_DICE_SIDES = 4;
/** An extra healing potion heals one die of this many sides per player level (original Rogue's `roll(level, 8)`). */
export const EXTRA_HEALING_POTION_DICE_SIDES = 8;
/** How long a haste self potion lasts — original Rogue's add_haste(): `rnd(4) + 4`. */
export const HASTE_POTION_TURNS_MIN = 4;
export const HASTE_POTION_TURNS_MAX = 7;
/** Drinking one while hasted faints the player for 0..this many turns (`rnd(8)`). */
export const HASTE_EXHAUSTION_TURNS_MAX = 7;

/**
 * Original Rogue 5.4's new_thing() roll for a found weapon/armor, decided
 * once at floor generation (items/heldItemFactory.ts) and hidden until the
 * item is equipped: a weapon is cursed WEAPON_CURSE_CHANCE_PERCENT of the
 * time, found already enchanted WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT of the
 * time, ordinary otherwise. A cursed one cannot be unequipped until a
 * remove-curse scroll (or an enchant scroll aimed at it) is read AND is
 * worse by FOUND_BONUS_ADJUSTMENT_MIN..MAX points (so its bonus can go
 * negative); a found-enchanted one is better by the same range. For a
 * weapon the points move its hitBonus only, never its damageBonus; for
 * armor, its defenseBonus. Milestone 81 had made the curse lock-only; the
 * numeric side was restored for fidelity (2026-11-12).
 */
export const WEAPON_CURSE_CHANCE_PERCENT = 10;
export const WEAPON_FOUND_ENCHANTED_CHANCE_PERCENT = 5;
export const FOUND_BONUS_ADJUSTMENT_MIN = 1;
export const FOUND_BONUS_ADJUSTMENT_MAX = 3;

/** Armor's share of the same roll as WEAPON_CURSE_CHANCE_PERCENT — Rogue curses armor twice as often as weapons. */
export const ARMOR_CURSE_CHANCE_PERCENT = 20;
export const ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT = 8;

/** Strength a poison potion takes: 1..POISON_POTION_STRENGTH_LOSS_MAX — original Rogue's `chg_str(-(rnd(3) + 1))`. */
export const POISON_POTION_STRENGTH_LOSS_MAX = 3;

/** Strength gained per gain strength potion drunk — original Rogue's `chg_str(1)`. */
export const STRENGTH_POTION_STRENGTH_GAIN = 1;

/**
 * The first floor the Amulet of Yendor lies on (original Rogue's
 * AMULETLEVEL): every floor from here down gets one until the player
 * carries it. The dungeon has no bottom; climbing all the way back to the
 * surface with the amulet is what wins the run. Monsters below this floor
 * grow stronger by one level per floor (floor/enemies.ts). See
 * floor/transitions.ts's descendStairs/ascendStairs.
 */
export const AMULET_FLOOR = 26;

/**
 * How much stronger a monster is on `floor` (original Rogue's new_monster()
 * lev_add): one level per floor below AMULET_FLOOR — that much higher a
 * level (to-hit, HP dice, saves), that much better an armor class, and 10
 * experience per level on top. A monster never leaves the floor it was
 * born on (every floor is generated fresh), so this is derived from the
 * current floor rather than kept on each enemy.
 */
export const calculateEnemyLevelBonus = (floor: number): number =>
	Math.max(0, floor - AMULET_FLOOR);

/** Below this floor every monster is hasted — two actions a turn (original Rogue's new_monster(): `level > 29`). */
export const HASTED_ENEMY_FLOOR = 30;

// Hunger follows original Rogue 5.4 (rogue.h's HUNGERTIME/STOMACHSIZE/
// MORETIME/STARVETIME, daemons.c's stomach(), misc.c's eat()) since
// milestone 112 — see turnEnd/hunger.ts.

/** What playerFood starts a run at — original Rogue's HUNGERTIME. It drops by 1 a turn. */
export const PLAYER_START_FOOD = 1300;
/** The most playerFood can hold, however much is eaten — original Rogue's STOMACHSIZE. */
export const PLAYER_MAX_FOOD = 2000;
/**
 * playerFood at or below this triggers the one-time player-hungry warning
 * and turns the status-bar food readout yellow (red is reserved for an
 * empty stomach — see statusBar.tsx). Original Rogue's "Hungry" stage
 * begins below 2 x MORETIME = 300.
 */
export const PLAYER_HUNGER_WARNING_THRESHOLD = 299;
/**
 * playerFood at or below this triggers the one-time player-weak warning — a
 * second, more urgent stage below PLAYER_HUNGER_WARNING_THRESHOLD, matching
 * original Rogue's Hungry→Weak→Faint progression (its "Weak" stage begins
 * below MORETIME = 150). As in the original, Weak is only a warning: it
 * changes nothing in combat.
 */
export const PLAYER_WEAK_THRESHOLD = 149;
/** How many turns an empty stomach lasts before the player starves to death — original Rogue's STARVETIME. */
export const STARVATION_TURNS = 850;
/** Chance (out of 100), rolled every turn spent with an empty stomach while not already out cold, of fainting. */
export const FAINT_CHANCE_PERCENT = 20;
/** How many turns a faint lasts — original Rogue's `rnd(8) + 4`. */
export const FAINT_TURNS_MIN = 4;
export const FAINT_TURNS_MAX = 11;
/** What one food ration adds to playerFood — original Rogue's `HUNGERTIME - 200 + rnd(400)`. */
export const FOOD_RATION_RESTORE_MIN = 1100;
export const FOOD_RATION_RESTORE_MAX = 1499;
/**
 * The items of a floor (floor/items.ts): original Rogue's put_things() makes
 * MAXOBJ = 9 attempts, each producing an item 36% of the time — its kind
 * drawn by floor/spawnTable.ts's weights. After more than
 * FOOD_DROUGHT_FLOOR_LIMIT floors without food, the next item is food for
 * sure (new_thing()'s no_food).
 */
export const ITEM_DRAW_ATTEMPTS_PER_FLOOR = 9;
/** A floor gets a treasure room 1 time in this many (original Rogue's TREAS_ROOM) — see floor/treasureRoom.ts. */
export const TREASURE_ROOM_CHANCE_DENOMINATOR = 20;
/** A treasure room holds MINTREAS..MAXTREAS items. */
export const TREASURE_ROOM_MIN = 2;
export const TREASURE_ROOM_MAX = 10;
export const ITEM_DRAW_CHANCE_PERCENT = 36;
export const FOOD_DROUGHT_FLOOR_LIMIT = 3;

/**
 * One pile of gold is GOLD_AMOUNT_MIN..calculateGoldAmountMax(floor),
 * uniformly — original Rogue's GOLDCALC, `rnd(50 + 10 * level) + 2`. The
 * deeper the floor, the bigger the pile (and the bigger a thief's take).
 */
export const GOLD_AMOUNT_MIN = 2;
export const calculateGoldAmountMax = (floor: number): number =>
	51 + 10 * floor;

/** At most this many traps on one floor (original Rogue's MAXTRAPS) — see floor/traps.ts. */
export const MAX_TRAPS_PER_FLOOR = 10;
/**
 * A poison dart trap shoots at the player like an attacker one level above
 * it (original Rogue's T_DART: `swing(level + 1, armor, 1)`, then 1d4) — so
 * armor makes it miss, and a miss does nothing at all.
 */
export const DART_TRAP_LEVEL_BONUS = 1;
export const DART_TRAP_HIT_BONUS = 1;
export const DART_TRAP_DAMAGE_DICE: DamageDice = { count: 1, sides: 4 };
/** An arrow trap shoots like an attacker one level below the player (T_ARROW: `swing(level - 1, armor, 1)`, then 1d6); a miss drops the arrow at the player's feet. */
export const ARROW_TRAP_LEVEL_BONUS = -1;
export const ARROW_TRAP_HIT_BONUS = 1;
export const ARROW_TRAP_DAMAGE_DICE: DamageDice = { count: 1, sides: 6 };
/** How many move attempts a bear trap holds the player for (original Rogue's BEARTIME, spread(3) = 3). */
export const BEAR_TRAP_STUCK_TURNS = 3;
/** How many turns a sleeping gas trap puts the player to sleep for (SLEEPTIME, spread(5) = 5). */
export const SLEEPING_GAS_TRAP_PARALYSIS_DURATION = 5;
/**
 * Searching finds a hidden trap next to the player 1 time in
 * SEARCH_TRAP_FIND_DENOMINATOR (original Rogue's search(): `rnd(2 +
 * probinc)`), harder while hallucinating (+3) or blind (+2).
 */
export const SEARCH_TRAP_FIND_DENOMINATOR = 2;
/** The same search's odds for a secret door (`rnd(5 + probinc)`) and a secret passage (`rnd(3 + probinc)`). */
export const SEARCH_DOOR_FIND_DENOMINATOR = 5;
export const SEARCH_PASSAGE_FIND_DENOMINATOR = 3;
export const SEARCH_HALLUCINATING_PENALTY = 3;
export const SEARCH_BLIND_PENALTY = 2;

/** HP a worn ring of regeneration heals every turn, as in original Rogue — see turnEnd/regeneration.ts. */
export const RING_REGEN_AMOUNT = 1;
/**
 * Natural healing (original Rogue's doctor() daemon, see
 * turnEnd/regeneration.ts). Below NATURAL_HEALING_FAST_LEVEL the player
 * heals 1 HP whenever quietTurns + 2 x level exceeds
 * NATURAL_HEALING_SLOW_THRESHOLD; from that level on, 1..(level - 7) HP
 * every NATURAL_HEALING_FAST_INTERVAL quiet turns.
 */
export const NATURAL_HEALING_SLOW_THRESHOLD = 20;
export const NATURAL_HEALING_FAST_LEVEL = 8;
export const NATURAL_HEALING_FAST_INTERVAL = 3;

/**
 * Food a worn ring uses each turn, original Rogue's ring_eat() table: a
 * positive number is that much every turn, a negative -N is one food with a
 * 1-in-N chance. Slow digestion (the sustenance ring) instead saves the
 * turn's food half the time — see turnEnd/hunger.ts.
 */
export const RING_FOOD_USE: Readonly<Record<RingKind, number>> = {
	"protection-ring": 1,
	"add-strength-ring": 1,
	"sustain-strength-ring": 1,
	"adornment-ring": 0,
	"aggravate-monster-ring": 0,
	"dexterity-ring": -3,
	"increase-damage-ring": -3,
	"regeneration-ring": 2,
	"sustenance-ring": -2,
	"teleportation-ring": 0,
	"stealth-ring": 1,
	"maintain-armor-ring": 1,
	"see-invisible-ring": -5,
	"searching-ring": -3,
};
/** A worn teleportation ring jumps the player somewhere at random with a 1-in-this chance each turn (original Rogue's command(): `rnd(50) == 0`). */
export const TELEPORTATION_RING_CHANCE_DENOMINATOR = 50;

/**
 * Permanent boost per scroll read to a targeted weapon's hitBonus or
 * damageBonus — a coin flip picks which, as in original Rogue — also
 * lifting its curse (see items/equipmentScrolls.ts — the player picks which
 * held weapon, equipped or not; no-op with no weapon held).
 */
export const ENCHANT_WEAPON_BONUS = 1;

/**
 * Permanent boost to a targeted armor's own defenseBonus per scroll read,
 * also lifting its curse — same targeting rules as ENCHANT_WEAPON_BONUS.
 */
export const ENCHANT_ARMOR_BONUS = 1;

/** A magic missile's damage dice — original Rogue's bolt `o_hurldmg` "1x4" (see items/wands.ts's applyMagicMissileWandStrike). */
export const MAGIC_MISSILE_DAMAGE_DICE = { count: 1, sides: 4 } as const;
/** Added to every magic missile's roll — the bolt's own `o_dplus` of 1, before the player's strength and wielded-weapon bonuses. */
export const MAGIC_MISSILE_DAMAGE_BONUS = 1;

/** How many turns a hallucination potion swaps displayed enemy glyphs for decoys — purely cosmetic, see frame.ts. */
export const HALLUCINATION_POTION_DURATION = 850;

/** How near (in tiles, either axis) a monster must be for a hold monster scroll to stop it — original Rogue's read_scroll(): hero.x - 2 .. hero.x + 2. */
export const HOLD_MONSTER_SCROLL_RANGE = 2;
/** A sleep scroll's nap: original Rogue's `rnd(SLEEPTIME) + 4`, 4..8 turns. */
export const SLEEP_SCROLL_TURNS_MIN = 4;
export const SLEEP_SCROLL_TURNS_MAX = 8;

/** How many turns a confusion potion (and a medusa's gaze) randomizes movement for — original Rogue's HUHDURATION, spread. */
export const CONFUSION_POTION_DURATION = 20;

/** A wand's charges when found — original Rogue's fix_stick(): `rnd(5) + 3` (the wand of light's 10-19 is not in this game). */
export const WAND_CHARGES_MIN = 3;
export const WAND_CHARGES_MAX = 7;

/** How many turns a levitation potion floats the player over traps for. */
export const LEVITATION_POTION_DURATION = 30;

/** How many turns a blindness potion shrinks the player's field of view for. */
export const BLIND_POTION_DURATION = 850;
/** How long a see invisible potion lets the player see invisible monsters (original Rogue's SEEDURATION, spread like the others). */
export const SEE_INVISIBLE_POTION_DURATION = 850;

/** How many turns a detect monster potion reveals every enemy through, regardless of FOV. */
export const DETECT_MONSTER_POTION_DURATION = 20;
