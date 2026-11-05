import { createContext, useContext, useEffect } from 'react'

// Lets a page set the subject wallpaper the shell shows behind it.
export const WallpaperContext = createContext(() => {})

// Call from a page with the subject being worked on (or null/undefined).
export function useSubjectWallpaper(subjectName) {
  const setSubject = useContext(WallpaperContext)
  useEffect(() => {
    setSubject(subjectName || null)
    return () => setSubject(null)
  }, [subjectName, setSubject])
}
