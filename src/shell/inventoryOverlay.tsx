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
	identifiedPotionKinds,
}: {
	readonly index: number;
	readonly item: HeldItem;
	readonly identifiedPotionKinds: GameState["identifiedPotionKinds"];
}) => (
	<Text>
		{toInventoryLetter(index)}){" "}
		{formatHeldItemLabel(item, identifiedPotionKinds)}
	</Text>
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
				{candidates.map((item, index) => (
					<HeldItemRow
						// biome-ignore lint/suspicious/noArrayIndexKey: rows repeat by kind (no stacking) and never reorder except by append/remove, so the index is a stable identity here
						key={index}
						index={index}
						item={item}
						identifiedPotionKinds={state.identifiedPotionKinds}
					/>
				))}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" borderStyle="round">
			<Text>{formatInventoryTitle(state.inventory.length)}</Text>
			{selectedItem !== undefined ? (
				<>
					<Text>
						{formatHeldItemLabel(selectedItem, state.identifiedPotionKinds)}
					</Text>
					<Text>{resolveItemVerbPrompt(selectedItem)}</Text>
				</>
			) : state.inventory.length === 0 ? (
				<Text>{INVENTORY_EMPTY_MESSAGE}</Text>
			) : (
				state.inventory.map((item, index) => (
					<HeldItemRow
						// biome-ignore lint/suspicious/noArrayIndexKey: rows repeat by kind (no stacking) and never reorder except by append/remove, so the index is a stable identity here
						key={index}
						index={index}
						item={item}
						identifiedPotionKinds={state.identifiedPotionKinds}
					/>
				))
			)}
		</Box>
	);
};
