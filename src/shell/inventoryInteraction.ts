import { useState } from "react";
import {
	canThrowItem,
	filterScrollTargets,
	toItemVerbAction,
	toSelectedHeldItem,
	toTargetedUseAction,
	toThrowAction,
} from "../game/inventoryKeymap.js";
import type { Action, Direction, HeldItem } from "../game/state.js";

/**
 * The inventory overlay's key-handling state machine, extracted out of
 * main.tsx once the overlay grew a third phase (target selection for a
 * targeted scroll — now the identify scroll) and pushed the file over the
 * 200-line structure-lint limit — same reason session.ts was split out in
 * milestone 79. Purely shell display state (never part of GameState, never
 * saved): whether the overlay is open, which row was picked (`selectedItem`),
 * and — only for a targeted scroll — which item is awaiting a target
 * (`pendingTargetFor`).
 */
export interface InventoryInteraction {
	readonly isOpen: boolean;
	readonly selectedItem: HeldItem | undefined;
	readonly pendingTargetFor: HeldItem | undefined;
	/** The weapon picked to throw, waiting for its direction. */
	readonly pendingThrowFor: HeldItem | undefined;
	readonly open: () => void;
	readonly close: () => void;
	/**
	 * Handles one keypress while the overlay is open, against the current
	 * inventory (needed to letter-select rows and, for a targeted scroll, to
	 * filter candidates). Returns the Action to dispatch, if the keypress
	 * completed one; the caller is responsible for dispatching it.
	 */
	readonly handleInput: (
		input: string,
		isEscape: boolean,
		inventory: readonly HeldItem[],
		direction: Direction | undefined,
	) => Action | undefined;
}

export const useInventoryInteraction = (): InventoryInteraction => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<HeldItem | undefined>(
		undefined,
	);
	const [pendingTargetFor, setPendingTargetFor] = useState<
		HeldItem | undefined
	>(undefined);

	const [pendingThrowFor, setPendingThrowFor] = useState<HeldItem | undefined>(
		undefined,
	);

	const close = (): void => {
		setIsOpen(false);
		setSelectedItem(undefined);
		setPendingTargetFor(undefined);
		setPendingThrowFor(undefined);
	};

	const handleInput = (
		input: string,
		isEscape: boolean,
		inventory: readonly HeldItem[],
		direction: Direction | undefined,
	): Action | undefined => {
		if (pendingThrowFor !== undefined) {
			if (isEscape) {
				close();
				return undefined;
			}
			if (direction === undefined) {
				return undefined;
			}
			const action = toThrowAction(pendingThrowFor, direction);
			close();
			return action;
		}
		if (pendingTargetFor !== undefined) {
			if (isEscape) {
				close();
				return undefined;
			}
			const candidates =
				filterScrollTargets(pendingTargetFor.kind, inventory) ?? [];
			const target = toSelectedHeldItem(input, candidates);
			if (target === undefined) {
				return undefined;
			}
			const action = toTargetedUseAction(pendingTargetFor, target);
			close();
			return action;
		}
		if (selectedItem !== undefined) {
			if (isEscape) {
				close();
				return undefined;
			}
			const candidates = filterScrollTargets(selectedItem.kind, inventory);
			if (input === "u" && candidates !== undefined && candidates.length > 0) {
				setPendingTargetFor(selectedItem);
				return undefined;
			}
			if (input === "t" && canThrowItem(selectedItem)) {
				setPendingThrowFor(selectedItem);
				return undefined;
			}
			const action = toItemVerbAction(input, selectedItem);
			if (action !== undefined) {
				close();
			}
			return action;
		}
		if (isEscape) {
			close();
			return undefined;
		}
		const item = toSelectedHeldItem(input, inventory);
		if (item !== undefined) {
			setSelectedItem(item);
		}
		return undefined;
	};

	return {
		isOpen,
		selectedItem,
		pendingTargetFor,
		pendingThrowFor,
		open: () => setIsOpen(true),
		close,
		handleInput,
	};
};
