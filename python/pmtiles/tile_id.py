def rotate(n,xy,rx,ry):
    if (ry == 0):
        if (rx == 1):
            xy[0] = n - 1 - xy[0]
            xy[1] = n - 1 - xy[1]
        t = xy[0]
        xy[0] = xy[1]
        xy[1] = t

def zxy_to_id(z,x,y):
    acc = 0
    tz = 0
    while (tz < z):
        acc += (0x1 << tz) * (0x1 << tz)
        tz = tz + 1
    n = 1 << z
    rx,ry,d = 0,0,0
    xy = [x,y]
    s = n // 2
    while s > 0:
        rx = (xy[0] & s) > 0
        ry = (xy[1] & s) > 0
        d += s * s * ((3 * rx) ^ ry)
        rotate(s,xy,rx,ry)
        s //= 2
    return acc + d

def id_on_level(z,pos):
    n = 1 << z
    rx, ry, t = pos, pos, pos
    xy = [0,0]
    s = 1
    while (s < n):
        rx = 1 & (t//2)
        ry = 1 & (t ^ rx)
        rotate(s,xy,rx,ry)
        xy[0] += s * rx
        xy[1] += s * ry
        t //= 4
        s += 2
    return (z,xy[0],xy[1])

def id_to_zxy(i):
    acc = 0
    z = 0
    while True:
        num_tiles = (1 << z) * (1 << z)
        if (acc + num_tiles > i):
            return id_on_level(z,i - acc)
        acc += num_tiles
        z += 1

