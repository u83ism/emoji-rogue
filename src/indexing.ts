/**
 * Shared helpers for index access under `noUncheckedIndexedAccess`.
 *
 * These exist for the "the index is provably in range, but the type system
 * cannot see it" case; the throw marks an invariant violation (a caller bug),
 * not an expected failure.
 */

/** The element at `index`, throwing if it is out of range. */
export function at<T>(values: readonly T[], index: number): T {
	const value = values[index];
	if (value === undefined) {
		throw new Error(`index ${index} out of range (length ${values.length})`);
	}
	return value;
}

/** Narrows a direction-vector pair from DIRS to a typed [dx, dy] tuple. */
export function toXy(pair: readonly number[] | undefined): [number, number] {
	if (pair === undefined) {
		throw new Error("expected a two-element direction vector");
	}
	const [dx, dy] = pair;
	if (dx === undefined || dy === undefined) {
		throw new Error("expected a two-element direction vector");
	}
	return [dx, dy];
}
