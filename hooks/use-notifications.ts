'use client'

import useSWR from 'swr'
import { getUserNotifications } from '@/app/actions/messaging-actions'

export function useNotifications() {
    const { data, error, isLoading, mutate } = useSWR(
        'user-notifications',
        getUserNotifications,
        {
            revalidateOnFocus: true,
            refreshInterval: 30000, // Poll every 30s to check for new alerts? Or just relying on focus.
        }
    )

    return {
        notifications: data || [],
        loading: isLoading,
        error,
        mutate
    }
}
