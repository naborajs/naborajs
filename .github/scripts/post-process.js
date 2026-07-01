const fs = require('fs');
const path = require('path');

const dirPath = path.join(process.cwd(), 'profile-3d-contrib');

if (!fs.existsSync(dirPath)) {
  console.log(`Directory ${dirPath} does not exist. Skipping post-processing.`);
  process.exit(0);
}

const force = process.argv.includes('--force');
const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.svg'));
console.log(`Found ${files.length} SVG files to process.`);

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  let svg = fs.readFileSync(filePath, 'utf8');

  // Skip if already processed, UNLESS --force or broken ampersand detected
  const hasUnescapedAmp = svg.includes('&display=swap');
  if (!force && (svg.includes('id="card-clip"') || svg.includes('premium-bg-gradient')) && !hasUnescapedAmp) {
    console.log(`File ${file} already processed. Skipping. (use --force to override)`);
    return;
  }

  if (hasUnescapedAmp) {
    console.log(`File ${file} has unescaped ampersand. Repairing...`);
  }

  // Detect dark theme variants
  const isDark = file.includes('night') || file.includes('dark') || file.includes('rainbow') || file.includes('black') || file.includes('gitblock');

  // Extract canvas dimensions
  const widthMatch = svg.match(/<svg[^>]+width="(\d+)"/);
  const heightMatch = svg.match(/<svg[^>]+height="(\d+)"/);
  const width = widthMatch ? parseInt(widthMatch[1]) : 1280;
  const height = heightMatch ? parseInt(heightMatch[1]) : 850;

  // ──────────────────────────────────────────────────────────────
  // 0. FORCE MODE: Strip all previously-injected custom elements
  //    so the script can re-apply them cleanly without duplication
  // ──────────────────────────────────────────────────────────────
  if (force) {
    // Remove custom defs content (card-clip through watermark-gradient)
    svg = svg.replace(/\s*<!-- Card Clip Path[\s\S]*?<\/linearGradient>\s*/g, '');
    // Remove watermark group
    svg = svg.replace(/\s*<!-- 3D Perspective Watermark Text -->[\s\S]*?<\/g>\s*(?=<!-- Shadow)/g, '');
    // Remove vignette overlay rect
    svg = svg.replace(/\s*<!-- Soft Vignette Overlay[\s\S]*?pointer-events="none" \/>\s*/g, '');
    // Remove divider line
    svg = svg.replace(/\s*<!-- Elegant Divider Line[\s\S]*?stroke-width="1\.5" \/>\s*/g, '');
    // Remove border frame
    svg = svg.replace(/\s*<!-- High-End Dashboard[\s\S]*?pointer-events="none" \/>\s*/g, '');
    // Remove clip-path wrapper opening <g clip-path=...>
    svg = svg.replace(/\s*<g clip-path="url\(#card-clip\)">\s*/g, '');
    // Remove shadow filter wrapper opening <g filter=...> and its comment
    svg = svg.replace(/\s*<!-- Shadow filter[\s\S]*?<g filter="url\(#premium-shadow\)">\s*/g, '');
    // Remove closing </g> tags from the wrappers (the last 3 before </svg>)
    // Be careful - just remove the extra </g> tags we added
    const svgEnd = svg.lastIndexOf('</svg>');
    const beforeEnd = svg.slice(0, svgEnd);
    // Count and remove our 3 wrapper closing tags
    let cleaned = beforeEnd.replace(/\s*<\/g>\s*<\/g>\s*$/, '');
    svg = cleaned + svg.slice(svgEnd);
    // Remove injected "stars" and "forks" labels
    svg = svg.replace(/<text[^>]*>stars<\/text>/g, '');
    svg = svg.replace(/<text[^>]*>forks<\/text>/g, '');
    // Remove custom CSS path rules we appended
    svg = svg.replace(/\s*path\s*\{[\s\S]*?stroke-linecap:\s*round;\s*\}[\s\S]*?stroke-linecap:\s*round !important;\s*\}\s*/g, '');
    // Remove anti-aliasing attributes so they can be cleanly re-added
    svg = svg.replace(/ shape-rendering="geometricPrecision" text-rendering="geometricPrecision"/g, '');
    console.log(`  Stripped existing enhancements from ${file} for clean re-apply.`);
  }

  // ──────────────────────────────────────────────────────────────
  // 1. Anti-aliasing on the root <svg> element
  // ──────────────────────────────────────────────────────────────
  if (!svg.includes('shape-rendering')) {
    svg = svg.replace('<svg', '<svg shape-rendering="geometricPrecision" text-rendering="geometricPrecision"');
  }

  // ──────────────────────────────────────────────────────────────
  // 2. Inject <defs>: gradients, filters, clip-paths
  // ──────────────────────────────────────────────────────────────
  if (!svg.includes('id="card-clip"') || force) {
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

      <!-- Soft Vignette Overlay -->
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

      <!-- Background Watermark Text Gradient -->
      <linearGradient id="watermark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#818cf8" stop-opacity="0.06" />
        <stop offset="50%" stop-color="#c084fc" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0.06" />
      </linearGradient>
      `;
    } else {
      defsContent = `
      <clipPath id="card-clip">
        <rect x="0" y="0" width="${width}" height="${height}" rx="24" ry="24" />
      </clipPath>
      <radialGradient id="premium-bg-gradient" cx="50%" cy="45%" r="80%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="60%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#f1f5f9" />
      </radialGradient>
      <radialGradient id="premium-vignette" cx="50%" cy="45%" r="70%">
        <stop offset="55%" stop-color="#f1f5f9" stop-opacity="0" />
        <stop offset="100%" stop-color="#f1f5f9" stop-opacity="0.9" />
      </radialGradient>
      <linearGradient id="card-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#475569" stop-opacity="0.15" />
        <stop offset="50%" stop-color="#64748b" stop-opacity="0.05" />
        <stop offset="100%" stop-color="#475569" stop-opacity="0.1" />
      </linearGradient>
      <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#94a3b8" stop-opacity="0" />
        <stop offset="50%" stop-color="#cbd5e1" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#94a3b8" stop-opacity="0" />
      </linearGradient>
      <filter id="premium-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="15" flood-color="#0f172a" flood-opacity="0.15" />
      </filter>
      <radialGradient id="radar-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.1" />
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.4" />
      </radialGradient>
      <linearGradient id="watermark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.04" />
        <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.03" />
      </linearGradient>
      `;
    }

    if (defsStart !== -1) {
      svg = svg.slice(0, defsStart + 6) + defsContent + svg.slice(defsStart + 6);
    } else {
      const styleEnd = svg.indexOf('</style>');
      if (styleEnd !== -1) {
        svg = svg.slice(0, styleEnd + 8) + `<defs>${defsContent}</defs>` + svg.slice(styleEnd + 8);
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 3. CSS overrides: typography, colors, grid lines, radar
  // ──────────────────────────────────────────────────────────────
  const styleStart = svg.indexOf('<style>');
  if (styleStart !== -1) {
    const styleEnd = svg.indexOf('</style>');
    let css = svg.slice(styleStart + 7, styleEnd);

    // Clean up any duplicate/unescaped Google Font imports
    css = css.replace(/@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\);?\s*/g, '');

    // Prepend clean XML-safe font import
    const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&amp;display=swap');\n`;
    css = fontImport + css;

    // Override all font-family declarations
    css = css.replace(/font-family:\s*[^;\}]+;/g, "font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;");

    // Override fill-bg, stroke-bg, stroke-weak with broad curly-brace matching
    css = css.replace(/\.fill-bg\s*\{[^}]*\}/g, `.fill-bg { fill: url(#premium-bg-gradient); }`);
    css = css.replace(/\.stroke-bg\s*\{[^}]*\}/g, `.stroke-bg { stroke: transparent; }`);
    css = css.replace(/\.stroke-weak\s*\{[^}]*\}/g, `.stroke-weak { stroke: ${isDark ? '#fde047' : '#cbd5e1'}; stroke-opacity: 0.65; }`);

    // Override radar graph styling
    css = css.replace(/\.radar\s*\{[^}]*\}/g, `
      .radar {
        stroke: ${isDark ? '#c084fc' : '#3b82f6'} !important;
        stroke-width: 2.5px !important;
        fill: url(#radar-gradient) !important;
        filter: drop-shadow(0 0 6px ${isDark ? 'rgba(192, 132, 252, 0.3)' : 'rgba(59, 130, 246, 0.2)'});
      }
    `);

    // Append path smoothing + donut gaps (only once)
    if (!css.includes('stroke-linejoin: round') || force) {
      css += `
        path {
          stroke-linejoin: round;
          stroke-linecap: round;
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

  // ──────────────────────────────────────────────────────────────
  // 4. Add descriptive labels to the stat numbers at the bottom
  //    The generator outputs:  <number> contributions  ★<number>  ⑂<number>
  //    but stars and forks have no text label — just an icon.
  //    We inject "stars" after the stars number and "forks" after the forks number.
  // ──────────────────────────────────────────────────────────────

  // Match the stars number: <text ...>NUMBER<title>NUMBER</title></text>  followed by a <g transform> with the fork icon
  // Stars: the number appears between the "contributions" text and the fork icon group
  // Pattern: >NUMBER<title>NUMBER</title></text><g transform="translate(FORKX
  svg = svg.replace(
    /(<text[^>]+class="fill-fg">(\d+)<title>\2<\/title><\/text>)(<g transform="translate\(\d+, 802\), scale\(2\)"><path fill-rule="evenodd" d="M5 3\.25)/g,
    (match, textEl, num, forkGroup) => {
      // Extract the x position from the text element
      const xMatch = textEl.match(/x="(\d+)"/);
      const x = xMatch ? parseInt(xMatch[1]) : 650;
      const labelX = x + (num.length * 18) + 8;
      const label = `<text style="font-size: 14px; opacity: 0.6;" x="${labelX}" y="832" text-anchor="start" class="fill-fg">stars</text>`;
      return textEl + label + forkGroup;
    }
  );

  // Forks: the last number before the date text
  svg = svg.replace(
    /(<text[^>]+class="fill-fg">(\d+)<title>\2<\/title><\/text>)(<text style="font-size: 16px;" x="\d+" y="\d+" dominant-baseline="hanging")/g,
    (match, textEl, num, dateText) => {
      const xMatch = textEl.match(/x="(\d+)"/);
      const x = xMatch ? parseInt(xMatch[1]) : 772;
      const labelX = x + (num.length * 18) + 8;
      const label = `<text style="font-size: 14px; opacity: 0.6;" x="${labelX}" y="832" text-anchor="start" class="fill-fg">forks</text>`;
      return textEl + label + dateText;
    }
  );

  // ──────────────────────────────────────────────────────────────
  // 5. Wrap all content in a rounded card clip-path with shadow,
  //    add a 3D watermark text, divider line, and border frame
  // ──────────────────────────────────────────────────────────────
  if (!svg.includes('clip-path="url(#card-clip)"') || force) {
    const bgRectRegex = /<rect[^>]+class="fill-bg"[^>]*>/;
    const bgMatch = svg.match(bgRectRegex);
    const svgEndIndex = svg.lastIndexOf('</svg>');

    if (bgMatch && svgEndIndex !== -1) {
      const bgIndex = bgMatch.index;
      const bgEndIndex = bgIndex + bgMatch[0].length;

      // Self-close the background rect if needed
      let bgRectStr = bgMatch[0];
      if (bgRectStr.endsWith('>') && !bgRectStr.endsWith('/>')) {
        bgRectStr = bgRectStr.slice(0, -1) + ' />';
      }

      // Strip orphaned </rect> from content
      let restOfContent = svg.slice(bgEndIndex, svgEndIndex);
      if (restOfContent.startsWith('</rect>')) {
        restOfContent = restOfContent.slice(7);
      }

      // Build the 3D watermark text (large, semi-transparent, rotated for depth)
      const watermarkColor = isDark ? 'fill="url(#watermark-gradient)"' : 'fill="url(#watermark-gradient)"';
      const watermark = `
        <!-- 3D Perspective Watermark Text -->
        <g transform="translate(${width / 2}, ${height / 2 - 40}) rotate(-12) skewX(-5)">
          <text x="0" y="0" text-anchor="middle" style="font-size: 120px; font-weight: 700; letter-spacing: 12px;" ${watermarkColor} pointer-events="none">NABORAJ</text>
          <text x="0" y="60" text-anchor="middle" style="font-size: 28px; font-weight: 400; letter-spacing: 8px;" ${watermarkColor} pointer-events="none">FULL STACK DEVELOPER</text>
        </g>
      `;

      const wrappedContent = `
        <g clip-path="url(#card-clip)">
          ${bgRectStr}
          ${watermark}
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
