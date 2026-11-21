/* file-size-exception: 手書きセーブ検証 — 依存追加禁止(zod不採用)の受容コスト。型ナローイングの都合で逐次チェックが必要(2026-07-18裁可) */

import { err, ok, type Result } from "../../result.js";
import type { RngState } from "../../rng.js";
import {
	type ItemAppearances,
	POTION_COLOR_COUNT,
	RING_STONE_VALUES,
	SCROLL_SYLLABLE_COUNT,
	WAND_METAL_COUNT,
	WAND_WOOD_COUNT,
} from "../appearances.js";
import { PLAYER_MAX_FOOD, STARVATION_TURNS } from "../balance.js";
import { STRENGTH_MAX, STRENGTH_MIN } from "../combat/strength.js";
import {
	ARMOR_KIND_VALUES,
	type DeathCause,
	ENEMY_KIND_VALUES,
	type EnemyKind,
	type GameEvent,
	ITEM_KIND_VALUES,
	type ItemKind,
	isEquipmentItemKind,
	isValuedRingKind,
	isWandKind,
	POTION_KIND_VALUES,
	RING_KINDS,
	SCROLL_KIND_VALUES,
	TRAP_KIND_VALUES,
	type TrapKind,
	WAND_KIND_VALUES,
	WEAPON_KIND_VALUES,
} from "../events.js";
import type {
	DungeonRoom,
	Enemy,
	EnemySpeed,
	GameState,
	GoldPile,
	HeldItem,
	HiddenTile,
	Item,
	Position,
	Trap,
} from "../state.js";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const isPositiveInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value > 0;

/** Any integer, negative included — a cursed weapon/armor's bonus can go below 0. */
const isInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value);

const isNonNegativeInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value >= 0;

export const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/** A column-major width×height grid whose every cell satisfies `isCell`. */
const isGrid = <CellValue>(
	value: unknown,
	width: number,
	height: number,
	isCell: (cell: unknown) => cell is CellValue,
): value is readonly (readonly CellValue[])[] =>
	Array.isArray(value) &&
	value.length === width &&
	value.every(
		(column) =>
			Array.isArray(column) && column.length === height && column.every(isCell),
	);

const isTerrainValue = (value: unknown): value is number =>
	value === 0 || value === 1;

const isBooleanValue = (value: unknown): value is boolean =>
	typeof value === "boolean";

/** A position inside the grid, standing on a floor tile. */
const standsOnFloor = (
	value: Record<string, unknown>,
	terrain: readonly (readonly number[])[],
): boolean => {
	const { x, y } = value;
	if (!isFiniteNumber(x) || !Number.isInteger(x) || x < 0) {
		return false;
	}
	if (!isFiniteNumber(y) || !Number.isInteger(y) || y < 0) {
		return false;
	}
	return terrain[x]?.[y] === 0;
};

/** Membership test against a literal-value catalog, doubling as a type guard. */
const isOneOf = <Member>(
	values: readonly Member[],
	value: unknown,
): value is Member => values.some((candidate) => candidate === value);

const ENEMY_SPEEDS: readonly EnemySpeed[] = [
	"normal",
	"hasted",
	"slowed-acting",
	"slowed-resting",
];

export const isEnemyKind = (value: unknown): value is EnemyKind =>
	isOneOf(ENEMY_KIND_VALUES, value);

const isDeathCause = (value: unknown): value is DeathCause =>
	isEnemyKind(value) ||
	isOneOf(["hunger", "trap", "hypothermia"] as const, value);

const isEnemyArray = (
	value: unknown,
	terrain: readonly (readonly number[])[],
): value is readonly Enemy[] =>
	Array.isArray(value) &&
	value.every(
		(enemy) =>
			isRecord(enemy) &&
			standsOnFloor(enemy, terrain) &&
			isEnemyKind(enemy.kind) &&
			isPositiveInteger(enemy.hp) &&
			isPositiveInteger(enemy.maxHp) &&
			enemy.hp <= enemy.maxHp &&
			isBooleanValue(enemy.awake) &&
			isOneOf(ENEMY_SPEEDS, enemy.speed) &&
			isBooleanValue(enemy.held) &&
			isItemArray(enemy.carried, terrain) &&
			isBooleanValue(enemy.mean) &&
			isBooleanValue(enemy.gazeUsed) &&
			isBooleanValue(enemy.confused) &&
			(enemy.goal === undefined ||
				(isRecord(enemy.goal) &&
					Number.isInteger(enemy.goal.x) &&
					Number.isInteger(enemy.goal.y))),
	);

const isEnemyName = (value: unknown): boolean =>
	value === "something" || isEnemyKind(value);

export const isItemKind = (value: unknown): value is ItemKind =>
	isOneOf(ITEM_KIND_VALUES, value);

const isItemKindArray = (value: unknown): value is readonly ItemKind[] =>
	Array.isArray(value) && value.every(isItemKind);

/** The fields a weapon or armor carries beyond itemId/cursed — which kind it is and its own bonuses. Rings carry none. */
const hasEquipmentStats = (
	kind: ItemKind,
	value: Record<string, unknown>,
): boolean => {
	if (kind === "weapon") {
		return (
			isOneOf(WEAPON_KIND_VALUES, value.weaponKind) &&
			isInteger(value.hitBonus) &&
			isInteger(value.damageBonus) &&
			isPositiveInteger(value.quantity)
		);
	}
	if (kind === "armor") {
		return (
			isOneOf(ARMOR_KIND_VALUES, value.armorKind) &&
			isInteger(value.defenseBonus) &&
			isBooleanValue(value.rustProtected)
		);
	}
	if (isValuedRingKind(kind)) {
		return isInteger(value.bonus);
	}
	return true;
};

/** An event payload naming one item: its ItemKind, plus which weapon/armor it is when it is one. */
const isItemEventPayload = (payload: Record<string, unknown>): boolean =>
	isItemKind(payload.kind) &&
	(payload.variant === undefined ||
		(payload.kind === "weapon" &&
			isOneOf(WEAPON_KIND_VALUES, payload.variant)) ||
		(payload.kind === "armor" && isOneOf(ARMOR_KIND_VALUES, payload.variant)));

/**
 * A held item: itemId + kind, plus (for weapon/armor/ring kinds only) the
 * equip/curse/bonus state HeldItem carries — see state.ts's doc comment.
 */
const isHeldItem = (value: unknown): value is HeldItem => {
	if (
		!isRecord(value) ||
		!isPositiveInteger(value.itemId) ||
		!isItemKind(value.kind)
	) {
		return false;
	}
	if (isWandKind(value.kind)) {
		return isNonNegativeInteger(value.charges);
	}
	if (!isEquipmentItemKind(value.kind)) {
		return true;
	}
	if (!isBooleanValue(value.equipped) || !isBooleanValue(value.cursed)) {
		return false;
	}
	return hasEquipmentStats(value.kind, value);
};

const isHeldItemArray = (value: unknown): value is readonly HeldItem[] =>
	Array.isArray(value) && value.every(isHeldItem);

/**
 * A weapon/armor/ring's identity on a floor Item — same shape as HeldItem's
 * equip state minus `equipped` (meaningless on the ground). Rolled once at
 * floor generation, so every equipment-kind Item always carries one — see
 * Item's doc comment in state.ts.
 */
const isItemIdentity = (kind: ItemKind, value: unknown): boolean => {
	if (
		!isRecord(value) ||
		!isPositiveInteger(value.itemId) ||
		!isBooleanValue(value.cursed)
	) {
		return false;
	}
	return hasEquipmentStats(kind, value);
};

const isItemArray = (
	value: unknown,
	terrain: readonly (readonly number[])[],
): value is readonly Item[] =>
	Array.isArray(value) &&
	value.every((item) => {
		if (
			!isRecord(item) ||
			!standsOnFloor(item, terrain) ||
			!isItemKind(item.kind)
		) {
			return false;
		}
		if (isWandKind(item.kind)) {
			return (
				isRecord(item.identity) &&
				isPositiveInteger(item.identity.itemId) &&
				isNonNegativeInteger(item.identity.charges)
			);
		}
		if (!isEquipmentItemKind(item.kind)) {
			return true;
		}
		return isItemIdentity(item.kind, item.identity);
	});

const isGoldPileArray = (
	value: unknown,
	terrain: readonly (readonly number[])[],
): value is readonly GoldPile[] =>
	Array.isArray(value) &&
	value.every(
		(pile) =>
			isRecord(pile) &&
			standsOnFloor(pile, terrain) &&
			isPositiveInteger(pile.amount),
	);

const isTrapKind = (value: unknown): value is TrapKind =>
	isOneOf(TRAP_KIND_VALUES, value);

const isTrapArray = (
	value: unknown,
	terrain: readonly (readonly number[])[],
): value is readonly Trap[] =>
	Array.isArray(value) &&
	value.every(
		(trap) =>
			isRecord(trap) &&
			standsOnFloor(trap, terrain) &&
			isTrapKind(trap.kind) &&
			isBooleanValue(trap.seen),
	);

const isHiddenTileArray = (
	value: unknown,
	terrain: readonly (readonly number[])[],
): value is readonly HiddenTile[] =>
	Array.isArray(value) &&
	value.every(
		(tile) =>
			isRecord(tile) &&
			Number.isInteger(tile.x) &&
			Number.isInteger(tile.y) &&
			typeof tile.x === "number" &&
			typeof tile.y === "number" &&
			terrain[tile.x]?.[tile.y] === 1 &&
			(tile.kind === "door" || tile.kind === "passage"),
	);

type PayloadValidator = (payload: Record<string, unknown>) => boolean;

/** An event whose payload is always empty carries nothing to validate. */
const emptyPayload: PayloadValidator = () => true;

/**
 * One payload validator per event type. Keyed by GameEvent["type"], so adding
 * an event without adding its validator is a compile error (the old switch's
 * `default: return false` only failed at runtime).
 */
const EVENT_PAYLOAD_VALIDATORS: Readonly<
	Record<GameEvent["type"], PayloadValidator>
> = {
	/* 0 is a real outcome on the original's scale: an aquator's hit only rusts, and a cursed weapon's penalty can cancel a low roll */
	"player-hit": (payload) =>
		isEnemyName(payload.by) && isNonNegativeInteger(payload.damage),
	"enemy-hit": (payload) =>
		isEnemyName(payload.target) && isNonNegativeInteger(payload.damage),
	"enemy-defeated": (payload) => isEnemyName(payload.target),
	"player-died": (payload) => isDeathCause(payload.by),
	"floor-descended": (payload) => isPositiveInteger(payload.floor),
	"floor-ascended": (payload) => isPositiveInteger(payload.floor),
	"amulet-obtained": emptyPayload,
	"player-healed": (payload) =>
		isItemKind(payload.by) && isNonNegativeInteger(payload.amount),
	"item-picked-up": isItemEventPayload,
	"inventory-full": isItemEventPayload,
	"item-dropped": isItemEventPayload,
	"game-won": emptyPayload,
	"weapon-equipped": (payload) =>
		isOneOf(WEAPON_KIND_VALUES, payload.weaponKind) &&
		isInteger(payload.hitBonus) &&
		isInteger(payload.damageBonus),
	"armor-equipped": (payload) =>
		isOneOf(ARMOR_KIND_VALUES, payload.armorKind) &&
		isInteger(payload.armorClass),
	"player-hungry": emptyPayload,
	"player-weak": emptyPayload,
	"player-fainted": (payload) => isPositiveInteger(payload.turns),
	"player-ate": (payload) => isNonNegativeInteger(payload.amount),
	"gold-collected": (payload) => isPositiveInteger(payload.amount),
	/* any kind can deal 0: the zero-damage kinds always, a dart trap when its dart misses */
	"trap-triggered": (payload) =>
		isTrapKind(payload.kind) && isNonNegativeInteger(payload.damage),
	"player-poisoned": (payload) => isNonNegativeInteger(payload.strengthLost),
	"player-teleported": (payload) =>
		isNonNegativeInteger(payload.x) &&
		isNonNegativeInteger(payload.y) &&
		(payload.source === "teleport-scroll" ||
			payload.source === "teleport-trap" ||
			payload.source === "teleportation-ring"),
	"floor-mapped": emptyPayload,
	"potion-identified": (payload) => isItemKind(payload.kind),
	"player-strengthened": (payload) =>
		isInteger(payload.strength) &&
		payload.strength >= STRENGTH_MIN &&
		payload.strength <= STRENGTH_MAX,
	"gold-stolen": (payload) => isNonNegativeInteger(payload.amount),
	"item-stolen": (payload) => isItemEventPayload(payload),
	"stairs-refused": (payload) =>
		(payload.direction === "down" || payload.direction === "up") &&
		(payload.reason === "no-stairs" ||
			payload.reason === "levitating" ||
			payload.reason === "magically-blocked"),
	"scroll-wasted": (payload) => isItemKind(payload.kind),
	"wand-empty": (payload) => isItemKind(payload.kind),
	"ring-hands-full": emptyPayload,
	"strength-restored": (payload) =>
		isInteger(payload.strength) &&
		payload.strength >= STRENGTH_MIN &&
		payload.strength <= STRENGTH_MAX,
	"player-hasted": (payload) => isPositiveInteger(payload.turns),
	"player-exhausted": (payload) => isNonNegativeInteger(payload.turns),
	"haste-faded": emptyPayload,
	"player-sees-invisible": (payload) => isPositiveInteger(payload.turns),
	"see-invisible-faded": emptyPayload,
	"trap-found": (payload) => isTrapKind(payload.kind),
	"player-fell-asleep": (payload) => isPositiveInteger(payload.turns),
	"monster-created": (payload) =>
		payload.target === undefined || isEnemyKind(payload.target),
	"monsters-aggravated": emptyPayload,
	"missile-landed": (payload) => isOneOf(WEAPON_KIND_VALUES, payload.variant),
	"player-stuck": emptyPayload,
	"trap-mystery": (payload) =>
		isNonNegativeInteger(payload.variant) && payload.variant < 11,
	"ring-equipped": (payload) => isItemKind(payload.kind),
	"player-drained": (payload) =>
		(payload.by === "vampire" || payload.by === "wraith") &&
		isPositiveInteger(payload.maxHpLost),
	"player-level-drained": (payload) => isPositiveInteger(payload.level),
	"player-gazed": (payload) => isPositiveInteger(payload.turns),
	"player-held": (payload) => isEnemyKind(payload.by),
	"player-frozen": (payload) => isPositiveInteger(payload.turns),
	"player-strength-drained": (payload) =>
		isPositiveInteger(payload.strengthLost),
	"weapon-enchanted": (payload) =>
		(payload.stat === "hit" || payload.stat === "damage") &&
		isPositiveInteger(payload.bonus),
	"armor-enchanted": (payload) => isPositiveInteger(payload.bonus),
	"armor-rusted": (payload) => isPositiveInteger(payload.amount),
	"armor-rust-blocked": emptyPayload,
	"missile-hit": (payload) =>
		isEnemyName(payload.target) &&
		isOneOf(WEAPON_KIND_VALUES, payload.variant) &&
		isNonNegativeInteger(payload.damage),
	"missile-missed": (payload) =>
		isEnemyName(payload.target) && isOneOf(WEAPON_KIND_VALUES, payload.variant),
	"wand-struck": (payload) =>
		isEnemyName(payload.target) && isPositiveInteger(payload.damage),
	"magic-missile-vanished": (payload) => isEnemyName(payload.target),
	"player-confused": (payload) => isPositiveInteger(payload.turns),
	"confusion-faded": emptyPayload,
	"enemy-slowed": (payload) => isEnemyKind(payload.target),
	"enemy-slowed-removed": (payload) => isEnemyKind(payload.target),
	"enemy-hasted": (payload) => isEnemyKind(payload.target),
	"enemy-pulled": (payload) => isEnemyKind(payload.target),
	"room-lit": emptyPayload,
	"corridor-glowed": emptyPayload,
	"enemy-unslowed": (payload) => isEnemyKind(payload.target),
	"player-levitated": (payload) => isPositiveInteger(payload.turns),
	"levitation-faded": emptyPayload,
	"armor-protected": emptyPayload,
	"player-blinded": (payload) => isPositiveInteger(payload.turns),
	"blindness-faded": emptyPayload,
	"player-leveled-up": (payload) => isPositiveInteger(payload.level),
	"paralysis-faded": emptyPayload,
	"player-detected-monsters": (payload) => isPositiveInteger(payload.turns),
	"detect-monsters-faded": emptyPayload,
	"item-unequipped": (payload) => isItemKind(payload.kind),
	"equip-blocked-cursed": (payload) => isItemKind(payload.kind),
	"curse-revealed": (payload) => isItemKind(payload.kind),
	"items-decursed": (payload) => isPositiveInteger(payload.count),
	"enemy-gold-drop": (payload) =>
		isEnemyKind(payload.by) && isPositiveInteger(payload.amount),
	"enemy-teleported": (payload) => isEnemyKind(payload.target),
	"enemy-confused": (payload) => isEnemyName(payload.target),
	"hands-glowing": emptyPayload,
	"hands-stopped-glowing": emptyPayload,
	"secret-door-found": emptyPayload,
	"player-flamed": (payload) => isPositiveInteger(payload.damage),
	"flame-dodged": emptyPayload,
	"enemy-flamed": (payload) =>
		isEnemyName(payload.target) && isPositiveInteger(payload.damage),
	"player-hallucinated": (payload) => isPositiveInteger(payload.turns),
	"hallucination-faded": emptyPayload,
	"enemy-held": (payload) => isEnemyKind(payload.target),
	"player-attack-missed": (payload) => isEnemyName(payload.target),
	"enemy-attack-missed": (payload) => isEnemyName(payload.by),
};

/** The same table widened for lookup by an untrusted string key. */
const EVENT_VALIDATOR_LOOKUP: Readonly<Record<string, PayloadValidator>> =
	EVENT_PAYLOAD_VALIDATORS;

const isGameEvent = (value: unknown): boolean => {
	if (
		!isRecord(value) ||
		typeof value.type !== "string" ||
		!isRecord(value.payload)
	) {
		return false;
	}
	const validatePayload = EVENT_VALIDATOR_LOOKUP[value.type];
	return validatePayload?.(value.payload) ?? false;
};

const isGameEventArray = (value: unknown): value is readonly GameEvent[] =>
	Array.isArray(value) && value.every(isGameEvent);

const isRngState = (value: unknown): value is RngState =>
	isRecord(value) &&
	isFiniteNumber(value.s0) &&
	isFiniteNumber(value.s1) &&
	isFiniteNumber(value.s2) &&
	isFiniteNumber(value.c);

/**
 * Checks that an untrusted value (a parsed save file) is a well-formed,
 * in-progress GameState, and rebuilds it from known fields only so unknown
 * extras never leak in. The error is the name of the first offending field.
 * Structural checks plus basic semantic ones (dimensions agree, actors stand
 * on floor tiles, hp in range); a save is only ever written mid-run, so
 * status must be "playing".
 */
/** One floor (or carried) Item rebuilt from known fields only. */
const rebuildItem = (item: Item): Item => {
	const position = { x: item.x, y: item.y };
	switch (item.kind) {
		case "weapon":
			return { ...position, kind: "weapon", identity: item.identity };
		case "armor":
			return { ...position, kind: "armor", identity: item.identity };
		case "regeneration-ring":
		case "sustenance-ring":
		case "stealth-ring":
		case "aggravate-monster-ring":
		case "sustain-strength-ring":
		case "adornment-ring":
		case "teleportation-ring":
		case "maintain-armor-ring":
		case "see-invisible-ring":
		case "searching-ring":
			return {
				...position,
				kind: item.kind,
				identity: item.identity,
			};
		case "protection-ring":
		case "add-strength-ring":
		case "dexterity-ring":
		case "increase-damage-ring":
			return {
				...position,
				kind: item.kind,
				identity: item.identity,
			};
		case "slow-wand":
		case "teleport-wand":
		case "magic-missile-wand":
		case "light-wand":
		case "nothing-wand":
		case "teleport-to-wand":
		case "haste-monster-wand":
			return {
				...position,
				kind: item.kind,
				identity: item.identity,
			};
		default:
			return { ...position, kind: item.kind };
	}
};

/** An index map over `kinds`, every value an integer in 0..count-1. */
const isIndexRecord = (
	value: unknown,
	kinds: readonly string[],
	count: number,
): boolean =>
	isRecord(value) &&
	kinds.every((kind) => {
		const index = value[kind];
		return isNonNegativeInteger(index) && index < count;
	});

const isAppearances = (value: unknown): value is ItemAppearances =>
	isRecord(value) &&
	isIndexRecord(value.potionColors, POTION_KIND_VALUES, POTION_COLOR_COUNT) &&
	isIndexRecord(value.ringStones, RING_KINDS, RING_STONE_VALUES.length) &&
	isIndexRecord(
		value.wandMaterials,
		WAND_KIND_VALUES,
		WAND_WOOD_COUNT + WAND_METAL_COUNT,
	) &&
	isRecord(value.scrollTitles) &&
	SCROLL_KIND_VALUES.every((kind) => {
		const title = (value.scrollTitles as Record<string, unknown>)[kind];
		return (
			Array.isArray(title) &&
			title.length > 0 &&
			title.every(
				(word) =>
					Array.isArray(word) &&
					word.length > 0 &&
					word.every(
						(syllable) =>
							isNonNegativeInteger(syllable) &&
							syllable < SCROLL_SYLLABLE_COUNT,
					),
			)
		);
	});

const isDungeonRoomArray = (value: unknown): value is readonly DungeonRoom[] =>
	Array.isArray(value) &&
	value.every(
		(room) =>
			isRecord(room) &&
			isNonNegativeInteger(room.x1) &&
			isNonNegativeInteger(room.y1) &&
			isNonNegativeInteger(room.x2) &&
			isNonNegativeInteger(room.y2) &&
			room.x1 <= room.x2 &&
			room.y1 <= room.y2 &&
			isBooleanValue(room.dark),
	);

export const validateGameState = (
	value: unknown,
): Result<GameState, string> => {
	/* The per-field checks below are deliberately NOT a data-driven loop:
	 * each `if (!isX(field)) return err(...)` narrows the field's static type,
	 * and the ok(...) construction at the bottom depends on every one of those
	 * narrowings. A generic loop would validate at runtime but leave the
	 * fields `unknown`, forcing casts this codebase forbids. */
	if (!isRecord(value)) {
		return err("root");
	}
	const { width, height } = value;
	if (!isPositiveInteger(width)) {
		return err("width");
	}
	if (!isPositiveInteger(height)) {
		return err("height");
	}
	const terrain = value.terrain;
	if (!isGrid(terrain, width, height, isTerrainValue)) {
		return err("terrain");
	}
	const explored = value.explored;
	if (!isGrid(explored, width, height, isBooleanValue)) {
		return err("explored");
	}
	const player = value.player;
	if (
		!isRecord(player) ||
		!standsOnFloor(player, terrain) ||
		!isFiniteNumber(player.x) ||
		!isFiniteNumber(player.y)
	) {
		return err("player");
	}
	const playerMaxHp = value.playerMaxHp;
	if (!isPositiveInteger(playerMaxHp)) {
		return err("playerMaxHp");
	}
	const playerHp = value.playerHp;
	if (!isPositiveInteger(playerHp) || playerHp > playerMaxHp) {
		return err("playerHp");
	}
	const playerLevel = value.playerLevel;
	if (!isPositiveInteger(playerLevel)) {
		return err("playerLevel");
	}
	const playerExperience = value.playerExperience;
	if (!isNonNegativeInteger(playerExperience)) {
		return err("playerExperience");
	}
	const playerMaxStrength = value.playerMaxStrength;
	if (
		!isInteger(playerMaxStrength) ||
		playerMaxStrength < STRENGTH_MIN ||
		playerMaxStrength > STRENGTH_MAX
	) {
		return err("playerMaxStrength");
	}
	const playerStrength = value.playerStrength;
	if (
		!isInteger(playerStrength) ||
		playerStrength < STRENGTH_MIN ||
		playerStrength > playerMaxStrength
	) {
		return err("playerStrength");
	}
	const playerFood = value.playerFood;
	if (
		!isInteger(playerFood) ||
		playerFood > PLAYER_MAX_FOOD ||
		playerFood < -STARVATION_TURNS - 1
	) {
		return err("playerFood");
	}
	const confusedTurnsRemaining = value.confusedTurnsRemaining;
	if (!isNonNegativeInteger(confusedTurnsRemaining)) {
		return err("confusedTurnsRemaining");
	}
	const levitationTurnsRemaining = value.levitationTurnsRemaining;
	if (!isNonNegativeInteger(levitationTurnsRemaining)) {
		return err("levitationTurnsRemaining");
	}
	const blindTurnsRemaining = value.blindTurnsRemaining;
	if (!isNonNegativeInteger(blindTurnsRemaining)) {
		return err("blindTurnsRemaining");
	}
	const paralyzedTurnsRemaining = value.paralyzedTurnsRemaining;
	if (!isNonNegativeInteger(paralyzedTurnsRemaining)) {
		return err("paralyzedTurnsRemaining");
	}
	const rooms = value.rooms;
	if (!isDungeonRoomArray(rooms)) {
		return err("rooms");
	}
	const appearances = value.appearances;
	if (!isAppearances(appearances)) {
		return err("appearances");
	}
	const playerRunFlag = value.playerRunFlag;
	if (!isBooleanValue(playerRunFlag)) {
		return err("playerRunFlag");
	}
	const nextHitConfuses = value.nextHitConfuses;
	if (!isBooleanValue(nextHitConfuses)) {
		return err("nextHitConfuses");
	}
	const stuckTurnsRemaining = value.stuckTurnsRemaining;
	if (!isNonNegativeInteger(stuckTurnsRemaining)) {
		return err("stuckTurnsRemaining");
	}
	const seeInvisibleTurnsRemaining = value.seeInvisibleTurnsRemaining;
	if (!isNonNegativeInteger(seeInvisibleTurnsRemaining)) {
		return err("seeInvisibleTurnsRemaining");
	}
	const hasteTurnsRemaining = value.hasteTurnsRemaining;
	if (!isNonNegativeInteger(hasteTurnsRemaining)) {
		return err("hasteTurnsRemaining");
	}
	const hasteMoveSpent = value.hasteMoveSpent;
	if (!isBooleanValue(hasteMoveSpent)) {
		return err("hasteMoveSpent");
	}
	const detectMonstersTurnsRemaining = value.detectMonstersTurnsRemaining;
	if (!isNonNegativeInteger(detectMonstersTurnsRemaining)) {
		return err("detectMonstersTurnsRemaining");
	}
	const hallucinatingTurnsRemaining = value.hallucinatingTurnsRemaining;
	if (!isNonNegativeInteger(hallucinatingTurnsRemaining)) {
		return err("hallucinatingTurnsRemaining");
	}
	const floor = value.floor;
	if (!isPositiveInteger(floor)) {
		return err("floor");
	}
	const deepestFloor = value.deepestFloor;
	if (!isPositiveInteger(deepestFloor) || deepestFloor < floor) {
		return err("deepestFloor");
	}
	const turnsOnCurrentFloor = value.turnsOnCurrentFloor;
	if (!isNonNegativeInteger(turnsOnCurrentFloor)) {
		return err("turnsOnCurrentFloor");
	}
	const wandererDelayTurns = value.wandererDelayTurns;
	if (!isNonNegativeInteger(wandererDelayTurns)) {
		return err("wandererDelayTurns");
	}
	const wandererRollTurns = value.wandererRollTurns;
	if (!isNonNegativeInteger(wandererRollTurns)) {
		return err("wandererRollTurns");
	}
	const floorsWithoutFood = value.floorsWithoutFood;
	if (!isNonNegativeInteger(floorsWithoutFood)) {
		return err("floorsWithoutFood");
	}
	const quietTurns = value.quietTurns;
	if (!isNonNegativeInteger(quietTurns)) {
		return err("quietTurns");
	}
	const flytrapHoldDamage = value.flytrapHoldDamage;
	if (!isNonNegativeInteger(flytrapHoldDamage)) {
		return err("flytrapHoldDamage");
	}
	const stairs = value.stairs;
	if (
		!isRecord(stairs) ||
		!standsOnFloor(stairs, terrain) ||
		!isFiniteNumber(stairs.x) ||
		!isFiniteNumber(stairs.y)
	) {
		return err("stairs");
	}
	const rawAmulet = value.amulet;
	let amulet: Position | undefined;
	if (rawAmulet === undefined) {
		amulet = undefined;
	} else if (
		isRecord(rawAmulet) &&
		standsOnFloor(rawAmulet, terrain) &&
		isFiniteNumber(rawAmulet.x) &&
		isFiniteNumber(rawAmulet.y)
	) {
		amulet = { x: rawAmulet.x, y: rawAmulet.y };
	} else {
		return err("amulet");
	}
	const hasAmulet = value.hasAmulet;
	if (!isBooleanValue(hasAmulet)) {
		return err("hasAmulet");
	}
	const enemies = value.enemies;
	if (!isEnemyArray(enemies, terrain)) {
		return err("enemies");
	}
	const items = value.items;
	if (!isItemArray(items, terrain)) {
		return err("items");
	}
	const inventory = value.inventory;
	if (!isHeldItemArray(inventory)) {
		return err("inventory");
	}
	const nextItemId = value.nextItemId;
	if (!isPositiveInteger(nextItemId)) {
		return err("nextItemId");
	}
	const identifiedItemKinds = value.identifiedItemKinds;
	if (!isItemKindArray(identifiedItemKinds)) {
		return err("identifiedItemKinds");
	}
	const goldPiles = value.goldPiles;
	if (!isGoldPileArray(goldPiles, terrain)) {
		return err("goldPiles");
	}
	const goldCollected = value.goldCollected;
	if (!isNonNegativeInteger(goldCollected)) {
		return err("goldCollected");
	}
	const traps = value.traps;
	if (!isTrapArray(traps, terrain)) {
		return err("traps");
	}
	const hiddenTiles = value.hiddenTiles;
	if (!isHiddenTileArray(hiddenTiles, terrain)) {
		return err("hiddenTiles");
	}
	const events = value.events;
	if (!isGameEventArray(events)) {
		return err("events");
	}
	const rng = value.rng;
	if (!isRngState(rng)) {
		return err("rng");
	}
	if (value.status !== "playing") {
		return err("status");
	}

	return ok({
		width,
		height,
		terrain,
		explored,
		player: { x: player.x, y: player.y },
		playerHp,
		playerMaxHp,
		playerLevel,
		playerExperience,
		playerStrength,
		playerMaxStrength,
		playerFood,
		confusedTurnsRemaining,
		levitationTurnsRemaining,
		blindTurnsRemaining,
		paralyzedTurnsRemaining,
		playerRunFlag,
		nextHitConfuses,
		appearances,
		rooms: rooms.map((room) => ({
			x1: room.x1,
			y1: room.y1,
			x2: room.x2,
			y2: room.y2,
			dark: room.dark,
		})),
		hasteTurnsRemaining,
		hasteMoveSpent,
		seeInvisibleTurnsRemaining,
		stuckTurnsRemaining,
		detectMonstersTurnsRemaining,
		hallucinatingTurnsRemaining,
		floor,
		deepestFloor,
		turnsOnCurrentFloor,
		quietTurns,
		flytrapHoldDamage,
		floorsWithoutFood,
		wandererDelayTurns,
		wandererRollTurns,
		stairs: { x: stairs.x, y: stairs.y },
		amulet,
		hasAmulet,
		enemies: enemies.map((enemy) => ({
			x: enemy.x,
			y: enemy.y,
			kind: enemy.kind,
			hp: enemy.hp,
			maxHp: enemy.maxHp,
			awake: enemy.awake,
			speed: enemy.speed,
			held: enemy.held,
			carried: enemy.carried.map(rebuildItem),
			mean: enemy.mean,
			gazeUsed: enemy.gazeUsed,
			confused: enemy.confused,
			...(enemy.goal === undefined
				? {}
				: { goal: { x: enemy.goal.x, y: enemy.goal.y } }),
		})),
		items: items.map(rebuildItem),
		inventory: [...inventory],
		nextItemId,
		identifiedItemKinds: [...identifiedItemKinds],
		goldPiles: goldPiles.map((pile) => ({
			x: pile.x,
			y: pile.y,
			amount: pile.amount,
		})),
		goldCollected,
		traps: traps.map((trap) => ({
			x: trap.x,
			y: trap.y,
			kind: trap.kind,
			seen: trap.seen,
		})),
		hiddenTiles: hiddenTiles.map((tile) => ({
			x: tile.x,
			y: tile.y,
			kind: tile.kind,
		})),
		events: [...events],
		rng: { s0: rng.s0, s1: rng.s1, s2: rng.s2, c: rng.c },
		status: "playing",
	});
};
