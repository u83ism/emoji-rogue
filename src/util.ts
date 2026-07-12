/**
 * Always positive modulus
 * @param x Operand
 * @param n Modulus
 * @returns x modulo n
 */
export function mod(x: number, n: number): number {
	return ((x % n) + n) % n;
}

export function clamp(val: number, min = 0, max = 1): number {
	if (val < min) return min;
	if (val > max) return max;
	return val;
}

export function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.substring(1);
}

/**
 * Maps a `%x{...}`/`%x` directive letter to the method name invoked on the
 * matching argument. Mutable so callers can register their own directives,
 * mirroring the extensibility rot.js originally exposed via `format.map`.
 */
export const formatMap: Record<string, string> = {
	s: "toString",
};

/**
 * Format a string in a flexible way. Scans for %s-style directives and
 * replaces them with arguments, dispatching through `formatMap`.
 */
export function format(template: string, ...args: unknown[]): string {
	const remaining = args.slice();

	const replacer = (
		match: string,
		group1: string,
		group2: string,
		index: number,
	) => {
		if (template.charAt(index - 1) === "%") {
			return match.substring(1);
		}
		if (!remaining.length) {
			return match;
		}

		const group = group1 || group2;
		const parts = group.split(",");
		const name = parts.shift() || "";
		const method = formatMap[name.toLowerCase()];
		if (!method) {
			return match;
		}

		const obj = remaining.shift() as Record<
			string,
			(...methodArgs: string[]) => string
		>;
		const fn = obj[method];
		if (typeof fn !== "function") {
			throw new Error(
				`formatMap entry "${name}" -> "${method}" is not a method on the given argument`,
			);
		}
		let replaced = fn.apply(obj, parts);

		const first = name.charAt(0);
		if (first !== first.toLowerCase()) {
			replaced = capitalize(replaced);
		}

		return replaced;
	};
	return template.replace(/%(?:([a-z]+)|(?:\{([^}]+)\}))/gi, replacer);
}
