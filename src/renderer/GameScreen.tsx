import { Box } from "ink";
import type { Cell } from "./cell.js";
import { MapRow } from "./MapRow.js";
import { groupIntoRuns } from "./runs.js";
import type { TerminalProfile } from "./terminalProfile.js";

export interface GameScreenProps {
	readonly grid: readonly (readonly Cell[])[];
	readonly terminalProfile: TerminalProfile;
}

/**
 * Renders a full grid of logical cells, one `<MapRow>` per row.
 */
export const GameScreen = ({ grid, terminalProfile }: GameScreenProps) => {
	return (
		<Box flexDirection="column">
			{grid.map((row, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: grid is a fixed-size layout rendered once per frame, never reordered
				<MapRow key={index} runs={groupIntoRuns(row, terminalProfile)} />
			))}
		</Box>
	);
};
