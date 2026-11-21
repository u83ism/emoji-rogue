import type { EnemyKind } from "../../events.js";
import type { Position } from "../../state.js";

/**
 * Percent chance, rolled on every action, that a kind lurches one step in a
 * random direction instead of doing what it meant to — attack included.
 * Original Rogue's chase(): "bats are quite confused all the time"
 * (`rnd(2) == 0`), and the phantom's slot, the invisible stalker, is
 * "slightly confused all of the time" (`rnd(5) == 0`).
 */
export const ERRATIC_MOVE_CHANCE_PERCENT: Readonly<
	Partial<Record<EnemyKind, number>>
> = {
	bat: 50,
	phantom: 20,
};

/** The kinds carrying original Rogue's ISFLY flag. */
const FLYING_ENEMY_KINDS: readonly EnemyKind[] = ["bat", "griffin", "kestrel"];

/** Original Rogue's runners() gives a flier its second move only while the squared distance to the hero is at least this — i.e. not next to it, diagonals included. */
const FLYING_SECOND_MOVE_MIN_SQUARED_DISTANCE = 3;

/**
 * Whether a `kind` standing at `position` after its action gets to act a
 * second time this turn: a flying kind does while it is still away from the
 * player, so it closes in at double speed but fights at normal speed.
 */
export const canFlyAgain = (
	kind: EnemyKind,
	position: Position,
	player: Position,
): boolean => {
	if (!FLYING_ENEMY_KINDS.includes(kind)) {
		return false;
	}
	const deltaX = position.x - player.x;
	const deltaY = position.y - player.y;
	return (
		deltaX * deltaX + deltaY * deltaY >= FLYING_SECOND_MOVE_MIN_SQUARED_DISTANCE
	);
};
