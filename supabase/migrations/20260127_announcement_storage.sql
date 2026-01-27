-- Create storage bucket for announcements
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Policies

-- 1. Public Read
DROP POLICY IF EXISTS "Public can view announcement images" ON storage.objects;
CREATE POLICY "Public can view announcement images"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'announcements' );

-- 2. Admin Insert
DROP POLICY IF EXISTS "Admins can upload announcement images" ON storage.objects;
CREATE POLICY "Admins can upload announcement images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'announcements' 
        AND EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() AND active = true
        )
    );

-- 3. Admin Update
DROP POLICY IF EXISTS "Admins can update announcement images" ON storage.objects;
CREATE POLICY "Admins can update announcement images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'announcements' 
        AND EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() AND active = true
        )
    );

-- 4. Admin Delete
DROP POLICY IF EXISTS "Admins can delete announcement images" ON storage.objects;
CREATE POLICY "Admins can delete announcement images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'announcements' 
        AND EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE id = auth.uid() AND active = true
        )
    );
