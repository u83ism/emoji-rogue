import { useState } from "react";
import {
	resolveTargetKind,
	toItemVerbAction,
	toSelectedHeldItem,
	toTargetedUseAction,
} from "../game/inventoryKeymap.js";
import type { Action, HeldItem } from "../game/state.js";

/**
 * The inventory overlay's key-handling state machine, extracted out of
 * main.tsx once the overlay grew a third phase (target selection for
 * enchant-weapon/enchant-armor/protect-armor) and pushed the file over the
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

	const close = (): void => {
		setIsOpen(false);
		setSelectedItem(undefined);
		setPendingTargetFor(undefined);
	};

	const handleInput = (
		input: string,
		isEscape: boolean,
		inventory: readonly HeldItem[],
	): Action | undefined => {
		if (pendingTargetFor !== undefined) {
			if (input === "i" || isEscape) {
				close();
				return undefined;
			}
			const candidates = inventory.filter(
				(item) => item.kind === resolveTargetKind(pendingTargetFor.kind),
			);
			const target = toSelectedHeldItem(input, candidates);
			if (target === undefined) {
				return undefined;
			}
			const action = toTargetedUseAction(pendingTargetFor, target);
			close();
			return action;
		}
		if (selectedItem !== undefined) {
			if (input === "i" || isEscape) {
				close();
				return undefined;
			}
			const targetKind = resolveTargetKind(selectedItem.kind);
			if (input === "u" && targetKind !== undefined) {
				if (inventory.some((item) => item.kind === targetKind)) {
					setPendingTargetFor(selectedItem);
				}
				return undefined;
			}
			const action = toItemVerbAction(input, selectedItem);
			if (action !== undefined) {
				close();
			}
			return action;
		}
		if (input === "i" || isEscape) {
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
		open: () => setIsOpen(true),
		close,
		handleInput,
	};
};
