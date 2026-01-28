'use client'

import useSWR from 'swr'
import { getUserProfile } from '@/app/actions/user-actions'

export function useUserProfile() {
    const { data, error, isLoading, mutate } = useSWR(
        'user-profile',
        getUserProfile,
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }
    )

    return {
        profile: data,
        loading: isLoading && !data,
        error,
        mutate
    }
}
