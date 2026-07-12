describe("FOV", () => {
	var MAP8_RING0 = ["#####", "#####", "##@##", "#####", "#####"];

	var RESULT_MAP8_RING0 = ["     ", " ... ", " ... ", " ... ", "     "];

	var RESULT_MAP8_RING0_90_NORTH = [
		"     ",
		" ... ",
		"  .  ",
		"     ",
		"     ",
	];

	var RESULT_MAP8_RING0_90_SOUTH = [
		"     ",
		"     ",
		"  .  ",
		" ... ",
		"     ",
	];

	var RESULT_MAP8_RING0_90_EAST = ["     ", "   . ", "  .. ", "   . ", "     "];

	var RESULT_MAP8_RING0_90_WEST = ["     ", " .   ", " ..  ", " .   ", "     "];

	var RESULT_MAP8_RING0_180_NORTH = [
		"     ",
		" ... ",
		" ... ",
		"     ",
		"     ",
	];

	var RESULT_MAP8_RING0_180_SOUTH = [
		"     ",
		"     ",
		" ... ",
		" ... ",
		"     ",
	];

	var RESULT_MAP8_RING0_180_EAST = [
		"     ",
		"  .. ",
		"  .. ",
		"  .. ",
		"     ",
	];

	var RESULT_MAP8_RING0_180_WEST = [
		"     ",
		" ..  ",
		" ..  ",
		" ..  ",
		"     ",
	];

	var MAP8_RING1 = ["#####", "#...#", "#.@.#", "#...#", "#####"];

	var MAP8_PARTIAL = ["#####", "##..#", "#.@.#", "#...#", "#####"];

	var RESULT_MAP8_RING1 = [".....", ".....", ".....", ".....", "....."];

	var buildLightCallback = (map) => {
		var center = [0, 0];
		/* locate center */
		for (var j = 0; j < map.length; j++) {
			for (var i = 0; i < map[j].length; i++) {
				if (map[j].charAt(i) == "@") {
					center = [i, j];
				}
			}
		}

		var result = (x, y) => {
			var ch = map[y].charAt(x);
			return ch != "#";
		};
		result.center = center;
		return result;
	};

	var checkResult = (fov, center, result) => {
		var used = {};
		var callback = (x, y, dist) => {
			expect(result[y].charAt(x)).toEqual(".");
			used[x + "," + y] = 1;
		};

		fov.compute(center[0], center[1], 2, callback);
		for (var j = 0; j < result.length; j++) {
			for (var i = 0; i < result[j].length; i++) {
				if (result[j].charAt(i) != ".") {
					continue;
				}
				expect(i + "," + j in used).toEqual(true);
			}
		}
	};

	var checkResult90Degrees = (fov, dir, center, result) => {
		var used = {};
		var callback = (x, y, dist) => {
			expect(result[y].charAt(x)).toEqual(".");
			used[x + "," + y] = 1;
		};

		fov.compute90(center[0], center[1], 2, dir, callback);
		for (var j = 0; j < result.length; j++) {
			for (var i = 0; i < result[j].length; i++) {
				if (result[j].charAt(i) != ".") {
					continue;
				}
				expect(i + "," + j in used).toEqual(true);
			}
		}
	};

	var checkResult180Degrees = (fov, dir, center, result) => {
		var used = {};
		var callback = (x, y, dist) => {
			expect(result[y].charAt(x)).toEqual(".");
			used[x + "," + y] = 1;
		};

		fov.compute180(center[0], center[1], 2, dir, callback);
		for (var j = 0; j < result.length; j++) {
			for (var i = 0; i < result[j].length; i++) {
				if (result[j].charAt(i) != ".") {
					continue;
				}
				expect(i + "," + j in used).toEqual(true);
			}
		}
	};

	describe("Discrete Shadowcasting", () => {
		describe("8-topology", () => {
			it("should compute visible ring0", () => {
				var lightPasses = buildLightCallback(MAP8_RING0);
				var fov = new ROT.FOV.DiscreteShadowcasting(lightPasses, {
					topology: 8,
				});
				checkResult(fov, lightPasses.center, RESULT_MAP8_RING0);
			});
			it("should compute visible ring1", () => {
				var lightPasses = buildLightCallback(MAP8_RING1);
				var fov = new ROT.FOV.DiscreteShadowcasting(lightPasses, {
					topology: 8,
				});
				checkResult(fov, lightPasses.center, RESULT_MAP8_RING1);
			});
		});
	});

	describe("Precise Shadowcasting", () => {
		describe("8-topology", () => {
			var topology = 8;
			it("should compute visible ring0", () => {
				var lightPasses = buildLightCallback(MAP8_RING0);
				var fov = new ROT.FOV.PreciseShadowcasting(lightPasses, {
					topology: topology,
				});
				checkResult(fov, lightPasses.center, RESULT_MAP8_RING0);
			});
			it("should compute visible ring1", () => {
				var lightPasses = buildLightCallback(MAP8_RING1);
				var fov = new ROT.FOV.PreciseShadowcasting(lightPasses, {
					topology: topology,
				});
				checkResult(fov, lightPasses.center, RESULT_MAP8_RING1);
			});
			xit("should compute single visible target", () => {
				var lightPasses = buildLightCallback(MAP8_RING1);
				var fov = new ROT.FOV.PreciseShadowcasting(lightPasses, {
					topology: topology,
				});
				var result = fov.computeSingle(
					lightPasses.center[0],
					lightPasses.center[1],
					2,
					0,
					1,
				);
				expect(result).toBe(1);
			});
			xit("should compute single invisible target", () => {
				var lightPasses = buildLightCallback(MAP8_RING0);
				var fov = new ROT.FOV.PreciseShadowcasting(lightPasses, {
					topology: topology,
				});
				var result = fov.computeSingle(
					lightPasses.center[0],
					lightPasses.center[1],
					2,
					0,
					1,
				);
				expect(result).toBe(0);
			});
			xit("should compute single partially visible target", () => {
				var lightPasses = buildLightCallback(MAP8_PARTIAL);
				var fov = new ROT.FOV.PreciseShadowcasting(lightPasses, {
					topology: topology,
				});
				var result = fov.computeSingle(
					lightPasses.center[0],
					lightPasses.center[1],
					2,
					0,
					1,
				);
				expect(result).toBe(0.5);
			});
		});
	});

	describe("Recursive Shadowcasting", () => {
		describe("8-topology", () => {
			describe("360-degree view", () => {
				it("should compute visible ring0 in 360 degrees", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult(fov, lightPasses.center, RESULT_MAP8_RING0);
				});
				it("should compute visible ring1 in 360 degrees", () => {
					var lightPasses = buildLightCallback(MAP8_RING1);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult(fov, lightPasses.center, RESULT_MAP8_RING1);
				});
			});
			describe("180-degree view", () => {
				it("should compute visible ring0 180 degrees facing north", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult180Degrees(
						fov,
						0,
						lightPasses.center,
						RESULT_MAP8_RING0_180_NORTH,
					);
				});
				it("should compute visible ring0 180 degrees facing south", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult180Degrees(
						fov,
						4,
						lightPasses.center,
						RESULT_MAP8_RING0_180_SOUTH,
					);
				});
				it("should compute visible ring0 180 degrees facing east", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult180Degrees(
						fov,
						2,
						lightPasses.center,
						RESULT_MAP8_RING0_180_EAST,
					);
				});
				it("should compute visible ring0 180 degrees facing west", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult180Degrees(
						fov,
						6,
						lightPasses.center,
						RESULT_MAP8_RING0_180_WEST,
					);
				});
			});
			describe("90-degree view", () => {
				it("should compute visible ring0 90 degrees facing north", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult90Degrees(
						fov,
						0,
						lightPasses.center,
						RESULT_MAP8_RING0_90_NORTH,
					);
				});
				it("should compute visible ring0 90 degrees facing south", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult90Degrees(
						fov,
						4,
						lightPasses.center,
						RESULT_MAP8_RING0_90_SOUTH,
					);
				});
				it("should compute visible ring0 90 degrees facing east", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult90Degrees(
						fov,
						2,
						lightPasses.center,
						RESULT_MAP8_RING0_90_EAST,
					);
				});
				it("should compute visible ring0 90 degrees facing west", () => {
					var lightPasses = buildLightCallback(MAP8_RING0);
					var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses, {
						topology: 8,
					});
					checkResult90Degrees(
						fov,
						6,
						lightPasses.center,
						RESULT_MAP8_RING0_90_WEST,
					);
				});
			});
		});
	});
}); /* FOV */
