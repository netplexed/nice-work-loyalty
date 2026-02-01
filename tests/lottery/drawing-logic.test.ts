import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeDrawing } from '@/lib/lottery/drawing-logic'

// Mock Supabase
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockLte = vi.fn()
const mockSingle = vi.fn()
const mockLimit = vi.fn()

const mockClient = {
    from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
    })),
}

// Chain setup
mockSelect.mockReturnValue({
    eq: mockEq,
    lte: mockLte,
})

mockEq.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
    order: vi.fn().mockReturnThis(),
    limit: mockLimit
})

mockSingle.mockReturnValue({ data: null, error: null })
mockInsert.mockReturnValue({ error: null })
mockUpdate.mockReturnValue({ error: null })
mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

// Mock admin client factory
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => mockClient
}))

describe('Lottery Drawing Logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should throw error if drawing not active', async () => {
        mockSingle.mockResolvedValueOnce({
            data: { id: 'd1', status: 'drawn' },
            error: null
        })

        await expect(executeDrawing('d1')).rejects.toThrow('Drawing is not active')
    })

    it('should select a winner correctly', async () => {
        // Mock entries
        const mockEntries = [
            { user_id: 'u1', quantity: 1, entry_type: 'base' },
            { user_id: 'u2', quantity: 3, entry_type: 'purchased' }
        ]

        // Mock drawing fetch
        mockEq.mockReturnValueOnce({ // select(*) from lottery_entries
            data: mockEntries,
            error: null
        })

        // Mock drawing detail fetch
        mockSingle.mockResolvedValueOnce({ // select(*) from lottery_drawings .single()
            data: {
                id: 'd1',
                status: 'active',
                prize_description: 'Prize',
                prize_value: 100
            },
            error: null
        })

        // Fix mock chain for second call (drawing detail)
        // The implementation calls:
        // 1. entries: from('lottery_entries').select('*').eq(...)
        // 2. drawing: from('lottery_drawings').select('*').eq(...).single()

        // We need significantly better mocking for chained calls or use a library.
        // Let's refine the mock to return specific values based on table name.

        mockClient.from.mockImplementation((table) => {
            if (table === 'lottery_entries') {
                return {
                    select: () => ({
                        eq: () => Promise.resolve({ data: mockEntries, error: null })
                    })
                }
            }
            if (table === 'lottery_drawings') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: 'd1', status: 'active', prize_description: 'P', prize_value: 100 },
                                error: null
                            })
                        }),
                        update: mockUpdate
                    })
                }
            }
            if (table === 'lottery_winners') {
                return {
                    insert: mockInsert
                }
            }
            if (table === 'lottery_stats') {
                return {
                    insert: () => Promise.resolve({ error: null })
                }
            }
            return {}
        })

        // Mock update chain
        mockUpdate.mockReturnValue({
            eq: () => Promise.resolve({ error: null })
        })

        const result = await executeDrawing('d1')

        expect(result.totalTickets).toBe(4) // 1 + 3
        expect(['u1', 'u2']).toContain(result.winner.userId)
        expect(mockInsert).toHaveBeenCalled() // Winner inserted
        expect(mockUpdate).toHaveBeenCalled() // Drawing status update
    })
})
