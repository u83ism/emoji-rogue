import { Box, Text } from "ink";
import { toInventoryLetter } from "../game/inventoryKeymap.js";
import type { GameState } from "../game/state.js";
import { formatInventoryEntry } from "./messages.js";
import { INVENTORY_EMPTY_MESSAGE, INVENTORY_TITLE } from "./systemMessages.js";

/**
 * The held-items panel opened with `i`. Shown INSTEAD of the map (milestone
 * 70, 不思議のダンジョン style) — main.tsx swaps it in for `<GameScreen>`
 * inside a map-height box, so the status bar and log never move. Whether it
 * is open lives in the shell (main.tsx) — display state, never part of
 * GameState.
 */
export const InventoryOverlay = ({ state }: { readonly state: GameState }) => (
	<Box flexDirection="column" borderStyle="round">
		<Text>{INVENTORY_TITLE}</Text>
		{state.inventory.length === 0 ? (
			<Text>{INVENTORY_EMPTY_MESSAGE}</Text>
		) : (
			state.inventory.map((entry, index) => (
				<Text key={entry.kind}>
					{toInventoryLetter(index)}){" "}
					{formatInventoryEntry(entry, state.identifiedPotionKinds)}
				</Text>
			))
		)}
	</Box>
);
