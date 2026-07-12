import { Box, Text } from "ink";
import type { CellRun } from "./runs.js";

export interface MapRowProps {
	readonly runs: readonly CellRun[];
}

/**
 * Ink's Text props require `color`/`backgroundColor` to be omitted entirely
 * when unset (not present-with-value-undefined), which a plain
 * `color={run.fg}` JSX prop can't express under exactOptionalPropertyTypes.
 */
function colorProps(run: CellRun): {
	color?: string;
	backgroundColor?: string;
} {
	const props: { color?: string; backgroundColor?: string } = {};
	if (run.fg !== undefined) props.color = run.fg;
	if (run.bg !== undefined) props.backgroundColor = run.bg;
	return props;
}

/**
 * Renders one row of the map grid as a sequence of colored text runs.
 * Deliberately does not use a `<Box>` per cell (or a border/padding at all):
 * per-cell Box sizing is exactly where a general-purpose layout engine's
 * runtime width measurement of emoji has historically gone wrong.
 */
export function MapRow({ runs }: MapRowProps) {
	return (
		<Box flexDirection="row">
			{runs.map((run, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: runs is a fixed-size row rendered once per frame, never reordered
				<Text key={index} {...colorProps(run)}>
					{run.text}
				</Text>
			))}
		</Box>
	);
}
