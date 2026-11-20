import { describe, expect, it } from "vitest";
import { formatScoreSummary } from "./messages.js";

describe("formatScoreSummary", () => {
	it("includes the score, level, floor, gold, and amulet status", () => {
		expect(formatScoreSummary(1234, 5, 3, 150, true)).toBe(
			"スコア: 1234(Lv.3, B5F, 所持金150, 護符あり)",
		);
		expect(formatScoreSummary(100, 1, 1, 0, false)).toBe(
			"スコア: 100(Lv.1, B1F, 所持金0, 護符なし)",
		);
	});
});
