#!/usr/bin/env node
// Generates build/icon.icns from code — no Pillow/ImageMagick dependency,
// just a hand-rolled supersampled rasterizer + PNG encoder (same spirit as
// electron/tray-icon.ts). Re-run after changing the design:
//
//   node scripts/make-icon.mjs

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'build');

// Dark near-black squircle (matches src/theme.css --surface-1 → --canvas)
// holding a lavender-blue ">_" prompt glyph (--accent), the same motif as
// the runtime-drawn menu-bar tray icon.
const TOP = [0x17, 0x18, 0x1a];
const BOTTOM = [0x0b, 0x0b, 0x0d];
const ACCENT = [0x5e, 0x6a, 0xd2];

const SUPERSAMPLE = 4096; // rendered once at this size, then box-downsampled

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function renderSupersampled(size) {
  const buf = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.41;
  const n = 4.2;

  // Glyph geometry in a 0..100 unit grid mapped onto the canvas.
  const u = (v) => (v / 100) * size;
  const B = [u(36), u(30)]; // chevron top
  const A = [u(58), u(50)]; // chevron apex (rightmost)
  const C = [u(36), u(70)]; // chevron bottom
  const cursor = [u(64), u(66), u(80), u(66)]; // cursor bar
  const strokeR = u(4.2);

  for (let y = 0; y < size; y++) {
    const bg = TOP.map((t, i) => Math.round(t + (BOTTOM[i] - t) * (y / size)));
    for (let x = 0; x < size; x++) {
      const nx = (x - cx) / R;
      const ny = (y - cy) / R;
      const inSquircle = Math.abs(nx) ** n + Math.abs(ny) ** n <= 1;
      const idx = (y * size + x) * 4;
      if (!inSquircle) continue; // stays transparent

      const onChevron =
        distToSegment(x, y, B[0], B[1], A[0], A[1]) <= strokeR ||
        distToSegment(x, y, A[0], A[1], C[0], C[1]) <= strokeR;
      const onCursor = distToSegment(x, y, cursor[0], cursor[1], cursor[2], cursor[3]) <= strokeR;

      const color = onChevron || onCursor ? ACCENT : bg;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = 255;
    }
  }
  return buf;
}

/** Exact box-average downsample; `big` must be evenly divisible by `size`. */
function downsample(big, bigSize, size) {
  const factor = bigSize / size;
  if (!Number.isInteger(factor)) throw new Error('non-integer downsample factor');
  const out = new Uint8ClampedArray(size * size * 4);
  const area = factor * factor;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < factor; dy++) {
        const sy = y * factor + dy;
        for (let dx = 0; dx < factor; dx++) {
          const sx = x * factor + dx;
          const idx = (sy * bigSize + sx) * 4;
          r += big[idx];
          g += big[idx + 1];
          b += big[idx + 2];
          a += big[idx + 3];
        }
      }
      const outIdx = (y * size + x) * 4;
      out[outIdx] = r / area;
      out[outIdx + 1] = g / area;
      out[outIdx + 2] = b / area;
      out[outIdx + 3] = a / area;
    }
  }
  return out;
}

// ── minimal PNG encoder (RGBA, 8-bit, no interlace) ─────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter: none
    raw.set(Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride), rowStart + 1);
  }
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`rendering at ${SUPERSAMPLE}x${SUPERSAMPLE}…`);
  const big = renderSupersampled(SUPERSAMPLE);

  fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), encodePng(1024, 1024, downsample(big, SUPERSAMPLE, 1024)));

  const iconset = path.join(OUT_DIR, 'icon.iconset');
  fs.rmSync(iconset, { recursive: true, force: true });
  fs.mkdirSync(iconset);
  for (const size of [16, 32, 128, 256, 512]) {
    fs.writeFileSync(
      path.join(iconset, `icon_${size}x${size}.png`),
      encodePng(size, size, downsample(big, SUPERSAMPLE, size)),
    );
    fs.writeFileSync(
      path.join(iconset, `icon_${size}x${size}@2x.png`),
      encodePng(size * 2, size * 2, downsample(big, SUPERSAMPLE, size * 2)),
    );
  }
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(OUT_DIR, 'icon.icns')]);
  console.log('wrote build/icon.png, build/icon.iconset/, build/icon.icns');
}

main();
