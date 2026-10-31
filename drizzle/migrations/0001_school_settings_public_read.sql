GRANT SELECT ON public.school_settings TO anon;

create policy "settings_read_anon" on public.school_settings for select to anon using (true);