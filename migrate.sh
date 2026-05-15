#!/bin/bash
# Migration script: Hexo → VuePress 2 + Plume
set -e

OLD_BLOG="/home/ymy/source/repos/bleatingsheep-blog"
NEW_SRC="/home/ymy/source/repos/blog-migration/bleatingsheep-blog-next/src"

# 1. Migrate posts
POSTS_SRC="$OLD_BLOG/source/_posts"
POSTS_DST="$NEW_SRC/posts"

for md in "$POSTS_SRC"/*.md; do
    filename=$(basename "$md")
    basename_noext="${filename%.md}"

    # Extract date from frontmatter
    date=$(grep -oP '^date:\s*\K.*' "$md" | head -1 | tr -d ' ')
    if [ -z "$date" ]; then
        echo "WARNING: No date found in $filename, skipping"
        continue
    fi

    # Parse date components - format: YYYY-MM-DD HH:MM:SS
    year=$(echo "$date" | cut -d'-' -f1)
    month=$(echo "$date" | cut -d'-' -f2)
    day=$(echo "$date" | cut -d'-' -f3 | cut -d' ' -f1)

    # Create post directory matching URL path
    post_dir="$POSTS_DST/$basename_noext"
    mkdir -p "$post_dir"

    # Generate new frontmatter with permalink
    permalink="/$year/$month/$day/$basename_noext/"

    # Copy and transform the markdown file
    # Add permalink to frontmatter, keep other fields
    python3 -c "
import sys
content = open('$md', 'r').read()

# Find frontmatter boundaries
if content.startswith('---'):
    end = content.find('---', 3)
    if end != -1:
        fm = content[3:end].strip()
        body = content[end+3:]

        # Check if permalink already exists
        has_permalink = False
        new_fm_lines = []
        for line in fm.split('\n'):
            if line.startswith('permalink:'):
                new_fm_lines.append('permalink: $permalink')
                has_permalink = True
            else:
                new_fm_lines.append(line)

        if not has_permalink:
            # Insert permalink after title
            insert_idx = 0
            for i, line in enumerate(new_fm_lines):
                if line.startswith('title:'):
                    insert_idx = i + 1
                    break
            new_fm_lines.insert(insert_idx, 'permalink: $permalink')

        new_content = '---\n' + '\n'.join(new_fm_lines) + '\n---' + body
        open('$post_dir/index.md', 'w').write(new_content)
        print('OK: $filename')
else:
    print('SKIP: $filename (no frontmatter)')
"

    # Copy assets if post asset folder exists
    if [ -d "$POSTS_SRC/$basename_noext" ]; then
        for asset in "$POSTS_SRC/$basename_noext"/*; do
            asset_name=$(basename "$asset")
            if [ ! -f "$post_dir/$asset_name" ]; then
                cp "$asset" "$post_dir/"
            fi
        done
        echo "  Assets copied for $basename_noext"
    fi
done

echo "=== Posts migration complete ==="

# 2. Migrate special pages
# About page
mkdir -p "$NEW_SRC/about"
cp "$OLD_BLOG/source/about/index.md" "$NEW_SRC/about/index.md"

# Wiki page
mkdir -p "$NEW_SRC/wiki"
cp "$OLD_BLOG/source/wiki/index.md" "$NEW_SRC/wiki/index.md"

# Copy favicon
cp "$OLD_BLOG/source/favicon.ico" "$NEW_SRC/.vuepress/public/" 2>/dev/null || mkdir -p "$NEW_SRC/.vuepress/public" && cp "$OLD_BLOG/source/favicon.ico" "$NEW_SRC/.vuepress/public/"

echo "=== Special pages + favicon migrated ==="
echo "=== Migration done ==="
