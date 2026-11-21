import { Box, Text } from "ink";
import {
	filterScrollTargets,
	toInventoryLetter,
} from "../game/inventoryKeymap.js";
import type { GameState, HeldItem } from "../game/state.js";
import {
	formatHeldItemLabel,
	formatInventoryTitle,
	resolveItemVerbPrompt,
} from "./inventoryLabels.js";
import {
	INVENTORY_EMPTY_MESSAGE,
	ITEM_TARGET_PROMPT,
	THROW_DIRECTION_PROMPT,
} from "./systemMessages.js";

/** One lettered row — shared by the main list and the target-selection list. */
const HeldItemRow = ({
	index,
	item,
	identifiedItemKinds,
	appearances,
}: {
	readonly index: number;
	readonly item: HeldItem;
	readonly identifiedItemKinds: GameState["identifiedItemKinds"];
	readonly appearances: GameState["appearances"];
}) => (
	<Text>
		{toInventoryLetter(index)}){" "}
		{formatHeldItemLabel(item, identifiedItemKinds, appearances)}
	</Text>
);

/** Rows per column in a row list — two columns of this hold all INVENTORY_CAPACITY (26) rows inside the map-height box main.tsx pins the overlay to. */
const ROWS_PER_COLUMN = 13;

/**
 * A lettered row list, column-major: rows past ROWS_PER_COLUMN flow into a
 * second column so a full pack never outgrows the overlay's fixed height.
 * Letters follow the position in `items`, matching toSelectedHeldItem.
 */
const HeldItemRowList = ({
	items,
	identifiedItemKinds,
	appearances,
}: {
	readonly items: readonly HeldItem[];
	readonly identifiedItemKinds: GameState["identifiedItemKinds"];
	readonly appearances: GameState["appearances"];
}) => (
	<Box flexDirection="row">
		{[0, ROWS_PER_COLUMN].map((columnStart) => (
			<Box key={columnStart} flexDirection="column" width="50%">
				{items
					.slice(columnStart, columnStart + ROWS_PER_COLUMN)
					.map((item, rowIndex) => (
						<HeldItemRow
							key={item.itemId}
							index={columnStart + rowIndex}
							item={item}
							identifiedItemKinds={identifiedItemKinds}
							appearances={appearances}
						/>
					))}
			</Box>
		))}
	</Box>
);

/**
 * The held-items panel opened with `i`. Shown INSTEAD of the map (milestone
 * 70, 不思議のダンジョン style). Whether it is open, which row was picked
 * (`selectedItem`), and — only for a targeted scroll (the identify
 * scroll) — which item is awaiting a target (`pendingTargetFor`) all live
 * in the shell (main.tsx), never in GameState. Three phases: row list →
 * verb prompt (u/d) → target row list (filterScrollTargets).
 */
export const InventoryOverlay = ({
	state,
	selectedItem,
	pendingTargetFor,
	pendingThrowFor,
}: {
	readonly state: GameState;
	readonly selectedItem: HeldItem | undefined;
	readonly pendingTargetFor: HeldItem | undefined;
	readonly pendingThrowFor?: HeldItem | undefined;
}) => {
	if (pendingThrowFor !== undefined) {
		return (
			<Box flexDirection="column" borderStyle="round">
				<Text>
					{formatHeldItemLabel(
						pendingThrowFor,
						state.identifiedItemKinds,
						state.appearances,
					)}
				</Text>
				<Text>{THROW_DIRECTION_PROMPT}</Text>
			</Box>
		);
	}
	if (pendingTargetFor !== undefined) {
		const candidates =
			filterScrollTargets(pendingTargetFor.kind, state.inventory) ?? [];
		return (
			<Box flexDirection="column" borderStyle="round">
				<Text>{ITEM_TARGET_PROMPT}</Text>
				<HeldItemRowList
					items={candidates}
					identifiedItemKinds={state.identifiedItemKinds}
					appearances={state.appearances}
				/>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" borderStyle="round">
			<Text>{formatInventoryTitle(state.inventory.length)}</Text>
			{selectedItem !== undefined ? (
				<>
					<Text>
						{formatHeldItemLabel(
							selectedItem,
							state.identifiedItemKinds,
							state.appearances,
						)}
					</Text>
					<Text>{resolveItemVerbPrompt(selectedItem)}</Text>
				</>
			) : state.inventory.length === 0 ? (
				<Text>{INVENTORY_EMPTY_MESSAGE}</Text>
			) : (
				<HeldItemRowList
					items={state.inventory}
					identifiedItemKinds={state.identifiedItemKinds}
					appearances={state.appearances}
				/>
			)}
		</Box>
	);
};
