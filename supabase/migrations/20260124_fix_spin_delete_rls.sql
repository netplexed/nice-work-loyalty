-- Allow users to delete their own spins (for debug/testing)
CREATE POLICY "Users can delete own spins"
  ON public.spins FOR DELETE
  USING (auth.uid() = user_id);
