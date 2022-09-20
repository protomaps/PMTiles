function rotate(n: number, xy: number[], rx: number, ry: number): void {
	if (ry == 0) {
		if (rx == 1) {
			xy[0] = n - 1 - xy[0];
			xy[1] = n - 1 - xy[1];
		}
		let t = xy[0];
		xy[0] = xy[1];
		xy[1] = t;
	}
}

function idOnLevel(z: number, pos: number): [number, number, number] {
	let n = 1 << z;
	let rx = pos;
	let ry = pos;
	let t = pos;
	let xy = [0, 0];
	let s = 1;
	while (s < n) {
		rx = 1 & ((t / 2) >> 0);
		ry = 1 & (t ^ rx);
		rotate(s, xy, rx, ry);
		xy[0] += s * rx;
		xy[1] += s * ry;
		t = (t / 4) >> 0;
		s *= 2;
	}
	return [z, xy[0], xy[1]];
}

export function zxyToTileId(z: number, x: number, y: number): number {
	let acc = 0;
	let tz = 0;
	while (tz < z) {
		acc += (0x1 << tz) * (0x1 << tz);
		tz++;
	}
	let n = 1 << z;
	let rx = 0;
	let ry = 0;
	let d = 0;
	let xy = [x, y];
	let s = (n / 2) >> 0;
	while (s > 0) {
		rx = (xy[0] & s) > 0 ? 1 : 0;
		ry = (xy[1] & s) > 0 ? 1 : 0;
		d += s * s * ((3 * rx) ^ ry);
		rotate(s, xy, rx, ry);
		s = (s / 2) >> 0;
	}
	return acc + d;
}

export function tileIdToZxy(i: number): [number, number, number] {
	let acc = 0;
	let z = 0;
	while (true) {
		let num_tiles = (0x1 << z) * (0x1 << z);
		if (acc + num_tiles > i) {
			return idOnLevel(z, i - acc);
		}
		acc += num_tiles;
		z++;
	}
}

export interface Entry {
	tileId: number;
	offset: number;
	length: number;
	runLength: number;
}

export function findTile(entries: Entry[], tileId: number): Entry | null {
	let m = 0;
	let n = entries.length - 1;
	while (m <= n) {
		const k = (n + m) >> 1;
		const cmp = tileId - entries[k].tileId;
		if (cmp > 0) {
			m = k + 1;
		} else if (cmp < 0) {
			n = k - 1;
		} else {
			return entries[k];
		}
	}

	// at this point, m > n
	if (n >= 0) {
		if (entries[n].runLength === 0) {
			return entries[n];
		}
		if (tileId - entries[n].tileId < entries[n].runLength) {
			return entries[n];
		}
	}
	return null;
}

