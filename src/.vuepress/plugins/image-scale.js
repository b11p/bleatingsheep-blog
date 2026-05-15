import path from 'path'
import fs from 'fs'
import { imageSize } from 'image-size'

const SCALE_RE = /-((?:\d|\.\d)\d*\.?\d*)x(?:\.[a-z]+|-)/

function parseScale(filename) {
  const m = filename.match(SCALE_RE)
  return m ? parseFloat(m[1]) : null
}

function resolveImagePath(src, pageFile) {
  if (!pageFile) return null
  const resolvedPath = path.resolve(path.dirname(pageFile), src)
  if (fs.existsSync(resolvedPath)) return resolvedPath
  return null
}

export function imageScalePlugin() {
  const metaMap = new Map() // original filename → { width, height }

  return {
    name: 'image-scale',

    extendsMarkdown: (md) => {
      const origRender = md.render.bind(md)
      md.render = function (src, env = {}) {
        const html = origRender(src, env)

        // Collect image metadata during rendering
        html.replace(/<img\s+[^>]*\/?>/gi, (match) => {
          const srcM = match.match(/src="([^"]*)"/)
          if (!srcM) return match

          const scale = parseScale(path.basename(srcM[1]))
          if (scale === null) return match

          const imgPath = resolveImagePath(srcM[1], env.filePath)
          if (!imgPath) return match

          try {
            const buf = fs.readFileSync(imgPath)
            const dims = imageSize(buf)
            metaMap.set(path.basename(srcM[1]), {
              width: dims.width / scale,
              height: dims.height / scale,
            })
          } catch (_) {}

          return match
        })

        return html
      }
    },

    onGenerated: async (app) => {
      const distDir = app.dir.dest()
      walkDir(distDir, metaMap)
    },
  }
}

function walkDir(dir, metaMap) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(fullPath, metaMap)
    } else if (entry.name.endsWith('.html')) {
      processHtmlFile(fullPath, metaMap)
    }
  }
}

function processHtmlFile(htmlPath, metaMap) {
  let html = fs.readFileSync(htmlPath, 'utf-8')
  let modified = false

  html = html.replace(/<img\s+[^>]*\/?>/gi, (match) => {
    const srcM = match.match(/src="([^"]*)"/)
    if (!srcM) return match

    const filename = path.basename(srcM[1])

    // Try exact match, then prefix match (handles hashed filenames)
    let meta = metaMap.get(filename)
    if (!meta) {
      for (const [key, val] of metaMap) {
        if (filename.startsWith(key.replace(/\.[a-z]+$/, ''))) {
          meta = val
          break
        }
      }
    }
    if (!meta) return match

    // Clean and rebuild the img tag with dimensions
    let attrs = match.replace(/^<img\s+/, '').replace(/\s*\/?>$/, '')
      .replace(/\s*(width|height)="[^"]*"/g, '')
      .replace(/\s*style="[^"]*"/, '')

    const w = meta.width.toFixed(2).replace(/\.?0+$/, '')
    const h = meta.height.toFixed(2).replace(/\.?0+$/, '')
    attrs += ` width="${Math.round(meta.width)}" height="${Math.round(meta.height)}"`
    attrs += ` style="width:${w}px; height:${h}px;"`

    modified = true
    return `<img ${attrs} />`
  })

  if (modified) {
    fs.writeFileSync(htmlPath, html)
  }
}
