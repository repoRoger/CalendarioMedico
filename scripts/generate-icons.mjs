import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Medical Calendar icon SVG
const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6" />
      <stop offset="50%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0ea5e9" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0d9488" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background rounded squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Outer glowing border -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#1e293b" stroke-width="6"/>

  <!-- Calendar card body -->
  <g filter="url(#glow)">
    <rect x="86" y="96" width="340" height="320" rx="36" fill="#1e293b" stroke="#334155" stroke-width="4"/>
    
    <!-- Calendar top header banner -->
    <path d="M 86 132 C 86 112 102 96 122 96 L 390 96 C 410 96 426 112 426 132 L 426 180 L 86 180 Z" fill="url(#accentGrad)" />

    <!-- Calendar rings / hangers -->
    <rect x="160" y="72" width="28" height="48" rx="14" fill="#f8fafc"/>
    <rect x="324" y="72" width="28" height="48" rx="14" fill="#f8fafc"/>

    <!-- Medical Cross inside calendar -->
    <g transform="translate(256, 298)">
      <!-- Cross vertical bar -->
      <rect x="-24" y="-72" width="48" height="144" rx="16" fill="url(#accentGrad)"/>
      <!-- Cross horizontal bar -->
      <rect x="-72" y="-24" width="144" height="48" rx="16" fill="url(#accentGrad)"/>
      <!-- Center white circle pulse -->
      <circle cx="0" cy="0" r="16" fill="#ffffff" opacity="0.95"/>
      <!-- Stethoscope / heartbeat pulse accent -->
      <circle cx="0" cy="0" r="8" fill="#0f766e" />
    </g>

    <!-- Calendar date dots representing shifts -->
    <circle cx="138" cy="226" r="10" fill="#38bdf8" />
    <circle cx="188" cy="226" r="10" fill="#fb923c" />
    <circle cx="324" cy="226" r="10" fill="#a855f7" />
    <circle cx="374" cy="226" r="10" fill="#34d399" />
  </g>
</svg>`;

// Maskable version has safe area (extra padding around contents)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="mAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14b8a6" />
      <stop offset="50%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
  </defs>

  <!-- Full-bleed background for maskable safe zone -->
  <rect width="512" height="512" fill="url(#mBgGrad)"/>

  <!-- Scaled content centered within 80% circle (safe zone: 512 * 0.7 = ~360) -->
  <g transform="translate(77, 77) scale(0.7)">
    <rect x="86" y="96" width="340" height="320" rx="36" fill="#1e293b" stroke="#334155" stroke-width="6"/>
    <path d="M 86 132 C 86 112 102 96 122 96 L 390 96 C 410 96 426 112 426 132 L 426 180 L 86 180 Z" fill="url(#mAccentGrad)" />
    <rect x="160" y="72" width="28" height="48" rx="14" fill="#f8fafc"/>
    <rect x="324" y="72" width="28" height="48" rx="14" fill="#f8fafc"/>

    <g transform="translate(256, 298)">
      <rect x="-24" y="-72" width="48" height="144" rx="16" fill="url(#mAccentGrad)"/>
      <rect x="-72" y="-24" width="144" height="48" rx="16" fill="url(#mAccentGrad)"/>
      <circle cx="0" cy="0" r="16" fill="#ffffff" opacity="0.95"/>
      <circle cx="0" cy="0" r="8" fill="#0f766e" />
    </g>

    <circle cx="138" cy="226" r="10" fill="#38bdf8" />
    <circle cx="188" cy="226" r="10" fill="#fb923c" />
    <circle cx="324" cy="226" r="10" fill="#a855f7" />
    <circle cx="374" cy="226" r="10" fill="#34d399" />
  </g>
</svg>`;

async function main() {
  // 1. Write SVG icon
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), baseSvg);

  // 2. Generate 192x192 PNG
  await sharp(Buffer.from(baseSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 3. Generate 512x512 PNG
  await sharp(Buffer.from(baseSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 4. Generate maskable 512x512 PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 5. Generate apple-touch-icon 180x180 PNG
  await sharp(Buffer.from(baseSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Generate favicon 64x64 PNG and copy to favicon.ico
  const favBuffer = await sharp(Buffer.from(baseSvg))
    .resize(64, 64)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favBuffer);

  console.log('All PWA icons successfully generated in public/ directory!');
}

main().catch(console.error);
