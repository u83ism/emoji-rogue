describe("Text", () => {
	describe("line breaking", () => {
		var A100 = new Array(101).join("A");
		var B100 = new Array(101).join("B");

		it("should not break when not requested", () => {
			var size = ROT.Text.measure(A100);
			expect(size.width).toEqual(A100.length);
			expect(size.height).toEqual(1);
		});

		it("should break when max length requested", () => {
			var size = ROT.Text.measure(A100, 30);
			expect(size.height).toEqual(4);
		});

		it("should break at explicit newlines", () => {
			var size = ROT.Text.measure("a\nb\nc");
			expect(size.height).toEqual(3);
		});

		it("should break at explicit newlines AND max length", () => {
			var size = ROT.Text.measure(A100 + B100, 30);
			expect(size.height).toEqual(7);

			var size = ROT.Text.measure(A100 + "\n" + B100, 30);
			expect(size.height).toEqual(8);
		});

		it("should break at space", () => {
			var size = ROT.Text.measure(A100 + " " + B100, 30);
			expect(size.height).toEqual(8);
		});

		it("should not break at nbsp", () => {
			var size = ROT.Text.measure(A100 + String.fromCharCode(160) + B100, 30);
			expect(size.height).toEqual(7);
		});

		it("should not break when text is short", () => {
			var size = ROT.Text.measure("aaa bbb", 7);
			expect(size.width).toEqual(7);
			expect(size.height).toEqual(1);
		});

		it("should adjust resulting width", () => {
			var size = ROT.Text.measure("aaa bbb", 6);
			expect(size.width).toEqual(3);
			expect(size.height).toEqual(2);
		});

		it("should adjust resulting width even without breaks", () => {
			var size = ROT.Text.measure("aaa ", 6);
			expect(size.width).toEqual(3);
			expect(size.height).toEqual(1);
		});

		it("should remove unnecessary spaces around newlines", () => {
			var size = ROT.Text.measure("aaa  \n  bbb");
			expect(size.width).toEqual(3);
			expect(size.height).toEqual(2);
		});

		it("should remove unnecessary spaces at the beginning", () => {
			var size = ROT.Text.measure("   aaa    bbb", 3);
			expect(size.width).toEqual(3);
			expect(size.height).toEqual(2);
		});

		it("should remove unnecessary spaces at the end", () => {
			var size = ROT.Text.measure("aaa    \nbbb", 3);
			expect(size.width).toEqual(3);
			expect(size.height).toEqual(2);
		});
	});

	describe("color formatting", () => {
		it("should not break with formatting part", () => {
			var size = ROT.Text.measure("aaa%c{x}bbb");
			expect(size.height).toEqual(1);
		});

		it("should correctly remove formatting", () => {
			var size = ROT.Text.measure("aaa%c{x}bbb");
			expect(size.width).toEqual(6);
		});

		it("should break independently on formatting - forced break", () => {
			var size = ROT.Text.measure("aaa%c{x}bbb", 3);
			expect(size.width).toEqual(3);
			expect(size.height).toEqual(2);
		});

		it("should break independently on formatting - forward break", () => {
			var size = ROT.Text.measure("aaa%c{x}b bb", 5);
			expect(size.width).toEqual(4);
			expect(size.height).toEqual(2);
		});

		it("should break independently on formatting - backward break", () => {
			var size = ROT.Text.measure("aa a%c{x}bbb", 5);
			expect(size.width).toEqual(4);
			expect(size.height).toEqual(2);
		});
	});
});
