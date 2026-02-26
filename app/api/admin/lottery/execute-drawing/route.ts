import { NextResponse } from 'next/server'
import { executeDrawing } from '@/lib/lottery/drawing-logic'
import { requireAdminApiContext } from '@/lib/admin/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const guard = await requireAdminApiContext({ minimumRole: 'manager' })
    if (!guard.ok) return guard.response

    try {
        const { drawing_id } = await req.json()

        if (!drawing_id) {
            return NextResponse.json({ error: 'Drawing ID is required' }, { status: 400 })
        }

        const result = await executeDrawing(drawing_id)

        return NextResponse.json({ success: true, result })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unexpected server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
