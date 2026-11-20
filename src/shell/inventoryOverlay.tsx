import { Box, Text } from "ink";
import {
	resolveTargetKind,
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
} from "./systemMessages.js";

/** One lettered row — shared by the main list and the target-selection list. */
const HeldItemRow = ({
	index,
	item,
	identifiedItemKinds,
}: {
	readonly index: number;
	readonly item: HeldItem;
	readonly identifiedItemKinds: GameState["identifiedItemKinds"];
}) => (
	<Text>
		{toInventoryLetter(index)}) {formatHeldItemLabel(item, identifiedItemKinds)}
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
}: {
	readonly items: readonly HeldItem[];
	readonly identifiedItemKinds: GameState["identifiedItemKinds"];
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
						/>
					))}
			</Box>
		))}
	</Box>
);

/**
 * The held-items panel opened with `i`. Shown INSTEAD of the map (milestone
 * 70, 不思議のダンジョン style). Whether it is open, which row was picked
 * (`selectedItem`), and — only for targeted scrolls (enchant-weapon,
 * enchant-armor, protect-armor) — which item is awaiting a target
 * (`pendingTargetFor`) all live in the shell (main.tsx), never in GameState.
 * Three phases: row list → verb prompt (u/d) → target row list (only for
 * pendingTargetFor kinds, filtered to resolveTargetKind).
 */
export const InventoryOverlay = ({
	state,
	selectedItem,
	pendingTargetFor,
}: {
	readonly state: GameState;
	readonly selectedItem: HeldItem | undefined;
	readonly pendingTargetFor: HeldItem | undefined;
}) => {
	if (pendingTargetFor !== undefined) {
		const targetKind = resolveTargetKind(pendingTargetFor.kind);
		const candidates = state.inventory.filter(
			(item) => item.kind === targetKind,
		);
		return (
			<Box flexDirection="column" borderStyle="round">
				<Text>{ITEM_TARGET_PROMPT}</Text>
				<HeldItemRowList
					items={candidates}
					identifiedItemKinds={state.identifiedItemKinds}
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
						{formatHeldItemLabel(selectedItem, state.identifiedItemKinds)}
					</Text>
					<Text>{resolveItemVerbPrompt(selectedItem)}</Text>
				</>
			) : state.inventory.length === 0 ? (
				<Text>{INVENTORY_EMPTY_MESSAGE}</Text>
			) : (
				<HeldItemRowList
					items={state.inventory}
					identifiedItemKinds={state.identifiedItemKinds}
				/>
			)}
		</Box>
	);
};
