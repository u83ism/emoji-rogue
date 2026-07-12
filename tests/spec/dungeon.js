describe("Map.Dungeon", () => {
	var names = ["Digger", "Uniform"];

	var buildDungeonTests = (name) => {
		var ctor = ROT.Map[name];
		ROT.RNG.setSeed(1234);
		var map = new ctor();
		map.create();
		var rooms = map.getRooms();
		var corridors = map.getCorridors();

		describe(name, () => {
			it("should generate >0 rooms", () => {
				expect(rooms.length).toBeGreaterThan(0);
			});

			it("all rooms should have at least one door", () => {
				for (var i = 0; i < rooms.length; i++) {
					var room = rooms[i];
					var doorCount = 0;
					room.create((x, y, value) => {
						if (value == 2) {
							doorCount++;
						}
					});
					expect(doorCount).toBeGreaterThan(0);
				}
			});

			it("all rooms should have at least one wall", () => {
				for (var i = 0; i < rooms.length; i++) {
					var room = rooms[i];
					var wallCount = 0;
					room.create((x, y, value) => {
						if (value == 1) {
							wallCount++;
						}
					});
					expect(wallCount).toBeGreaterThan(0);
				}
			});

			it("all rooms should have at least one empty cell", () => {
				for (var i = 0; i < rooms.length; i++) {
					var room = rooms[i];
					var emptyCount = 0;
					room.create((x, y, value) => {
						if (value == 0) {
							emptyCount++;
						}
					});
					expect(emptyCount).toBeGreaterThan(0);
				}
			});

			it("should generate >0 corridors", () => {
				expect(corridors.length).toBeGreaterThan(0);
			});

			it("all corridors should have at least one empty cell", () => {
				for (var i = 0; i < corridors.length; i++) {
					var corridor = corridors[i];
					var emptyCount = 0;
					corridor.create((x, y, value) => {
						if (value == 0) {
							emptyCount++;
						}
					});
					expect(emptyCount).toBeGreaterThan(0);
				}
			});
		});
	};

	while (names.length) {
		var name = names.shift();
		buildDungeonTests(name);
	}
});
