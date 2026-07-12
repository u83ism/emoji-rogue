describe("RNG", () => {
	describe("getUniform", () => {
		var value = ROT.RNG.getUniform();
		it("should return a number", () => {
			expect(typeof value).toEqual("number");
		});
		it("should return a number 0..1", () => {
			expect(value).toBeGreaterThan(0);
			expect(value).toBeLessThan(1);
		});
	});

	describe("getUniformInt", () => {
		var lowerBound = 5;
		var upperBound = 10;
		it("should return a number", () => {
			var value = ROT.RNG.getUniformInt(lowerBound, upperBound);
			expect(typeof value).toEqual("number");
		});
		it("should not care which number is larger in the arguments", () => {
			var seed = Math.round(Math.random() * 1000000);
			ROT.RNG.setSeed(seed);
			var val1 = ROT.RNG.getUniformInt(lowerBound, upperBound);
			ROT.RNG.setSeed(seed);
			var val2 = ROT.RNG.getUniformInt(upperBound, lowerBound);
			expect(val1).toEqual(val2);
		});
		it("should only return a number in the desired range", () => {
			var value = ROT.RNG.getUniformInt(lowerBound, upperBound);
			var value2 = ROT.RNG.getUniformInt(upperBound, lowerBound);
			expect(value).not.toBeGreaterThan(upperBound);
			expect(value).not.toBeLessThan(lowerBound);
			expect(value2).not.toBeGreaterThan(upperBound);
			expect(value2).not.toBeLessThan(lowerBound);
		});
	});

	describe("seeding", () => {
		it("should return a seed number", () => {
			expect(typeof ROT.RNG.getSeed()).toEqual("number");
		});

		it("should return the same value for a given seed", () => {
			var seed = Math.round(Math.random() * 1000000);
			ROT.RNG.setSeed(seed);
			var val1 = ROT.RNG.getUniform();
			ROT.RNG.setSeed(seed);
			var val2 = ROT.RNG.getUniform();
			expect(val1).toEqual(val2);
		});

		it("should return a precomputed value for a given seed", () => {
			ROT.RNG.setSeed(12345);
			var val = ROT.RNG.getUniform();
			expect(val).toEqual(0.01198604702949524);
		});
	});

	describe("state manipulation", () => {
		it("should return identical values after setting identical states", () => {
			ROT.RNG.getUniform();

			var state = ROT.RNG.getState();
			var val1 = ROT.RNG.getUniform();
			ROT.RNG.setState(state);
			var val2 = ROT.RNG.getUniform();

			expect(val1).toEqual(val2);
		});
	});

	describe("cloning", () => {
		it("should be able to clone a RNG", () => {
			var clone = ROT.RNG.clone();
			expect(typeof clone).toEqual("object");
		});

		it("should clone a working RNG", () => {
			var clone = ROT.RNG.clone();
			var num = clone.getUniform();
			expect(typeof num).toEqual("number");
		});

		it("should clone maintaining its state", () => {
			var clone = ROT.RNG.clone();
			var num1 = ROT.RNG.getUniform();
			var num2 = clone.getUniform();
			expect(num1).toEqual(num2);
		});
	});
});
