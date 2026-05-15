#!/usr/bin/env node
// Migrate Hexo posts to VuePress 2 + Plume format
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const OLD_POSTS = '/home/ymy/source/repos/bleatingsheep-blog/source/_posts';
const NEW_SRC = '/home/ymy/source/repos/blog-migration/bleatingsheep-blog-next/src';
const POSTS_DST = path.join(NEW_SRC, 'posts');

// Build a map from post title to permalink
function buildPermalinkMap() {
    const map = {};
    const files = fs.readdirSync(OLD_POSTS).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const content = fs.readFileSync(path.join(OLD_POSTS, file), 'utf-8');
        if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) continue;
        const end = content.indexOf('\n---', 3);
        if (end === -1) continue;
        const fmText = content.substring(4, end);
        const fm = yaml.load(fmText);
        if (!fm || !fm.title || !fm.date) continue;
        const basename = file.replace(/\.md$/, '');
        const dateStr = typeof fm.date === 'object' && fm.date instanceof Date
            ? fm.date.toISOString().replace('T', ' ').substring(0, 19)
            : String(fm.date);
        const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) {
            console.log(`  Map WARNING: unparseable date for "${fm.title}": ${dateStr}`);
            continue;
        }
        const permalink = `/${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}/${basename}/`;
        map[fm.title] = permalink;
        // Also map by basename (for post_link references that use the filename)
        map[basename] = permalink;
        // Map without file extension suffix for common patterns
        map[fm.title.replace(/ /g, '-')] = permalink;
    }
    return map;
}

function parseFrontmatter(content) {
    if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) return null;
    const end = content.indexOf('\n---', 3);
    if (end === -1) return null;
    const fmText = content.substring(4, end);
    const body = content.substring(end + 4);
    const fm = yaml.load(fmText);
    return { fm, body };
}

function convertHexoTags(body, permalinkMap) {
    // Convert {% asset_img "file name.png" %} → ![](./file name.png)
    body = body.replace(/\{%\s*asset_img\s+"([^"]+)"\s*%\}/g, '![](./$1)');

    // Convert {% asset_img "file.png" "caption" %} → ![caption](./file.png)
    body = body.replace(/\{%\s*asset_img\s+"([^"]+)"\s+"([^"]+)"\s*%\}/g, '![$2](./$1)');

    // Convert {% asset_img file.png caption text %} → ![caption text](./file.png)
    // (caption is unquoted text after filename)
    body = body.replace(/\{%\s*asset_img\s+(\S+)\s+([^%]+?)\s*%\}/g, '![$2](./$1)');

    // Convert {% asset_img file.png %} → ![](./file.png)
    body = body.replace(/\{%\s*asset_img\s+(\S+)\s*%\}/g, '![](./$1)');

    // Convert {% post_link "title" %} → [title](permalink)
    body = body.replace(/\{%\s*post_link\s+"([^"]+)"\s*%\}/g, (match, title) => {
        const permalink = permalinkMap[title];
        if (permalink) {
            return `[${title}](${permalink})`;
        }
        // Try fuzzy match
        for (const key of Object.keys(permalinkMap)) {
            if (key.includes(title) || title.includes(key)) {
                return `[${title}](${permalinkMap[key]})`;
            }
        }
        console.log(`  WARNING: post_link target not found: "${title}"`);
        return match;
    });

    // Convert {% post_link "title" "display" %} → [display](permalink)
    body = body.replace(/\{%\s*post_link\s+"([^"]+)"\s+"([^"]+)"\s*%\}/g, (match, title, display) => {
        const permalink = permalinkMap[title];
        if (permalink) {
            return `[${display}](${permalink})`;
        }
        for (const key of Object.keys(permalinkMap)) {
            if (key.includes(title) || title.includes(key)) {
                return `[${display}](${permalinkMap[key]})`;
            }
        }
        console.log(`  WARNING: post_link target not found: "${title}"`);
        return match;
    });

    // Fix <img> tags with unquoted width/height attributes
    body = body.replace(/<img\s+([^>]+)>/g, (match, attrs) => {
        // Add quotes to unquoted width/height values
        attrs = attrs.replace(/\b(width|height)=(\d+)([^\w"'=]|$)/g, '$1="$2"$3');
        attrs = attrs.replace(/\b(width|height)=(\d+)$/g, '$1="$2"');
        // Add ./ prefix to src if it's a plain filename reference (no path, no URL)
        attrs = attrs.replace(/src="(?!\/|https?:\/\/|\.+\/)([^"]+)"/g, 'src="./$1"');
        // Ensure self-closing tag is proper: <img ... /> not <img ... />
        if (!attrs.endsWith('/') && !attrs.endsWith('/ ')) {
            attrs = attrs + ' /';
        }
        return `<img ${attrs}>`;
    });

    return body;
}

function migratePost(mdFile, permalinkMap) {
    const filename = path.basename(mdFile);
    const basename = filename.replace(/\.md$/, '');
    const content = fs.readFileSync(mdFile, 'utf-8');
    const parsed = parseFrontmatter(content);

    if (!parsed) {
        console.log(`SKIP: ${filename} (no valid frontmatter)`);
        return;
    }

    const { fm, body } = parsed;
    if (!fm.date) {
        console.log(`SKIP: ${filename} (no date)`);
        return;
    }

    const dateStr = typeof fm.date === 'object' && fm.date instanceof Date
        ? fm.date.toISOString().replace('T', ' ').substring(0, 19)
        : String(fm.date);

    const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
        console.log(`SKIP: ${filename} (unparseable date: ${dateStr})`);
        return;
    }

    const year = dateMatch[1], month = dateMatch[2], day = dateMatch[3];
    const permalink = `/${year}/${month}/${day}/${basename}/`;

    // Build new frontmatter
    const newFm = {};
    newFm.title = fm.title || basename;
    newFm.permalink = permalink;
    newFm.createTime = dateStr;
    if (fm.lang) newFm.lang = fm.lang;

    // Handle tags: could be string, array, or missing
    if (fm.tags) {
        if (Array.isArray(fm.tags)) {
            newFm.tags = fm.tags;
        } else if (typeof fm.tags === 'string') {
            newFm.tags = fm.tags.split(',').map(t => t.trim()).filter(Boolean);
        }
    }

    // Convert Hexo tags to standard Markdown
    const convertedBody = convertHexoTags(body, permalinkMap)
        // Remove old theme-specific script tags that won't work in VuePress
        .replace(/<script\s+src="\/scripts\/image-scale\.js"><\/script>\n?/g, '');

    const newContent = '---\n' + yaml.dump(newFm, { lineWidth: -1 }) + '---\n' + convertedBody;

    // Create post directory and write
    const postDir = path.join(POSTS_DST, basename);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.md'), newContent);

    // Copy assets
    const assetDir = path.join(OLD_POSTS, basename);
    if (fs.existsSync(assetDir) && fs.statSync(assetDir).isDirectory()) {
        for (const asset of fs.readdirSync(assetDir)) {
            const src = path.join(assetDir, asset);
            const dst = path.join(postDir, asset);
            if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
            }
        }
    }

    console.log(`OK: ${filename} → ${permalink}`);
}

// Main
fs.rmSync(POSTS_DST, { recursive: true, force: true });
fs.mkdirSync(POSTS_DST, { recursive: true });

// Build permalink map for converting post_link tags
const permalinkMap = buildPermalinkMap();

const files = fs.readdirSync(OLD_POSTS).filter(f => f.endsWith('.md'));
for (const file of files) {
    migratePost(path.join(OLD_POSTS, file), permalinkMap);
}

// Special pages
const aboutSrc = '/home/ymy/source/repos/bleatingsheep-blog/source/about/index.md';
const aboutDst = path.join(NEW_SRC, 'about');
fs.mkdirSync(aboutDst, { recursive: true });
fs.copyFileSync(aboutSrc, path.join(aboutDst, 'index.md'));

const wikiSrc = '/home/ymy/source/repos/bleatingsheep-blog/source/wiki/index.md';
const wikiDst = path.join(NEW_SRC, 'wiki');
fs.mkdirSync(wikiDst, { recursive: true });
fs.copyFileSync(wikiSrc, path.join(wikiDst, 'index.md'));

// Favicon
const publicDir = path.join(NEW_SRC, '.vuepress', 'public');
fs.mkdirSync(publicDir, { recursive: true });
const faviconSrc = '/home/ymy/source/repos/bleatingsheep-blog/source/favicon.ico';
if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(publicDir, 'favicon.ico'));
}

console.log(`\nDone! Migrated ${files.length} posts + about + wiki.`);
