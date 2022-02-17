import { test } from "zora";
import {
	unshift,
	getUint24,
	getUint48,
	queryLeafdir,
	queryTile,
	parseEntry,
	Entry,
	createDirectory,
} from "./pmtiles";

test("stub data", (assertion) => {
	let data = createDirectory([
		{ z: 5, x: 1000, y: 2000, offset: 1000, length: 2000, is_dir: false },
		{
			z: 14,
			x: 16383,
			y: 16383,
			offset: 999999,
			length: 999,
			is_dir: false,
		},
	]);
	let dataview = new DataView(data);

	var z_raw = dataview.getUint8(17 + 0);
	var x = getUint24(dataview, 17 + 1);
	var y = getUint24(dataview, 17 + 4);
	var offset = getUint48(dataview, 17 + 7);
	var length = dataview.getUint32(17 + 13, true);
	assertion.ok(z_raw === 14);
	assertion.ok(x === 16383);
	assertion.ok(y === 16383);
});

test("get entry", (assertion) => {
	let data = createDirectory([
		{ z: 5, x: 1000, y: 2000, offset: 1000, length: 2000, is_dir: false },
		{
			z: 14,
			x: 16383,
			y: 16383,
			offset: 999999,
			length: 999,
			is_dir: false,
		},
	]);
	let view = new DataView(data);
	let entry = queryTile(view, 14, 16383, 16383);
	assertion.ok(entry!.z === 14);
	assertion.ok(entry!.x === 16383);
	assertion.ok(entry!.y === 16383);
	assertion.ok(entry!.offset === 999999);
	assertion.ok(entry!.length === 999);
	assertion.ok(entry!.is_dir === false);
	assertion.ok(queryLeafdir(view, 14, 16383, 16383) === null);
});

test("get leafdir", (assertion) => {
	let data = createDirectory([
		{
			z: 14,
			x: 16383,
			y: 16383,
			offset: 999999,
			length: 999,
			is_dir: true,
		},
	]);
	let view = new DataView(data);
	let entry = queryLeafdir(view, 14, 16383, 16383);
	assertion.ok(entry!.z === 14);
	assertion.ok(entry!.x === 16383);
	assertion.ok(entry!.y === 16383);
	assertion.ok(entry!.offset === 999999);
	assertion.ok(entry!.length === 999);
	assertion.ok(entry!.is_dir === true);
	assertion.ok(queryTile(view, 14, 16383, 16383) === null);
});

test("convert spec v1 directory to spec v2 directory", (assertion) => {
	let data = createDirectory([
		{
			z: 7,
			x: 3,
			y: 3,
			offset: 3,
			length: 3,
			is_dir: true,
		},
		{
			z: 6,
			x: 2,
			y: 2,
			offset: 2,
			length: 2,
			is_dir: false,
		},
		{
			z: 6,
			x: 2,
			y: 1,
			offset: 1,
			length: 1,
			is_dir: false,
		},
	]);
	let view = new DataView(data);
	let entry = queryLeafdir(view, 7, 3, 3);
	assertion.ok(entry!.offset === 3);
	entry = queryTile(view, 6, 2, 2);
	assertion.ok(entry!.offset === 2);
	entry = queryTile(view, 6, 2, 1);
	assertion.ok(entry!.offset === 1);

	entry = parseEntry(view, 0);
	assertion.ok(entry!.offset === 1);
	entry = parseEntry(view, 1);
	assertion.ok(entry!.offset === 2);
	entry = parseEntry(view, 2);
	assertion.ok(entry!.offset === 3);
});
