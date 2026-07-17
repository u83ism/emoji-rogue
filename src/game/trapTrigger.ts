import { TRAP_DAMAGE } from "./balance.js";
import { buildEventLog, type GameEvent } from "./events.js";
import { descendStairs } from "./floor/transitions.js";
import type { GameState } from "./state.js";
import { applyRandomTeleport } from "./teleport.js";

/**
 * Springs any hidden trap under the player's feet: TRAP_DAMAGE[kind] damage,
 * the trap consumed (one-time — never re-triggers, never becomes visible).
 * A fatal hit ends the run with player-died(by: "trap"); advanceTurn's move
 * case checks status right after this runs, so enemies never get a same-turn
 * bonus hit on an already-trap-killed player. A trapdoor that the player
 * survives additionally hands the (already trap-triggered) state straight to
 * descendStairs — the whole floor gets replaced exactly as if the player had
 * taken the stairs, GOAL_FLOOR's amulet/up-staircase forcing included. A
 * teleport trap that the player survives (it deals no damage, so always)
 * instead hands off to applyRandomTeleport — same relocation as the teleport
 * scroll, just triggered by a footstep instead of an inventory item. While
 * levitationTurnsRemaining is set, no trap can trigger at all — the player
 * floats over it (any kind alike), and it stays armed underneath.
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
	const damage = TRAP_DAMAGE[trap.kind];
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
		traps: state.traps.filter((candidate) => candidate !== trap),
		status: playerHp <= 0 ? "dead" : state.status,
		events: buildEventLog(state.events, events),
	};
	if (trap.kind === "trapdoor" && afterTrap.status === "playing") {
		return descendStairs(afterTrap);
	}
	if (trap.kind === "teleport" && afterTrap.status === "playing") {
		return applyRandomTeleport(afterTrap);
	}
	return afterTrap;
};
