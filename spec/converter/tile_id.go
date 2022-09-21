package main

import "math/bits"

func rotate(n int64, x *int64, y *int64, rx int64, ry int64) {
	if ry == 0 {
		if rx == 1 {
			*x = n - 1 - *x
			*y = n - 1 - *y
		}
		t := *x
		*x = *y
		*y = t
	}
}

func t_on_level(z int64, pos int64) (int64, int64, int64) {
	var n int64 = 1 << z
	rx, ry, t := pos, pos, pos
	var tx int64
	var ty int64
	var s int64
	for s = 1; s < n; s *= 2 {
		rx = 1 & (t / 2)
		ry = 1 & (t ^ rx)
		rotate(s, &tx, &ty, rx, ry)
		tx += s * rx
		ty += s * ry
		t /= 4
	}
	return z, tx, ty
}

func ZxyToId(z int64, x int64, y int64) int64 {
	var acc int64
	var tz int64
	for ; tz < z; tz++ {
		acc += (0x1 << tz) * (0x1 << tz)
	}
	var n int64 = 1 << z
	var rx int64
	var ry int64
	var d int64
	var tx int64 = x
	var ty int64 = y
	for s := n / 2; s > 0; s /= 2 {
		if tx&s > 0 {
			rx = 1
		} else {
			rx = 0
		}
		if ty&s > 0 {
			ry = 1
		} else {
			ry = 0
		}
		d += s * s * ((3 * rx) ^ ry)
		rotate(s, &tx, &ty, rx, ry)
	}
	return acc + d
}

func IdToZxy(i int64) (int64, int64, int64) {
	var acc int64
	var num_tiles int64
	var z int64
	for {
		num_tiles = (1 << z) * (1 << z)
		if acc+num_tiles > i {
			return t_on_level(z, i-acc)
		}
		acc += num_tiles
		z++
	}
}

// 32 bit only
func ZxyToQuadkey(z int64, px int64, py int64) int64 {
	var b0 int64 = 0x55555555
	var b1 int64 = 0x33333333
	var b2 int64 = 0x0F0F0F0F
	var b3 int64 = 0x00FF00FF

	var sentinel int64 = 0b1 << (z * 2)

	var x int64
	var y int64

	x = px
	x = (x | (x << 8)) & b3
	x = (x | (x << 4)) & b2
	x = (x | (x << 2)) & b1
	x = (x | (x << 1)) & b0

	y = py
	y = (y | (y << 8)) & b3
	y = (y | (y << 4)) & b2
	y = (y | (y << 2)) & b1
	y = (y | (y << 1)) & b0

	result := x | (y << 1) | sentinel
	return result
}

func QuadkeyToZxy(i int64) (int64, int64, int64) { 
	var z = 32 - (bits.LeadingZeros64(uint64(i)) + 1) / 2
	var mask int64 = ^(0b1 << (z * 2))

	var x int64 x = (i & mask)
	var y int64 = (i & mask) >> 1

	x &= 0x55555555
  x = (x ^ (x >>  1)) & 0x33333333
  x = (x ^ (x >>  2)) & 0x0f0f0f0f
  x = (x ^ (x >>  4)) & 0x00ff00ff
  x = (x ^ (x >>  8)) & 0x0000ffff

	y &= 0x55555555
  y = (y ^ (y >>  1)) & 0x33333333
  y = (y ^ (y >>  2)) & 0x0f0f0f0f
  y = (y ^ (y >>  4)) & 0x00ff00ff
  y = (y ^ (y >>  8)) & 0x0000ffff

	return int64(z),x,y
}
