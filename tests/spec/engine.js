describe("Engine", () => {
	var RESULT = 0;
	var E = null;
	var S = null;
	var A50 = {
		getSpeed: () => 50,
		act: () => {
			RESULT++;
		},
	};
	var A70 = {
		getSpeed: () => 70,
		act: () => {
			RESULT++;
			S.add(A100);
		},
	};
	var A100 = {
		getSpeed: () => 100,
		act: () => {
			E.lock();
		},
	};

	beforeEach(() => {
		RESULT = 0;
		S = new ROT.Scheduler.Speed();
		E = new ROT.Engine(S);
	});

	it("should stop when locked", () => {
		S.add(A50, true);
		S.add(A100, true);

		E.start();
		expect(RESULT).toEqual(0);
	});

	it("should run until locked", () => {
		S.add(A50, true);
		S.add(A70, true);

		E.start();
		expect(RESULT).toEqual(2);
	});

	it("should run only when unlocked", () => {
		S.add(A70, true);

		E.lock();
		E.start();
		expect(RESULT).toEqual(0);
		E.start();
		expect(RESULT).toEqual(1);
	});
});
