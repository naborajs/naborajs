const fs = require('fs');
const path = require('path');

const dirPath = path.join(process.cwd(), 'profile-3d-contrib');

if (!fs.existsSync(dirPath)) {
  console.log(`Directory ${dirPath} does not exist. Skipping post-processing.`);
  process.exit(0);
}

const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.svg'));
console.log(`Found ${files.length} SVG files to process.`);

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  let svg = fs.readFileSync(filePath, 'utf8');

  // Determine if it's a dark/night theme
  const isDark = file.includes('night') || file.includes('dark') || file.includes('rainbow') || file.includes('black') || file.includes('gitblock');

  // Extract dimensions
  const widthMatch = svg.match(/<svg[^>]+width="(\d+)"/);
  const heightMatch = svg.match(/<svg[^>]+height="(\d+)"/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 1280;
  const height = heightMatch ? parseInt(heightMatch[1]) : 850;

  // 1. Add anti-aliasing properties to the <svg> tag if not present
  if (!svg.includes('shape-rendering')) {
    svg = svg.replace('<svg', '<svg shape-rendering="geometricPrecision" text-rendering="geometricPrecision"');
  }

  // 2. Add custom filters & gradients to the <defs> section
  const defsStart = svg.indexOf('<defs>');
  let defsContent = '';

  if (isDark) {
    defsContent = `
    <!-- Premium Dark Background Gradient -->
    <radialGradient id="premium-bg-gradient" cx="50%" cy="50%" r="85%">
      <stop offset="0%" stop-color="#141226" />
      <stop offset="45%" stop-color="#0c0a1a" />
      <stop offset="100%" stop-color="#04020a" />
    </radialGradient>
    
    <!-- Soft Vignette Overlay for Dark Mode -->
    <radialGradient id="premium-vignette" cx="50%" cy="50%" r="70%">
      <stop offset="55%" stop-color="#04020a" stop-opacity="0" />
      <stop offset="100%" stop-color="#04020a" stop-opacity="0.95" />
    </radialGradient>
    
    <!-- Modern Soft Drop Shadow -->
    <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#000000" flood-opacity="0.75" />
    </filter>
    
    <!-- Subtle Glow for Neon Elements -->
    <filter id="premium-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    `;
  } else {
    // Light mode styling
    defsContent = `
    <!-- Premium Light Background Gradient -->
    <radialGradient id="premium-bg-gradient" cx="50%" cy="50%" r="85%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#f1f5f9" />
    </radialGradient>
    
    <!-- Soft Vignette Overlay for Light Mode -->
    <radialGradient id="premium-vignette" cx="50%" cy="50%" r="70%">
      <stop offset="55%" stop-color="#f1f5f9" stop-opacity="0" />
      <stop offset="100%" stop-color="#f1f5f9" stop-opacity="0.95" />
    </radialGradient>
    
    <!-- Soft Clean Shadow -->
    <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="15" flood-color="#0f172a" flood-opacity="0.12" />
    </filter>
    `;
  }

  if (defsStart !== -1) {
    // Insert inside existing <defs>
    svg = svg.slice(0, defsStart + 6) + defsContent + svg.slice(defsStart + 6);
  } else {
    // Inject <defs> right after <style> or at start
    const styleEnd = svg.indexOf('</style>');
    if (styleEnd !== -1) {
      svg = svg.slice(0, styleEnd + 8) + `<defs>${defsContent}</defs>` + svg.slice(styleEnd + 8);
    } else {
      svg = svg.replace('<svg', `<svg><defs>${defsContent}</defs>`);
    }
  }

  // 3. Inject typography, round corner paths, and styles into the <style> block
  const styleStart = svg.indexOf('<style>');
  if (styleStart !== -1) {
    const styleEnd = svg.indexOf('</style>');
    let css = svg.slice(styleStart + 7, styleEnd);

    // Replace fonts with Google Font (Outfit)
    const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');\n`;
    css = fontImport + css;
    
    // Replace font-family inside rules cleanly
    css = css.replace(/font-family:\s*[^;\}]+;/g, "font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");

    // Override background fill and stroke to use gradient
    css = css.replace(/\.fill-bg\s*\{\s*fill:[^;\}]+;\s*\}/g, `.fill-bg { fill: url(#premium-bg-gradient); }`);
    css = css.replace(/\.stroke-bg\s*\{\s*stroke:[^;\}]+;\s*\}/g, `.stroke-bg { stroke: transparent; }`);

    // Softer grids
    css = css.replace(/\.stroke-weak\s*\{\s*stroke:[^;\}]+;\s*\}/g, `.stroke-weak { stroke: ${isDark ? '#27272a' : '#e2e8f0'}; stroke-opacity: 0.4; }`);

    // Smooth path edges and shadows
    css += `
      path {
        stroke-linejoin: round;
        stroke-linecap: round;
        transition: filter 0.3s ease;
      }
      path:hover {
        filter: brightness(1.2);
      }
    `;

    svg = svg.slice(0, styleStart + 7) + css + svg.slice(styleEnd);
  }

  // 4. Wrap components in shadows group (excluding background rect)
  // Look for the background rect: <rect x="0" y="0" width="..." height="..." class="fill-bg"/>
  const bgRectRegex = /<rect[^>]+class="fill-bg"[^>]*>/;
  const bgMatch = svg.match(bgRectRegex);
  if (bgMatch) {
    const bgEndIndex = bgMatch.index + bgMatch[0].length;
    const svgEndIndex = svg.lastIndexOf('</svg>');

    if (svgEndIndex !== -1) {
      const contentToWrap = svg.slice(bgEndIndex, svgEndIndex);
      const wrappedContent = `
        <g filter="url(#premium-shadow)">
          ${contentToWrap}
        </g>
        <!-- Fade-Style Outer Edges (Vignette) -->
        <rect width="${width}" height="${height}" fill="url(#premium-vignette)" pointer-events="none" />
      `;
      svg = svg.slice(0, bgEndIndex) + wrappedContent + svg.slice(svgEndIndex);
    }
  }

  fs.writeFileSync(filePath, svg, 'utf8');
  console.log(`Processed and enhanced ${file} successfully.`);
});
