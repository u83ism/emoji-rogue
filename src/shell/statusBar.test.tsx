import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { buildArenaGameState } from "../game/initialState.js";
import { StatusBar } from "./statusBar.js";

describe("StatusBar", () => {
	it("shows an ice monster's freeze with the ice glyph, any other paralysis with ⚡", () => {
		const base = {
			...buildArenaGameState(9, 3, 1),
			paralyzedTurnsRemaining: 3,
		};
		const frozen =
			render(<StatusBar state={{ ...base, frozen: true }} />).lastFrame() ?? "";
		expect(frozen).toContain("🧊");
		expect(frozen).not.toContain("⚡");
		const asleep =
			render(<StatusBar state={{ ...base, frozen: false }} />).lastFrame() ??
			"";
		expect(asleep).toContain("⚡");
		expect(asleep).not.toContain("🧊");
	});
});
