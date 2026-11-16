/* file-size-exception: 調整ノブの単一責務カタログ — 1種1エントリで、分割するとノブが散る(2026-07-18裁可) */
// Tuning knobs, all in one place. Since milestone 111 the combat numbers
// follow original Rogue 5.4 (docs/rogue-5.4-spec.md): the enemies' own table
// lives in enemies/enemyStats.ts, and what stays here is the player's side
// plus the knobs of this game's own mechanics. damage.ts's older rollDamage()
// (a normal-distribution roll tried and rolled back in game-history.md
// milestone 15) stays dormant, unrelated to the dice below.

import type { DamageDice } from "./damage.js";
import type { TrapKind } from "./events.js";

/** Original Rogue's starting hit points (INIT_STATS). */
export const PLAYER_MAX_HP = 12;
/**
 * The flat damage every player hit adds on top of its dice — original
 * Rogue's add_dam[] for the starting strength of 16. Raised by strength
 * potions (STRENGTH_POTION_ATTACK_BONUS); this game has no separate strength
 * stat, so a potion always adds a full point.
 */
export const PLAYER_ATTACK_DAMAGE = 1;
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
 * items/hitChance.ts. Sneak attacks (target still asleep) skip the roll
 * entirely, an arrangement kept from before (the original gives +4 to hit
 * instead — docs/tasks/game.md).
 */
export const HIT_CHANCE_PERCENT_PER_POINT = 5;
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
// is a kept arrangement — docs/tasks/game.md). It steals gold on contact
// and flees instead of fighting (see enemies/enemyFlee.ts). Both the theft
// and the gold it drops when killed first (combat.ts) are measured in gold
// piles' worth (GOLD_AMOUNT_MIN..MAX rolls): one, or
// THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME when the magic save goes the thief's way
// (failed → steals more) or the player's (passed → drops more).
export const THIEF_GOLD_ROLLS_ON_SAVE_OUTCOME = 5;

/**
 * Percent chance the player passes a save against magic — original Rogue's
 * `save(VS_MAGIC)`, a d20 that must reach 17 - level/2 (rounded down),
 * restated on this file's percent-roll idiom: 20% at level 1, +5 points per
 * two levels. The only caller so far is the thief's theft/drop size.
 */
export const calculateMagicSaveChancePercent = (playerLevel: number): number =>
	(4 + Math.floor(playerLevel / 2)) * 5;

/** Percentage (floored) of the damage a vampire landed this turn that it heals itself for, capped at its own max HP — see vampireLifesteal.ts. An arrangement: the original vampire steals max HP instead. */
export const VAMPIRE_LIFESTEAL_PERCENT = 50;

/** HP a griffin regenerates per awake turn while below its max HP — see enemyRegen.ts. */
export const GRIFFIN_REGEN_AMOUNT = 1;
/** HP a troll regenerates per awake turn while below its max HP — see enemyRegen.ts. */
export const TROLL_REGEN_AMOUNT = 2;

/** Chance (out of 100), rolled independently every turn a medusa is visible but not adjacent, that its gaze lands — same "roll every eligible turn" idiom as WAKE_CHANCE_PERCENT. */
export const MEDUSA_GAZE_CHANCE_PERCENT = 33;
/** Shorter than a confusion potion's duration (see items/potions.ts) since a medusa's gaze can reapply every turn it stays visible. */
export const MEDUSA_GAZE_CONFUSE_DURATION = 6;

/** Permanent playerMaxHp lost on a turn a wraith lands a hit — see wraithDrain.ts. Never drains playerMaxHp below 1. An arrangement: the original wraith drains a level instead. */
export const WRAITH_DRAIN_AMOUNT = 1;

/**
 * Chance (out of 100), rolled once per room at floor generation, that the
 * room holds one enemy — see floor/enemies.ts. Original Rogue rolls 80% for
 * a room with gold in it and 25% otherwise, with gold in half the rooms;
 * gold here is not placed per room, so the two are flattened into one rate.
 */
export const ROOM_ENEMY_SPAWN_CHANCE_PERCENT = 50;

/**
 * All enemies spawn asleep (see floor.ts) and take no action until they wake
 * (see advanceEnemies) — attacking a still-sleeping enemy is a sneak attack,
 * dealing this many times the normal damage (matching original Rogue).
 */
export const SNEAK_ATTACK_MULTIPLIER = 3;
/**
 * Chance (out of 100), rolled independently every turn a sleeping enemy is
 * adjacent to or within sight of the player, that it wakes up this turn.
 * Deliberately not "wakes for sure the instant it's adjacent/visible" — a
 * bump attack only ever happens from an already-adjacent tile (movement is
 * the only way to become adjacent, so there is always a prior turn standing
 * next to the enemy), so a guaranteed-on-adjacency wake would make every
 * approach wake the enemy one full turn before the player could ever attack,
 * leaving no room for a real sneak attack.
 */
export const WAKE_CHANCE_PERCENT = 33;

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

export const POTION_COUNT_PER_FLOOR = 1;
/** A heal potion restores one die of this many sides per player level (original Rogue's `roll(level, 4)`); healing past the cap raises max HP by 1 instead. */
export const HEAL_POTION_DICE_SIDES = 4;

/** Chance (out of 100), independently rolled per floor, that a weapon spawns — which of the five kinds is a weighted draw, see items/equipmentKinds.ts. */
export const WEAPON_SPAWN_CHANCE_PERCENT = 15;
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

/** Chance (out of 100), independently rolled per floor, that armor spawns — which of the eight kinds is a weighted draw, see items/equipmentKinds.ts. */
export const ARMOR_SPAWN_CHANCE_PERCENT = 15;
/** Armor's share of the same roll as WEAPON_CURSE_CHANCE_PERCENT — Rogue curses armor twice as often as weapons. */
export const ARMOR_CURSE_CHANCE_PERCENT = 20;
export const ARMOR_FOUND_ENCHANTED_CHANCE_PERCENT = 8;

export const POISON_DAMAGE = 4;
/** Chance (out of 100), independently rolled per floor, that a poison potion spawns. */
export const POISON_POTION_SPAWN_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that a teleport scroll spawns. */
export const SCROLL_SPAWN_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that a magic mapping scroll spawns. */
export const MAPPING_SCROLL_SPAWN_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that an identify scroll spawns. */
export const IDENTIFY_SCROLL_SPAWN_CHANCE_PERCENT = 15;

/** Permanent boost to playerPower per strength potion drunk — meaningful even with no weapon equipped. */
export const STRENGTH_POTION_ATTACK_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that a strength potion spawns. */
export const STRENGTH_POTION_SPAWN_CHANCE_PERCENT = 15;

/**
 * The deepest floor — where the Amulet of Yendor lies (original Rogue's
 * AMULETLEVEL). It has no down staircase (nothing lower); reaching it and
 * climbing all the way back to the surface with the amulet is what actually
 * wins the run. See floor.ts's descendStairs/ascendStairs.
 */
export const GOAL_FLOOR = 26;

export const PLAYER_MAX_FOOD = 100;
/**
 * playerFood at or below this triggers the one-time player-hungry warning
 * and turns the status-bar food readout yellow (red is reserved for 0 —
 * see statusBar.tsx). Raised 30→50 (2026-07-18 playtest): with only one
 * stage at 30, the drop from 100 was going unnoticed until it was critical.
 */
export const PLAYER_HUNGER_WARNING_THRESHOLD = 50;
/**
 * playerFood at or below this triggers the one-time player-weak warning and
 * applies WEAK_ATTACK_PENALTY to the player's attack (see
 * calculatePlayerAttackDamage). A second, more urgent stage below
 * PLAYER_HUNGER_WARNING_THRESHOLD, matching original Rogue's
 * Hungry→Weak→Faint progression — the Weak-stage strength loss, modeled here
 * as an attack penalty since this game has no separate strength stat.
 */
export const PLAYER_WEAK_THRESHOLD = 20;
/** Flat reduction to calculatePlayerAttackDamage while playerFood <= PLAYER_WEAK_THRESHOLD. */
export const WEAK_ATTACK_PENALTY = 1;
/** HP lost per turn while playerFood is at 0. */
export const STARVATION_DAMAGE_PER_TURN = 1;
export const FOOD_RATION_RESTORE_AMOUNT = 50;
export const FOOD_COUNT_PER_FLOOR = 2;

export const GOLD_PILES_PER_FLOOR = 3;
export const GOLD_AMOUNT_MIN = 2;
export const GOLD_AMOUNT_MAX = 20;

export const TRAP_COUNT_PER_FLOOR = 2;
export const DART_TRAP_DAMAGE = 2;
/** No damage — the penalty is the forced descent itself, see floor.ts's descendStairs. */
export const TRAPDOOR_DAMAGE = 0;
/** Chance (out of 100), independently rolled per floor (never on GOAL_FLOOR), that a trapdoor spawns. */
export const TRAPDOOR_SPAWN_CHANCE_PERCENT = 15;
/** No damage — the penalty is being relocated at random, see teleport.ts's applyRandomTeleport. */
export const TELEPORT_TRAP_DAMAGE = 0;
/**
 * Chance (out of 100), independently rolled per floor, that a teleport trap
 * spawns — same idiom as TRAPDOOR_SPAWN_CHANCE_PERCENT, but (unlike a
 * trapdoor) allowed on GOAL_FLOOR too, since it only relocates the player
 * within the same floor rather than generating one beyond it.
 */
export const TELEPORT_TRAP_SPAWN_CHANCE_PERCENT = 20;

/** No damage — the penalty is the paralysis itself, see PARALYZED_TURNS_REMAINING handling in trapTrigger.ts. */
export const BEAR_TRAP_DAMAGE = 0;
/** How many turns a bear trap paralyzes the player for — same length as the paralysis potion. */
export const BEAR_TRAP_PARALYSIS_DURATION = 3;
/** Chance (out of 100), independently rolled per floor, that a bear trap spawns — same idiom as TRAPDOOR_SPAWN_CHANCE_PERCENT, allowed on GOAL_FLOOR too (it never generates a floor beyond it). */
export const BEAR_TRAP_SPAWN_CHANCE_PERCENT = 15;

/** No damage — the penalty is the armor degradation itself, see trapTrigger.ts's TRAP_SIDE_EFFECTS. */
export const RUST_TRAP_DAMAGE = 0;
/** Chance (out of 100), independently rolled per floor, that a rust trap spawns — same idiom as the other non-guaranteed traps, allowed on GOAL_FLOOR too. */
export const RUST_TRAP_SPAWN_CHANCE_PERCENT = 15;

/** No damage — the penalty is the forced sleep itself, see trapTrigger.ts's TRAP_SIDE_EFFECTS. */
export const SLEEPING_GAS_TRAP_DAMAGE = 0;
/**
 * How many turns a sleeping gas trap holds the player for — reuses
 * paralyzedTurnsRemaining, same field/tick/status-bar chip as a bear trap
 * (see trapTrigger.ts). Longer than BEAR_TRAP_PARALYSIS_DURATION: original
 * Rogue's sleep trap is the more punishing of the two.
 */
export const SLEEPING_GAS_TRAP_PARALYSIS_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a sleeping gas trap spawns — same idiom as the other non-guaranteed traps, allowed on GOAL_FLOOR too. */
export const SLEEPING_GAS_TRAP_SPAWN_CHANCE_PERCENT = 15;

/** Per-kind lookup table — a new kind is one entry. */
export const TRAP_DAMAGE: Readonly<Record<TrapKind, number>> = {
	dart: DART_TRAP_DAMAGE,
	trapdoor: TRAPDOOR_DAMAGE,
	teleport: TELEPORT_TRAP_DAMAGE,
	bear: BEAR_TRAP_DAMAGE,
	rust: RUST_TRAP_DAMAGE,
	"sleeping-gas": SLEEPING_GAS_TRAP_DAMAGE,
};

/** Chance (out of 100), independently rolled per floor, that a ring spawns. */
export const RING_SPAWN_CHANCE_PERCENT = 8;
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

/** Chance (out of 100), independently rolled per floor, that a ring of sustenance spawns. */
export const SUSTENANCE_RING_SPAWN_CHANCE_PERCENT = 8;
/**
 * Chance (out of 100), rolled independently every turn a ring of sustenance
 * is equipped, that the whole hunger tick (food loss, and any starvation
 * consequences) is skipped this turn — same "roll every eligible turn"
 * idiom as WAKE_CHANCE_PERCENT.
 */
export const SUSTENANCE_HUNGER_SKIP_CHANCE_PERCENT = 50;

/** Chance (out of 100), independently rolled per floor, that a ring of stealth spawns. */
export const STEALTH_RING_SPAWN_CHANCE_PERCENT = 8;
/**
 * Replaces WAKE_CHANCE_PERCENT (33) while a ring of stealth is equipped —
 * roughly half, see enemies.ts's advanceEnemies.
 */
export const STEALTH_RING_WAKE_CHANCE_PERCENT = 15;

/** Chance (out of 100), independently rolled per floor, that a ring of awareness spawns. */
export const AWARENESS_RING_SPAWN_CHANCE_PERCENT = 8;

/** Chance (out of 100), independently rolled per floor, that a ring of aggravate monster spawns — the first ring with a downside rather than a benefit. */
export const AGGRAVATE_MONSTER_RING_SPAWN_CHANCE_PERCENT = 8;

/**
 * Permanent boost per scroll read to a targeted weapon's hitBonus or
 * damageBonus — a coin flip picks which, as in original Rogue — also
 * lifting its curse (see items/equipmentScrolls.ts — the player picks which
 * held weapon, equipped or not; no-op with no weapon held).
 */
export const ENCHANT_WEAPON_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that an enchant weapon scroll spawns. */
export const ENCHANT_WEAPON_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/**
 * Permanent boost to a targeted armor's own defenseBonus per scroll read,
 * also lifting its curse — same targeting rules as ENCHANT_WEAPON_BONUS.
 */
export const ENCHANT_ARMOR_BONUS = 1;
/** Chance (out of 100), independently rolled per floor, that an enchant armor scroll spawns. */
export const ENCHANT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/**
 * Fixed ranged damage a wand of striking deals — higher than the player's
 * base melee damage as compensation for never getting a sneak-attack
 * multiplier (see combat.ts's applyWandStrike).
 */
export const WAND_STRIKE_DAMAGE = 3;
/** Chance (out of 100), independently rolled per floor, that a wand spawns. */
export const WAND_SPAWN_CHANCE_PERCENT = 8;

/** Chance (out of 100), independently rolled per floor, that a teleport wand spawns — same rarity as the other wands. */
export const TELEPORT_WAND_SPAWN_CHANCE_PERCENT = 8;

/** Fixed ranged damage a wand of magic missile deals — higher than WAND_STRIKE_DAMAGE, offset by a lower spawn chance. */
export const MAGIC_MISSILE_WAND_DAMAGE = 5;
/** Chance (out of 100), independently rolled per floor, that a magic missile wand spawns — lower than WAND_SPAWN_CHANCE_PERCENT. */
export const MAGIC_MISSILE_WAND_SPAWN_CHANCE_PERCENT = 6;

/** How many turns a confuse monster scroll makes an enemy wander instead of pathfinding toward the player (adjacent attacks still land). */
export const CONFUSE_MONSTER_SCROLL_DURATION = 8;
/** Chance (out of 100), independently rolled per floor, that a confuse monster scroll spawns. */
export const CONFUSE_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** How many turns a hallucination potion swaps displayed enemy glyphs for decoys — purely cosmetic, see frame.ts. */
export const HALLUCINATION_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a hallucination potion spawns. */
export const HALLUCINATION_POTION_SPAWN_CHANCE_PERCENT = 12;

/** How many turns a hold monster scroll freezes every visible enemy for — same length as SLOW_WAND_DURATION, its single-target counterpart. */
export const HOLD_MONSTER_SCROLL_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a hold monster scroll spawns. */
export const HOLD_MONSTER_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** Chance (out of 100), independently rolled per floor, that a sleep wand spawns — same rarity as the other wands. */
export const SLEEP_WAND_SPAWN_CHANCE_PERCENT = 8;

/** How many turns a confusion potion randomizes movement for. */
export const CONFUSION_POTION_DURATION = 10;
/** Chance (out of 100), independently rolled per floor, that a confusion potion spawns. */
export const CONFUSION_POTION_SPAWN_CHANCE_PERCENT = 15;

/** How many turns a wand of slow monster freezes its target for. */
export const SLOW_WAND_DURATION = 5;
/** Chance (out of 100), independently rolled per floor, that a slow wand spawns. */
export const SLOW_WAND_SPAWN_CHANCE_PERCENT = 8;

/** How many turns a levitation potion floats the player over traps for. */
export const LEVITATION_POTION_DURATION = 15;
/** Chance (out of 100), independently rolled per floor, that a levitation potion spawns. */
export const LEVITATION_POTION_SPAWN_CHANCE_PERCENT = 12;

/** Chance (out of 100), independently rolled per floor, that a protect armor scroll spawns. Sets rustProtected on a targeted held armor (see items/scrolls.ts). */
export const PROTECT_ARMOR_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** Chance (out of 100), independently rolled per floor, that a remove-curse scroll spawns. No-op (not consumed) if nothing currently equipped is cursed. */
export const REMOVE_CURSE_SCROLL_SPAWN_CHANCE_PERCENT = 10;

/** How many turns a blindness potion shrinks the player's field of view for. */
export const BLIND_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a blindness potion spawns. */
export const BLIND_POTION_SPAWN_CHANCE_PERCENT = 12;
/** Field of view radius while blind — adjacent tiles only. */
export const BLIND_VIEW_RADIUS = 1;

/**
 * How many turns a paralysis potion locks the player out of acting for.
 * Shorter than the other temporary statuses — being unable to act at all
 * for even a few turns next to an enemy is punishing enough.
 */
export const PARALYSIS_POTION_DURATION = 3;
/** Chance (out of 100), independently rolled per floor, that a paralysis potion spawns. */
export const PARALYSIS_POTION_SPAWN_CHANCE_PERCENT = 12;

/** Chance (out of 100), independently rolled per floor, that a potion of raise level spawns — rarer than the other potions since an instant level-up is a strong effect. */
export const RAISE_LEVEL_POTION_SPAWN_CHANCE_PERCENT = 8;

/** Final-score weights — see calculateScore in score.ts. */
export const SCORE_PER_FLOOR = 100;
export const SCORE_PER_LEVEL = 50;
export const SCORE_AMULET_BONUS = 500;

/** How many turns a detect monster potion reveals every enemy through, regardless of FOV. */
export const DETECT_MONSTER_POTION_DURATION = 20;
/** Chance (out of 100), independently rolled per floor, that a detect monster potion spawns. */
export const DETECT_MONSTER_POTION_SPAWN_CHANCE_PERCENT = 12;

/** Permanent playerMaxHp increase from a potion of life — higher than a level-up's bonus, a high-value find. */
export const LIFE_POTION_MAX_HP_BONUS = 5;
/** Chance (out of 100), independently rolled per floor, that a potion of life spawns — rare, like raise-level. */
export const LIFE_POTION_SPAWN_CHANCE_PERCENT = 8;

/** Score bonus for finishing a run having never landed an attack — see calculateScore. */
export const SCORE_PACIFIST_BONUS = 300;
/** Score bonus for finishing a run having never eaten — see calculateScore. */
export const SCORE_FOODLESS_BONUS = 300;
