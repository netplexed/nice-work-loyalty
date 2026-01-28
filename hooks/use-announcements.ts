'use client'

import useSWR from 'swr'
import { getActiveAnnouncements, Announcement } from '@/app/actions/announcement-actions'

export function useAnnouncements() {
    const { data, error, isLoading } = useSWR<Announcement[]>(
        'active-announcements',
        getActiveAnnouncements,
        {
            revalidateOnFocus: false, // News doesn't change essential state, so less aggressive
            revalidateIfStale: false,
            dedupingInterval: 60000, // 1 minute cache
            keepPreviousData: true
        }
    )

    return {
        announcements: data || [],
        loading: isLoading,
        error
    }
}
