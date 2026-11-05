// Subject wallpapers: faint line-drawn patterns shown behind a page while the
// student works on that subject. Drawn as SVG tiles in src/assets/wallpapers.
import biology from '../assets/wallpapers/biology.svg'
import business from '../assets/wallpapers/business.svg'
import chemistry from '../assets/wallpapers/chemistry.svg'
import economics from '../assets/wallpapers/economics.svg'
import english from '../assets/wallpapers/english.svg'
import pe from '../assets/wallpapers/pe.svg'
import physics from '../assets/wallpapers/physics.svg'

const BY_KEYWORD = [
  ['biology', biology],
  ['chemistry', chemistry],
  ['physics', physics],
  ['english', english],
  ['economics', economics],
  ['business', business],
  ['physical education', pe],
]

// Subject name (e.g. "English Literature") -> wallpaper URL, or null.
export function wallpaperFor(subjectName) {
  const name = (subjectName || '').toLowerCase()
  if (!name) return null
  const hit = BY_KEYWORD.find(([key]) => name.includes(key))
  return hit ? hit[1] : null
}
