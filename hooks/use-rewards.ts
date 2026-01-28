'use client'

import useSWR from 'swr'
import { getAvailableRewards, getUserRedemptions } from '@/app/actions/rewards-actions'

export function useRewards() {
    const { data, error, isLoading } = useSWR(
        'available-rewards',
        getAvailableRewards,
        {
            revalidateOnFocus: false, // Rewards catalog changes rarely
            dedupingInterval: 60000, // 1 min cache
        }
    )

    return {
        rewards: data || [],
        loading: isLoading,
        error
    }
}

export function useRedemptions() {
    const { data, error, isLoading, mutate } = useSWR(
        'user-redemptions',
        getUserRedemptions,
        {
            revalidateOnFocus: true,
        }
    )

    return {
        redemptions: data || [],
        loading: isLoading,
        error,
        mutate
    }
}
