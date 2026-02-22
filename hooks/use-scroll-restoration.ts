'use client'

import { useEffect, useRef } from 'react'

/**
 * Hook to preserve scroll position across component mounting/unmounting.
 * @param key A unique key for this scroll context (e.g., 'home-scroll')
 */
export function useScrollRestoration(key: string) {
    const isRestoring = useRef(true)

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return

        const scrollKey = `scroll_pos_${key}`

        // Restore scroll position on mount
        const savedPosition = sessionStorage.getItem(scrollKey)
        if (savedPosition !== null) {
            window.scrollTo({
                top: parseInt(savedPosition, 10),
                behavior: 'instant'
            })
        }

        // Allow a small delay before we start recording new scrolls
        // to prevent recording the top (0) position before restoration completes
        const timer = setTimeout(() => {
            isRestoring.current = false
        }, 100)

        // Throttle scroll events to avoid performance issues
        let timeoutId: number | null = null

        const handleScroll = () => {
            if (isRestoring.current) return

            if (timeoutId === null) {
                timeoutId = window.setTimeout(() => {
                    sessionStorage.setItem(scrollKey, window.scrollY.toString())
                    timeoutId = null
                }, 100) // 100ms throttle
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            clearTimeout(timer)
            if (timeoutId !== null) clearTimeout(timeoutId)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [key])
}
