import type { Cell } from "../renderer/index.js";
import type { EnemyKind } from "./events.js";

// Split out of glyphs.ts (milestone 101 follow-up) once the second batch of
// original-Rogue monsters pushed that file past the 200-line structure-lint
// limit — the enemy roster's rationale comments were the overwhelming share
// of the growth. Selection rationale for each glyph lives inline below and
// in docs/emoji-registry.md; the technical criteria themselves (single
// codepoint, no VS16, EAW Wide, Unicode ≤15.1) are in docs/emoji-policy.md.
export const ENEMY_GLYPHS: Readonly<Record<EnemyKind, Cell>> = {
	/* Zombie, bat: both single-codepoint, Unicode 6.0. */
	zombie: { glyph: "🧟" },
	bat: { glyph: "🦇" },
	/* Goblin mask: single-codepoint, Unicode 6.0. */
	thief: { glyph: "👺" },
	/* Ghost: single-codepoint, Unicode 6.0 — fits "appears, steals, vanishes"
	 * better than the newer (Unicode 10) fairy emoji, which this project's
	 * stability rule (docs/design.md) avoids. */
	nymph: { glyph: "👻" },
	/* Octopus: single-codepoint, Unicode 6.0. */
	aquator: { glyph: "🐙" },
	/* Ogre: single-codepoint, Unicode 6.0. */
	orc: { glyph: "👹" },
	/* Dragon: single-codepoint, Unicode 6.0. */
	dragon: { glyph: "🐉" },
	/* No stable single-codepoint yeti emoji exists — bear (Unicode 6.0) stands in as the nearest mountain-beast glyph. */
	yeti: { glyph: "🐻" },
	/* Snake: single-codepoint, Unicode 6.0. */
	snake: { glyph: "🐍" },
	/* Vampire: single-codepoint, no ZWJ/variation selector, but Unicode 11.0 —
	 * newer than this project's usual Unicode 6.0 preference (see docs/design.md),
	 * kept as an exception since no older glyph depicts a vampire (same
	 * reasoning as the yeti/bear substitution, except here the glyph itself
	 * is the best fit rather than a stand-in). */
	vampire: { glyph: "🧛" },
	/* Rat: direct literal match, single-codepoint, Unicode 6.0. */
	rat: { glyph: "🐀" },
	/* No stable single-codepoint emu emoji exists — dodo (Unicode 13.0)
	 * stands in as the nearest "large flightless bird" glyph, same
	 * substitution reasoning as the yeti/bear pairing above. */
	emu: { glyph: "🦤" },
	/* No stable single-codepoint kestrel/falcon emoji exists — eagle
	 * (Unicode 9.0) stands in as the nearest bird-of-prey glyph. */
	kestrel: { glyph: "🦅" },
	/* No stable single-codepoint hobgoblin emoji exists — thief already uses
	 * the goblin mask (👺), so this uses the horned devil face (Unicode 6.0)
	 * instead, both reading as "evil humanoid" without colliding. */
	hobgoblin: { glyph: "😈" },
	/* No stable single-codepoint centaur emoji exists — horse (Unicode 6.0)
	 * stands in for the "half-horse" half of the hybrid. */
	centaur: { glyph: "🐎" },
	/* Quagga is literally an extinct zebra subspecies — zebra (Unicode 10.0)
	 * is a direct match, not a stand-in. */
	quagga: { glyph: "🦓" },
	/* Ur-vile has no real-world analog and no established visual design even
	 * within Rogue itself — bust in silhouette (Unicode 6.0) stands in for
	 * "shadowy figure", the weakest match in this batch. */
	"ur-vile": { glyph: "👤" },
	/* Jabberwock is dragon-like but distinct from this game's own Dragon —
	 * dragon face (Unicode 6.0) is a different codepoint from the dragon (🐉)
	 * glyph above, avoiding a collision while keeping the family resemblance. */
	jabberwock: { glyph: "🐲" },
	/* Griffin is a lion-eagle hybrid with no dedicated emoji — eagle went to
	 * kestrel already, so this uses the lion half instead (Unicode 8.0). */
	griffin: { glyph: "🦁" },
	/* Troll: direct literal match, single-codepoint, Unicode 14.0 — the first
	 * Unicode version to add one (the earlier yeti/vampire substitutions
	 * predate this and had no such option). */
	troll: { glyph: "🧌" },
	/* No stable single-codepoint "icky thing" emoji exists — microbe
	 * (Unicode 11.0) carries the same blind, amorphous, slightly repulsive
	 * connotation. */
	"icky-thing": { glyph: "🦠" },
	/* No carnivorous-plant emoji exists — herb (Unicode 6.0) stands in as a
	 * generic "dangerous plant", the weakest match in this batch. */
	"venus-flytrap": { glyph: "🌿" },
	/* No stable single-codepoint medusa emoji exists — moai (Unicode 6.0)
	 * evokes the petrify/stone-gaze effect rather than depicting the monster
	 * itself. */
	medusa: { glyph: "🗿" },
	/* Dotted line face: literally designed to depict fading/invisibility
	 * (Unicode 14.0) — a direct semantic match rather than a stand-in. */
	phantom: { glyph: "🫥" },
	/* No stable single-codepoint wraith emoji exists — cold face
	 * (Unicode 9.0) leans on the "wraiths drain warmth/life" fantasy trope
	 * instead of depicting the monster itself. */
	wraith: { glyph: "🥶" },
	/* Coin (Unicode 13.0) — Xeroc disguises itself as gold, so its revealed
	 * form (drawn only once awake; see frame.ts) is a direct match rather
	 * than a stand-in. While still asleep it draws as GOLD_CELL instead. */
	xeroc: { glyph: "🪙" },
};
