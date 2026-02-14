'use client'

import useSWR from 'swr'
import { useState, useEffect } from 'react'
import { getNiceState, NiceState } from '@/app/actions/nice-actions'

export function useNiceTank() {
    const { data, error, isLoading, mutate, isValidating } = useSWR<NiceState>(
        'nice-tank-state', // Cache key
        getNiceState,      // Fetcher (Server Action)
        {
            revalidateOnFocus: true,    // Update when user comes back to app
            keepPreviousData: true,     // Show cached data while updating (Instant loading!)
            dedupingInterval: 10000,    // Don't re-fetch if we just fetched 10s ago
        }
    )

    // Force loading state when visibility changes (App Open / Resume)
    // We want to hide cached data and show skeleton if the user is "opening" the app
    // to ensure they see fresh data.
    const [forceLoading, setForceLoading] = useState(false)

    // Effect to handle app resume (visibility change)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // User came back to the app
                setForceLoading(true)
                mutate() // Trigger re-fetch
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [mutate])

    // Clear forceLoading when validation completes
    useEffect(() => {
        if (!isValidating && forceLoading) {
            // Add a small artificial delay to prevent flickering if fetch is too fast
            // or just unset immediately. Let's unset immediately for responsiveness, 
            // but ensuring we have data.
            setForceLoading(false)
        }
    }, [isValidating, forceLoading])

    // Also force loading on initial mount if we have no data? 
    // SWR handles initial load via isLoading.
    // We only want to override "keepPreviousData" behavior specifically on App Resume.

    return {
        niceState: data,
        // Show loading if:
        // 1. SWR is initially loading (no data)
        // 2. We are forcing loading due to app resume (even if we have cached data)
        loading: (isLoading && !data) || forceLoading,
        error,
        mutate
    }
}
