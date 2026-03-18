import { useState, useEffect } from 'react'

export function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      if (scrollY + windowHeight >= docHeight - 10) {
        setActiveSection(sectionIds[sectionIds.length - 1])
        return
      }

      let currentSection = ''
      let smallestDistance = Infinity

      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const distance = Math.abs(rect.top - windowHeight * 0.2)
        if (rect.top <= windowHeight * 0.35 && distance < smallestDistance) {
          smallestDistance = distance
          currentSection = id
        }
      }

      setActiveSection(currentSection)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sectionIds])

  return activeSection
}
