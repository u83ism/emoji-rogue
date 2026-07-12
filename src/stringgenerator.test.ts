import { describe, expect, it } from "vitest";
import { createRng } from "./rng.js";
import { createStringGenerator } from "./stringgenerator.js";

describe("createStringGenerator", () => {
	it("generates a non-empty string after observing training data", () => {
		const generator = createStringGenerator(createRng(1));
		generator.observe("hello");
		generator.observe("help");
		generator.observe("held");
		expect(generator.generate().length).toBeGreaterThan(0);
	});

	it("is deterministic for the same rng seed and training data", () => {
		const generatorA = createStringGenerator(createRng(42));
		const generatorB = createStringGenerator(createRng(42));
		for (const word of ["alpha", "alto", "alcohol", "album"]) {
			generatorA.observe(word);
			generatorB.observe(word);
		}
		expect(generatorA.generate()).toBe(generatorB.generate());
	});

	it("reports growing dictionary stats as it observes more data", () => {
		const generator = createStringGenerator(createRng(1));
		const before = generator.getStats();
		generator.observe("training data makes the dictionary grow");
		const after = generator.getStats();
		expect(after).not.toBe(before);
	});

	it("clear() resets the learned data", () => {
		const generator = createStringGenerator(createRng(1));
		generator.observe("some training text");
		generator.clear();
		expect(generator.getStats()).toBe(
			"distinct samples: -1, dictionary size (contexts): 0, dictionary size (events): 0",
		);
	});

	it("supports word mode", () => {
		const generator = createStringGenerator(createRng(1), {
			words: true,
			order: 2,
		});
		generator.observe("the quick brown fox jumps over the lazy dog");
		const generated = generator.generate();
		expect(typeof generated).toBe("string");
	});
});
