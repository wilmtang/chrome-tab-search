const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const repoRoot = path.resolve(__dirname, "..");
const iconDir = path.join(repoRoot, "icons");
const sizes = [16, 32, 48, 128];

fs.mkdirSync(iconDir, { recursive: true });

const sourceSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Chrome Tab Search">
  <defs>
    <linearGradient id="surface" x1="18" y1="14" x2="112" y2="118" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#0f172a" flood-opacity=".24"/>
    </filter>
  </defs>
  <rect x="14" y="16" width="100" height="88" rx="22" fill="url(#surface)" filter="url(#shadow)"/>
  <path d="M30 40c0-6.6 5.4-12 12-12h52c6.6 0 12 5.4 12 12v12H30V40Z" fill="#f8fafc" opacity=".94"/>
  <rect x="28" y="48" width="80" height="48" rx="10" fill="#111827" opacity=".92"/>
  <path d="M45 66h18M45 78h12M75 66h18M75 78h10" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round"/>
  <circle cx="83" cy="84" r="17" fill="#111827" stroke="#f8fafc" stroke-width="7"/>
  <path d="m96 97 15 15" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/>
</svg>
`;

fs.writeFileSync(path.join(iconDir, "icon.svg"), sourceSvg);

for (const size of sizes) {
    fs.writeFileSync(path.join(iconDir, `icon-${size}.png`), createIconPng(size));
}

console.log(`Generated extension icons in ${iconDir}`);

function createIconPng(size) {
    const scale = size / 128;
    const sampleCount = size < 48 ? 4 : 3;
    const pixels = Buffer.alloc(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const color = samplePixel(x, y, scale, sampleCount);
            const offset = (y * size + x) * 4;
            pixels[offset] = color.r;
            pixels[offset + 1] = color.g;
            pixels[offset + 2] = color.b;
            pixels[offset + 3] = color.a;
        }
    }

    return encodePng(size, size, pixels);
}

function samplePixel(x, y, scale, sampleCount) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    const total = sampleCount * sampleCount;

    for (let sy = 0; sy < sampleCount; sy++) {
        for (let sx = 0; sx < sampleCount; sx++) {
            const px = (x + (sx + 0.5) / sampleCount) / scale;
            const py = (y + (sy + 0.5) / sampleCount) / scale;
            const color = drawAt(px, py);
            r += color.r;
            g += color.g;
            b += color.b;
            a += color.a;
        }
    }

    return {
        r: Math.round(r / total),
        g: Math.round(g / total),
        b: Math.round(b / total),
        a: Math.round(a / total),
    };
}

function drawAt(x, y) {
    let color = { r: 0, g: 0, b: 0, a: 0 };

    if (insideRoundedRect(x, y, 14, 16, 100, 88, 22)) {
        color = gradientColor(x, y);
    }

    if (insideRoundedRect(x, y, 30, 28, 76, 42, 12) && y <= 52) {
        color = composite(color, { r: 248, g: 250, b: 252, a: 240 });
    }

    if (insideRoundedRect(x, y, 28, 48, 80, 48, 10)) {
        color = composite(color, { r: 17, g: 24, b: 39, a: 235 });
    }

    color = strokePolyline(color, x, y, [[45, 66], [63, 66]], 6, { r: 229, g: 231, b: 235, a: 255 });
    color = strokePolyline(color, x, y, [[45, 78], [57, 78]], 6, { r: 229, g: 231, b: 235, a: 255 });
    color = strokePolyline(color, x, y, [[75, 66], [93, 66]], 6, { r: 229, g: 231, b: 235, a: 255 });
    color = strokePolyline(color, x, y, [[75, 78], [85, 78]], 6, { r: 229, g: 231, b: 235, a: 255 });

    const lensDistance = distance(x, y, 83, 84);
    if (lensDistance <= 20.5 && lensDistance >= 13.5) {
        color = { r: 248, g: 250, b: 252, a: 255 };
    } else if (lensDistance < 13.5) {
        color = { r: 17, g: 24, b: 39, a: 255 };
    }

    color = strokePolyline(color, x, y, [[96, 97], [111, 112]], 8, { r: 248, g: 250, b: 252, a: 255 });

    return color;
}

function gradientColor(x, y) {
    const t = Math.max(0, Math.min(1, ((x - 18) + (y - 14)) / ((112 - 18) + (118 - 14))));
    return {
        r: Math.round(59 + (139 - 59) * t),
        g: Math.round(130 + (92 - 130) * t),
        b: Math.round(246 + (246 - 246) * t),
        a: 255,
    };
}

function composite(base, top) {
    const alpha = top.a / 255;
    const inverse = 1 - alpha;
    return {
        r: Math.round(top.r * alpha + base.r * inverse),
        g: Math.round(top.g * alpha + base.g * inverse),
        b: Math.round(top.b * alpha + base.b * inverse),
        a: Math.round(top.a + base.a * inverse),
    };
}

function strokePolyline(base, x, y, points, width, color) {
    const radius = width / 2;

    for (const point of points) {
        if (distance(x, y, point[0], point[1]) <= radius) {
            return color;
        }
    }

    for (let i = 0; i < points.length - 1; i++) {
        if (distanceToSegment(x, y, points[i], points[i + 1]) <= radius) {
            return color;
        }
    }

    return base;
}

function insideRoundedRect(x, y, left, top, width, height, radius) {
    const right = left + width;
    const bottom = top + height;
    const cx = Math.max(left + radius, Math.min(x, right - radius));
    const cy = Math.max(top + radius, Math.min(y, bottom - radius));
    return x >= left && x <= right && y >= top && y <= bottom && distance(x, y, cx, cy) <= radius;
}

function distanceToSegment(x, y, a, b) {
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const wx = x - a[0];
    const wy = y - a[1];
    const lengthSquared = vx * vx + vy * vy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lengthSquared));
    return distance(x, y, a[0] + t * vx, a[1] + t * vy);
}

function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
}

function encodePng(width, height, rgba) {
    const scanlineLength = width * 4 + 1;
    const raw = Buffer.alloc(scanlineLength * height);

    for (let y = 0; y < height; y++) {
        raw[y * scanlineLength] = 0;
        rgba.copy(raw, y * scanlineLength + 1, y * width * 4, (y + 1) * width * 4);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk("IHDR", Buffer.concat([
            uint32(width),
            uint32(height),
            Buffer.from([8, 6, 0, 0, 0]),
        ])),
        pngChunk("IDAT", zlib.deflateSync(raw)),
        pngChunk("IEND", Buffer.alloc(0)),
    ]);
}

function pngChunk(type, data) {
    const typeBuffer = Buffer.from(type, "ascii");
    const crcBuffer = Buffer.concat([typeBuffer, data]);
    return Buffer.concat([
        uint32(data.length),
        typeBuffer,
        data,
        uint32(crc32(crcBuffer)),
    ]);
}

function uint32(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(value >>> 0, 0);
    return buffer;
}

function crc32(buffer) {
    let crc = 0xffffffff;

    for (const byte of buffer) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }

    return (crc ^ 0xffffffff) >>> 0;
}
