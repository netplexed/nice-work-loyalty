'use client'

import { SWRConfig } from 'swr'
import { useEffect, useState } from 'react'

export function SwrProvider({ children }: { children: React.ReactNode }) {
    const [provider] = useState(() => {
        // Initialize Map
        const map = new Map()

        // If on client, try to hydrate from storage immediately
        if (typeof window !== 'undefined') {
            try {
                const json = localStorage.getItem('app-cache')
                if (json) {
                    const parsed = JSON.parse(json)
                    parsed.forEach(([key, value]: [string, any]) => {
                        map.set(key, value)
                    })
                }
            } catch (e) {
                console.error('Failed to load cache', e)
            }

            // Setup persistence on cache updates
            // We hook into the map's set/delete methods
            const originalSet = map.set.bind(map)
            const originalDelete = map.delete.bind(map)
            const originalClear = map.clear.bind(map)

            let saveTimeout: NodeJS.Timeout

            const debouncedSave = () => {
                clearTimeout(saveTimeout)
                saveTimeout = setTimeout(() => {
                    try {
                        const appCache = JSON.stringify(Array.from(map.entries()))
                        localStorage.setItem('app-cache', appCache)
                    } catch (e) {
                        console.warn('Cache save failed (quota?)', e)
                    }
                }, 1000) // Save 1s after last write
            }

            map.set = (key: any, value: any) => {
                const res = originalSet(key, value)
                debouncedSave()
                return res
            }

            map.delete = (key: any) => {
                const res = originalDelete(key)
                debouncedSave()
                return res
            }

            map.clear = () => {
                originalClear()
                debouncedSave()
            }
        }

        return map
    })

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
