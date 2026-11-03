/* Synchronous gzip inflate for the offline bundle (scripts/build_offline_html.py): the frozen October feeds are embedded as base64 gzip blobs and
   unpacked at start-up, because the app needs them before app.js runs (DecompressionStream is asynchronous). Not loaded by index.html.
   Port of the tinf algorithm (RFC 1951); input is the gzip a python gzip.compress() writes. window.ijInflate(base64) -> string */
(function () {
  function Tree() { this.t = new Uint16Array(16); this.trans = new Uint16Array(288); }
  var lenBits = new Uint8Array(30), lenBase = new Uint16Array(30), distBits = new Uint8Array(30), distBase = new Uint16Array(30);
  var CLC = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var sltree = new Tree(), sdtree = new Tree();
  function bitsBase(bits, base, delta, first) {
    var i, sum;
    for (i = 0; i < delta; ++i) bits[i] = 0;
    for (i = 0; i < 30 - delta; ++i) bits[i + delta] = (i / delta) | 0;
    for (sum = first, i = 0; i < 30; ++i) { base[i] = sum; sum += 1 << bits[i]; }
  }
  function buildTree(t, lengths, off, num) {
    var offs = new Uint16Array(16), i, sum;
    for (i = 0; i < 16; ++i) t.t[i] = 0;
    for (i = 0; i < num; ++i) t.t[lengths[off + i]]++;
    t.t[0] = 0;
    for (sum = 0, i = 0; i < 16; ++i) { offs[i] = sum; sum += t.t[i]; }
    for (i = 0; i < num; ++i) if (lengths[off + i]) t.trans[offs[lengths[off + i]]++] = i;
  }
  function fixed() {
    var i;
    for (i = 0; i < 7; ++i) sltree.t[i] = 0;
    sltree.t[7] = 24; sltree.t[8] = 152; sltree.t[9] = 112;
    for (i = 0; i < 24; ++i) sltree.trans[i] = 256 + i;
    for (i = 0; i < 144; ++i) sltree.trans[24 + i] = i;
    for (i = 0; i < 8; ++i) sltree.trans[24 + 144 + i] = 280 + i;
    for (i = 0; i < 112; ++i) sltree.trans[24 + 144 + 8 + i] = 144 + i;
    for (i = 0; i < 5; ++i) sdtree.t[i] = 0;
    sdtree.t[5] = 32;
    for (i = 0; i < 32; ++i) sdtree.trans[i] = i;
  }
  bitsBase(lenBits, lenBase, 4, 3); bitsBase(distBits, distBase, 2, 1);
  lenBits[28] = 0; lenBase[28] = 258; fixed();
  function D(src, dst) { this.s = src; this.si = 0; this.tag = 0; this.bc = 0; this.d = dst; this.di = 0; this.lt = new Tree(); this.dt = new Tree(); }
  function getbit(d) { if (!d.bc--) { d.tag = d.s[d.si++]; d.bc = 7; } var b = d.tag & 1; d.tag >>>= 1; return b; }
  function readBits(d, num, base) {
    if (!num) return base;
    while (d.bc < 24) { d.tag |= d.s[d.si++] << d.bc; d.bc += 8; }
    var v = d.tag & (0xffff >>> (16 - num)); d.tag >>>= num; d.bc -= num; return v + base;
  }
  function decodeSym(d, t) {
    while (d.bc < 24) { d.tag |= d.s[d.si++] << d.bc; d.bc += 8; }
    var sum = 0, cur = 0, len = 0, tag = d.tag;
    do { cur = 2 * cur + (tag & 1); tag >>>= 1; ++len; sum += t.t[len]; cur -= t.t[len]; } while (cur >= 0);
    d.tag = tag; d.bc -= len; return t.trans[sum + cur];
  }
  function decodeTrees(d, lt, dt) {
    var lengths = new Uint8Array(288 + 32), hlit = readBits(d, 5, 257), hdist = readBits(d, 5, 1), hclen = readBits(d, 4, 4), i, num, length;
    for (i = 0; i < 19; ++i) lengths[i] = 0;
    for (i = 0; i < hclen; ++i) lengths[CLC[i]] = readBits(d, 3, 0);
    var code = new Tree(); buildTree(code, lengths, 0, 19);
    for (num = 0; num < hlit + hdist;) {
      var sym = decodeSym(d, code), prev;
      switch (sym) {
        case 16: prev = lengths[num - 1]; for (length = readBits(d, 2, 3); length; --length) lengths[num++] = prev; break;
        case 17: for (length = readBits(d, 3, 3); length; --length) lengths[num++] = 0; break;
        case 18: for (length = readBits(d, 7, 11); length; --length) lengths[num++] = 0; break;
        default: lengths[num++] = sym;
      }
    }
    buildTree(lt, lengths, 0, hlit); buildTree(dt, lengths, hlit, hdist);
  }
  function blockData(d, lt, dt) {
    for (;;) {
      var sym = decodeSym(d, lt);
      if (sym === 256) return;
      if (sym < 256) d.d[d.di++] = sym;
      else {
        sym -= 257;
        var length = readBits(d, lenBits[sym], lenBase[sym]), dist = decodeSym(d, dt), offs = d.di - readBits(d, distBits[dist], distBase[dist]);
        for (var i = offs; i < offs + length; ++i) d.d[d.di++] = d.d[i];
      }
    }
  }
  function inflateRaw(src, start, dst) {
    var d = new D(src, dst), bfinal, btype;
    d.si = start;
    do {
      bfinal = getbit(d); btype = readBits(d, 2, 0);
      if (btype === 0) {
        var length, invlength;
        d.bc = 0; length = src[d.si + 1] * 256 + src[d.si]; d.si += 4;
        for (var i = length; i; --i) d.d[d.di++] = src[d.si++];
        d.bc = 0;
      } else if (btype === 1) blockData(d, sltree, sdtree);
      else if (btype === 2) { decodeTrees(d, d.lt, d.dt); blockData(d, d.lt, d.dt); }
      else throw new Error('bad deflate block');
    } while (!bfinal);
    return dst;
  }
  window.ijInflate = function (b64) {
    var bin = atob(b64), n = bin.length, src = new Uint8Array(n), i;
    for (i = 0; i < n; i++) src[i] = bin.charCodeAt(i);
    var flg = src[3], p = 10;
    if (flg & 4) p += 2 + (src[p] | (src[p + 1] << 8));
    if (flg & 8) { while (src[p++]); }
    if (flg & 16) { while (src[p++]); }
    if (flg & 2) p += 2;
    var size = (src[n - 4] | (src[n - 3] << 8) | (src[n - 2] << 16) | (src[n - 1] << 24)) >>> 0;
    return new TextDecoder('utf-8').decode(inflateRaw(src, p, new Uint8Array(size)).subarray(0, size));
  };
})();
