import { calculateEnemyLevelBonus } from "../balance.js";
import { calculateEnemyHitChancePercent } from "../combat/hitChance.js";
import type { EnemyKind, GameEvent } from "../events.js";
import type { Enemy, GameState } from "../state.js";
import { nameEnemy } from "../vision.js";
import type {
	EnemyActionResult,
	EnemyActor,
	EnemyTurnProgress,
} from "./action.js";
import { resolveEnemyAttack } from "./enemyAttack.js";
import { resolveFleeingTheft } from "./enemyFlee.js";
import { resolveFlytrapAttack } from "./flytrapHold.js";
import { resolveIceMonsterAttack } from "./iceMonsterFreeze.js";

export const withEvents = (
	progress: EnemyTurnProgress,
	events: readonly GameEvent[],
): EnemyTurnProgress =>
	events.length === 0
		? progress
		: { ...progress, events: [...progress.events, ...events] };

type AdjacentAction = (
	state: GameState,
	enemy: Enemy,
	actor: EnemyActor,
	progress: EnemyTurnProgress,
) => EnemyActionResult;

/**
 * Thief/nymph: an ordinary attack first (attackWithDice — a thief's 1d1, a
 * nymph's 0d0); only a landed hit lets it steal (enemyFlee.ts), as in
 * original Rogue's attack(). A thief then always vanishes; a nymph only
 * once it has taken something.
 */
const stealAndFlee: AdjacentAction = (state, enemy, actor, progress) => {
	if (enemy.kind !== "thief" && enemy.kind !== "nymph") {
		throw new Error("unreachable: stealAndFlee is only listed for thieves");
	}
	const attacked = attackWithDice(state, enemy, actor, progress);
	if (!attacked.landed || attacked.progress.died) {
		return attacked;
	}
	const { event, ...stolen } = resolveFleeingTheft(
		enemy.kind,
		attacked.progress.rng,
		attacked.progress.goldCollected,
		attacked.progress.inventory,
		state.playerLevel,
		state.floor,
	);
	if (event === undefined) {
		return attacked;
	}
	return {
		actor: { ...attacked.actor, fled: true },
		progress: withEvents({ ...attacked.progress, ...stolen }, [event]),
	};
};

/**
 * The kinds whose turn next to the player is not a plain melee attack. A
 * kind absent here attacks with its dice (attackWithDice). A lookup table
 * rather than an if-chain (functional-style.md's limit) — converted at the
 * 4th special kind, the ice monster.
 */
const SPECIAL_ADJACENT_ACTIONS: Readonly<
	Partial<Record<EnemyKind, AdjacentAction>>
> = {
	thief: stealAndFlee,
	nymph: stealAndFlee,
	/* tightens its hold instead of rolling dice — flytrapHold.ts */
	"venus-flytrap": (state, enemy, actor, progress) => {
		const { events, ...squeezed } = resolveFlytrapAttack(
			progress.flytrapHoldDamage,
			progress.playerHp,
			calculateEnemyHitChancePercent(
				enemy.kind,
				progress.inventory,
				calculateEnemyLevelBonus(state.floor),
				progress.playerRunFlag,
			),
			progress.rng,
		);
		return {
			actor,
			progress: withEvents(
				{ ...progress, ...squeezed, died: progress.died || squeezed.died },
				events,
			),
		};
	},
	/* freezes instead of dealing damage — iceMonsterFreeze.ts */
	"ice-monster": (state, enemy, actor, progress) => {
		const { events, ...frozen } = resolveIceMonsterAttack(
			progress.playerParalyzedTurnsRemaining,
			calculateEnemyHitChancePercent(
				enemy.kind,
				progress.inventory,
				calculateEnemyLevelBonus(state.floor),
				progress.playerRunFlag,
			),
			progress.rng,
		);
		return {
			actor,
			progress: withEvents(
				{
					...progress,
					rng: frozen.rng,
					playerParalyzedTurnsRemaining: frozen.paralyzedTurnsRemaining,
					/* a landed freeze takes the run flag away (original Rogue's attack()) */
					playerRunFlag:
						frozen.paralyzedTurnsRemaining >
						progress.playerParalyzedTurnsRemaining
							? false
							: progress.playerRunFlag,
					died: progress.died || frozen.died,
				},
				events,
			),
		};
	},
};

/** Every other kind: one to-hit and damage roll per attack die, plus its own on-hit effect (enemyAttack.ts). */
const attackWithDice = (
	state: GameState,
	enemy: Enemy,
	actor: EnemyActor,
	progress: EnemyTurnProgress,
): EnemyActionResult & { readonly landed: boolean } => {
	const hit = resolveEnemyAttack(enemy, actor.hp, {
		playerHp: progress.playerHp,
		playerMaxHp: progress.playerMaxHp,
		playerStrength: progress.playerStrength,
		playerLevel: progress.playerLevel,
		playerExperience: progress.playerExperience,
		inventory: progress.inventory,
		rng: progress.rng,
		levelBonus: calculateEnemyLevelBonus(state.floor),
		playerRunFlag: progress.playerRunFlag,
		attackerName: nameEnemy(state, { ...enemy, ...actor.position }),
	});
	return {
		actor: { ...actor, hp: hit.enemyHp },
		progress: withEvents(
			{ ...progress, ...hit.target, died: progress.died || hit.died },
			hit.events,
		),
		landed: hit.landed,
	};
};

/**
 * One action of an enemy standing next to the player. Whatever it does,
 * the player has been attacked — original Rogue's attack() ends the quiet
 * that natural healing waits for, even for a theft or a miss.
 */
export const resolveAdjacentAction = (
	state: GameState,
	enemy: Enemy,
	actor: EnemyActor,
	progress: EnemyTurnProgress,
): EnemyActionResult => {
	const action =
		(enemy.cancelled ? undefined : SPECIAL_ADJACENT_ACTIONS[enemy.kind]) ??
		attackWithDice;
	const result = action(state, enemy, actor, {
		...progress,
		playerAttacked: true,
	});
	return result;
};
