import { Box, Text } from "ink";
import {
	PLAYER_HUNGER_WARNING_THRESHOLD,
	PLAYER_MAX_FOOD,
} from "../game/balance.js";
import type { GameState } from "../game/state.js";

const LOW_HP_THRESHOLD = 3;

/** Two stages: yellow once food dips to the warning threshold, red once it hits 0 (starving). */
const resolveFoodTextStyle = (
	playerFood: number,
): { readonly color?: string } => {
	if (playerFood <= 0) {
		return { color: "red" };
	}
	return playerFood <= PLAYER_HUNGER_WARNING_THRESHOLD
		? { color: "yellow" }
		: {};
};

/**
 * One chip per temporary status, shown only while its counter is positive.
 * Adding a status is one entry here (same table idiom as balance.ts's
 * ENEMY_MAX_HP), not another copy-pasted conditional block.
 *
 * Glyphs are dedicated per-status (not reused item glyphs like 🍖/🦺 below):
 * the potions that cause these statuses all share 💊 while unidentified, so
 * there is no source icon to mirror. Chosen per docs/emoji-policy.md's
 * criteria + milestone 74: 💫 confusion (manga convention for dizziness,
 * not the ZWJ 😵‍💫 variant), 🪽 levitation, 🙈 blindness (passive "made
 * unable to see" — rejected 🫣, whose peeking implies an active choice to
 * look; also rejected the real-world accessibility glyph 🦯 as tonally
 * mismatched for a comedic temporary debuff), ⚡ paralysis (freed up by the
 * scroll-glyph unification in milestone 72), 🔭 detect-monster (👁️ was the
 * intuitive pick but needs VS16, so it's excluded).
 */
const STATUS_CHIPS: readonly {
	readonly label: string;
	readonly glyph: string;
	readonly color: string;
	readonly resolveRemaining: (state: GameState) => number;
}[] = [
	{
		label: "混乱中",
		glyph: "💫",
		color: "magenta",
		resolveRemaining: (state) => state.confusedTurnsRemaining,
	},
	{
		label: "浮遊中",
		glyph: "🪽",
		color: "cyan",
		resolveRemaining: (state) => state.levitationTurnsRemaining,
	},
	{
		label: "盲目",
		glyph: "🙈",
		color: "gray",
		resolveRemaining: (state) => state.blindTurnsRemaining,
	},
	{
		label: "麻痺",
		glyph: "⚡",
		color: "red",
		resolveRemaining: (state) => state.paralyzedTurnsRemaining,
	},
	{
		label: "索敵中",
		glyph: "🔭",
		color: "green",
		resolveRemaining: (state) => state.detectMonstersTurnsRemaining,
	},
];

/**
 * The one-line chrome row ABOVE the map (the 不思議のダンジョン layout):
 * floor, level, HP, food, attack and defense, gold, and a chip per active
 * temporary status. Chrome emoji are allowed under the same stability bar as
 * map tiles — single codepoint, no variation selector, East Asian Width
 * Wide, verified on a real terminal (milestone 68 amended milestone 5's
 * blanket "no emoji in chrome" rule; 💰 was the precedent). 🍖/🦺 deliberately
 * reuse the food/shield item glyphs: the pickup and the number it moves
 * share a face. Floor ("1F") and level ("Lv.") stay text — their emoji
 * candidates were either unstable (🪜) or colliding with map glyphs (🔽).
 * HP moved from text to 💓 in milestone 74, once docs/emoji-policy.md's
 * Unicode ceiling research turned up a VS16-free red heart (❤️, milestone
 * 68's original candidate, needs one and was rejected for it).
 */
export const StatusBar = ({ state }: { readonly state: GameState }) => (
	<Box>
		<Text>{state.floor}F </Text>
		<Text color="blueBright">Lv.{state.playerLevel} </Text>
		<Text color={state.playerHp <= LOW_HP_THRESHOLD ? "red" : "green"}>
			💓 {state.playerHp}/{state.playerMaxHp}
		</Text>
		<Text> </Text>
		<Text {...resolveFoodTextStyle(state.playerFood)}>
			🍖 {state.playerFood}/{PLAYER_MAX_FOOD}
		</Text>
		<Text> </Text>
		<Text>
			💪 {state.playerAttackDamage} 🦺 {state.playerDefense}
		</Text>
		<Text> </Text>
		<Text color="yellow">💰{state.goldCollected}</Text>
		{STATUS_CHIPS.map((chip) => {
			const remaining = chip.resolveRemaining(state);
			if (remaining <= 0) {
				return null;
			}
			return (
				<Text key={chip.label} color={chip.color}>
					{" "}
					{chip.glyph}({remaining})
				</Text>
			);
		})}
	</Box>
);
