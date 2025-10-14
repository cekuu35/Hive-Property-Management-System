// Script to generate PWA icons
// This is a placeholder - in production, you would use a proper icon generation tool
// For now, we'll create simple colored squares as placeholders

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Generating PWA icons...');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (placeholder)
iconSizes.forEach(size => {
  const svgContent = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">LP</text>
</svg>`;

  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Generated icon-${size}x${size}.svg`);
});

// Generate additional icons for shortcuts
const shortcutIcons = [
  { name: 'rent-icon-96x96', text: 'R' },
  { name: 'utility-icon-96x96', text: 'U' },
  { name: 'dashboard-icon-96x96', text: 'D' }
];

shortcutIcons.forEach(({ name, text }) => {
  const svgContent = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="96" height="96" fill="url(#grad)" rx="20"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="40" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">${text}</text>
</svg>`;

  const svgPath = path.join(iconsDir, `${name}.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Generated ${name}.svg`);
});

// Generate action icons
const actionIcons = [
  { name: 'checkmark', text: '✓' },
  { name: 'xmark', text: '✕' }
];

actionIcons.forEach(({ name, text }) => {
  const svgContent = `
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" fill="#10b981" rx="4"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="white">${text}</text>
</svg>`;

  const svgPath = path.join(iconsDir, `${name}.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Generated ${name}.svg`);
});

console.log('🎉 PWA icons generated successfully!');
console.log('📝 Note: In production, replace these with proper PNG icons for better compatibility.');
