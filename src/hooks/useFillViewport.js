import { useLayoutEffect } from 'react'

// Sizes an element to fill the visible viewport below its top edge, leaving
// room for the phone tab bar. Follows window.visualViewport, so when the
// on-screen keyboard opens the element shrinks and its bottom (the chat
// composer) stays above the keyboard. Layout only.
export function useFillViewport(ref, enabled = true) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const vv = window.visualViewport

    function update() {
      const viewportHeight = vv ? vv.height : window.innerHeight
      const keyboardOpen = vv ? window.innerHeight - vv.height > 150 : false
      const tabbar = document.querySelector('[data-tabbar]')
      const tabbarHeight = tabbar && !keyboardOpen && getComputedStyle(tabbar).display !== 'none'
        ? tabbar.getBoundingClientRect().height
        : 0
      const top = el.getBoundingClientRect().top + window.scrollY
      const offsetTop = vv ? vv.offsetTop : 0
      const height = Math.max(240, viewportHeight + offsetTop - top - tabbarHeight)
      el.style.height = `${height}px`
    }

    update()
    window.addEventListener('resize', update)
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      el.style.height = ''
    }
  }, [ref, enabled])
}
