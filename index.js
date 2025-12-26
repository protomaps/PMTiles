var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = /* @__PURE__ */ __name(function(eb, start) {
  var b2 = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b2[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b2[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j2 = b2[i]; j2 < b2[i + 1]; ++j2) {
      r[j2] = j2 - b2[i] << 5 | i;
    }
  }
  return { b: b2, r };
}, "freb");
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x2 = (i & 43690) >> 1 | (i & 21845) << 1;
  x2 = (x2 & 52428) >> 2 | (x2 & 13107) << 2;
  x2 = (x2 & 61680) >> 4 | (x2 & 3855) << 4;
  rev[i] = ((x2 & 65280) >> 8 | (x2 & 255) << 8) >> 1;
}
var x2;
var i;
var hMap = /* @__PURE__ */ __name(function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l2 = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l2[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l2[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v2 = le[cd[i] - 1]++ << r_1;
        for (var m2 = v2 | (1 << r_1) - 1; v2 <= m2; ++v2) {
          co[rev[v2] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
}, "hMap");
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = /* @__PURE__ */ __name(function(a) {
  var m2 = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m2)
      m2 = a[i];
  }
  return m2;
}, "max");
var bits = /* @__PURE__ */ __name(function(d, p, m2) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m2;
}, "bits");
var bits16 = /* @__PURE__ */ __name(function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
}, "bits16");
var shft = /* @__PURE__ */ __name(function(p) {
  return (p + 7) / 8 | 0;
}, "shft");
var slc = /* @__PURE__ */ __name(function(v2, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v2.length)
    e = v2.length;
  return new u8(v2.subarray(s, e));
}, "slc");
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = /* @__PURE__ */ __name(function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
}, "err");
var inflt = /* @__PURE__ */ __name(function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = /* @__PURE__ */ __name(function(l3) {
    var bl = buf.length;
    if (l3 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l3));
      nbuf.set(buf);
      buf = nbuf;
    }
  }, "cbuf");
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l2 = dat[s - 4] | dat[s - 3] << 8, t = s + l2;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l2);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l2, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b2 = fleb[i];
          add = bits(dat, pos, (1 << b2) - 1) + fl[i];
          pos += b2;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b2 = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b2) - 1, pos += b2;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
}, "inflt");
var et = /* @__PURE__ */ new u8(0);
var gzs = /* @__PURE__ */ __name(function(d) {
  if (d[0] != 31 || d[1] != 139 || d[2] != 8)
    err(6, "invalid gzip data");
  var flg = d[3];
  var st = 10;
  if (flg & 4)
    st += (d[10] | d[11] << 8) + 2;
  for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
    ;
  return st + (flg & 2);
}, "gzs");
var gzl = /* @__PURE__ */ __name(function(d) {
  var l2 = d.length;
  return (d[l2 - 4] | d[l2 - 3] << 8 | d[l2 - 2] << 16 | d[l2 - 1] << 24) >>> 0;
}, "gzl");
var zls = /* @__PURE__ */ __name(function(d, dict) {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
    err(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict)
    err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
}, "zls");
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
__name(inflateSync, "inflateSync");
function gunzipSync(data, opts) {
  var st = gzs(data);
  if (st + 8 > data.length)
    err(6, "invalid gzip data");
  return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
}
__name(gunzipSync, "gunzipSync");
function unzlibSync(data, opts) {
  return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
__name(unzlibSync, "unzlibSync");
function decompressSync(data, opts) {
  return data[0] == 31 && data[1] == 139 && data[2] == 8 ? gunzipSync(data, opts) : (data[0] & 15) != 8 || data[0] >> 4 > 7 || (data[0] << 8 | data[1]) % 31 ? inflateSync(data, opts) : unzlibSync(data, opts);
}
__name(decompressSync, "decompressSync");
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}

// node_modules/pmtiles/dist/esm/index.js
var z = Object.defineProperty;
var b = Math.pow;
var l = /* @__PURE__ */ __name((i, e) => z(i, "name", { value: e, configurable: true }), "l");
var m = /* @__PURE__ */ __name((i, e, t) => new Promise((r, n) => {
  var s = /* @__PURE__ */ __name((u) => {
    try {
      a(t.next(u));
    } catch (c) {
      n(c);
    }
  }, "s"), o = /* @__PURE__ */ __name((u) => {
    try {
      a(t.throw(u));
    } catch (c) {
      n(c);
    }
  }, "o"), a = /* @__PURE__ */ __name((u) => u.done ? r(u.value) : Promise.resolve(u.value).then(s, o), "a");
  a((t = t.apply(i, e)).next());
}), "m");
var re = l((i, e) => {
  let t = false, r = "", n = L.GridLayer.extend({ createTile: l((s, o) => {
    let a = document.createElement("img"), u = new AbortController(), c = u.signal;
    return a.cancel = () => {
      u.abort();
    }, t || (i.getHeader().then((d) => {
      d.tileType === 1 ? console.error("Error: archive contains MVT vector tiles, but leafletRasterLayer is for displaying raster tiles. See https://github.com/protomaps/PMTiles/tree/main/js for details.") : d.tileType === 2 ? r = "image/png" : d.tileType === 3 ? r = "image/jpeg" : d.tileType === 4 ? r = "image/webp" : d.tileType === 5 && (r = "image/avif");
    }), t = true), i.getZxy(s.z, s.x, s.y, c).then((d) => {
      if (d) {
        let h = new Blob([d.data], { type: r }), p = window.URL.createObjectURL(h);
        a.src = p, a.cancel = void 0, o(void 0, a);
      }
    }).catch((d) => {
      if (d.name !== "AbortError") throw d;
    }), a;
  }, "createTile"), _removeTile: l(function(s) {
    let o = this._tiles[s];
    o && (o.el.cancel && o.el.cancel(), o.el.width = 0, o.el.height = 0, o.el.deleted = true, L.DomUtil.remove(o.el), delete this._tiles[s], this.fire("tileunload", { tile: o.el, coords: this._keyToTileCoords(s) }));
  }, "_removeTile") });
  return new n(e);
}, "leafletRasterLayer");
var j = l((i) => (e, t) => {
  if (t instanceof AbortController) return i(e, t);
  let r = new AbortController();
  return i(e, r).then((n) => t(void 0, n.data, n.cacheControl || "", n.expires || ""), (n) => t(n)).catch((n) => t(n)), { cancel: l(() => r.abort(), "cancel") };
}, "v3compat");
var T = class T2 {
  static {
    __name(this, "T");
  }
  constructor(e) {
    this.tilev4 = l((e2, t) => m(this, null, function* () {
      if (e2.type === "json") {
        let p = e2.url.substr(10), y = this.tiles.get(p);
        if (y || (y = new x(p), this.tiles.set(p, y)), this.metadata) return { data: yield y.getTileJson(e2.url) };
        let f = yield y.getHeader();
        return (f.minLon >= f.maxLon || f.minLat >= f.maxLat) && console.error(`Bounds of PMTiles archive ${f.minLon},${f.minLat},${f.maxLon},${f.maxLat} are not valid.`), { data: { tiles: [`${e2.url}/{z}/{x}/{y}`], minzoom: f.minZoom, maxzoom: f.maxZoom, bounds: [f.minLon, f.minLat, f.maxLon, f.maxLat] } };
      }
      let r = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/), n = e2.url.match(r);
      if (!n) throw new Error("Invalid PMTiles protocol URL");
      let s = n[1], o = this.tiles.get(s);
      o || (o = new x(s), this.tiles.set(s, o));
      let a = n[2], u = n[3], c = n[4], d = yield o.getHeader(), h = yield o == null ? void 0 : o.getZxy(+a, +u, +c, t.signal);
      if (h) return { data: new Uint8Array(h.data), cacheControl: h.cacheControl, expires: h.expires };
      if (d.tileType === 1) {
        if (this.errorOnMissingTile) throw new Error("Tile not found.");
        return { data: new Uint8Array() };
      }
      return { data: null };
    }), "tilev4");
    this.tile = j(this.tilev4);
    this.tiles = /* @__PURE__ */ new Map(), this.metadata = (e == null ? void 0 : e.metadata) || false, this.errorOnMissingTile = (e == null ? void 0 : e.errorOnMissingTile) || false;
  }
  add(e) {
    this.tiles.set(e.source.getKey(), e);
  }
  get(e) {
    return this.tiles.get(e);
  }
};
l(T, "Protocol");
function w(i, e) {
  return (e >>> 0) * 4294967296 + (i >>> 0);
}
__name(w, "w");
l(w, "toNum");
function F(i, e) {
  let t = e.buf, r = t[e.pos++], n = (r & 112) >> 4;
  if (r < 128 || (r = t[e.pos++], n |= (r & 127) << 3, r < 128) || (r = t[e.pos++], n |= (r & 127) << 10, r < 128) || (r = t[e.pos++], n |= (r & 127) << 17, r < 128) || (r = t[e.pos++], n |= (r & 127) << 24, r < 128) || (r = t[e.pos++], n |= (r & 1) << 31, r < 128)) return w(i, n);
  throw new Error("Expected varint not more than 10 bytes");
}
__name(F, "F");
l(F, "readVarintRemainder");
function v(i) {
  let e = i.buf, t = e[i.pos++], r = t & 127;
  return t < 128 || (t = e[i.pos++], r |= (t & 127) << 7, t < 128) || (t = e[i.pos++], r |= (t & 127) << 14, t < 128) || (t = e[i.pos++], r |= (t & 127) << 21, t < 128) ? r : (t = e[i.pos], r |= (t & 15) << 28, F(r, i));
}
__name(v, "v");
l(v, "readVarint");
function k(i, e, t, r) {
  if (r === 0) {
    t === 1 && (e[0] = i - 1 - e[0], e[1] = i - 1 - e[1]);
    let n = e[0];
    e[0] = e[1], e[1] = n;
  }
}
__name(k, "k");
l(k, "rotate");
function N(i, e) {
  let t = b(2, i), r = e, n = e, s = e, o = [0, 0], a = 1;
  for (; a < t; ) r = 1 & s / 2, n = 1 & (s ^ r), k(a, o, r, n), o[0] += a * r, o[1] += a * n, s = s / 4, a *= 2;
  return [i, o[0], o[1]];
}
__name(N, "N");
l(N, "idOnLevel");
var q = [0, 1, 5, 21, 85, 341, 1365, 5461, 21845, 87381, 349525, 1398101, 5592405, 22369621, 89478485, 357913941, 1431655765, 5726623061, 22906492245, 91625968981, 366503875925, 1466015503701, 5864062014805, 23456248059221, 93824992236885, 375299968947541, 1501199875790165];
function G(i, e, t) {
  if (i > 26) throw new Error("Tile zoom level exceeds max safe number limit (26)");
  if (e > b(2, i) - 1 || t > b(2, i) - 1) throw new Error("tile x/y outside zoom level bounds");
  let r = q[i], n = b(2, i), s = 0, o = 0, a = 0, u = [e, t], c = n / 2;
  for (; c > 0; ) s = (u[0] & c) > 0 ? 1 : 0, o = (u[1] & c) > 0 ? 1 : 0, a += c * c * (3 * s ^ o), k(c, u, s, o), c = c / 2;
  return r + a;
}
__name(G, "G");
l(G, "zxyToTileId");
function ie(i) {
  let e = 0, t = 0;
  for (let r = 0; r < 27; r++) {
    let n = (1 << r) * (1 << r);
    if (e + n > i) return N(r, i - e);
    e += n;
  }
  throw new Error("Tile zoom level exceeds max safe number limit (26)");
}
__name(ie, "ie");
l(ie, "tileIdToZxy");
var J = ((s) => (s[s.Unknown = 0] = "Unknown", s[s.None = 1] = "None", s[s.Gzip = 2] = "Gzip", s[s.Brotli = 3] = "Brotli", s[s.Zstd = 4] = "Zstd", s))(J || {});
function D(i, e) {
  return m(this, null, function* () {
    if (e === 1 || e === 0) return i;
    if (e === 2) {
      if (typeof globalThis.DecompressionStream == "undefined") return decompressSync(new Uint8Array(i));
      let t = new Response(i).body;
      if (!t) throw new Error("Failed to read response stream");
      let r = t.pipeThrough(new globalThis.DecompressionStream("gzip"));
      return new Response(r).arrayBuffer();
    }
    throw new Error("Compression method not supported");
  });
}
__name(D, "D");
l(D, "defaultDecompress");
var O = ((o) => (o[o.Unknown = 0] = "Unknown", o[o.Mvt = 1] = "Mvt", o[o.Png = 2] = "Png", o[o.Jpeg = 3] = "Jpeg", o[o.Webp = 4] = "Webp", o[o.Avif = 5] = "Avif", o))(O || {});
function _(i) {
  return i === 1 ? ".mvt" : i === 2 ? ".png" : i === 3 ? ".jpg" : i === 4 ? ".webp" : i === 5 ? ".avif" : "";
}
__name(_, "_");
l(_, "tileTypeExt");
var Y = 127;
function Q(i, e) {
  let t = 0, r = i.length - 1;
  for (; t <= r; ) {
    let n = r + t >> 1, s = e - i[n].tileId;
    if (s > 0) t = n + 1;
    else if (s < 0) r = n - 1;
    else return i[n];
  }
  return r >= 0 && (i[r].runLength === 0 || e - i[r].tileId < i[r].runLength) ? i[r] : null;
}
__name(Q, "Q");
l(Q, "findTile");
var A = class A2 {
  static {
    __name(this, "A");
  }
  constructor(e) {
    this.file = e;
  }
  getKey() {
    return this.file.name;
  }
  getBytes(e, t) {
    return m(this, null, function* () {
      return { data: yield this.file.slice(e, e + t).arrayBuffer() };
    });
  }
};
l(A, "FileSource");
var U = class U2 {
  static {
    __name(this, "U");
  }
  constructor(e, t = new Headers()) {
    this.url = e, this.customHeaders = t, this.mustReload = false;
    let r = "";
    "navigator" in globalThis && (r = globalThis.navigator.userAgent || "");
    let n = r.indexOf("Windows") > -1, s = /Chrome|Chromium|Edg|OPR|Brave/.test(r);
    this.chromeWindowsNoCache = false, n && s && (this.chromeWindowsNoCache = true);
  }
  getKey() {
    return this.url;
  }
  setHeaders(e) {
    this.customHeaders = e;
  }
  getBytes(e, t, r, n) {
    return m(this, null, function* () {
      let s, o;
      r ? o = r : (s = new AbortController(), o = s.signal);
      let a = new Headers(this.customHeaders);
      a.set("range", `bytes=${e}-${e + t - 1}`);
      let u;
      this.mustReload ? u = "reload" : this.chromeWindowsNoCache && (u = "no-store");
      let c = yield fetch(this.url, { signal: o, cache: u, headers: a });
      if (e === 0 && c.status === 416) {
        let y = c.headers.get("Content-Range");
        if (!y || !y.startsWith("bytes */")) throw new Error("Missing content-length on 416 response");
        let f = +y.substr(8);
        c = yield fetch(this.url, { signal: o, cache: "reload", headers: { range: `bytes=0-${f - 1}` } });
      }
      let d = c.headers.get("Etag");
      if (d != null && d.startsWith("W/") && (d = null), c.status === 416 || n && d && d !== n) throw this.mustReload = true, new E(`Server returned non-matching ETag ${n} after one retry. Check browser extensions and servers for issues that may affect correct ETag headers.`);
      if (c.status >= 300) throw new Error(`Bad response code: ${c.status}`);
      let h = c.headers.get("Content-Length");
      if (c.status === 200 && (!h || +h > t)) throw s && s.abort(), new Error("Server returned no content-length header or content-length exceeding request. Check that your storage backend supports HTTP Byte Serving.");
      return { data: yield c.arrayBuffer(), etag: d || void 0, cacheControl: c.headers.get("Cache-Control") || void 0, expires: c.headers.get("Expires") || void 0 };
    });
  }
};
l(U, "FetchSource");
var C = U;
function g(i, e) {
  let t = i.getUint32(e + 4, true), r = i.getUint32(e + 0, true);
  return t * b(2, 32) + r;
}
__name(g, "g");
l(g, "getUint64");
function X(i, e) {
  let t = new DataView(i), r = t.getUint8(7);
  if (r > 3) throw new Error(`Archive is spec version ${r} but this library supports up to spec version 3`);
  return { specVersion: r, rootDirectoryOffset: g(t, 8), rootDirectoryLength: g(t, 16), jsonMetadataOffset: g(t, 24), jsonMetadataLength: g(t, 32), leafDirectoryOffset: g(t, 40), leafDirectoryLength: g(t, 48), tileDataOffset: g(t, 56), tileDataLength: g(t, 64), numAddressedTiles: g(t, 72), numTileEntries: g(t, 80), numTileContents: g(t, 88), clustered: t.getUint8(96) === 1, internalCompression: t.getUint8(97), tileCompression: t.getUint8(98), tileType: t.getUint8(99), minZoom: t.getUint8(100), maxZoom: t.getUint8(101), minLon: t.getInt32(102, true) / 1e7, minLat: t.getInt32(106, true) / 1e7, maxLon: t.getInt32(110, true) / 1e7, maxLat: t.getInt32(114, true) / 1e7, centerZoom: t.getUint8(118), centerLon: t.getInt32(119, true) / 1e7, centerLat: t.getInt32(123, true) / 1e7, etag: e };
}
__name(X, "X");
l(X, "bytesToHeader");
function Z(i) {
  let e = { buf: new Uint8Array(i), pos: 0 }, t = v(e), r = [], n = 0;
  for (let s = 0; s < t; s++) {
    let o = v(e);
    r.push({ tileId: n + o, offset: 0, length: 0, runLength: 1 }), n += o;
  }
  for (let s = 0; s < t; s++) r[s].runLength = v(e);
  for (let s = 0; s < t; s++) r[s].length = v(e);
  for (let s = 0; s < t; s++) {
    let o = v(e);
    o === 0 && s > 0 ? r[s].offset = r[s - 1].offset + r[s - 1].length : r[s].offset = o - 1;
  }
  return r;
}
__name(Z, "Z");
l(Z, "deserializeIndex");
var R = class R2 extends Error {
  static {
    __name(this, "R");
  }
};
l(R, "EtagMismatch");
var E = R;
function K(i, e) {
  return m(this, null, function* () {
    let t = yield i.getBytes(0, 16384);
    if (new DataView(t.data).getUint16(0, true) !== 19792) throw new Error("Wrong magic number for PMTiles archive");
    let n = t.data.slice(0, Y), s = X(n, t.etag), o = t.data.slice(s.rootDirectoryOffset, s.rootDirectoryOffset + s.rootDirectoryLength), a = `${i.getKey()}|${s.etag || ""}|${s.rootDirectoryOffset}|${s.rootDirectoryLength}`, u = Z(yield e(o, s.internalCompression));
    return [s, [a, u.length, u]];
  });
}
__name(K, "K");
l(K, "getHeaderAndRoot");
function I(i, e, t, r, n) {
  return m(this, null, function* () {
    let s = yield i.getBytes(t, r, void 0, n.etag), o = yield e(s.data, n.internalCompression), a = Z(o);
    if (a.length === 0) throw new Error("Empty directory is invalid");
    return a;
  });
}
__name(I, "I");
l(I, "getDirectory");
var H = class H2 {
  static {
    __name(this, "H");
  }
  constructor(e = 100, t = true, r = D) {
    this.cache = /* @__PURE__ */ new Map(), this.maxCacheEntries = e, this.counter = 1, this.decompress = r;
  }
  getHeader(e) {
    return m(this, null, function* () {
      let t = e.getKey(), r = this.cache.get(t);
      if (r) return r.lastUsed = this.counter++, r.data;
      let n = yield K(e, this.decompress);
      return n[1] && this.cache.set(n[1][0], { lastUsed: this.counter++, data: n[1][2] }), this.cache.set(t, { lastUsed: this.counter++, data: n[0] }), this.prune(), n[0];
    });
  }
  getDirectory(e, t, r, n) {
    return m(this, null, function* () {
      let s = `${e.getKey()}|${n.etag || ""}|${t}|${r}`, o = this.cache.get(s);
      if (o) return o.lastUsed = this.counter++, o.data;
      let a = yield I(e, this.decompress, t, r, n);
      return this.cache.set(s, { lastUsed: this.counter++, data: a }), this.prune(), a;
    });
  }
  prune() {
    if (this.cache.size > this.maxCacheEntries) {
      let e = 1 / 0, t;
      this.cache.forEach((r, n) => {
        r.lastUsed < e && (e = r.lastUsed, t = n);
      }), t && this.cache.delete(t);
    }
  }
  invalidate(e) {
    return m(this, null, function* () {
      this.cache.delete(e.getKey());
    });
  }
};
l(H, "ResolvedValueCache");
var $ = H;
var M = class M2 {
  static {
    __name(this, "M");
  }
  constructor(e = 100, t = true, r = D) {
    this.cache = /* @__PURE__ */ new Map(), this.invalidations = /* @__PURE__ */ new Map(), this.maxCacheEntries = e, this.counter = 1, this.decompress = r;
  }
  getHeader(e) {
    return m(this, null, function* () {
      let t = e.getKey(), r = this.cache.get(t);
      if (r) return r.lastUsed = this.counter++, yield r.data;
      let n = new Promise((s, o) => {
        K(e, this.decompress).then((a) => {
          a[1] && this.cache.set(a[1][0], { lastUsed: this.counter++, data: Promise.resolve(a[1][2]) }), s(a[0]), this.prune();
        }).catch((a) => {
          o(a);
        });
      });
      return this.cache.set(t, { lastUsed: this.counter++, data: n }), n;
    });
  }
  getDirectory(e, t, r, n) {
    return m(this, null, function* () {
      let s = `${e.getKey()}|${n.etag || ""}|${t}|${r}`, o = this.cache.get(s);
      if (o) return o.lastUsed = this.counter++, yield o.data;
      let a = new Promise((u, c) => {
        I(e, this.decompress, t, r, n).then((d) => {
          u(d), this.prune();
        }).catch((d) => {
          c(d);
        });
      });
      return this.cache.set(s, { lastUsed: this.counter++, data: a }), a;
    });
  }
  prune() {
    if (this.cache.size >= this.maxCacheEntries) {
      let e = 1 / 0, t;
      this.cache.forEach((r, n) => {
        r.lastUsed < e && (e = r.lastUsed, t = n);
      }), t && this.cache.delete(t);
    }
  }
  invalidate(e) {
    return m(this, null, function* () {
      let t = e.getKey();
      if (this.invalidations.get(t)) return yield this.invalidations.get(t);
      this.cache.delete(e.getKey());
      let r = new Promise((n, s) => {
        this.getHeader(e).then((o) => {
          n(), this.invalidations.delete(t);
        }).catch((o) => {
          s(o);
        });
      });
      this.invalidations.set(t, r);
    });
  }
};
l(M, "SharedPromiseCache");
var P = M;
var B = class B2 {
  static {
    __name(this, "B");
  }
  constructor(e, t, r) {
    typeof e == "string" ? this.source = new C(e) : this.source = e, r ? this.decompress = r : this.decompress = D, t ? this.cache = t : this.cache = new P();
  }
  getHeader() {
    return m(this, null, function* () {
      return yield this.cache.getHeader(this.source);
    });
  }
  getZxyAttempt(e, t, r, n) {
    return m(this, null, function* () {
      let s = G(e, t, r), o = yield this.cache.getHeader(this.source);
      if (e < o.minZoom || e > o.maxZoom) return;
      let a = o.rootDirectoryOffset, u = o.rootDirectoryLength;
      for (let c = 0; c <= 3; c++) {
        let d = yield this.cache.getDirectory(this.source, a, u, o), h = Q(d, s);
        if (h) {
          if (h.runLength > 0) {
            let p = yield this.source.getBytes(o.tileDataOffset + h.offset, h.length, n, o.etag);
            return { data: yield this.decompress(p.data, o.tileCompression), cacheControl: p.cacheControl, expires: p.expires };
          }
          a = o.leafDirectoryOffset + h.offset, u = h.length;
        } else return;
      }
      throw new Error("Maximum directory depth exceeded");
    });
  }
  getZxy(e, t, r, n) {
    return m(this, null, function* () {
      try {
        return yield this.getZxyAttempt(e, t, r, n);
      } catch (s) {
        if (s instanceof E) return this.cache.invalidate(this.source), yield this.getZxyAttempt(e, t, r, n);
        throw s;
      }
    });
  }
  getMetadataAttempt() {
    return m(this, null, function* () {
      let e = yield this.cache.getHeader(this.source), t = yield this.source.getBytes(e.jsonMetadataOffset, e.jsonMetadataLength, void 0, e.etag), r = yield this.decompress(t.data, e.internalCompression), n = new TextDecoder("utf-8");
      return JSON.parse(n.decode(r));
    });
  }
  getMetadata() {
    return m(this, null, function* () {
      try {
        return yield this.getMetadataAttempt();
      } catch (e) {
        if (e instanceof E) return this.cache.invalidate(this.source), yield this.getMetadataAttempt();
        throw e;
      }
    });
  }
  getTileJson(e) {
    return m(this, null, function* () {
      let t = yield this.getHeader(), r = yield this.getMetadata(), n = _(t.tileType);
      return { tilejson: "3.0.0", scheme: "xyz", tiles: [`${e}/{z}/{x}/{y}${n}`], vector_layers: r.vector_layers, attribution: r.attribution, description: r.description, name: r.name, version: r.version, bounds: [t.minLon, t.minLat, t.maxLon, t.maxLat], center: [t.centerLon, t.centerLat, t.centerZoom], minzoom: t.minZoom, maxzoom: t.maxZoom };
    });
  }
};
l(B, "PMTiles");
var x = B;

// ../shared/index.ts
var pmtiles_path = /* @__PURE__ */ __name((name, setting) => {
  if (setting) {
    return setting.replaceAll("{name}", name);
  }
  return name + ".pmtiles";
}, "pmtiles_path");
var TILE = /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+)\/(?<Z>\d+)\/(?<X>\d+)\/(?<Y>\d+).(?<EXT>[a-z]+)$/;
var TILESET = /^\/(?<NAME>[0-9a-zA-Z\/!\-_\.\*\'\(\)]+).json$/;
var tile_path = /* @__PURE__ */ __name((path) => {
  const tile_match = path.match(TILE);
  if (tile_match) {
    const g2 = tile_match.groups;
    return { ok: true, name: g2.NAME, tile: [+g2.Z, +g2.X, +g2.Y], ext: g2.EXT };
  }
  const tileset_match = path.match(TILESET);
  if (tileset_match) {
    const g2 = tileset_match.groups;
    return { ok: true, name: g2.NAME, ext: "json" };
  }
  return { ok: false, name: "", tile: [0, 0, 0], ext: "" };
}, "tile_path");

// src/index.ts
var KeyNotFoundError = class extends Error {
  static {
    __name(this, "KeyNotFoundError");
  }
};
async function nativeDecompress(buf, compression) {
  if (compression === J.None || compression === J.Unknown) {
    return buf;
  }
  if (compression === J.Gzip) {
    const stream = new Response(buf).body;
    const result = stream?.pipeThrough(new DecompressionStream("gzip"));
    return new Response(result).arrayBuffer();
  }
  throw new Error("Compression method not supported");
}
__name(nativeDecompress, "nativeDecompress");
var CACHE = new $(25, void 0, nativeDecompress);
var R2Source = class {
  static {
    __name(this, "R2Source");
  }
  constructor(env, archiveName) {
    this.env = env;
    this.archiveName = archiveName;
  }
  getKey() {
    return this.archiveName;
  }
  async getBytes(offset, length, signal, etag) {
    const resp = await this.env.BUCKET.get(
      pmtiles_path(this.archiveName, this.env.PMTILES_PATH),
      {
        range: { offset, length },
        onlyIf: { etagMatches: etag }
      }
    );
    if (!resp) {
      throw new KeyNotFoundError("Archive not found");
    }
    const o = resp;
    if (!o.body) {
      throw new E();
    }
    const a = await o.arrayBuffer();
    return {
      data: a,
      etag: o.etag,
      cacheControl: o.httpMetadata?.cacheControl,
      expires: o.httpMetadata?.cacheExpiry?.toISOString()
    };
  }
};
var index_default = {
  async fetch(request, env, ctx) {
    if (request.method.toUpperCase() === "POST")
      return new Response(void 0, { status: 405 });
    const url = new URL(request.url);
    const { ok, name, tile, ext } = tile_path(url.pathname);
    const cache = caches.default;
    if (!ok) {
      return new Response("Invalid URL", { status: 404 });
    }
    let allowedOrigin = "";
    if (typeof env.ALLOWED_ORIGINS !== "undefined") {
      for (const o of env.ALLOWED_ORIGINS.split(",")) {
        if (o === request.headers.get("Origin") || o === "*") {
          allowedOrigin = o;
        }
      }
    }
    const cached = await cache.match(request.url);
    if (cached) {
      const respHeaders = new Headers(cached.headers);
      if (allowedOrigin)
        respHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      respHeaders.set("Vary", "Origin");
      return new Response(cached.body, {
        headers: respHeaders,
        status: cached.status
      });
    }
    const cacheableResponse = /* @__PURE__ */ __name((body, cacheableHeaders2, status) => {
      cacheableHeaders2.set(
        "Cache-Control",
        env.CACHE_CONTROL || "public, max-age=86400"
      );
      const cacheable = new Response(body, {
        headers: cacheableHeaders2,
        status
      });
      ctx.waitUntil(cache.put(request.url, cacheable));
      const respHeaders = new Headers(cacheableHeaders2);
      if (allowedOrigin)
        respHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      respHeaders.set("Vary", "Origin");
      return new Response(body, { headers: respHeaders, status });
    }, "cacheableResponse");
    const cacheableHeaders = new Headers();
    const source = new R2Source(env, name);
    const p = new x(source, CACHE, nativeDecompress);
    try {
      const pHeader = await p.getHeader();
      if (!tile) {
        cacheableHeaders.set("Content-Type", "application/json");
        const t = await p.getTileJson(
          `https://${env.PUBLIC_HOSTNAME || url.hostname}/${name}`
        );
        return cacheableResponse(JSON.stringify(t), cacheableHeaders, 200);
      }
      if (tile[0] < pHeader.minZoom || tile[0] > pHeader.maxZoom) {
        return cacheableResponse(void 0, cacheableHeaders, 404);
      }
      for (const pair of [
        [O.Mvt, "mvt"],
        [O.Png, "png"],
        [O.Jpeg, "jpg"],
        [O.Webp, "webp"],
        [O.Avif, "avif"]
      ]) {
        if (pHeader.tileType === pair[0] && ext !== pair[1]) {
          if (pHeader.tileType === O.Mvt && ext === "pbf") {
            continue;
          }
          return cacheableResponse(
            `Bad request: requested .${ext} but archive has type .${pair[1]}`,
            cacheableHeaders,
            400
          );
        }
      }
      const tiledata = await p.getZxy(tile[0], tile[1], tile[2]);
      switch (pHeader.tileType) {
        case O.Mvt:
          cacheableHeaders.set("Content-Type", "application/x-protobuf");
          break;
        case O.Png:
          cacheableHeaders.set("Content-Type", "image/png");
          break;
        case O.Jpeg:
          cacheableHeaders.set("Content-Type", "image/jpeg");
          break;
        case O.Webp:
          cacheableHeaders.set("Content-Type", "image/webp");
          break;
      }
      if (tiledata) {
        return cacheableResponse(tiledata.data, cacheableHeaders, 200);
      }
      return cacheableResponse(void 0, cacheableHeaders, 204);
    } catch (e) {
      if (e instanceof KeyNotFoundError) {
        return cacheableResponse("Archive not found", cacheableHeaders, 404);
      }
      throw e;
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
