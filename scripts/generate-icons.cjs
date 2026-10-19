const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function buildAllIcons() {
  const publicDir = path.resolve(__dirname, '../public');
  const logoPath = path.join(publicDir, 'nocus-logo.png');

  if (!fs.existsSync(logoPath)) {
    throw new Error('nocus-logo.png not found at ' + logoPath);
  }

  // Extract clean glyph bounds from nocus-logo.png
  const glyphBuffer = await sharp(logoPath)
    .extract({ left: 60, top: 89, width: 1010, height: 951 })
    .toBuffer();

  const bg = { r: 8, g: 7, b: 20, alpha: 1 }; // #080714 dark brand background

  async function makeIcon(size, glyphW, outName) {
    const glyphH = Math.round(glyphW * 951 / 1010);
    const glyphResized = await sharp(glyphBuffer)
      .resize(glyphW, glyphH, { fit: 'fill' })
      .toBuffer();

    const left = Math.round((size - glyphW) / 2);
    const top = Math.round((size - glyphH) / 2);

    const outPath = path.join(publicDir, outName);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bg
      }
    })
    .composite([{ input: glyphResized, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

    console.log(`✓ Generated ${outName} (${size}x${size}, glyph ${glyphW}x${glyphH})`);
  }

  // Standard and maskable 512x512
  // Max pixel distance: 191.7px from center (safe radius is 204.8px)
  await makeIcon(512, 275, 'icon-512.png');
  await makeIcon(512, 275, 'icon-maskable-512.png');

  // Standard and maskable 192x192
  await makeIcon(192, 103, 'icon-192.png');
  await makeIcon(192, 103, 'icon-maskable-192.png');

  // Apple touch icon 180x180
  await makeIcon(180, 106, 'apple-touch-icon.png');

  // Favicons
  await makeIcon(32, 24, 'favicon-32x32.png');
  await makeIcon(16, 12, 'favicon-16x16.png');

  console.log('All PWA and mobile icons built successfully!');
}

buildAllIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
