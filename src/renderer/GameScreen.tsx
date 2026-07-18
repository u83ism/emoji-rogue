import { Box } from "ink";
import type { Cell } from "./cell.js";
import { MapRow } from "./MapRow.js";
import { groupIntoRuns } from "./runs.js";

export interface GameScreenProps {
	readonly grid: readonly (readonly Cell[])[];
}

/**
 * Renders a full grid of logical cells, one `<MapRow>` per row.
 */
export const GameScreen = ({ grid }: GameScreenProps) => {
	return (
		<Box flexDirection="column">
			{grid.map((row, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: grid is a fixed-size layout rendered once per frame, never reordered
				<MapRow key={index} runs={groupIntoRuns(row)} />
			))}
		</Box>
	);
};
