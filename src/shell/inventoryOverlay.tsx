import { Box, Text } from "ink";
import type { ItemKind } from "../game/events.js";
import { toInventoryLetter } from "../game/inventoryKeymap.js";
import type { GameState } from "../game/state.js";
import { resolveItemDisplayName } from "./gameNames.js";
import { formatInventoryTitle } from "./messages.js";
import { INVENTORY_EMPTY_MESSAGE, ITEM_VERB_PROMPT } from "./systemMessages.js";

/**
 * The held-items panel opened with `i`. Shown INSTEAD of the map (milestone
 * 70, 不思議のダンジョン style) — main.tsx swaps it in for `<GameScreen>`
 * inside a map-height box, so the status bar and log never move. Whether it
 * is open lives in the shell (main.tsx) — display state, never part of
 * GameState. `selectedItemKind` is set once a row has been picked, swapping
 * the row list for the use/drop verb prompt (also shell display state).
 * Each row is one held item (no stacking — see GameState.inventory), so two
 * potions of the same kind list as two identical-looking rows.
 */
export const InventoryOverlay = ({
	state,
	selectedItemKind,
}: {
	readonly state: GameState;
	readonly selectedItemKind: ItemKind | undefined;
}) => (
	<Box flexDirection="column" borderStyle="round">
		<Text>{formatInventoryTitle(state.inventory.length)}</Text>
		{selectedItemKind !== undefined ? (
			<>
				<Text>
					{resolveItemDisplayName(
						selectedItemKind,
						state.identifiedPotionKinds,
					)}
				</Text>
				<Text>{ITEM_VERB_PROMPT}</Text>
			</>
		) : state.inventory.length === 0 ? (
			<Text>{INVENTORY_EMPTY_MESSAGE}</Text>
		) : (
			state.inventory.map((kind, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: rows repeat by kind (no stacking) and never reorder except by append/remove, so the index is a stable identity here
				<Text key={index}>
					{toInventoryLetter(index)}){" "}
					{resolveItemDisplayName(kind, state.identifiedPotionKinds)}
				</Text>
			))
		)}
	</Box>
);
