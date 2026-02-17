'use client'

import useSWR from 'swr'
import { getActiveAnnouncements, Announcement } from '@/app/actions/announcement-actions'

export function useAnnouncements() {
    const { data, error, isLoading } = useSWR<Announcement[]>(
        'active-announcements',
        getActiveAnnouncements,
        {
            // This key is persisted in localStorage via SWR provider.
            // Always revalidate so admin edits/deletes are reflected after refresh.
            revalidateOnMount: true,
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            revalidateIfStale: true,
            dedupingInterval: 10000,
            keepPreviousData: true
        }
    )

    return {
        announcements: data || [],
        loading: isLoading,
        error
    }
}
