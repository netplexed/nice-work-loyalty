'use client'

import useSWR from 'swr'
import { getSpinConfig, getUserSpinStatus, SpinPrize } from '@/app/actions/spin-actions'

export function useSpinWheel() {
    // Cache prizes for a long time (e.g., 1 hour) as they change rarely
    const { data: prizes, error: configError, isLoading: configLoading } = useSWR<SpinPrize[]>(
        'spin-config',
        getSpinConfig,
        {
            revalidateOnFocus: false,
            dedupingInterval: 3600000, // 1 hour
            keepPreviousData: true
        }
    )

    // Cache user status, revalidate more often but keep existing data
    const { data: status, error: statusError, isLoading: statusLoading, mutate: mutateStatus } = useSWR(
        'spin-status',
        getUserSpinStatus,
        {
            revalidateOnFocus: true,
            dedupingInterval: 60000, // 1 minute
            keepPreviousData: true
        }
    )

    return {
        prizes: prizes || [],
        loading: configLoading || statusLoading,
        available: status?.available ?? false,
        nextSpinTime: status?.nextSpinTime || null,
        mutateStatus
    }
}
