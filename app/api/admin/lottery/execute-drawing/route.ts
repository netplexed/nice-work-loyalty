import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { executeDrawing } from '@/lib/lottery/drawing-logic'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Admin Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { drawing_id } = await req.json()

        if (!drawing_id) {
            return NextResponse.json({ error: 'Drawing ID is required' }, { status: 400 })
        }

        const result = await executeDrawing(drawing_id)

        return NextResponse.json({ success: true, result })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
