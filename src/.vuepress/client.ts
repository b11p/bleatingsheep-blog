import { defineClientConfig } from 'vuepress/client'
import type { App } from 'vue'

const SCALE_RE = /-((?:\d|\.\d)\d*\.?\d*)x(?:[-.]|$)/i

function parseScale(filename: string): number | null {
  const m = filename.match(SCALE_RE)
  return m ? parseFloat(m[1]) : null
}

function applyImageScales() {
  document.querySelectorAll<HTMLImageElement>('img:not([data-scaled])').forEach((img) => {
    // Skip images inside PhotoSwipe lightbox
    if (img.closest('.pswp')) return
    img.dataset.scaled = '1'
    const filename = img.src.split('/').pop() || ''
    const scale = parseScale(filename)
    if (!scale) return

    const setDims = () => {
      if (!img.naturalWidth) return
      const w = img.naturalWidth / scale
      // Only set width — let browser derive height from aspect ratio.
      // This avoids distorting the image when the container is narrower
      // and prevents PhotoSwipe from using the scaled dimensions in the lightbox.
      img.style.width = `${w}px`
      img.style.height = 'auto'
      img.style.maxWidth = '100%'
    }

    setDims()
    img.addEventListener('load', setDims, { once: true })
  })
}

export default defineClientConfig({
  enhance({ app }: { app: App }) {
    if (typeof window === 'undefined') return

    app.mixin({
      mounted() {
        applyImageScales()
        new MutationObserver(applyImageScales).observe(document.body, {
          childList: true,
          subtree: true,
        })
      },
    })
  },
})
