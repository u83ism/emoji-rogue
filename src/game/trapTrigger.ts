import { createRng, type RngState } from "../rng.js";
import {
	ARROW_TRAP_DAMAGE_DICE,
	BEAR_TRAP_STUCK_TURNS,
	DART_TRAP_DAMAGE_DICE,
	SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
} from "./balance.js";
import { rollDamageDice, rollToHit } from "./combat/damage.js";
import {
	calculateArrowTrapHitChancePercent,
	calculateDartTrapHitChancePercent,
} from "./combat/hitChance.js";
import { isStrengthSustained, resolvePoisonDrain } from "./combat/strength.js";
import { buildEventLog, type GameEvent, type TrapKind } from "./events.js";
import { descendStairs } from "./floor/transitions.js";
import { resolveArmorRust } from "./items/equipment.js";
import type { GameState, Item } from "./state.js";
import { applyRandomTeleport } from "./teleport.js";

/** How many different sensations a mysterious trap can give (original Rogue's T_MYST: \`rnd(11)\`). */
const MYSTERY_VARIANTS = 11;

const withEvents = (state: GameState, events: readonly GameEvent[]) => ({
	...state,
	events: buildEventLog(state.events, events),
});

/** An arrow that missed: one plain arrow left on the player's tile — unless something already lies there (original Rogue's fall() finding no spot). */
const dropMissedArrow = (state: GameState): GameState => {
	if (
		state.items.some(
			(item) => item.x === state.player.x && item.y === state.player.y,
		)
	) {
		return state;
	}
	const arrow: Item = {
		...state.player,
		kind: "weapon",
		identity: {
			itemId: state.nextItemId,
			weaponKind: "arrow",
			cursed: false,
			hitBonus: 0,
			damageBonus: 0,
			quantity: 1,
		},
	};
	return {
		...state,
		items: [...state.items, arrow],
		nextItemId: state.nextItemId + 1,
	};
};

/**
 * What a trap kind does once sprung, beyond the HP a dart or arrow costs
 * (rollTrapDamage) — applied only while still "playing". A lookup table
 * rather than an if-chain (functional-style.md).
 */
const TRAP_SIDE_EFFECTS: Readonly<
	Partial<Record<TrapKind, (state: GameState, damage: number) => GameState>>
> = {
	trapdoor: (state) => descendStairs(state),
	teleport: (state) => applyRandomTeleport(state, "teleport-trap"),
	/* original Rogue's no_move: moving is what fails, everything else still works */
	bear: (state) => ({
		...state,
		stuckTurnsRemaining: state.stuckTurnsRemaining + BEAR_TRAP_STUCK_TURNS,
	}),
	"sleeping-gas": (state) => ({
		...state,
		paralyzedTurnsRemaining:
			state.paralyzedTurnsRemaining + SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
		/* falling asleep takes the run flag away (original Rogue's be_trapped()) */
		playerRunFlag: false,
	}),
	rust: (state) => {
		const rust = resolveArmorRust(state.inventory);
		return rust.event === undefined
			? state
			: withEvents({ ...state, inventory: rust.inventory }, [rust.event]);
	},
	/* a dart that hit is poisoned: it may cost a point of strength */
	dart: (state, damage) => (damage > 0 ? applyDartPoison(state) : state),
	arrow: (state, damage) => (damage > 0 ? state : dropMissedArrow(state)),
	mysterious: (state) => {
		const rng = createRng(1).setState(state.rng);
		const variant = rng.getUniformInt(0, MYSTERY_VARIANTS - 1);
		return withEvents({ ...state, rng: rng.getState() }, [
			{ type: "trap-mystery", payload: { variant } },
		]);
	},
};

/**
 * The HP a sprung \`kind\` costs: a poison dart or an arrow first rolls to
 * hit (armor helps) and then its dice, 0 on a miss; every other kind costs
 * none and consumes no rng.
 */
const rollTrapDamage = (
	state: GameState,
	kind: TrapKind,
): { readonly damage: number; readonly rng: RngState } => {
	if (kind !== "dart" && kind !== "arrow") {
		return { damage: 0, rng: state.rng };
	}
	const hitRoll = rollToHit(
		state.rng,
		kind === "dart"
			? calculateDartTrapHitChancePercent(state.playerLevel, state.inventory)
			: calculateArrowTrapHitChancePercent(state.playerLevel, state.inventory),
	);
	return hitRoll.hit
		? rollDamageDice(
				hitRoll.rng,
				kind === "dart" ? DART_TRAP_DAMAGE_DICE : ARROW_TRAP_DAMAGE_DICE,
				0,
				0,
			)
		: { damage: 0, rng: hitRoll.rng };
};

/** A dart that hit: its poison may drain a point of strength (resolvePoisonDrain). */
const applyDartPoison = (state: GameState): GameState => {
	const drain = resolvePoisonDrain(
		state.playerStrength,
		state.playerLevel,
		state.rng,
		isStrengthSustained(state.inventory),
	);
	const drained = {
		...state,
		playerStrength: drain.playerStrength,
		rng: drain.rng,
	};
	return drain.strengthLost > 0
		? withEvents(drained, [
				{
					type: "player-strength-drained",
					payload: { strengthLost: drain.strengthLost },
				},
			])
		: drained;
};

/**
 * Springs the trap under the player's feet, as original Rogue's
 * be_trapped(): it becomes seen — drawn from now on — and stays armed for
 * the next step onto it. A poison dart or an arrow may cost HP
 * (rollTrapDamage); a fatal one ends the run with player-died(by: "trap"),
 * and advanceTurn's move case checks status right after this, so enemies
 * never get a same-turn hit on an already-dead player. The kind's
 * TRAP_SIDE_EFFECTS entry then applies: a trapdoor drops to the next floor,
 * a teleport trap moves the player at random, a bear trap holds them
 * (stuckTurnsRemaining), sleeping gas puts them to sleep, a rust trap rusts
 * the worn armor, a hit dart may poison, a missed arrow drops, and a
 * mysterious trap only gives a sensation. While levitating, no trap
 * triggers at all — the player floats over it.
 */
export const applyTrapTrigger = (state: GameState): GameState => {
	if (state.levitationTurnsRemaining > 0) {
		return state;
	}
	const trap = state.traps.find(
		(candidate) =>
			candidate.x === state.player.x && candidate.y === state.player.y,
	);
	if (trap === undefined) {
		return state;
	}
	const { damage, rng } = rollTrapDamage(state, trap.kind);
	const playerHp = state.playerHp - damage;
	const events: GameEvent[] = [
		{ type: "trap-triggered", payload: { kind: trap.kind, damage } },
	];
	if (playerHp <= 0) {
		events.push({ type: "player-died", payload: { by: "trap" } });
	}
	const afterTrap: GameState = withEvents(
		{
			...state,
			playerHp: Math.max(0, playerHp),
			rng,
			traps: state.traps.map((candidate) =>
				candidate === trap ? { ...candidate, seen: true } : candidate,
			),
			status: playerHp <= 0 ? "dead" : state.status,
		},
		events,
	);
	if (afterTrap.status !== "playing") {
		return afterTrap;
	}
	const sideEffect = TRAP_SIDE_EFFECTS[trap.kind];
	return sideEffect === undefined ? afterTrap : sideEffect(afterTrap, damage);
};
