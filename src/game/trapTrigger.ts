import type { RngState } from "../rng.js";
import {
	BEAR_TRAP_PARALYSIS_DURATION,
	DART_TRAP_DAMAGE_DICE,
	SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
	TRAP_DAMAGE,
} from "./balance.js";
import { rollDamageDice, rollToHit } from "./damage.js";
import { buildEventLog, type GameEvent, type TrapKind } from "./events.js";
import { descendStairs } from "./floor/transitions.js";
import { applyArmorRust, canRustEquippedArmor } from "./items/equipment.js";
import { calculateDartTrapHitChancePercent } from "./items/hitChance.js";
import type { GameState } from "./state.js";
import { resolvePoisonDrain } from "./strength.js";
import { applyRandomTeleport } from "./teleport.js";

/**
 * The extra effect a trap kind has beyond its TRAP_DAMAGE hit, applied once
 * the trap-triggered/player-died bookkeeping below is done and only while
 * still "playing" (a fatal trap skips these entirely). A kind absent here
 * (dart) has no extra effect. A lookup table rather than an if-chain —
 * converted here at the 4th kind (functional-style.md's if-chain limit is 3
 * branches; trapdoor/teleport/bear were still within it).
 */
const TRAP_SIDE_EFFECTS: Readonly<
	Partial<Record<TrapKind, (state: GameState) => GameState>>
> = {
	trapdoor: (state) => descendStairs(state),
	teleport: (state) => applyRandomTeleport(state),
	bear: (state) => ({
		...state,
		paralyzedTurnsRemaining: BEAR_TRAP_PARALYSIS_DURATION,
	}),
	/** Same paralyzedTurnsRemaining field/tick/status-bar chip as a bear trap — just a longer hold, see SLEEPING_GAS_TRAP_PARALYSIS_DURATION. */
	"sleeping-gas": (state) => ({
		...state,
		paralyzedTurnsRemaining: SLEEPING_GAS_TRAP_PARALYSIS_DURATION,
	}),
	/** Same armor-rusted degradation as an aquator's landed hit, but guaranteed on trigger rather than a rolled chance. */
	rust: (state) => {
		if (!canRustEquippedArmor(state.inventory)) {
			return state;
		}
		return {
			...state,
			inventory: applyArmorRust(state.inventory),
			events: buildEventLog(state.events, [
				{ type: "armor-rusted", payload: { amount: 1 } },
			]),
		};
	},
};

/**
 * The HP a sprung `kind` costs: a dart trap first rolls to hit
 * (calculateDartTrapHitChancePercent — armor helps) and then
 * DART_TRAP_DAMAGE_DICE, 0 on a miss; every other kind is its fixed
 * TRAP_DAMAGE and consumes no rng.
 */
const rollTrapDamage = (
	state: GameState,
	kind: TrapKind,
): { readonly damage: number; readonly rng: RngState } => {
	if (kind !== "dart") {
		return { damage: TRAP_DAMAGE[kind], rng: state.rng };
	}
	const hitRoll = rollToHit(
		state.rng,
		calculateDartTrapHitChancePercent(state.playerLevel, state.inventory),
	);
	return hitRoll.hit
		? rollDamageDice(hitRoll.rng, DART_TRAP_DAMAGE_DICE, 0, 0)
		: { damage: 0, rng: hitRoll.rng };
};

/** A dart that hit: its poison may drain a point of strength (resolvePoisonDrain). */
const applyDartPoison = (state: GameState): GameState => {
	const drain = resolvePoisonDrain(
		state.playerStrength,
		state.playerLevel,
		state.rng,
	);
	return {
		...state,
		playerStrength: drain.playerStrength,
		rng: drain.rng,
		events:
			drain.strengthLost > 0
				? buildEventLog(state.events, [
						{
							type: "player-strength-drained",
							payload: { strengthLost: drain.strengthLost },
						},
					])
				: state.events,
	};
};

/**
 * Springs any hidden trap under the player's feet: rollTrapDamage's damage,
 * the trap consumed (one-time — never re-triggers, never becomes visible).
 * A fatal hit ends the run with player-died(by: "trap"); advanceTurn's move
 * case checks status right after this runs, so enemies never get a same-turn
 * bonus hit on an already-trap-killed player. A trapdoor that the player
 * survives additionally hands the (already trap-triggered) state straight to
 * descendStairs — the whole floor gets replaced exactly as if the player had
 * taken the stairs, GOAL_FLOOR's amulet/up-staircase forcing included. A
 * teleport trap that the player survives (it deals no damage, so always)
 * instead hands off to applyRandomTeleport — same relocation as the teleport
 * scroll, just triggered by a footstep instead of an inventory item. A bear
 * trap deals no damage either — instead it sets paralyzedTurnsRemaining,
 * reusing the same field/tick/status-bar chip the paralysis potion drives. A
 * sleeping gas trap deals no damage either — same paralyzedTurnsRemaining
 * field, just held for SLEEPING_GAS_TRAP_PARALYSIS_DURATION turns instead of
 * BEAR_TRAP_PARALYSIS_DURATION. A rust trap also deals no damage — instead
 * it degrades the equipped armor's own defenseBonus exactly like an
 * aquator's rust (see TRAP_SIDE_EFFECTS).
 * A dart trap's dart that hits is poisoned too: it may drain a point of
 * strength (strength.ts's resolvePoisonDrain), logged as
 * player-strength-drained when it does.
 * While levitationTurnsRemaining is set, no trap can trigger at all — the
 * player floats over it (any kind alike), and it stays armed underneath.
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
	const afterTrap: GameState = {
		...state,
		playerHp: Math.max(0, playerHp),
		rng,
		traps: state.traps.filter((candidate) => candidate !== trap),
		status: playerHp <= 0 ? "dead" : state.status,
		events: buildEventLog(state.events, events),
	};
	if (afterTrap.status !== "playing") {
		return afterTrap;
	}
	const afterPoison =
		trap.kind === "dart" && damage > 0 ? applyDartPoison(afterTrap) : afterTrap;
	const sideEffect = TRAP_SIDE_EFFECTS[trap.kind];
	return sideEffect === undefined ? afterPoison : sideEffect(afterPoison);
};
