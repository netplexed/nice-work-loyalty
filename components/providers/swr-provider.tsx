'use client'

import { SWRConfig } from 'swr'
import { useEffect, useState } from 'react'

export function SwrProvider({ children }: { children: React.ReactNode }) {
    // Only persist in browser
    const [provider, setProvider] = useState<any>()

    useEffect(() => {
        // Initialize from localStorage
        const map = new Map(JSON.parse(localStorage.getItem('app-cache') || '[]'))

        // Save to localStorage before unloading or hiding (better for mobile)
        const saveCache = () => {
            const appCache = JSON.stringify(Array.from(map.entries()))
            localStorage.setItem('app-cache', appCache)
        }

        window.addEventListener('beforeunload', saveCache)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) saveCache()
        })

        // Also save periodically or on visibility change could be good, but unload is simple for now.
        // Better: We can optimize by saving specific keys? No, let's keep it simple.

        // Wrap the map to sync on set
        // Actually, SWR expects a specific provider signature.
        setProvider(() => map)
    }, [])

    if (!provider) {
        // Render without hydration first or wait? 
        // If we wait, we block painting. 
        // If we render immediately with empty cache, then hydration kicks in.
        // Let's return children directly for SSR, but client side we wait for restore?
        // Actually for optimal UX:
        // 1. Initial render (empty cache)
        // 2. useEffect restores cache -> Re-render with data (Instant)
        return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    }

    return (
        <SWRConfig value={{
            provider: () => provider,
            revalidateOnFocus: true,
            revalidateOnReconnect: true
        }}>
            {children}
        </SWRConfig>
    )
}
