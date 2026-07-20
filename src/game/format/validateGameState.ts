/* file-size-exception: 手書きセーブ検証 — 依存追加禁止(zod不採用)の受容コスト。型ナローイングの都合で逐次チェックが必要(2026-07-18裁可) */
import { err, ok, type Result } from "../../result.js";
import type { RngState } from "../../rng.js";
import { PLAYER_MAX_FOOD } from "../balance.js";
import {
	type DeathCause,
	ENEMY_KIND_VALUES,
	type EnemyKind,
	type GameEvent,
	ITEM_KIND_VALUES,
	type ItemKind,
	isEquipmentItemKind,
	TRAP_KIND_VALUES,
	type TrapKind,
} from "../events.js";
import type {
	Enemy,
	GameState,
	GoldPile,
	HeldItem,
	Item,
	Position,
	Stairs,
	Trap,
} from "../state.js";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const isPositiveInteger = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value > 0;

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

const isStairsDirection = (value: unknown): value is Stairs["direction"] =>
	value === "up" || value === "down";

/** Membership test against a literal-value catalog, doubling as a type guard. */
const isOneOf = <Member>(
	values: readonly Member[],
	value: unknown,
): value is Member => values.some((candidate) => candidate === value);

export const isEnemyKind = (value: unknown): value is EnemyKind =>
	isOneOf(ENEMY_KIND_VALUES, value);

const isDeathCause = (value: unknown): value is DeathCause =>
	isEnemyKind(value) || isOneOf(["hunger", "trap", "poison"] as const, value);

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
			isBooleanValue(enemy.awake) &&
			isNonNegativeInteger(enemy.slowedTurnsRemaining) &&
			isNonNegativeInteger(enemy.confusedTurnsRemaining),
	);

export const isItemKind = (value: unknown): value is ItemKind =>
	isOneOf(ITEM_KIND_VALUES, value);

const isItemKindArray = (value: unknown): value is readonly ItemKind[] =>
	Array.isArray(value) && value.every(isItemKind);

/**
 * A held item: itemId + kind, plus (for sword/armor/ring kinds only) the
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
	if (!isEquipmentItemKind(value.kind)) {
		return true;
	}
	if (!isBooleanValue(value.equipped) || !isBooleanValue(value.cursed)) {
		return false;
	}
	if (value.kind === "sword") {
		return isNonNegativeInteger(value.attackBonus);
	}
	if (value.kind === "armor") {
		return (
			isNonNegativeInteger(value.defenseBonus) &&
			isBooleanValue(value.rustProtected)
		);
	}
	return true;
};

const isHeldItemArray = (value: unknown): value is readonly HeldItem[] =>
	Array.isArray(value) && value.every(isHeldItem);

/**
 * A sword/armor/ring's identity on a floor Item — same shape as HeldItem's
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
	if (kind === "sword") {
		return isNonNegativeInteger(value.attackBonus);
	}
	if (kind === "armor") {
		return (
			isNonNegativeInteger(value.defenseBonus) &&
			isBooleanValue(value.rustProtected)
		);
	}
	return true;
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
			isRecord(trap) && standsOnFloor(trap, terrain) && isTrapKind(trap.kind),
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
	"player-hit": (payload) =>
		isEnemyKind(payload.by) && isPositiveInteger(payload.damage),
	"enemy-hit": (payload) =>
		isEnemyKind(payload.target) && isPositiveInteger(payload.damage),
	"sneak-attack": (payload) =>
		isEnemyKind(payload.target) && isPositiveInteger(payload.damage),
	"enemy-defeated": (payload) => isEnemyKind(payload.target),
	"player-died": (payload) => isDeathCause(payload.by),
	"floor-descended": (payload) => isPositiveInteger(payload.floor),
	"floor-ascended": (payload) => isPositiveInteger(payload.floor),
	"amulet-obtained": emptyPayload,
	"player-healed": (payload) =>
		isItemKind(payload.by) && isNonNegativeInteger(payload.amount),
	"item-picked-up": (payload) => isItemKind(payload.kind),
	"inventory-full": (payload) => isItemKind(payload.kind),
	"item-dropped": (payload) => isItemKind(payload.kind),
	"game-won": emptyPayload,
	"weapon-equipped": (payload) =>
		isItemKind(payload.kind) && isPositiveInteger(payload.bonus),
	"armor-equipped": (payload) =>
		isItemKind(payload.kind) && isNonNegativeInteger(payload.bonus),
	"player-hungry": emptyPayload,
	"player-starved": (payload) => isPositiveInteger(payload.damage),
	"player-ate": (payload) => isNonNegativeInteger(payload.amount),
	"gold-collected": (payload) => isPositiveInteger(payload.amount),
	/* trapdoor, teleport and bear are the zero-damage trap kinds — see TRAPDOOR_DAMAGE, TELEPORT_TRAP_DAMAGE, BEAR_TRAP_DAMAGE */
	"trap-triggered": (payload) =>
		payload.kind === "trapdoor" ||
		payload.kind === "teleport" ||
		payload.kind === "bear"
			? isNonNegativeInteger(payload.damage)
			: isTrapKind(payload.kind) && isPositiveInteger(payload.damage),
	"player-poisoned": (payload) => isPositiveInteger(payload.damage),
	"player-teleported": (payload) =>
		isNonNegativeInteger(payload.x) && isNonNegativeInteger(payload.y),
	"floor-mapped": emptyPayload,
	"potion-identified": (payload) => isItemKind(payload.kind),
	"player-strengthened": (payload) => isPositiveInteger(payload.bonus),
	"gold-stolen": (payload) => isNonNegativeInteger(payload.amount),
	"item-stolen": (payload) =>
		payload.kind === undefined || isItemKind(payload.kind),
	"ring-equipped": (payload) => isItemKind(payload.kind),
	"player-regenerated": (payload) => isPositiveInteger(payload.amount),
	"weapon-enchanted": (payload) => isPositiveInteger(payload.bonus),
	"armor-enchanted": (payload) => isPositiveInteger(payload.bonus),
	"armor-rusted": (payload) => isPositiveInteger(payload.amount),
	"wand-struck": (payload) =>
		isEnemyKind(payload.target) && isPositiveInteger(payload.damage),
	"player-confused": (payload) => isPositiveInteger(payload.turns),
	"confusion-faded": emptyPayload,
	"enemy-slowed": (payload) =>
		isEnemyKind(payload.target) && isPositiveInteger(payload.turns),
	"player-levitated": (payload) => isPositiveInteger(payload.turns),
	"levitation-faded": emptyPayload,
	"armor-protected": emptyPayload,
	"player-blinded": (payload) => isPositiveInteger(payload.turns),
	"blindness-faded": emptyPayload,
	"player-leveled-up": (payload) => isPositiveInteger(payload.level),
	"player-paralyzed": (payload) => isPositiveInteger(payload.turns),
	"paralysis-faded": emptyPayload,
	"player-detected-monsters": (payload) => isPositiveInteger(payload.turns),
	"detect-monsters-faded": emptyPayload,
	"player-revitalized": (payload) => isPositiveInteger(payload.maxHpBonus),
	"winds-of-kron-warning": emptyPayload,
	"winds-of-kron-eviction": emptyPayload,
	"item-unequipped": (payload) => isItemKind(payload.kind),
	"equip-blocked-cursed": (payload) => isItemKind(payload.kind),
	"curse-revealed": (payload) => isItemKind(payload.kind),
	"items-decursed": (payload) => isPositiveInteger(payload.count),
	"orc-gold-drop": (payload) => isPositiveInteger(payload.amount),
	"enemy-teleported": (payload) => isEnemyKind(payload.target),
	"enemy-confused": (payload) =>
		isEnemyKind(payload.target) && isPositiveInteger(payload.turns),
	"player-hallucinated": (payload) => isPositiveInteger(payload.turns),
	"hallucination-faded": emptyPayload,
	"enemy-held": (payload) =>
		isEnemyKind(payload.target) && isPositiveInteger(payload.turns),
	"enemy-slept": (payload) => isEnemyKind(payload.target),
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
	const playerPower = value.playerPower;
	if (!isPositiveInteger(playerPower)) {
		return err("playerPower");
	}
	const playerFood = value.playerFood;
	if (!isNonNegativeInteger(playerFood) || playerFood > PLAYER_MAX_FOOD) {
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
	const turnsOnCurrentFloor = value.turnsOnCurrentFloor;
	if (!isNonNegativeInteger(turnsOnCurrentFloor)) {
		return err("turnsOnCurrentFloor");
	}
	const stairs = value.stairs;
	if (
		!isRecord(stairs) ||
		!standsOnFloor(stairs, terrain) ||
		!isFiniteNumber(stairs.x) ||
		!isFiniteNumber(stairs.y) ||
		!isStairsDirection(stairs.direction)
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
	const hasAttacked = value.hasAttacked;
	if (!isBooleanValue(hasAttacked)) {
		return err("hasAttacked");
	}
	const hasEaten = value.hasEaten;
	if (!isBooleanValue(hasEaten)) {
		return err("hasEaten");
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
	const identifiedPotionKinds = value.identifiedPotionKinds;
	if (!isItemKindArray(identifiedPotionKinds)) {
		return err("identifiedPotionKinds");
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
		playerPower,
		playerFood,
		confusedTurnsRemaining,
		levitationTurnsRemaining,
		blindTurnsRemaining,
		paralyzedTurnsRemaining,
		detectMonstersTurnsRemaining,
		hallucinatingTurnsRemaining,
		floor,
		turnsOnCurrentFloor,
		stairs: { x: stairs.x, y: stairs.y, direction: stairs.direction },
		amulet,
		hasAmulet,
		hasAttacked,
		hasEaten,
		enemies: enemies.map((enemy) => ({
			x: enemy.x,
			y: enemy.y,
			kind: enemy.kind,
			hp: enemy.hp,
			awake: enemy.awake,
			slowedTurnsRemaining: enemy.slowedTurnsRemaining,
			confusedTurnsRemaining: enemy.confusedTurnsRemaining,
		})),
		items: items.map((item): Item => {
			const position = { x: item.x, y: item.y };
			switch (item.kind) {
				case "sword":
					return { ...position, kind: "sword", identity: item.identity };
				case "armor":
					return { ...position, kind: "armor", identity: item.identity };
				case "regeneration-ring":
				case "sustenance-ring":
				case "stealth-ring":
				case "awareness-ring":
				case "aggravate-monster-ring":
					return {
						...position,
						kind: item.kind,
						identity: item.identity,
					};
				default:
					return { ...position, kind: item.kind };
			}
		}),
		inventory: [...inventory],
		nextItemId,
		identifiedPotionKinds: [...identifiedPotionKinds],
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
		})),
		events: [...events],
		rng: { s0: rng.s0, s1: rng.s1, s2: rng.s2, c: rng.c },
		status: "playing",
	});
};
