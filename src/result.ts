/**
 * For expected, normal-path outcomes ("can't do that right now"), not for
 * genuine invariant violations — those should still throw. Deliberately
 * non-chaining: use early-return (`if (!result.ok) return err(...)`) rather
 * than `.andThen()`/`.map()`, since chain-style clashes with async/await
 * idiom and early-return reads clearer in this codebase.
 */
export type Result<T, E> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => {
	return { ok: true, value };
};

export const err = <E>(error: E): Result<never, E> => {
	return { ok: false, error };
};
