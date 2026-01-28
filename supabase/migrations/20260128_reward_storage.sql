-- Create a new storage bucket for rewards
INSERT INTO storage.buckets (id, name, public)
VALUES ('rewards', 'rewards', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view reward images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'rewards' );

-- Policy: Admins can upload reward images
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rewards' AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() AND active = true
  )
);

-- Policy: Admins can update reward images
CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'rewards' AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() AND active = true
  )
);

-- Policy: Admins can delete reward images
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rewards' AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = auth.uid() AND active = true
  )
);
