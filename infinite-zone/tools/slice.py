#!/usr/bin/env python3
"""Slice a sprite-sheet rip into frame rectangles.

Finds every sprite as a connected blob of non-background pixels (blobs
closer than --gap px merge, so detached shoes and hands stay with their
body), orders them in reading order, and writes:

  <sheet>.frames.json   {"key": "#rrggbb", "frames": [[x, y, w, h], ...]}
  <sheet>.preview.png   the sheet with every frame boxed and numbered

Map animations to frame numbers in an atlas (see src/shell/skin.js):
  "anims": {"run": {"frames": [12, 13, 14, 15]}}

usage: python3 tools/slice.py sheet.png [--key auto|#rrggbb] [--gap 2] [--min 10]
"""
import argparse
import json
from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageDraw


def background(img):
    w, h = img.size
    px = img.load()
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    border += [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    return Counter(border).most_common(1)[0][0]


def blobs(mask, w, h, gap):
    seen = bytearray(w * h)
    out = []
    for start in range(w * h):
        if not mask[start] or seen[start]:
            continue
        seen[start] = 1
        q = deque([start])
        x0 = x1 = start % w
        y0 = y1 = start // w
        while q:
            i = q.popleft()
            x, y = i % w, i // w
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for dy in range(-gap, gap + 1):
                ny = y + dy
                if ny < 0 or ny >= h:
                    continue
                for dx in range(-gap, gap + 1):
                    nx = x + dx
                    if 0 <= nx < w:
                        j = ny * w + nx
                        if mask[j] and not seen[j]:
                            seen[j] = 1
                            q.append(j)
        out.append([x0, y0, x1 - x0 + 1, y1 - y0 + 1])
    return out


def reading_order(rects):
    rects = sorted(rects, key=lambda r: r[1])
    rows, row, bottom = [], [], -1
    for r in rects:
        if row and r[1] > bottom:
            rows.append(row)
            row, bottom = [], -1
        row.append(r)
        bottom = max(bottom, r[1] + r[3] // 2)
    if row:
        rows.append(row)
    return [r for row in rows for r in sorted(row, key=lambda r: r[0])]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sheet')
    ap.add_argument('--key', default='auto')
    ap.add_argument('--gap', type=int, default=2)
    ap.add_argument('--min', type=int, default=10, help='drop blobs smaller than this on both sides')
    a = ap.parse_args()

    img = Image.open(a.sheet).convert('RGBA')
    w, h = img.size
    key = background(img) if a.key == 'auto' else tuple(int(a.key[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
    px = list(img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata())
    mask = bytearray(1 if (p[3] > 0 and p[:3] != key[:3]) else 0 for p in px)
    rects = [r for r in blobs(mask, w, h, a.gap) if r[2] >= a.min or r[3] >= a.min]
    rects = reading_order(rects)

    base = Path(a.sheet).with_suffix('')
    hexkey = '#%02x%02x%02x' % key[:3]
    Path(f'{base}.frames.json').write_text(json.dumps({'key': hexkey, 'frames': rects}, separators=(',', ':')))
    prev = img.copy()
    d = ImageDraw.Draw(prev)
    for i, (x, y, fw, fh) in enumerate(rects):
        d.rectangle([x, y, x + fw - 1, y + fh - 1], outline=(255, 0, 255, 255))
        d.text((x + 1, y + 1), str(i), fill=(255, 0, 255, 255))
    prev.save(f'{base}.preview.png')
    print(f'{len(rects)} frames, key {hexkey} -> {base}.frames.json, {base}.preview.png')


if __name__ == '__main__':
    main()
