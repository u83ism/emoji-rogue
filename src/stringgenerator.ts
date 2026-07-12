import type { Rng } from "./rng.js";

export interface Options {
	/** Use word mode? */
	words: boolean;
	/** Order, default = 3 */
	order: number;
	/** Prior value, default = 0.001 */
	prior: number;
}

export interface StringGenerator {
	/** Remove all learning data. */
	clear(): void;
	/** Generate a string from the learned data. */
	generate(): string;
	/** Observe (learn) a string from a training set. */
	observe(input: string): void;
	getStats(): string;
}

/**
 * (Markov process)-based string generator.
 * Copied from a RogueBasin article on names from a high order Markov Process
 * and a simplified Katz back-off scheme. Offers configurable order and prior.
 */
export function createStringGenerator(
	rng: Rng,
	options: Partial<Options> = {},
): StringGenerator {
	const resolvedOptions: Options = {
		words: false,
		order: 3,
		prior: 0.001,
		...options,
	};

	const boundary = String.fromCharCode(0);
	const suffix = boundary;
	const prefix: string[] = [];
	for (let i = 0; i < resolvedOptions.order; i++) {
		prefix.push(boundary);
	}

	let priorValues: Record<string, number> = {
		[boundary]: resolvedOptions.prior,
	};
	let data: Record<string, Record<string, number>> = {};

	function split(value: string): string[] {
		return value.split(resolvedOptions.words ? /\s+/ : "");
	}

	function join(parts: readonly string[]): string {
		return parts.join(resolvedOptions.words ? " " : "");
	}

	function observeEvent(context: readonly string[], event: string): void {
		const key = join(context);
		const bucket = data[key] ?? {};
		bucket[event] = (bucket[event] ?? 0) + 1;
		data[key] = bucket;
	}

	function backoff(contextInput: readonly string[]): string[] {
		let context = contextInput.slice();
		if (context.length > resolvedOptions.order) {
			context = context.slice(-resolvedOptions.order);
		} else if (context.length < resolvedOptions.order) {
			context = prefix
				.slice(0, resolvedOptions.order - context.length)
				.concat(context);
		}
		while (!(join(context) in data) && context.length > 0) {
			context = context.slice(1);
		}
		return context;
	}

	function sample(contextInput: readonly string[]): string {
		const context = backoff(contextInput);
		const eventCounts = data[join(context)];

		let available: Record<string, number>;
		if (resolvedOptions.prior) {
			available = {};
			for (const event of Object.keys(priorValues)) {
				available[event] = priorValues[event] ?? 0;
			}
			if (eventCounts) {
				for (const event of Object.keys(eventCounts)) {
					available[event] =
						(available[event] ?? 0) + (eventCounts[event] ?? 0);
				}
			}
		} else {
			available = eventCounts ?? {};
		}

		return rng.getWeightedValue(available);
	}

	return {
		clear(): void {
			data = {};
			priorValues = {};
		},

		generate(): string {
			const result = [sample(prefix)];
			while (result[result.length - 1] !== boundary) {
				result.push(sample(result));
			}
			return join(result.slice(0, -1));
		},

		observe(input: string): void {
			let tokens = split(input);
			for (const token of tokens) {
				priorValues[token] = resolvedOptions.prior;
			}

			tokens = prefix.concat(tokens).concat(suffix);
			for (let i = resolvedOptions.order; i < tokens.length; i++) {
				const context = tokens.slice(i - resolvedOptions.order, i);
				const event = tokens[i];
				if (event === undefined) {
					throw new Error("unreachable: i is within tokens.length");
				}
				for (let j = 0; j < context.length; j++) {
					observeEvent(context.slice(j), event);
				}
			}
		},

		getStats(): string {
			const priorCount = Object.keys(priorValues).length - 1; // exclude boundary
			const dataKeys = Object.keys(data);
			let eventCount = 0;
			for (const key of dataKeys) {
				eventCount += Object.keys(data[key] ?? {}).length;
			}
			return [
				`distinct samples: ${priorCount}`,
				`dictionary size (contexts): ${dataKeys.length}`,
				`dictionary size (events): ${eventCount}`,
			].join(", ");
		},
	};
}
