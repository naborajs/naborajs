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

  // Skip if already processed, UNLESS it contains the broken, unescaped google font ampersand URL
  const hasUnescapedAmp = svg.includes('&display=swap');
  if ((svg.includes('id="card-clip"') || svg.includes('premium-bg-gradient')) && !hasUnescapedAmp) {
    console.log(`File ${file} has already been processed and enhanced. Skipping.`);
    return;
  }

  if (hasUnescapedAmp) {
    console.log(`File ${file} contains unescaped ampersand in style block. Repairing file...`);
  }

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

  // 2. Add custom filters, clip paths, & gradients to the <defs> section
  // Note: We only add defs if they are not already present (self-healing/repair mode)
  if (!svg.includes('id="card-clip"')) {
    const defsStart = svg.indexOf('<defs>');
    let defsContent = '';

    if (isDark) {
      defsContent = `
      <!-- Card Clip Path for Rounded Corners -->
      <clipPath id="card-clip">
        <rect x="0" y="0" width="${width}" height="${height}" rx="24" ry="24" />
      </clipPath>
      
      <!-- Premium Dark Background Gradient -->
      <radialGradient id="premium-bg-gradient" cx="50%" cy="45%" r="80%">
        <stop offset="0%" stop-color="#14112c" />
        <stop offset="50%" stop-color="#0b0818" />
        <stop offset="100%" stop-color="#030207" />
      </radialGradient>
      
      <!-- Soft Vignette Overlay for Dark Mode -->
      <radialGradient id="premium-vignette" cx="50%" cy="45%" r="70%">
        <stop offset="55%" stop-color="#030207" stop-opacity="0" />
        <stop offset="100%" stop-color="#030207" stop-opacity="0.9" />
      </radialGradient>
      
      <!-- Translucent Card Border Gradient -->
      <linearGradient id="card-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#818cf8" stop-opacity="0.35" />
        <stop offset="25%" stop-color="#c084fc" stop-opacity="0.1" />
        <stop offset="75%" stop-color="#3b82f6" stop-opacity="0.05" />
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0.25" />
      </linearGradient>
      
      <!-- Horizontal Separator Line Gradient -->
      <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#818cf8" stop-opacity="0" />
        <stop offset="20%" stop-color="#818cf8" stop-opacity="0.15" />
        <stop offset="50%" stop-color="#c084fc" stop-opacity="0.3" />
        <stop offset="80%" stop-color="#818cf8" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0" />
      </linearGradient>
      
      <!-- Modern Soft Drop Shadow -->
      <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="25" stdDeviation="22" flood-color="#000000" flood-opacity="0.75" />
      </filter>
      
      <!-- Radar Graph Area Gradient -->
      <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#c084fc" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#c084fc" stop-opacity="0.5" />
      </radialGradient>
      `;
    } else {
      // Light mode styling
      defsContent = `
      <!-- Card Clip Path for Rounded Corners -->
      <clipPath id="card-clip">
        <rect x="0" y="0" width="${width}" height="${height}" rx="24" ry="24" />
      </clipPath>
      
      <!-- Premium Light Background Gradient -->
      <radialGradient id="premium-bg-gradient" cx="50%" cy="45%" r="80%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="60%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#f1f5f9" />
      </radialGradient>
      
      <!-- Soft Vignette Overlay for Light Mode -->
      <radialGradient id="premium-vignette" cx="50%" cy="45%" r="70%">
        <stop offset="55%" stop-color="#f1f5f9" stop-opacity="0" />
        <stop offset="100%" stop-color="#f1f5f9" stop-opacity="0.9" />
      </radialGradient>
      
      <!-- Translucent Card Border Gradient -->
      <linearGradient id="card-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#475569" stop-opacity="0.15" />
        <stop offset="50%" stop-color="#64748b" stop-opacity="0.05" />
        <stop offset="100%" stop-color="#475569" stop-opacity="0.1" />
      </linearGradient>
      
      <!-- Horizontal Separator Line Gradient -->
      <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#94a3b8" stop-opacity="0" />
        <stop offset="50%" stop-color="#cbd5e1" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#94a3b8" stop-opacity="0" />
      </linearGradient>
      
      <!-- Soft Clean Shadow -->
      <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="15" flood-color="#0f172a" flood-opacity="0.15" />
      </filter>
      
      <!-- Radar Graph Area Gradient -->
      <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.4" />
      </radialGradient>
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
  }

  // 3. Inject typography, round corner paths, donut gaps, and custom styles into the <style> block
  const styleStart = svg.indexOf('<style>');
  if (styleStart !== -1) {
    const styleEnd = svg.indexOf('</style>');
    let css = svg.slice(styleStart + 7, styleEnd);

    // Remove any existing Google Font imports (including unescaped and duplicate imports)
    css = css.replace(/@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\);?\s*/g, '');

    // Prepend the clean Google Font (Outfit) import with escaped XML ampersand
    const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&amp;display=swap');\n`;
    css = fontImport + css;
    
    // Replace font-family inside rules cleanly
    css = css.replace(/font-family:\s*[^;\}]+;/g, "font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");

    // Only apply class overrides if not already applied
    if (!css.includes('stroke-linejoin: round')) {
      // Override background fill and stroke to use gradient
      css = css.replace(/\.fill-bg\s*\{\s*fill:[^;\}]+;\s*\}/g, `.fill-bg { fill: url(#premium-bg-gradient); }`);
      css = css.replace(/\.stroke-bg\s*\{\s*stroke:[^;\}]+;\s*\}/g, `.stroke-bg { stroke: transparent; }`);

      // Softer grids
      css = css.replace(/\.stroke-weak\s*\{\s*stroke:[^;\}]+;\s*\}/g, `.stroke-weak { stroke: ${isDark ? '#27272a' : '#cbd5e1'}; stroke-opacity: 0.4; }`);

      // Override radar graph visual appearance
      css = css.replace(/\.radar\s*\{\s*[^}]*\}/g, `
        .radar {
          stroke: ${isDark ? '#c084fc' : '#3b82f6'} !important;
          stroke-width: 2.5px !important;
          fill: url(#radar-gradient) !important;
          filter: drop-shadow(0 0 6px ${isDark ? 'rgba(192, 132, 252, 0.3)' : 'rgba(59, 130, 246, 0.2)'});
        }
      `);

      // Smooth path edges and shadows
      css += `
        path {
          stroke-linejoin: round;
          stroke-linecap: round;
          transition: filter 0.3s ease, transform 0.3s ease;
        }
        path[class*="cont-"]:hover, path[class*="rb-"]:hover {
          filter: brightness(1.2) drop-shadow(0 0 8px ${isDark ? 'rgba(139, 92, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)'}) !important;
        }
        /* Modern donut gap styling for pie chart slices */
        path:not([class*="cont-"]):not([class*="rb-"]):not(.radar) {
          stroke: url(#premium-bg-gradient) !important;
          stroke-width: 4px !important;
          stroke-linejoin: round !important;
          stroke-linecap: round !important;
        }
      `;
    }

    svg = svg.slice(0, styleStart + 7) + css + svg.slice(styleEnd);
  }

  // 4. Wrap elements in card rounded corners clip-path and apply drop-shadow to content
  // Note: Skip wrapping if already wrapped in clip path
  if (!svg.includes('clip-path="url(#card-clip)"')) {
    const bgRectRegex = /<rect[^>]+class="fill-bg"[^>]*>/;
    const bgMatch = svg.match(bgRectRegex);
    const svgEndIndex = svg.lastIndexOf('</svg>');
    
    if (bgMatch && svgEndIndex !== -1) {
      const bgIndex = bgMatch.index;
      const bgEndIndex = bgIndex + bgMatch[0].length;
      
      let bgRectStr = bgMatch[0];
      if (bgRectStr.endsWith('>')) {
        if (!bgRectStr.endsWith('/>')) {
          bgRectStr = bgRectStr.slice(0, -1) + ' />';
        }
      }
      
      let restOfContent = svg.slice(bgEndIndex, svgEndIndex);
      if (restOfContent.startsWith('</rect>')) {
        restOfContent = restOfContent.slice(7);
      }
      
      const wrappedContent = `
        <g clip-path="url(#card-clip)">
          ${bgRectStr}
          <!-- Shadow filter applied to contribution elements and charts -->
          <g filter="url(#premium-shadow)">
            ${restOfContent}
          </g>
          <!-- Soft Vignette Overlay to blend outer edges -->
          <rect width="${width}" height="${height}" fill="url(#premium-vignette)" pointer-events="none" />
        </g>
        
        <!-- Elegant Divider Line above stats -->
        <line x1="40" y1="778" x2="${width - 40}" y2="778" stroke="url(#line-gradient)" stroke-width="1.5" />
        
        <!-- High-End Dashboard Card Translucent Border Frame -->
        <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="22.5" ry="22.5" fill="none" stroke="url(#card-border-gradient)" stroke-width="3" pointer-events="none" />
      `;
      
      svg = svg.slice(0, bgIndex) + wrappedContent + svg.slice(svgEndIndex);
    }
  }

  fs.writeFileSync(filePath, svg, 'utf8');
  console.log(`Processed and enhanced ${file} successfully.`);
});
