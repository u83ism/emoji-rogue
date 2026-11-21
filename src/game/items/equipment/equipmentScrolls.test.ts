import { describe, expect, it } from "vitest";
import { advanceTurn } from "../../advanceTurn.js";
import { ENCHANT_ARMOR_BONUS, ENCHANT_WEAPON_BONUS } from "../../balance.js";
import type { ItemKind } from "../../events.js";
import { buildArenaGameState } from "../../initialState.js";
import type { HeldItem } from "../../state.js";

const sword = (equipped: boolean, cursed = false): HeldItem => ({
	itemId: 1,
	kind: "weapon",
	equipped,
	cursed,
	weaponKind: "long-sword",
	hitBonus: 1,
	damageBonus: 1,
	quantity: 1,
});

const ringMail = (
	itemId: number,
	equipped: boolean,
	cursed = false,
	rustProtected = false,
): HeldItem => ({
	itemId,
	kind: "armor",
	equipped,
	cursed,
	armorKind: "ring-mail",
	defenseBonus: 1,
	rustProtected,
});

/** Reads the scroll (itemId 99) of `kind` with `held` alongside it. */
const readScroll = (kind: ItemKind, held: readonly HeldItem[]) => {
	const state = {
		...buildArenaGameState(9, 3, 1),
		inventory: [...held, { itemId: 99, kind } as HeldItem],
	};
	return {
		state,
		next: advanceTurn(state, { type: "use-item", payload: { itemId: 99 } }),
	};
};

describe("items/equipmentScrolls", () => {
	it("an enchant weapon scroll raises one of the wielded weapon's two bonuses and lifts its curse", () => {
		const { state, next } = readScroll("enchant-weapon", [sword(true, true)]);
		const [enchantedEvent] = next.events;
		if (enchantedEvent?.type !== "weapon-enchanted") {
			throw new Error("unreachable: the scroll logs weapon-enchanted");
		}
		const { stat } = enchantedEvent.payload;
		expect(next.inventory).toEqual([
			{
				...sword(true),
				hitBonus: 1 + (stat === "hit" ? ENCHANT_WEAPON_BONUS : 0),
				damageBonus: 1 + (stat === "damage" ? ENCHANT_WEAPON_BONUS : 0),
			},
		]);
		expect(next.rng).not.toEqual(state.rng); /* the coin flip */
	});

	it("an enchant weapon scroll's coin flip lands on either bonus", () => {
		const stats = new Set<string>();
		let rng = buildArenaGameState(9, 3, 1).rng;
		for (let attempt = 0; attempt < 40; attempt++) {
			const next = advanceTurn(
				{
					...buildArenaGameState(9, 3, 1),
					rng,
					inventory: [sword(true), { itemId: 2, kind: "enchant-weapon" }],
				},
				{ type: "use-item", payload: { itemId: 2 } },
			);
			rng = next.rng;
			const [event] = next.events;
			if (event?.type === "weapon-enchanted") {
				stats.add(event.payload.stat);
			}
		}
		expect([...stats].sort()).toEqual(["damage", "hit"]);
	});

	it("an enchant weapon scroll leaves a weapon that is only carried alone, and is wasted", () => {
		const { next } = readScroll("enchant-weapon", [sword(false)]);
		expect(next.inventory).toEqual([sword(false)]); /* scroll used up */
		expect(next.events).toEqual([
			{ type: "scroll-wasted", payload: { kind: "enchant-weapon" } },
		]);
	});

	it("an enchant armor scroll raises the worn armor's defenseBonus and lifts its curse — never a carried one", () => {
		const { state, next } = readScroll("enchant-armor", [
			ringMail(1, false),
			ringMail(2, true, true),
		]);
		expect(next.inventory).toEqual([
			ringMail(1, false),
			{ ...ringMail(2, true), defenseBonus: 1 + ENCHANT_ARMOR_BONUS },
		]);
		expect(next.rng).toEqual(state.rng); /* deterministic */
		expect(next.events).toEqual([
			{ type: "armor-enchanted", payload: { bonus: ENCHANT_ARMOR_BONUS } },
		]);
	});

	it("an enchant armor or protect armor scroll with no armor worn is wasted", () => {
		for (const kind of ["enchant-armor", "protect-armor"] as const) {
			const { next } = readScroll(kind, [ringMail(1, false)]);
			expect(next.inventory).toEqual([ringMail(1, false)]);
			expect(next.events).toEqual([
				{ type: "scroll-wasted", payload: { kind } },
			]);
		}
	});

	it("a protect armor scroll makes the worn armor rust-proof — again on armor already protected", () => {
		for (const alreadyProtected of [false, true]) {
			const { next } = readScroll("protect-armor", [
				ringMail(1, true, false, alreadyProtected),
			]);
			expect(next.inventory).toEqual([ringMail(1, true, false, true)]);
			expect(next.events).toEqual([{ type: "armor-protected", payload: {} }]);
		}
	});

	it("a remove-curse scroll frees every currently-equipped cursed item at once", () => {
		const ring: HeldItem = {
			itemId: 3,
			kind: "regeneration-ring",
			equipped: true,
			cursed: true,
		};
		const { next } = readScroll("remove-curse-scroll", [
			sword(true, true),
			ringMail(2, true, true),
			ring,
			/* held but not equipped — its curse must survive untouched */
			ringMail(4, false, true),
		]);
		expect(next.inventory).toEqual([
			sword(true),
			ringMail(2, true),
			{ ...ring, cursed: false },
			ringMail(4, false, true),
		]);
		expect(next.events).toEqual([
			{ type: "items-decursed", payload: { count: 3 } },
		]);
	});

	it("a remove-curse scroll with nothing equipped and cursed is wasted", () => {
		const { next } = readScroll("remove-curse-scroll", [sword(true)]);
		expect(next.inventory).toEqual([sword(true)]);
		expect(next.events).toEqual([
			{ type: "scroll-wasted", payload: { kind: "remove-curse-scroll" } },
		]);
	});
});
