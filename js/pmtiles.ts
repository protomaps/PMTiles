export const shift = (n:number, shift:number) => {
    return n * Math.pow(2, shift);
}

export const unshift = (n:number, shift:number) => {
	return Math.floor(n / Math.pow(2, shift));
}

export const getUint24 = (view:DataView, pos:number) => {
  return shift(view.getUint16(pos+1,true),8) + view.getUint8(pos)
}

export const getUint48 = (view:DataView, pos:number) => {
    return shift(view.getUint32(pos+2,true),16) + view.getUint16(pos,true)
}

const compare = (tz:number,tx:number,ty:number,view:DataView,i:number) => {
	if (tz != view.getUint8(i)) return tz - view.getUint8(i);
	var x = getUint24(view,i+1);
	if (tx != x) return tx - x;
	var y = getUint24(view,i+4);
	if (ty != y) return ty - y;
	return 0;
}

export const getLeafdir = (view:DataView, z:number, x:number, y:number) => {
	return getTile(view,z | 0x80,x,y);
}

export const getTile = (view:DataView, z:number, x:number, y:number) => {
	var m = 0;
	var n = view.byteLength / 17 - 1;	
	while (m <= n) {
		var k = (n + m) >> 1;
		var cmp = compare(z,x,y,view,k*17);
		if (cmp > 0) {
			m = k + 1;
		} else if (cmp < 0) {
			n = k - 1;
		} else {
			return {
				offset:getUint48(view,k*17+7),
				length:view.getUint32(k*17+13,true)
			}
		}
	}
	return null;
}