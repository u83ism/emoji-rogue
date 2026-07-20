import type { Cell, TileGlyphs } from "../renderer/index.js";
import type { EnemyKind, ItemKind } from "./events.js";

// Tile set limited to emoji already verified stable on a real terminal
// (docs/tasks/modernization.md Stage 5).
export const TERRAIN_GLYPHS: TileGlyphs = {
	0: { glyph: "🟫" },
	1: { glyph: "🧱" },
};
export const FALLBACK_CELL: Cell = { glyph: "⚠️" };
export const PLAYER_CELL: Cell = { glyph: "🧑" };
/* Single-codepoint, Unicode 6.0 — inside the "technically stable" emoji
 * category docs/design.md restricts tiles to. */
export const DEAD_PLAYER_CELL: Cell = { glyph: "💀" };
/* Also single-codepoint, Unicode 6.0 — shown once the player surfaces with the amulet. */
export const WON_PLAYER_CELL: Cell = { glyph: "🎉" };
/* Bat, also single-codepoint. Per-kind so a third enemy kind is one entry. */
export const ENEMY_GLYPHS: Readonly<Record<EnemyKind, Cell>> = {
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
};
/* Staircase, by direction (both single-codepoint, Unicode 6.0). */
export const STAIRS_GLYPHS: Readonly<Record<"up" | "down", Cell>> = {
	down: { glyph: "🔽" },
	up: { glyph: "🔼" },
};
/* Amulet of Yendor: single-codepoint, Unicode 6.0 — GOAL_FLOOR only. */
export const AMULET_CELL: Cell = { glyph: "💎" };
/* Sword uses a kitchen knife glyph (single-codepoint, no variation selector
 * needed) rather than the crossed-swords/dagger emoji, which both require
 * one — see docs/design.md's "avoid combining sequences" rule (re-verified
 * milestone 73: both 🗡️/⚔️ still need VS16). The defense equipment item
 * uses a safety vest for the same reason (🛡️ needs a variation selector) —
 * milestone 75 renamed the item itself from "shield"/盾 to "armor"/鎧 to
 * match the glyph, rather than keep hunting for a shield-shaped emoji that
 * doesn't exist under this stability bar. */
export const ITEM_GLYPHS: Readonly<Record<ItemKind, Cell>> = {
	"heal-potion": { glyph: "💊" },
	sword: { glyph: "🔪" },
	armor: { glyph: "🦺" },
	food: { glyph: "🍖" },
	/* Same glyph as heal-potion, on purpose — poison is unidentified until drunk. */
	poison: { glyph: "💊" },
	/* Also the same glyph — strength is unidentified until drunk too. */
	strength: { glyph: "💊" },
	/* Same glyph again — confusion is unidentified until drunk too. */
	confusion: { glyph: "💊" },
	/* Same glyph again — levitation is unidentified until drunk too. */
	levitation: { glyph: "💊" },
	/* Same glyph again — blindness is unidentified until drunk too. */
	blindness: { glyph: "💊" },
	/* Same glyph again — paralysis is unidentified until drunk too. */
	paralysis: { glyph: "💊" },
	/* Same glyph again — raise-level is unidentified until drunk too. */
	"raise-level": { glyph: "💊" },
	/* Same glyph again — detect-monster is unidentified until drunk too. */
	"detect-monster": { glyph: "💊" },
	/* Same glyph again — life is unidentified until drunk too. */
	life: { glyph: "💊" },
	/* Same glyph again — hallucination is unidentified until drunk too. */
	hallucination: { glyph: "💊" },
	/* Scroll: single-codepoint, Unicode 6.0. Every scroll kind shares this
	 * glyph — genre convention (Mystery Dungeon et al.) is that item art is
	 * fixed per category, and identity is conveyed by the name shown on
	 * pickup, not by varying the icon. Unlike wands/rings below, scrolls are
	 * not anonymous (their real name shows immediately), so the shared glyph
	 * carries no gameplay weight here — it's purely the genre convention. */
	"protect-armor": { glyph: "📜" },
	"teleport-scroll": { glyph: "📜" },
	"mapping-scroll": { glyph: "📜" },
	"identify-scroll": { glyph: "📜" },
	"enchant-weapon": { glyph: "📜" },
	"enchant-armor": { glyph: "📜" },
	"remove-curse-scroll": { glyph: "📜" },
	/* Ring: single-codepoint, Unicode 6.0. */
	"regeneration-ring": { glyph: "💍" },
	/* Same glyph as the ring of regeneration — both are just "a ring" on the ground. */
	"sustenance-ring": { glyph: "💍" },
	/* Magic wand: single-codepoint, VS16-free, Emoji 13.0 — within the
	 * Emoji-15.1 ceiling (docs/emoji-policy.md ADR 2026-07-19). Replaces the
	 * earlier crystal-ball glyph, which was semantically a mismatch for
	 * "wand" but was the best fit under the old (Unicode-6.0) ceiling. */
	"striking-wand": { glyph: "🪄" },
	/* Same glyph as the wand of striking — both are just "a wand" on the ground. */
	"slow-wand": { glyph: "🪄" },
	/* Same glyph again — every wand is just "a wand" on the ground. */
	"teleport-wand": { glyph: "🪄" },
	/* Same glyph as the other rings — every ring is just "a ring" on the ground. */
	"stealth-ring": { glyph: "💍" },
	"awareness-ring": { glyph: "💍" },
	/* Same glyph again — every wand is just "a wand" on the ground. */
	"magic-missile-wand": { glyph: "🪄" },
	/* Same scroll glyph as every other scroll kind — see the comment above. */
	"confuse-monster-scroll": { glyph: "📜" },
	"hold-monster-scroll": { glyph: "📜" },
};
/* Money bag: single-codepoint, Unicode 6.0. */
export const GOLD_CELL: Cell = { glyph: "💰" };

/* Status-effect chip glyphs shown in chrome (src/shell/statusBar.tsx,
 * demo/main.js) — exported here (not just inline in statusBar.tsx) so both
 * consumers share one definition instead of hand-copying the emoji and
 * silently drifting (see docs/tasks/game.md milestone 78). Selection
 * rationale for each is in milestone 74 and docs/emoji-registry.md. */
export const CONFUSION_GLYPH = "💫";
export const LEVITATION_GLYPH = "🪽";
export const BLINDNESS_GLYPH = "🙈";
export const PARALYSIS_GLYPH = "⚡";
export const DETECT_MONSTER_GLYPH = "🔭";
/* Woozy face: single-codepoint, no VS16, Unicode 11.0 — CONFUSION_GLYPH(💫)
 * is already taken, and this project's other status chips are all
 * Unicode ≤10; kept anyway since no lower-Unicode glyph reads as "things
 * look wrong" without colliding with an existing chip (same exception
 * rationale as the vampire glyph in ENEMY_GLYPHS). */
export const HALLUCINATION_GLYPH = "🥴";

/**
 * Marks a currently-equipped sword/armor/ring row in the inventory overlay
 * (src/shell/inventoryLabels.ts, demo/main.js) — same shared-glyph reasoning
 * as the status chips above. Single codepoint, no VS16, Unicode 6.0 (well
 * under the docs/emoji-policy.md ceiling); EAW Wide per Unicode's East Asian
 * Width data. Added 2026-07-19 (milestone 81) — still pending the real
 * Windows Terminal check the policy's step 5 calls for (this environment has
 * no tmux/PTY, same constraint noted in milestones 79/80).
 */
export const EQUIPPED_GLYPH = "✅";

// Out-of-sight layers use the full-width space (U+3000, East Asian Width
// Wide — a stable 2 columns) instead of emoji: ANSI dimming has no effect on
// color emoji, so remembered terrain is drawn as background-color silhouettes
// and unexplored cells as plain darkness.
export const UNEXPLORED_CELL: Cell = { glyph: "　" };
export const REMEMBERED_WALL_CELL: Cell = { glyph: "　", bg: "#666666" };
export const REMEMBERED_FLOOR_CELL: Cell = { glyph: "　", bg: "#262626" };
/* A landmark worth remembering: once seen, the staircase keeps its own
 * silhouette color so the player can navigate back to it. */
export const REMEMBERED_STAIRS_CELL: Cell = { glyph: "　", bg: "#26454a" };
