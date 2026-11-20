// Event-to-text formatting lives in eventMessages.ts (split out at milestone
// 98 once this file passed the 200-line structure-lint limit) — this file
// keeps the two other small text formatters that don't belong there.

/** The one-line run summary shown once the game ends — see calculateScore in game/score.ts. */
export const formatScoreSummary = (
	score: number,
	floor: number,
	playerLevel: number,
	goldCollected: number,
	hasAmulet: boolean,
): string =>
	`スコア: ${score}(Lv.${playerLevel}, B${floor}F, 所持金${goldCollected}, ${
		hasAmulet ? "護符あり" : "護符なし"
	})`;
