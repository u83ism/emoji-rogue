const SEED_ARGUMENT_PATTERN = /^--seed=(.+)$/;

/**
 * Picks a `--seed=<positive number>` out of CLI arguments, if present.
 * Undefined for a missing or invalid seed so the caller can fall back to
 * Date.now(). Mirrors demo/'s `?seed=` URL parameter and the same
 * validation rule (finite, positive) — both exist for the same "share a
 * seed" purpose from the design decisions in docs/tasks/game.md.
 */
export const parseSeedArgument = (
	argv: readonly string[],
): number | undefined => {
	for (const argument of argv) {
		const match = SEED_ARGUMENT_PATTERN.exec(argument);
		if (match === null) {
			continue;
		}
		const seed = Number(match[1]);
		if (Number.isFinite(seed) && seed > 0) {
			return seed;
		}
	}
	return undefined;
};
