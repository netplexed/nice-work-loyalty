-- Create Announcements Table (Idempotent)

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL, -- Short summary or body
    image_url text, -- Optional hero image
    action_url text, -- Optional link (e.g. "/rewards")
    action_label text, -- Button text (e.g. "View Offer")
    active boolean DEFAULT true,
    start_date timestamptz DEFAULT now(),
    end_date timestamptz,
    priority integer DEFAULT 0, -- Higher number = higher priority
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS (Safe to run multiple times)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to avoid errors if re-running)

DROP POLICY IF EXISTS "Public can view active announcements" ON public.announcements;
CREATE POLICY "Public can view active announcements"
    ON public.announcements FOR SELECT
    USING (
        active = true 
        AND (start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
    );

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
    ON public.announcements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() AND active = true
        )
    );

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_announcements_active_date ON public.announcements(active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority DESC, created_at DESC);
