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
	"scorpion",
	"emu",
	"kestrel",
	"hobgoblin",
	"centaur",
	"quagga",
	"rhinoceros",
	"jabberwock",
	"griffin",
	"troll",
	"ice-monster",
	"venus-flytrap",
	"medusa",
	"phantom",
	"wraith",
	"xeroc",
] as const;

/** Events carry it so the shell can name the attacker. */
export type EnemyKind = (typeof ENEMY_KIND_VALUES)[number];

/**
 * How a log line names a monster — its kind, or "something" when the player
 * cannot see it (original Rogue's set_mname(); vision.ts's nameEnemy).
 */
export type EnemyName = EnemyKind | "something";

export const ITEM_KIND_VALUES = [
	"heal-potion",
	"weapon",
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
	"confusion",
	"slow-wand",
	"levitation",
	"protect-armor",
	"blindness",
	"raise-level",
	"detect-monster",
	"remove-curse-scroll",
	"teleport-wand",
	"stealth-ring",
	"magic-missile-wand",
	"confuse-monster-scroll",
	"hallucination",
	"hold-monster-scroll",
	"aggravate-monster-ring",
	"protection-ring",
	"add-strength-ring",
	"sustain-strength-ring",
	"adornment-ring",
	"dexterity-ring",
	"increase-damage-ring",
	"teleportation-ring",
	"maintain-armor-ring",
	"restore-strength-potion",
	"extra-healing-potion",
	"haste-self-potion",
	"see-invisible-potion",
	"see-invisible-ring",
	"searching-ring",
	"sleep-scroll",
	"create-monster-scroll",
	"aggravate-monsters-scroll",
] as const;

export type ItemKind = (typeof ITEM_KIND_VALUES)[number];

/** The rings — any two can be worn at once, one per hand (see items/rings.ts). */
export const RING_KINDS = [
	"regeneration-ring",
	"sustenance-ring",
	"stealth-ring",
	"aggravate-monster-ring",
	"protection-ring",
	"add-strength-ring",
	"sustain-strength-ring",
	"adornment-ring",
	"dexterity-ring",
	"increase-damage-ring",
	"teleportation-ring",
	"maintain-armor-ring",
	"see-invisible-ring",
	"searching-ring",
] as const satisfies readonly ItemKind[];

export type RingKind = (typeof RING_KINDS)[number];

const RING_KIND_LIST: readonly ItemKind[] = RING_KINDS;

/** Type guard: narrows an ItemKind to RingKind. */
export const isRingKind = (kind: ItemKind): kind is RingKind =>
	RING_KIND_LIST.includes(kind);

/** The rings that carry a value (original Rogue's o_arm on R_PROTECT/R_ADDSTR/R_ADDHIT/R_ADDDAM): +1 or +2, or -1 and cursed. */
export const VALUED_RING_KINDS = [
	"protection-ring",
	"add-strength-ring",
	"dexterity-ring",
	"increase-damage-ring",
] as const satisfies readonly RingKind[];

export type ValuedRingKind = (typeof VALUED_RING_KINDS)[number];

const VALUED_RING_KIND_LIST: readonly ItemKind[] = VALUED_RING_KINDS;

/** Type guard: narrows an ItemKind to ValuedRingKind. */
export const isValuedRingKind = (kind: ItemKind): kind is ValuedRingKind =>
	VALUED_RING_KIND_LIST.includes(kind);

const EQUIPMENT_ITEM_KIND_VALUES = [
	"weapon",
	"armor",
	...RING_KINDS,
] as const satisfies readonly ItemKind[];

/** The equippable subset of ItemKind — held as a HeldItem with equip/curse state (see GameState.inventory). */
export type EquipmentItemKind = (typeof EQUIPMENT_ITEM_KIND_VALUES)[number];

export const EQUIPMENT_ITEM_KINDS: readonly ItemKind[] =
	EQUIPMENT_ITEM_KIND_VALUES;

/** Type guard form of EQUIPMENT_ITEM_KINDS — narrows an ItemKind to EquipmentItemKind. */
export const isEquipmentItemKind = (
	kind: ItemKind,
): kind is EquipmentItemKind => EQUIPMENT_ITEM_KINDS.includes(kind);

export const WAND_KIND_VALUES = [
	"slow-wand",
	"teleport-wand",
	"magic-missile-wand",
] as const satisfies readonly ItemKind[];

/** The wands — held with a count of charges left (original Rogue's o_charges), used up by zapping, never by the item itself. */
export type WandKind = (typeof WAND_KIND_VALUES)[number];

const WAND_KINDS: readonly ItemKind[] = WAND_KIND_VALUES;

/** Type guard: narrows an ItemKind to WandKind. */
export const isWandKind = (kind: ItemKind): kind is WandKind =>
	WAND_KINDS.includes(kind);

/**
 * Whether a `kind` carries per-item state rolled at floor generation (an
 * itemId and an identity on the floor Item): equipment, and wands with
 * their charges. Every other kind is a plain consumable.
 */
export const hasItemIdentity = (
	kind: ItemKind,
): kind is EquipmentItemKind | WandKind =>
	isEquipmentItemKind(kind) || isWandKind(kind);

/** The nine weapons of original Rogue 5.4, in its own table order — which one a held/floor "weapon" item is. Stats live in items/equipmentKinds.ts. */
export const WEAPON_KIND_VALUES = [
	"mace",
	"long-sword",
	"short-bow",
	"arrow",
	"dagger",
	"two-handed-sword",
	"dart",
	"shuriken",
	"spear",
] as const;

export type WeaponKind = (typeof WEAPON_KIND_VALUES)[number];

/** The eight armors of original Rogue 5.4 — which one a held/floor "armor" item is. Stats live in items/equipmentKinds.ts. */
export const ARMOR_KIND_VALUES = [
	"leather-armor",
	"ring-mail",
	"studded-leather-armor",
	"scale-mail",
	"chain-mail",
	"splint-mail",
	"banded-mail",
	"plate-mail",
] as const;

export type ArmorKind = (typeof ARMOR_KIND_VALUES)[number];

/** Which weapon or armor an event's "weapon"/"armor" item is — absent for every other ItemKind. */
export type EquipmentVariant = WeaponKind | ArmorKind;

/** How an event names one item: see items/equipmentKinds.ts's toItemEventPayload. */
interface ItemEventPayload {
	readonly kind: ItemKind;
	readonly variant?: EquipmentVariant;
}

export const POTION_KIND_VALUES = [
	"heal-potion",
	"poison",
	"strength",
	"confusion",
	"levitation",
	"blindness",
	"raise-level",
	"detect-monster",
	"hallucination",
	"restore-strength-potion",
	"extra-healing-potion",
	"haste-self-potion",
	"see-invisible-potion",
] as const satisfies readonly ItemKind[];

/** The potion subset of ItemKind — lets items/potions.ts switch exhaustively. */
export type PotionKind = (typeof POTION_KIND_VALUES)[number];

/**
 * Kinds with a potion effect — visually identical (same glyph, same generic
 * name) until identified. See GameState.identifiedItemKinds. Typed as the
 * wider ItemKind[] so `POTION_KINDS.includes(anyItemKind)` stays a plain
 * membership test at call sites.
 */
export const POTION_KINDS: readonly ItemKind[] = [...POTION_KIND_VALUES];

/**
 * Kinds whose real name stays hidden behind their run's appearance (a
 * potion's color, a scroll's title, a ring's stone, a wand's material —
 * see appearances.ts) until identified — see GameState.identifiedItemKinds.
 * Food, weapons and armor are always known by name.
 */
/** The scrolls — in original Rogue unknown by name until read, each titled with nonsense words (appearances.ts). */
export const SCROLL_KIND_VALUES = [
	"teleport-scroll",
	"mapping-scroll",
	"identify-scroll",
	"enchant-weapon",
	"enchant-armor",
	"protect-armor",
	"remove-curse-scroll",
	"confuse-monster-scroll",
	"hold-monster-scroll",
	"sleep-scroll",
	"create-monster-scroll",
	"aggravate-monsters-scroll",
] as const satisfies readonly ItemKind[];

export type ScrollKind = (typeof SCROLL_KIND_VALUES)[number];

export const IDENTIFIABLE_ITEM_KINDS: readonly ItemKind[] = [
	...POTION_KIND_VALUES,
	...RING_KINDS,
	...WAND_KIND_VALUES,
	...SCROLL_KIND_VALUES,
];

/** Original Rogue's eight traps (T_DOOR … T_MYST), in its own order — floor/traps.ts draws among them evenly. */
export const TRAP_KIND_VALUES = [
	"trapdoor",
	"arrow",
	"sleeping-gas",
	"bear",
	"teleport",
	"dart",
	"rust",
	"mysterious",
] as const;

/** Hidden until stepped on or searched out, then shown for good — see trapTrigger.ts and search.ts. */
export type TrapKind = (typeof TRAP_KIND_VALUES)[number];

/** What killed the player — an enemy kind, starvation, a trap, or being frozen too long (an ice monster's freeze piled up). */
export type DeathCause = EnemyKind | "hunger" | "trap" | "hypothermia";

/**
 * What happened inside the game world during a turn (diegetic events only —
 * app/session concerns like "saved" or input warnings are shell notices,
 * never events), as plain data. No human-readable strings live here —
 * turning events into prose is the shell's job, concentrated in one module
 * (src/shell/eventMessages.ts) so a future locale swap touches a single file.
 * See the i18n discipline in docs/tasks/game.md.
 */
/** What relocated the player in a player-teleported event. */
export type TeleportSource =
	| "teleport-scroll"
	| "teleport-trap"
	| "teleportation-ring";

export type GameEvent =
	| {
			/** One adjacent enemy's whole attack turn that landed at least once — damage is the sum over its dice (enemyAttack.ts). */
			readonly type: "player-hit";
			readonly payload: { readonly by: EnemyName; readonly damage: number };
	  }
	| {
			readonly type: "enemy-hit";
			readonly payload: { readonly target: EnemyName; readonly damage: number };
	  }
	| {
			readonly type: "enemy-defeated";
			readonly payload: { readonly target: EnemyName };
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
			readonly payload: ItemEventPayload;
	  }
	| {
			/** Stepping onto a new kind while at INVENTORY_CAPACITY — the item stays on the floor. */
			readonly type: "inventory-full";
			readonly payload: ItemEventPayload;
	  }
	| {
			/** The "drop" verb — one unit of `kind` leaves the inventory and lands under the player. */
			readonly type: "item-dropped";
			readonly payload: ItemEventPayload;
	  }
	| {
			/** `>`/`<` that could not be taken — see floor/transitions.ts's resolveStairsRefusal. No turn passes. */
			readonly type: "stairs-refused";
			readonly payload: {
				readonly direction: "down" | "up";
				readonly reason: "no-stairs" | "levitating" | "magically-blocked";
			};
	  }
	| {
			/** Winning always means the same thing now: surfacing with the amulet. */
			readonly type: "game-won";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Auto-pickup on a floor from AMULET_FLOOR down, same shape as floor-mapped — see applyAmuletPickup. */
			readonly type: "amulet-obtained";
			readonly payload: Record<string, never>;
	  }
	| {
			/** The weapon's own to-hit and damage bonuses, revealed the moment it is wielded. */
			readonly type: "weapon-equipped";
			readonly payload: {
				readonly weaponKind: WeaponKind;
				readonly hitBonus: number;
				readonly damageBonus: number;
			};
	  }
	| {
			/** armorClass is what the player's armor class becomes — the kind's own class adjusted by this armor's enchantment, curse and rust. */
			readonly type: "armor-equipped";
			readonly payload: {
				readonly armorKind: ArmorKind;
				readonly armorClass: number;
			};
	  }
	| {
			/** Fired once, the turn playerFood crosses the warning threshold going down. */
			readonly type: "player-hungry";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Fainting from an empty stomach — `turns` of paralysis. See turnEnd/hunger.ts. */
			readonly type: "player-fainted";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired once, the turn playerFood crosses PLAYER_WEAK_THRESHOLD going down — a warning only, as in original Rogue. See turnEnd/hunger.ts. */
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
			/** A poison potion drunk — strengthLost is what it actually took (0 once strength is at its floor). */
			readonly type: "player-poisoned";
			readonly payload: { readonly strengthLost: number };
	  }
	| {
			/** source tells the log which wording to use — the relocation itself is identical (teleport.ts). */
			readonly type: "player-teleported";
			readonly payload: {
				readonly x: number;
				readonly y: number;
				readonly source: TeleportSource;
			};
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
			/** A restore strength potion — `strength` is playerStrength after it. See items/potions.ts. */
			readonly type: "strength-restored";
			readonly payload: { readonly strength: number };
	  }
	| {
			/** A haste self potion starting `turns` of two moves a turn — see items/potions.ts. */
			readonly type: "player-hasted";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** A haste self potion drunk while already hasted: fainting for `turns` (original Rogue's add_haste()). */
			readonly type: "player-exhausted";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** A sleep scroll: the player falls asleep for `turns` (original Rogue's S_SLEEP). */
			readonly type: "player-fell-asleep";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** A create monster scroll bringing a monster next to the player — or, with no room, only "a faint cry" (`target` undefined). */
			readonly type: "monster-created";
			readonly payload: { readonly target: EnemyKind | undefined };
	  }
	| {
			/** An aggravate monsters scroll waking every monster on the floor. */
			readonly type: "monsters-aggravated";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A thrown weapon that met no monster, falling near where it stopped — see throw.ts. */
			readonly type: "missile-landed";
			readonly payload: { readonly variant: EquipmentVariant };
	  }
	| {
			/** Searching (the `s` key, or a worn searching ring) turned up a hidden trap next to the player — see search.ts. */
			readonly type: "trap-found";
			readonly payload: { readonly kind: TrapKind };
	  }
	| {
			/** A move tried while held by a bear trap (original Rogue's no_move): it fails and the turn passes. */
			readonly type: "player-stuck";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A mysterious trap's harmless sensation — `variant` picks which of original Rogue's eleven messages. */
			readonly type: "trap-mystery";
			readonly payload: { readonly variant: number };
	  }
	| {
			/** A see invisible potion — invisible monsters show for `turns` (turnEnd/statusCountdowns.ts). */
			readonly type: "player-sees-invisible";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn seeInvisibleTurnsRemaining reaches 0. */
			readonly type: "see-invisible-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Fired the turn hasteTurnsRemaining reaches 0 — see turnEnd/statusCountdowns.ts. */
			readonly type: "haste-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Putting on a ring with one already on each hand — refused (original Rogue's ring_on()). */
			readonly type: "ring-hands-full";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A wand zapped with no charges left — nothing happens, the turn passes (original Rogue's do_zap()). */
			readonly type: "wand-empty";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** A scroll read with nothing to work on (no weapon/armor worn, nothing cursed, no potion picked) — still used up. See items/equipmentScrolls.ts's applyScrollWasted. */
			readonly type: "scroll-wasted";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** A gain strength potion drunk — `strength` is the new playerStrength. */
			readonly type: "player-strengthened";
			readonly payload: { readonly strength: number };
	  }
	| {
			/** amount is the actual gold stolen (capped at what the player carried) — 0 when the thief struck with nothing to take. */
			readonly type: "gold-stolen";
			readonly payload: { readonly amount: number };
	  }
	| {
			readonly type: "ring-equipped";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** A nymph's landed hit taking one unequipped magic item — see enemies/enemyFlee.ts. */
			readonly type: "item-stolen";
			readonly payload: {
				readonly kind: ItemKind;
				readonly variant?: EquipmentVariant;
			};
	  }
	| {
			/** Which of the weapon's two bonuses the scroll raised (a coin flip, as in original Rogue) and by how much. Also lifts the weapon's curse. */
			readonly type: "weapon-enchanted";
			readonly payload: {
				readonly stat: "hit" | "damage";
				readonly bonus: number;
			};
	  }
	| {
			/** Always a positive bonus. Also lifts the armor's curse. */
			readonly type: "armor-enchanted";
			readonly payload: { readonly bonus: number };
	  }
	| {
			/** Fired alongside player-hit when an aquator's rust roll succeeds. */
			readonly type: "armor-rusted";
			readonly payload: { readonly amount: number };
	  }
	| {
			/** A rust attempt the worn armor's protection (the protect-armor scroll) blocked — equipment.ts's resolveArmorRust. */
			readonly type: "armor-rust-blocked";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A thrown weapon that connected — see items/throw.ts. The missile itself is used up. */
			readonly type: "missile-hit";
			readonly payload: {
				readonly target: EnemyName;
				readonly variant: WeaponKind;
				readonly damage: number;
			};
	  }
	| {
			/** A thrown weapon that missed — it lands near the target (or is lost if there is nowhere for it to fall). */
			readonly type: "missile-missed";
			readonly payload: {
				readonly target: EnemyName;
				readonly variant: WeaponKind;
			};
	  }
	| {
			/** A magic missile that landed — same shape as enemy-hit, kept separate for its own flavor text. See items/wands.ts's applyMagicMissileWandStrike. */
			readonly type: "wand-struck";
			readonly payload: { readonly target: EnemyName; readonly damage: number };
	  }
	| {
			/** A magic missile the target saved against — it vanishes, no damage. See items/wands.ts's applyMagicMissileWandStrike. */
			readonly type: "magic-missile-vanished";
			readonly payload: { readonly target: EnemyName };
	  }
	| {
			/** Drinking a confusion potion — see applyStatusCountdownTicks and applyMove. */
			readonly type: "player-confused";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn confusedTurnsRemaining reaches 0 — see applyStatusCountdownTicks. */
			readonly type: "confusion-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A wand of slow monster slowing its target for good (it acts every other move) — see items/wands.ts. */
			readonly type: "enemy-slowed";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** A wand of slow monster that only took away its hasted target's haste — see items/wands.ts. */
			readonly type: "enemy-slowed-removed";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** Drinking a levitation potion — see applyStatusCountdownTicks. */
			readonly type: "player-levitated";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn levitationTurnsRemaining reaches 0 — see applyStatusCountdownTicks. */
			readonly type: "levitation-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Sets armorProtected — see advanceEnemies' aquator rust check. */
			readonly type: "armor-protected";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Drinking a blindness potion — see applyStatusCountdownTicks and resolveViewRadius. */
			readonly type: "player-blinded";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn blindTurnsRemaining reaches 0 — see applyStatusCountdownTicks. */
			readonly type: "blindness-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Fired each level gained — see applyExperienceGain. */
			readonly type: "player-leveled-up";
			readonly payload: { readonly level: number };
	  }
	| {
			/** Fired the turn paralyzedTurnsRemaining reaches 0 — see applyStatusCountdownTicks. */
			readonly type: "paralysis-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Drinking a detect monster potion — see applyStatusCountdownTicks. */
			readonly type: "player-detected-monsters";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn detectMonstersTurnsRemaining reaches 0 — see applyStatusCountdownTicks. */
			readonly type: "detect-monsters-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Taking off a weapon/armor/ring — the mirror of weapon-equipped/armor-equipped/ring-equipped. */
			readonly type: "item-unequipped";
			readonly payload: { readonly kind: ItemKind };
	  }
	| {
			/** Trying to unequip a cursed weapon/armor/ring — no-op, see items/equipment.ts and items/rings.ts. */
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
			/** An orc or thief defeated by any means (melee or wand) drops gold on the spot — see combat.ts's applyEnemyHit. */
			readonly type: "enemy-gold-drop";
			readonly payload: { readonly by: EnemyKind; readonly amount: number };
	  }
	| {
			/** A teleport wand forcibly relocating its target — see teleport.ts's applyEnemyTeleport. */
			readonly type: "enemy-teleported";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** A monster hit while the player's hands glowed is confused (Enemy.confused) — see combat/combat.ts's applyEnemyHit. */
			readonly type: "enemy-confused";
			readonly payload: { readonly target: EnemyName };
	  }
	| {
			/** Reading a confuse monster scroll: the player's hands glow until they next hit something (GameState.nextHitConfuses). */
			readonly type: "hands-glowing";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A search turned up a secret door (original Rogue's "a secret door") — see search.ts. A secret passage turns up silently. */
			readonly type: "secret-door-found";
			readonly payload: Record<string, never>;
	  }
	| {
			/** The glow passing into the monster just hit. */
			readonly type: "hands-stopped-glowing";
			readonly payload: Record<string, never>;
	  }
	| {
			/** Drinking a hallucination potion — see turnEnd/statusCountdowns.ts. Cosmetic only, no mechanical effect. */
			readonly type: "player-hallucinated";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** Fired the turn hallucinatingTurnsRemaining reaches 0 — see turnEnd/statusCountdowns.ts. */
			readonly type: "hallucination-faded";
			readonly payload: Record<string, never>;
	  }
	| {
			/** A hold monster scroll stopping one monster near the player until it is attacked — see items/scrolls.ts. */
			readonly type: "enemy-held";
			readonly payload: { readonly target: EnemyKind };
	  }
	| {
			/** A vampire's or wraith's landed hit draining max HP (and HP) for good — see enemies/vitalityDrain.ts. */
			readonly type: "player-drained";
			readonly payload: {
				readonly by: "vampire" | "wraith";
				readonly maxHpLost: number;
			};
	  }
	| {
			/** A wraith's drain taking a level — logged before its player-drained. `level` is the level the player drops to. */
			readonly type: "player-level-drained";
			readonly payload: { readonly level: number };
	  }
	| {
			/** A medusa's ranged gaze landing — sets confusedTurnsRemaining, same field as player-confused (the confusion potion) but its own event/flavor text, same "same field, different source" idiom as the sleeping gas trap reusing paralyzedTurnsRemaining. See advanceEnemies. */
			readonly type: "player-gazed";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** A poisoned wound (a dart trap's dart, a scorpion's sting) costing strength — see strength.ts's resolvePoisonDrain. */
			readonly type: "player-strength-drained";
			readonly payload: { readonly strengthLost: number };
	  }
	| {
			/** An ice monster's hit freezing a player who was not frozen yet — sets paralyzedTurnsRemaining, the same field as the paralysis potion and the sleeping gas trap. See enemies/iceMonsterFreeze.ts. */
			readonly type: "player-frozen";
			readonly payload: { readonly turns: number };
	  }
	| {
			/** An attempt to move away from an adjacent, awake venus-flytrap — the turn is still spent struggling. See advanceTurn.ts's applyMove. */
			readonly type: "player-held";
			readonly payload: { readonly by: EnemyKind };
	  }
	| {
			/** A player melee attack that failed its to-hit roll — no damage, no side effects. See combat.ts's applyPlayerAttack. */
			readonly type: "player-attack-missed";
			readonly payload: { readonly target: EnemyName };
	  }
	| {
			/** An adjacent enemy's whole attack turn in which every die failed its to-hit roll — no damage, no per-kind side effect (rust/lifesteal/drain). See enemyAttack.ts. */
			readonly type: "enemy-attack-missed";
			readonly payload: { readonly by: EnemyName };
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
