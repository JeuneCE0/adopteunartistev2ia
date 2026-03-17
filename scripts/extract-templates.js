#!/usr/bin/env node
/**
 * Extract HTML Templates Script
 *
 * Converts static HTML pages into EJS templates by extracting
 * shared sections (head, loader, navigation, chat, header, floaty bar, scripts)
 * into reusable partials.
 *
 * Usage: node scripts/extract-templates.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const VIEWS_DIR = path.join(__dirname, '../views');
const PARTIALS_DIR = path.join(VIEWS_DIR, 'partials');
const PAGES_DIR = path.join(VIEWS_DIR, 'pages');

// Ensure directories exist
[VIEWS_DIR, PARTIALS_DIR, PAGES_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Files to skip (not standard app pages)
const SKIP_FILES = ['index.html', 'logged-out-and-icons.html', '404.html'];

// Menu items and their corresponding page prefixes for active state detection
const MENU_ITEMS = [
  { id: 'newsfeed', href: 'newsfeed.html', pages: ['newsfeed'] },
  { id: 'overview', href: 'overview.html', pages: ['overview'] },
  { id: 'groups', href: 'groups.html', pages: ['groups', 'group-'] },
  { id: 'members', href: 'members.html', pages: ['members'] },
  { id: 'badges', href: 'badges.html', pages: ['badges'] },
  { id: 'quests', href: 'quests.html', pages: ['quests'] },
  { id: 'streams', href: 'streams.html', pages: ['streams'] },
  { id: 'events', href: 'events.html', pages: ['events'] },
  { id: 'forums', href: 'forums.html', pages: ['forums'] },
  { id: 'marketplace', href: 'marketplace.html', pages: ['marketplace'] },
];

/**
 * Detect active menu item based on filename
 */
function detectActivePage(filename) {
  const baseName = filename.replace('.html', '');
  for (const item of MENU_ITEMS) {
    for (const prefix of item.pages) {
      if (baseName === prefix || baseName.startsWith(prefix)) {
        return item.id;
      }
    }
  }
  // For hub-*, profile-*, admin pages
  if (baseName.startsWith('profile-')) return 'overview';
  if (baseName.startsWith('hub-store')) return 'marketplace';
  if (baseName.startsWith('hub-')) return 'overview';
  if (baseName === 'admin') return 'overview';
  return '';
}

/**
 * Extract sections from an HTML file using comment markers
 */
function extractSections(content) {
  const lines = content.split('\n');

  // Find key line indices
  let headEnd = -1;
  let pageLoaderStart = -1, pageLoaderEnd = -1;
  let contentStart = -1;
  let scriptsStart = -1;

  // Find the first <!-- CONTENT GRID --> or similar page content marker
  // Also find where scripts begin (first <script after content ends)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '</head>') headEnd = i;
    if (line === '<!-- PAGE LOADER -->') pageLoaderStart = i;
    if (line === '<!-- /PAGE LOADER -->') pageLoaderEnd = i;
  }

  // Find where the shared boilerplate ends and page content begins
  // This is after <!-- /FLOATY BAR --> or after <!-- /HEADER --> followed by floaty bar
  let floatyBarEnd = -1;
  let headerEnd = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '<!-- /FLOATY BAR -->' && floatyBarEnd === -1) {
      floatyBarEnd = i;
    }
    if (line === '<!-- /HEADER -->' && headerEnd === -1) {
      headerEnd = i;
    }
  }

  // Content starts after floaty bar (if present) or after header
  if (floatyBarEnd !== -1) {
    contentStart = floatyBarEnd + 1;
  } else if (headerEnd !== -1) {
    contentStart = headerEnd + 1;
  }

  // If we couldn't find content boundaries, this page has a different structure
  if (contentStart === -1) {
    return { headEnd, pageLoaderStart, pageLoaderEnd, contentStart: -1, scriptsStart: -1, totalLines: lines.length };
  }

  // Find where scripts begin - look for first <script after content area
  // Scripts section starts with <!-- app --> or first <script src= after content
  for (let i = contentStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '<!-- app -->' || (line.startsWith('<script src="js/utils/app.js"'))) {
      scriptsStart = i;
      break;
    }
  }

  // If we couldn't find the standard marker, look for the script block
  if (scriptsStart === -1) {
    for (let i = lines.length - 1; i >= contentStart; i--) {
      const line = lines[i].trim();
      if (line === '</body>' || line === '</html>') continue;
      if (line === '</script>') {
        // Walk backwards to find the start of script section
        for (let j = i; j >= contentStart; j--) {
          if (lines[j].trim().startsWith('<script src="js/utils/app.js"') ||
              lines[j].trim() === '<!-- app -->') {
            scriptsStart = j;
            break;
          }
        }
        break;
      }
    }
  }

  return {
    headEnd,
    pageLoaderStart,
    pageLoaderEnd,
    contentStart,
    scriptsStart,
    totalLines: lines.length
  };
}

/**
 * Extract the shared boilerplate from a reference file (forums.html)
 */
function extractSharedPartials(refFile) {
  const content = fs.readFileSync(path.join(PUBLIC_DIR, refFile), 'utf-8');
  const lines = content.split('\n');

  // Page loader: lines between <!-- PAGE LOADER --> and <!-- /PAGE LOADER -->
  let loaderLines = [];
  let inLoader = false;
  for (const line of lines) {
    if (line.trim() === '<!-- PAGE LOADER -->') { inLoader = true; }
    if (inLoader) loaderLines.push(line);
    if (line.trim() === '<!-- /PAGE LOADER -->') { inLoader = false; break; }
  }

  // Navigation widgets + chat + header + floaty bar
  // Everything between <!-- /PAGE LOADER --> and content start
  const sections = extractSections(content);

  // Shared body = from after page loader to content start
  // We need to make the active menu item dynamic
  const sharedBodyLines = lines.slice(sections.pageLoaderEnd + 1, sections.contentStart);

  // Common scripts footer
  // From scriptsStart to just before page-specific inline script
  let commonScriptLines = [];
  let pageScriptLines = [];
  let inPageScript = false;

  for (let i = sections.scriptsStart; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '</body>' || trimmed === '</html>') continue;

    // Page-specific scripts start at inline <script> blocks or page-specific API modules
    if (trimmed.startsWith('<script src="js/api/') ||
        trimmed.startsWith('<script src="js/utils/page-init.js"') ||
        (trimmed === '<script>' && !inPageScript)) {
      inPageScript = true;
    }

    if (!inPageScript) {
      commonScriptLines.push(line);
    } else {
      pageScriptLines.push(line);
    }
  }

  return {
    loader: loaderLines.join('\n'),
    sharedBody: sharedBodyLines.join('\n'),
    commonScripts: commonScriptLines.join('\n'),
  };
}

/**
 * Make navigation active state dynamic in EJS
 */
function makeNavDynamic(html) {
  // Replace hardcoded active menu items with EJS conditionals
  // Pattern: <li class="menu-item active"> before href="xxx.html"

  let result = html;

  for (const item of MENU_ITEMS) {
    // For the small nav: menu-item with text-tooltip
    const activePattern = new RegExp(
      `<li class="menu-item active">\\s*\\n\\s*<!-- MENU ITEM LINK -->\\s*\\n\\s*<a class="menu-item-link text-tooltip-tfr" href="${item.href.replace('.', '\\.')}"`,
      'g'
    );
    const inactivePattern = new RegExp(
      `<li class="menu-item">\\s*\\n\\s*<!-- MENU ITEM LINK -->\\s*\\n\\s*<a class="menu-item-link text-tooltip-tfr" href="${item.href.replace('.', '\\.')}"`,
      'g'
    );

    const replacement = `<li class="menu-item<%= activePage === '${item.id}' ? ' active' : '' %>">\n        <!-- MENU ITEM LINK -->\n        <a class="menu-item-link text-tooltip-tfr" href="${item.href}"`;

    result = result.replace(activePattern, replacement);
    result = result.replace(inactivePattern, replacement);

    // For the full nav and mobile nav: menu-item-link with text
    const activePatternFull = new RegExp(
      `<li class="menu-item active">\\s*\\n\\s*<!-- MENU ITEM LINK -->\\s*\\n\\s*<a class="menu-item-link" href="${item.href.replace('.', '\\.')}"`,
      'g'
    );
    const inactivePatternFull = new RegExp(
      `<li class="menu-item">\\s*\\n\\s*<!-- MENU ITEM LINK -->\\s*\\n\\s*<a class="menu-item-link" href="${item.href.replace('.', '\\.')}"`,
      'g'
    );

    const replacementFull = `<li class="menu-item<%= activePage === '${item.id}' ? ' active' : '' %>">\n        <!-- MENU ITEM LINK -->\n        <a class="menu-item-link" href="${item.href}"`;

    result = result.replace(activePatternFull, replacementFull);
    result = result.replace(inactivePatternFull, replacementFull);
  }

  return result;
}

/**
 * Extract page-specific info from an HTML file
 */
function extractPageInfo(filename) {
  const content = fs.readFileSync(path.join(PUBLIC_DIR, filename), 'utf-8');
  const lines = content.split('\n');

  // Extract title
  const titleMatch = content.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : 'Adopte un Artiste';

  // Detect extra CSS
  const extraCss = [];
  if (content.includes('tiny-slider.css')) extraCss.push('css/vendor/tiny-slider.css');

  // Detect active page
  const activePage = detectActivePage(filename);

  // Extract page content and scripts
  const sections = extractSections(content);

  if (sections.contentStart === -1 || sections.scriptsStart === -1) {
    console.warn(`  WARNING: Could not find content boundaries in ${filename}`);
    return null;
  }

  // Page content: between shared boilerplate end and scripts start
  // Skip empty lines at start/end
  const pageContentLines = lines.slice(sections.contentStart, sections.scriptsStart);

  // Page-specific scripts: from scriptsStart to end, minus common scripts and closing tags
  // We need the page-specific API modules and inline scripts
  let pageScripts = [];
  let foundPageInit = false;

  for (let i = sections.scriptsStart; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '</body>' || trimmed === '</html>') continue;

    // Skip common script includes that are in the shared partial
    if (trimmed.startsWith('<script src="js/utils/app.js"') ||
        trimmed.startsWith('<script src="js/utils/page-loader.js"') ||
        trimmed.startsWith('<script src="js/vendor/simplebar.min.js"') ||
        trimmed.startsWith('<script src="js/utils/liquidify.js"') ||
        trimmed.startsWith('<script src="js/vendor/xm_plugins.min.js"') ||
        trimmed.startsWith('<script src="js/global/global.hexagons.js"') ||
        trimmed.startsWith('<script src="js/global/global.tooltips.js"') ||
        trimmed.startsWith('<script src="js/header/header.js"') ||
        trimmed.startsWith('<script src="js/sidebar/sidebar.js"') ||
        trimmed.startsWith('<script src="js/content/content.js"') ||
        trimmed.startsWith('<script src="js/form/form.utils.js"') ||
        trimmed.startsWith('<script src="js/utils/svg-loader.js"') ||
        trimmed.startsWith('<!-- app -->') ||
        trimmed.startsWith('<!-- page loader -->') ||
        trimmed.startsWith('<!-- simplebar -->') ||
        trimmed.startsWith('<!-- liquidify -->') ||
        trimmed.startsWith('<!-- XM_Plugins -->') ||
        trimmed.startsWith('<!-- global.hexagons -->') ||
        trimmed.startsWith('<!-- global.tooltips -->') ||
        trimmed.startsWith('<!-- header -->') ||
        trimmed.startsWith('<!-- sidebar -->') ||
        trimmed.startsWith('<!-- content -->') ||
        trimmed.startsWith('<!-- form.utils -->') ||
        trimmed.startsWith('<!-- SVG icons -->')) {
      continue;
    }

    pageScripts.push(lines[i]);
  }

  // Clean up leading/trailing empty lines
  while (pageScripts.length && pageScripts[0].trim() === '') pageScripts.shift();
  while (pageScripts.length && pageScripts[pageScripts.length - 1].trim() === '') pageScripts.pop();

  while (pageContentLines.length && pageContentLines[0].trim() === '') pageContentLines.shift();
  while (pageContentLines.length && pageContentLines[pageContentLines.length - 1].trim() === '') pageContentLines.pop();

  return {
    title,
    activePage,
    extraCss,
    pageContent: pageContentLines.join('\n'),
    pageScripts: pageScripts.join('\n'),
  };
}

// ============ MAIN ============

console.log('=== HTML Template Extraction ===\n');

// Step 1: Extract shared partials from forums.html (simplest complete page)
console.log('Extracting shared partials from forums.html...');
const shared = extractSharedPartials('forums.html');

// Write head partial
const headPartial = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <!-- bootstrap 4.3.1 -->
  <link rel="stylesheet" href="css/vendor/bootstrap.min.css">
  <!-- styles -->
  <link rel="stylesheet" href="css/styles.min.css">
  <link rel="stylesheet" href="css/custom.css">
  <!-- simplebar styles -->
  <link rel="stylesheet" href="css/vendor/simplebar.css">
<% if (locals.extraCss && extraCss.length) { %>
<% extraCss.forEach(function(css) { %>
  <link rel="stylesheet" href="<%= css %>">
<% }); %>
<% } %>
  <!-- favicon -->
  <link rel="icon" href="img/favicon.ico">
  <title><%= title %></title>
</head>
<body>
`;
fs.writeFileSync(path.join(PARTIALS_DIR, 'head.ejs'), headPartial);
console.log('  Created partials/head.ejs');

// Write page loader partial
fs.writeFileSync(path.join(PARTIALS_DIR, 'page-loader.ejs'), shared.loader);
console.log('  Created partials/page-loader.ejs');

// Write shared body (nav + chat + header + floaty bar) with dynamic active state
const dynamicBody = makeNavDynamic(shared.sharedBody);
fs.writeFileSync(path.join(PARTIALS_DIR, 'layout-shell.ejs'), dynamicBody);
console.log('  Created partials/layout-shell.ejs');

// Write common scripts partial
const scriptsPartial = shared.commonScripts + '\n';
fs.writeFileSync(path.join(PARTIALS_DIR, 'scripts.ejs'), scriptsPartial);
console.log('  Created partials/scripts.ejs');

// Write closing tags partial
fs.writeFileSync(path.join(PARTIALS_DIR, 'footer.ejs'), '</body>\n</html>\n');
console.log('  Created partials/footer.ejs');

// Step 2: Convert each HTML page to an EJS template
console.log('\nConverting HTML pages to EJS templates...');

const htmlFiles = fs.readdirSync(PUBLIC_DIR)
  .filter(f => f.endsWith('.html'))
  .filter(f => !SKIP_FILES.includes(f));

let converted = 0;
let skipped = 0;

for (const file of htmlFiles) {
  process.stdout.write(`  Converting ${file}... `);

  const info = extractPageInfo(file);
  if (!info) {
    console.log('SKIPPED (could not parse)');
    skipped++;
    continue;
  }

  const pageName = file.replace('.html', '');

  // Create EJS template
  const template = `<%- include('../partials/head', { title: ${JSON.stringify(info.title)}, extraCss: ${JSON.stringify(info.extraCss)} }) %>

<%- include('../partials/page-loader') %>

<%- include('../partials/layout-shell', { activePage: ${JSON.stringify(info.activePage)} }) %>

${info.pageContent}

<%- include('../partials/scripts') %>
${info.pageScripts}
<%- include('../partials/footer') %>
`;

  fs.writeFileSync(path.join(PAGES_DIR, `${pageName}.ejs`), template);
  console.log(`OK (${info.pageContent.split('\n').length} content lines, ${info.pageScripts.split('\n').length} script lines)`);
  converted++;
}

console.log(`\n=== Done ===`);
console.log(`Converted: ${converted} pages`);
console.log(`Skipped: ${skipped} pages`);
console.log(`Partials created: 5 (head, page-loader, layout-shell, scripts, footer)`);

// Print size comparison
let totalOriginal = 0;
let totalTemplate = 0;
for (const file of htmlFiles) {
  const pageName = file.replace('.html', '');
  const templatePath = path.join(PAGES_DIR, `${pageName}.ejs`);
  if (fs.existsSync(templatePath)) {
    totalOriginal += fs.statSync(path.join(PUBLIC_DIR, file)).size;
    totalTemplate += fs.statSync(templatePath).size;
  }
}

const partialFiles = fs.readdirSync(PARTIALS_DIR);
let totalPartials = 0;
for (const f of partialFiles) {
  totalPartials += fs.statSync(path.join(PARTIALS_DIR, f)).size;
}

console.log(`\nSize comparison:`);
console.log(`  Original HTML files: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
console.log(`  EJS templates: ${(totalTemplate / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Partials: ${(totalPartials / 1024).toFixed(2)} KB`);
console.log(`  Total EJS: ${((totalTemplate + totalPartials) / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Reduction: ${(((totalOriginal - totalTemplate - totalPartials) / totalOriginal) * 100).toFixed(1)}%`);
