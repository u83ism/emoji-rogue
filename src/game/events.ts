/* file-size-exception: kindカタログとGameEventのunion定義 — 判別可能unionは1箇所で読める価値を優先(2026-07-18裁可) */
// The kind catalogs are value arrays first, types second (derived via
// `(typeof X)[number]`): a single source of truth that both the compiler and
// the save validator (validateGameState.ts's membership checks) read, so
// adding a kind is one entry — never a union member plus a hand-kept
// validator list drifting apart.

export const ENEMY_KIND_VALUES = [
	"zombie",
	"bat",
	"thief",
	"nymph",
	"aquator",
	"orc",
	"dragon",
	"yeti",
	"snake",
	"vampire",
	"rat",
	"emu",
	"kestrel",
	"hobgoblin",
	"centaur",
	"quagga",
	"ur-vile",
	"jabberwock",
	"griffin",
	"troll",
	"icky-thing",
	"venus-flytrap",
	"medusa",
	"phantom",
	"wraith",
	"xeroc",
] as const;

/** Events carry it so the shell can name the attacker. */
export type EnemyKind = (typeof ENEMY_KIND_VALUES)[number];

export const ITEM_KIND_VALUES = [
	"heal-potion",
	"sword",
	"armor",
	"food",
	"poison",
	"teleport-scroll",
	"mapping-scroll",
	"identify-scroll",
	"strength",
	"regeneration-ring",
	"sustenance-ring",
	"enchant-weapon",
	"enchant-armor",
	"striking-wand",
	"confusion",
	"slow-wand",
	"levitation",
	"protect-armor",
	"blindness",
	"paralysis",
	"raise-level",
	"detect-monster",
	"life",
	"remove-curse-scroll",
	"teleport-wand",
	"stealth-ring",
	"awareness-ring",
	"magic-missile-wand",
	"confuse-monster-scroll",
	"hallucination",
	"hold-monster-scroll",
	"aggravate-monster-ring",
	"sleep-wand",
] as const;

export type ItemKind = (typeof ITEM_KIND_VALUES)[number];

const EQUIPMENT_ITEM_KIND_VALUES = [
	"sword",
	"armor",
	"regeneration-ring",
	"sustenance-ring",
	"stealth-ring",
	"awareness-ring",
	"aggravate-monster-ring",
] as const satisfies readonly ItemKind[];

/** The equippable subset of ItemKind — held as a HeldItem with equip/curse state (see GameState.inventory). */
export type EquipmentItemKind = (typeof EQUIPMENT_ITEM_KIND_VALUES)[number];

export const EQUIPMENT_ITEM_KINDS: readonly ItemKind[] =
	EQUIPMENT_ITEM_KIND_VALUES;

/** Type guard form of EQUIPMENT_ITEM_KINDS — narrows an ItemKind to EquipmentItemKind. */
export const isEquipmentItemKind = (
	kind: ItemKind,
): kind is EquipmentItemKind => EQUIPMENT_ITEM_KINDS.includes(kind);

const POTION_KIND_VALUES = [
	"heal-potion",
	"poison",
	"strength",
	"confusion",
	"levitation",
	"blindness",
	"paralysis",
	"raise-level",
	"detect-monster",
	"life",
	"hallucination",
] as const satisfies readonly ItemKind[];

/** The potion subset of ItemKind — lets items/potions.ts switch exhaustively. */
export type PotionKind = (typeof POTION_KIND_VALUES)[number];

/**
 * Kinds with a potion effect — visually identical (same glyph, same generic
 * name) until identified. See GameState.identifiedPotionKinds. Typed as the
 * wider ItemKind[] so `POTION_KINDS.includes(anyItemKind)` stays a plain
 * membership test at call sites.
 */
export const POTION_KINDS: readonly ItemKind[] = POTION_KIND_VALUES;

export const TRAP_KIND_VALUES = [
	"dart",
	"trapdoor",
	"teleport",
	"bear",
	"rust",
	"sleeping-gas",
] as const;

/** Hidden until stepped on — see trapTrigger.ts. */
export type TrapKind = (typeof TRAP_KIND_VALUES)[number];

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
			/** Attacking a still-sleeping enemy — see SNEAK_ATTACK_MULTIPLIER. */
			readonly type: "sneak-attack";
			readonly payload: { readonly target: EnemyKind; readonly damage: number };
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
			/** Climbing back toward the surface — see ascendStairs. */
			readonly type: "floor-ascended";
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
			/** Stepping onto a new kind while at INVENTORY_CAPACITY — the item stays on the floor. */
			readonly type: "inventory-full";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** The "drop" verb — one unit of `kind` leaves the inventory and lands under the player. */
			readonly type: "item-dropped";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** Winning always means the same thing now: surfacing with the amulet. */
			readonly type: "game-won";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Auto-pickup on GOAL_FLOOR, same shape as floor-mapped — see applyAmuletPickup. */
			readonly type: "amulet-obtained";
			readonly payload: Record<string, never>;
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
			/** Fired once, the turn playerFood crosses PLAYER_WEAK_THRESHOLD going down — see calculatePlayerAttackDamage. */
			readonly type: "player-weak";
			readonly payload: Record<string, never>;
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
	  }
	| {
			readonly type: "potion-identified";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			readonly type: "player-strengthened";
			readonly payload: { readonly bonus: number };
	  }
	| {
			/** amount is the actual gold stolen — 0 when the thief struck with nothing to take. */
			readonly type: "gold-stolen";
			readonly payload: { readonly amount: number };
	  }
	| {
			readonly type: "ring-equipped";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** Fired only when the roll succeeds — see applyRegenerationTick. */
			readonly type: "player-regenerated";
			readonly payload: { readonly amount: number };
	  }
	| {
			/** kind is undefined when the inventory was empty — see advanceEnemies. */
			readonly type: "item-stolen";
			readonly payload: { readonly kind: ItemKind | undefined };
	  }
	| {
			/** Always a positive bonus — enchant-weapon is never cursed, unlike a found sword. */
			readonly type: "weapon-enchanted";
			readonly payload: { readonly bonus: number };
	  }
	| {
			/** Always a positive bonus — enchant-armor is never cursed, unlike found armor. */
			readonly type: "armor-enchanted";
			readonly payload: { readonly bonus: number };
	  }
	| {
			/** Fired alongside player-hit when an aquator's rust roll succeeds. */
			readonly type: "armor-rusted";
			readonly payload: { readonly amount: number };
	  }
	| {
			/** Same shape as enemy-hit, kept separate for its own flavor text — see applyWandStrike. */
			readonly type: "wand-struck";
			readonly payload: { readonly target: EnemyKind; readonly damage: number };
	  }
	| {
			/** Drinking a confusion potion — see applyConfusionTick and applyMove. */
			readonly type: "player-confused";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn confusedTurnsRemaining reaches 0 — see applyConfusionTick. */
			readonly type: "confusion-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A wand of slow monster freezing its target — see advanceEnemies. */
			readonly type: "enemy-slowed";
			readonly payload: { readonly target: EnemyKind; readonly turns: number };
	  }
	| {
			/** Drinking a levitation potion — see applyLevitationTick. */
			readonly type: "player-levitated";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn levitationTurnsRemaining reaches 0 — see applyLevitationTick. */
			readonly type: "levitation-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Sets armorProtected — see advanceEnemies' aquator rust check. */
			readonly type: "armor-protected";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Drinking a blindness potion — see applyBlindnessTick and resolveViewRadius. */
			readonly type: "player-blinded";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn blindTurnsRemaining reaches 0 — see applyBlindnessTick. */
			readonly type: "blindness-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Fired each level gained — see applyExperienceGain. */
			readonly type: "player-leveled-up";
			readonly payload: { readonly level: number };
	  }
	| {
			/** Drinking a paralysis potion — see applyParalysisTick. */
			readonly type: "player-paralyzed";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn paralyzedTurnsRemaining reaches 0 — see applyParalysisTick. */
			readonly type: "paralysis-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Drinking a detect monster potion — see applyDetectMonstersTick. */
			readonly type: "player-detected-monsters";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn detectMonstersTurnsRemaining reaches 0 — see applyDetectMonstersTick. */
			readonly type: "detect-monsters-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Drinking a potion of life — permanently raises playerMaxHp and fully heals. */
			readonly type: "player-revitalized";
			readonly payload: { readonly maxHpBonus: number };
	  }
	| {
			/** Fired once turnsOnCurrentFloor reaches WINDS_OF_KRON_WARNING_TURNS — see applyWindsOfKronTick. */
			readonly type: "winds-of-kron-warning";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Fired the turn turnsOnCurrentFloor reaches WINDS_OF_KRON_EVICTION_TURNS — see applyWindsOfKronTick. */
			readonly type: "winds-of-kron-eviction";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Taking off a sword/armor/ring — the mirror of weapon-equipped/armor-equipped/ring-equipped. */
			readonly type: "item-unequipped";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** Trying to unequip a cursed sword/armor/ring — no-op, see items/equipment.ts and items/rings.ts. */
			readonly type: "equip-blocked-cursed";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** A curse revealed the moment an item is equipped — rolled at pickup, only shown now. See items/pickups.ts. */
			readonly type: "curse-revealed";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** A remove-curse scroll freeing every currently-equipped cursed item at once. */
			readonly type: "items-decursed";
			readonly payload: { readonly count: number };
	  }
	| {
			/** An orc defeated by any means (melee or wand) drops a gold bonus on the spot — see combat.ts's applyEnemyHit. */
			readonly type: "orc-gold-drop";
			readonly payload: { readonly amount: number };
	  }
	| {
			/** A teleport wand forcibly relocating its target — see teleport.ts's applyEnemyTeleport. */
			readonly type: "enemy-teleported";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** A confuse monster scroll — see advanceEnemies's confusedTurnsRemaining handling. */
			readonly type: "enemy-confused";
			readonly payload: { readonly target: EnemyKind; readonly turns: number };
	  }
	| {
			/** Drinking a hallucination potion — see turnEnd/hallucination.ts. Cosmetic only, no mechanical effect. */
			readonly type: "player-hallucinated";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn hallucinatingTurnsRemaining reaches 0 — see turnEnd/hallucination.ts. */
			readonly type: "hallucination-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A hold monster scroll freezing one visible enemy — same shape as enemy-slowed, independent flavor text (it's the scroll, not a wand). */
			readonly type: "enemy-held";
			readonly payload: { readonly target: EnemyKind; readonly turns: number };
	  }
	| {
			/** A sleep wand forcing its target back to sleep — see items/wands.ts's applyUseSleepWand. */
			readonly type: "enemy-slept";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** A vampire healing itself off a landed hit — see vampireLifesteal.ts. Fired only when the heal is nonzero (already at max HP is silent). */
			readonly type: "vampire-healed";
			readonly payload: { readonly amount: number };
	  }
	| {
			/** A griffin/troll's passive per-turn self-heal — see enemyRegen.ts. Fired only when the heal is nonzero (already at max HP is silent). */
			readonly type: "enemy-regenerated";
			readonly payload: { readonly target: EnemyKind; readonly amount: number };
	  }
	| {
			/** A wraith's landed hit permanently lowering playerMaxHp — see wraithDrain.ts. Fired only when the drain is nonzero (already at the floor is silent). */
			readonly type: "player-drained";
			readonly payload: { readonly amount: number };
	  }
	| {
			/** A medusa's ranged gaze landing — sets confusedTurnsRemaining, same field as player-confused (the confusion potion) but its own event/flavor text, same "same field, different source" idiom as the sleeping gas trap reusing paralyzedTurnsRemaining. See advanceEnemies. */
			readonly type: "player-gazed";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** An attempt to move away from an adjacent, awake venus-flytrap — the turn is still spent struggling. See advanceTurn.ts's applyMove. */
			readonly type: "player-held";
			readonly payload: { readonly by: EnemyKind };
	  }
	| {
			/** A player melee attack (bump or sneak) that failed its to-hit roll — no damage, no side effects. See combat.ts's applyPlayerAttack. */
			readonly type: "player-attack-missed";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** An adjacent enemy's attack that failed its to-hit roll — no damage, no per-kind side effect (rust/lifesteal/drain) triggers on a miss. See enemyHitLanded.ts. */
			readonly type: "enemy-attack-missed";
			readonly payload: { readonly by: EnemyKind };
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
