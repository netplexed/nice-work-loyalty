'use client'

import useSWR from 'swr'
import { getNiceState, NiceState } from '@/app/actions/nice-actions'

export function useNiceTank() {
    const { data, error, isLoading, mutate } = useSWR<NiceState>(
        'nice-tank-state', // Cache key
        getNiceState,      // Fetcher (Server Action)
        {
            revalidateOnFocus: true,    // Update when user comes back to app
            keepPreviousData: true,     // Show cached data while updating (Instant loading!)
            dedupingInterval: 10000,    // Don't re-fetch if we just fetched 10s ago
        }
    )

    return {
        niceState: data,
        loading: isLoading && !data, // Only "loading" if we have NO data at all
        error,
        mutate
    }
}
