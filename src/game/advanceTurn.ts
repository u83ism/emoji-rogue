import { encodePointKey } from "../pointkey.js";
import { createRng, type RngState } from "../rng.js";
import {
	FOOD_RATION_RESTORE_AMOUNT,
	MIN_PLAYER_ATTACK_DAMAGE,
	PLAYER_MAX_FOOD,
	PLAYER_MAX_HP,
	POISON_DAMAGE,
	POTION_HEAL_AMOUNT,
	SHIELD_CURSE_CHANCE_PERCENT,
	SHIELD_DEFENSE_BONUS,
	STRENGTH_POTION_ATTACK_BONUS,
	SWORD_ATTACK_BONUS,
	SWORD_CURSE_CHANCE_PERCENT,
	TRAP_DAMAGE,
} from "./balance.js";
import { applyPlayerAttack } from "./combat.js";
import { advanceEnemies } from "./enemies.js";
import type { GameEvent, ItemKind } from "./events.js";
import { buildEventLog, POTION_KINDS } from "./events.js";
import { ascendStairs, descendStairs } from "./floor.js";
import { applyHungerTick } from "./hunger.js";
import { applyRegenerationTick } from "./regeneration.js";
import type {
	Action,
	Direction,
	Enemy,
	GameState,
	InventoryEntry,
	Position,
} from "./state.js";
import { deriveExploredState } from "./vision.js";

const DIRECTION_VECTORS: Readonly<
	Record<Direction, readonly [number, number]>
> = {
	north: [0, -1],
	south: [0, 1],
	west: [-1, 0],
	east: [1, 0],
};

const findEnemyAt = (
	state: GameState,
	x: number,
	y: number,
): Enemy | undefined =>
	state.enemies.find((enemy) => enemy.x === x && enemy.y === y);

/** Passability is derived from terrain data, never stored as a function. */
const isFloor = (state: GameState, x: number, y: number): boolean =>
	state.terrain[x]?.[y] === 0;

const addToInventory = (
	inventory: readonly InventoryEntry[],
	kind: ItemKind,
): readonly InventoryEntry[] => {
	const held = inventory.find((entry) => entry.kind === kind);
	if (held === undefined) {
		return [...inventory, { kind, quantity: 1 }];
	}
	return inventory.map((entry) =>
		entry.kind === kind ? { ...entry, quantity: entry.quantity + 1 } : entry,
	);
};

const removeFromInventory = (
	inventory: readonly InventoryEntry[],
	kind: ItemKind,
): readonly InventoryEntry[] =>
	inventory
		.map((entry) =>
			entry.kind === kind ? { ...entry, quantity: entry.quantity - 1 } : entry,
		)
		.filter((entry) => entry.quantity > 0);

/**
 * Whether an equipped sword/shield turns out cursed, rolled fresh at use
 * time (see SWORD_CURSE_CHANCE_PERCENT's comment for why not at spawn),
 * consuming (and advancing) the rng in the same temporary-stateful-Rng
 * pattern floor.ts's descendStairs and the teleport scroll both use.
 */
const rollCurse = (
	rngState: RngState,
	chancePercent: number,
): { readonly cursed: boolean; readonly rng: RngState } => {
	const rng = createRng(1).setState(rngState);
	return {
		cursed: rng.getUniformInt(0, 99) < chancePercent,
		rng: rng.getState(),
	};
};

/** Adds `kind` to identifiedPotionKinds if it is a potion kind not already identified. */
const identifyPotionKind = (
	identifiedPotionKinds: readonly ItemKind[],
	kind: ItemKind,
): readonly ItemKind[] => {
	if (!POTION_KINDS.includes(kind) || identifiedPotionKinds.includes(kind)) {
		return identifiedPotionKinds;
	}
	return [...identifiedPotionKinds, kind];
};

/**
 * Picks up the item under the player's feet into inventory, if any — no
 * longer used immediately (that's the "use-item" action's job).
 */
const applyItemPickup = (state: GameState): GameState => {
	const item = state.items.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (item === undefined) {
		return state;
	}
	return {
		...state,
		inventory: addToInventory(state.inventory, item.kind),
		items: state.items.filter((candidate) => candidate !== item),
		events: buildEventLog(state.events, [
			{ type: "item-picked-up", payload: { kind: item.kind } },
		]),
	};
};

/**
 * Picks up the Amulet of Yendor if it is lying under the player's feet
 * (only possible on GOAL_FLOOR, before it has been taken). Unconditional and
 * immediate, like gold — there is no "use" step, and hasAmulet never turns
 * back off once set.
 */
const applyAmuletPickup = (state: GameState): GameState => {
	if (
		state.amulet === undefined ||
		state.amulet.x !== state.player.x ||
		state.amulet.y !== state.player.y
	) {
		return state;
	}
	return {
		...state,
		amulet: undefined,
		hasAmulet: true,
		events: buildEventLog(state.events, [
			{ type: "amulet-obtained", payload: {} },
		]),
	};
};

/**
 * Adds any gold pile under the player's feet straight to goldCollected — no
 * inventory slot, no use-item step, unlike Item. Picking up gold is
 * unconditional and immediate.
 */
const applyGoldPickup = (state: GameState): GameState => {
	const pile = state.goldPiles.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (pile === undefined) {
		return state;
	}
	return {
		...state,
		goldCollected: state.goldCollected + pile.amount,
		goldPiles: state.goldPiles.filter((candidate) => candidate !== pile),
		events: buildEventLog(state.events, [
			{ type: "gold-collected", payload: { amount: pile.amount } },
		]),
	};
};

/**
 * Springs any hidden trap under the player's feet: TRAP_DAMAGE[kind] damage,
 * the trap consumed (one-time — never re-triggers, never becomes visible).
 * A fatal hit ends the run with player-died(by: "trap"); advanceTurn's move
 * case checks status right after this runs, so enemies never get a same-turn
 * bonus hit on an already-trap-killed player.
 */
const applyTrapTrigger = (state: GameState): GameState => {
	const trap = state.traps.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (trap === undefined) {
		return state;
	}
	const damage = TRAP_DAMAGE[trap.kind];
	const playerHp = state.playerHp - damage;
	const events: GameEvent[] = [
		{ type: "trap-triggered", payload: { kind: trap.kind, damage } },
	];
	if (playerHp <= 0) {
		events.push({ type: "player-died", payload: { by: "trap" } });
	}
	return {
		...state,
		playerHp: Math.max(0, playerHp),
		traps: state.traps.filter((candidate) => candidate !== trap),
		status: playerHp <= 0 ? "dead" : state.status,
		events: buildEventLog(state.events, events),
	};
};

/**
 * Every floor tile a teleport scroll may land on: not the player's own tile,
 * not one occupied by an enemy (the "enemies never share the player's tile"
 * invariant must survive teleporting too). Falls back to the player's own
 * tile only if the map has no other floor tile at all (tiny arenas).
 */
const collectTeleportTargets = (state: GameState): readonly Position[] => {
	const occupied = new Set(
		state.enemies.map((enemy) => encodePointKey(enemy.x, enemy.y)),
	);
	const tiles: Position[] = [];
	for (let x = 0; x < state.terrain.length; x++) {
		const column = state.terrain[x] ?? [];
		for (let y = 0; y < column.length; y++) {
			if (column[y] !== 0) {
				continue;
			}
			if (x === state.player.x && y === state.player.y) {
				continue;
			}
			if (occupied.has(encodePointKey(x, y))) {
				continue;
			}
			tiles.push({ x, y });
		}
	}
	return tiles.length > 0 ? tiles : [state.player];
};

/**
 * Uses one held item of `kind`, consumed from inventory either way. A potion
 * heals up to the cap (using it at full health wastes it); a sword instead
 * permanently raises playerAttackDamage and a shield playerDefense — both
 * stack with no cap, since they are rewards, not a resource that can be
 * wasted. A ring sets hasRingOfRegeneration (an on/off flag, not stackable —
 * using a second ring is consumed but changes nothing). Using a kind not
 * held is a no-op (same reference, no turn spent).
 */
const applyUseItem = (state: GameState, kind: ItemKind): GameState => {
	const held = state.inventory.find((entry) => entry.kind === kind);
	if (held === undefined) {
		return state;
	}
	const inventory = removeFromInventory(state.inventory, kind);

	if (kind === "sword") {
		const { cursed, rng } = rollCurse(state.rng, SWORD_CURSE_CHANCE_PERCENT);
		const rawBonus = cursed ? -SWORD_ATTACK_BONUS : SWORD_ATTACK_BONUS;
		const playerAttackDamage = Math.max(
			MIN_PLAYER_ATTACK_DAMAGE,
			state.playerAttackDamage + rawBonus,
		);
		return {
			...state,
			playerAttackDamage,
			inventory,
			rng,
			events: buildEventLog(state.events, [
				{
					type: "weapon-equipped",
					payload: {
						kind,
						bonus: playerAttackDamage - state.playerAttackDamage,
					},
				},
			]),
		};
	}

	if (kind === "shield") {
		const { cursed, rng } = rollCurse(state.rng, SHIELD_CURSE_CHANCE_PERCENT);
		const bonus = cursed ? -SHIELD_DEFENSE_BONUS : SHIELD_DEFENSE_BONUS;
		return {
			...state,
			playerDefense: state.playerDefense + bonus,
			inventory,
			rng,
			events: buildEventLog(state.events, [
				{ type: "armor-equipped", payload: { kind, bonus } },
			]),
		};
	}

	if (kind === "food") {
		const restored = Math.min(
			FOOD_RATION_RESTORE_AMOUNT,
			PLAYER_MAX_FOOD - state.playerFood,
		);
		return {
			...state,
			playerFood: state.playerFood + restored,
			inventory,
			events: buildEventLog(state.events, [
				{ type: "player-ate", payload: { amount: restored } },
			]),
		};
	}

	if (kind === "scroll") {
		const targets = collectTeleportTargets(state);
		const rng = createRng(1).setState(state.rng);
		const target = targets[rng.getUniformInt(0, targets.length - 1)];
		if (target === undefined) {
			throw new Error(
				"unreachable: collectTeleportTargets always returns at least one tile",
			);
		}
		return deriveExploredState({
			...state,
			player: target,
			inventory,
			rng: rng.getState(),
			events: buildEventLog(state.events, [
				{ type: "player-teleported", payload: { x: target.x, y: target.y } },
			]),
		});
	}

	if (kind === "mapping") {
		return {
			...state,
			explored: state.terrain.map((column) => column.map(() => true)),
			inventory,
			events: buildEventLog(state.events, [
				{ type: "floor-mapped", payload: {} },
			]),
		};
	}

	if (kind === "ring") {
		return {
			...state,
			hasRingOfRegeneration: true,
			inventory,
			events: buildEventLog(state.events, [
				{ type: "ring-equipped", payload: { kind } },
			]),
		};
	}

	if (kind === "sustenance") {
		return {
			...state,
			hasRingOfSustenance: true,
			inventory,
			events: buildEventLog(state.events, [
				{ type: "ring-equipped", payload: { kind } },
			]),
		};
	}

	if (kind === "identify") {
		const target = POTION_KINDS.find(
			(potionKind) => !state.identifiedPotionKinds.includes(potionKind),
		);
		if (target === undefined) {
			return state; /* nothing left to identify — same as an unheld item */
		}
		return {
			...state,
			inventory,
			identifiedPotionKinds: [...state.identifiedPotionKinds, target],
			events: buildEventLog(state.events, [
				{ type: "potion-identified", payload: { kind: target } },
			]),
		};
	}

	const identifiedPotionKinds = identifyPotionKind(
		state.identifiedPotionKinds,
		kind,
	);

	if (kind === "poison") {
		const playerHp = state.playerHp - POISON_DAMAGE;
		const events: GameEvent[] = [
			{ type: "player-poisoned", payload: { damage: POISON_DAMAGE } },
		];
		if (playerHp <= 0) {
			events.push({ type: "player-died", payload: { by: "poison" } });
		}
		return {
			...state,
			playerHp: Math.max(0, playerHp),
			inventory,
			identifiedPotionKinds,
			status: playerHp <= 0 ? "dead" : state.status,
			events: buildEventLog(state.events, events),
		};
	}

	if (kind === "strength") {
		return {
			...state,
			playerAttackDamage:
				state.playerAttackDamage + STRENGTH_POTION_ATTACK_BONUS,
			inventory,
			identifiedPotionKinds,
			events: buildEventLog(state.events, [
				{
					type: "player-strengthened",
					payload: { bonus: STRENGTH_POTION_ATTACK_BONUS },
				},
			]),
		};
	}

	const amount = Math.min(POTION_HEAL_AMOUNT, PLAYER_MAX_HP - state.playerHp);
	return {
		...state,
		playerHp: state.playerHp + amount,
		inventory,
		identifiedPotionKinds,
		events: buildEventLog(state.events, [
			{ type: "player-healed", payload: { by: kind, amount } },
		]),
	};
};

/**
 * A movement turn: bump attack when an enemy occupies the target tile
 * (even one standing on the staircase), transition floors when it is the
 * staircase (direction decides descend vs ascend), walk when it is open
 * floor (picking up any item, gold or the amulet lying there). Bumping a
 * wall consumes no turn (returns the input state, same reference); the
 * other three all do.
 */
const applyMove = (state: GameState, direction: Direction): GameState => {
	const [deltaX, deltaY] = DIRECTION_VECTORS[direction];
	const x = state.player.x + deltaX;
	const y = state.player.y + deltaY;

	const target = findEnemyAt(state, x, y);
	if (target !== undefined) {
		return applyPlayerAttack(state, target);
	}
	if (!isFloor(state, x, y)) {
		return state;
	}
	if (x === state.stairs.x && y === state.stairs.y) {
		/* the whole floor is replaced, so this floor's enemies never act */
		return state.stairs.direction === "up"
			? ascendStairs(state)
			: descendStairs(state);
	}
	return applyTrapTrigger(
		applyGoldPickup(
			applyAmuletPickup(
				applyItemPickup(deriveExploredState({ ...state, player: { x, y } })),
			),
		),
	);
};

/**
 * The pure game reducer: one action in, the next state out. Same state and
 * action always produce the same result; a blocked move returns the input
 * state unchanged (same reference).
 */
export const advanceTurn = (state: GameState, action: Action): GameState => {
	switch (action.type) {
		case "move": {
			if (state.status !== "playing") {
				return state;
			}
			const afterPlayer = applyMove(state, action.payload.direction);
			if (afterPlayer === state) {
				return state; /* bumping a wall consumes no turn */
			}
			if (afterPlayer.status !== "playing") {
				return afterPlayer; /* a trap ended the run before enemies could act */
			}
			if (afterPlayer.floor !== state.floor) {
				return applyRegenerationTick(
					applyHungerTick(afterPlayer),
				); /* descended — the new floor's enemies wait */
			}
			return applyRegenerationTick(
				applyHungerTick(advanceEnemies(afterPlayer)),
			);
		}
		case "wait": {
			/* Stand still for one turn; enemies still act. Without this a
			 * cornered player would soft-lock: bumps consume no turn, so the
			 * enemy turn that would end the run could never arrive. */
			if (state.status !== "playing") {
				return state;
			}
			return applyRegenerationTick(applyHungerTick(advanceEnemies(state)));
		}
		case "use-item": {
			if (state.status !== "playing") {
				return state;
			}
			const afterUse = applyUseItem(state, action.payload.kind);
			if (afterUse === state) {
				return state; /* nothing of that kind held — no turn spent */
			}
			if (afterUse.status !== "playing") {
				return afterUse; /* a poison potion ended the run before enemies could act */
			}
			return applyRegenerationTick(applyHungerTick(advanceEnemies(afterUse)));
		}
		case "save": {
			/* Only mark the intent — the shell performs the actual file write
			 * when it observes the "suspended" status. Saving is not a game-world
			 * event, so nothing is logged here; the shell shows its own notice. */
			if (state.status !== "playing") {
				return state;
			}
			return { ...state, status: "suspended" };
		}
		case "quit":
			return { ...state, status: "exited" };
	}
};
