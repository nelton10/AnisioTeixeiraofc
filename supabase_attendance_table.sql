-- SQL for creating the frequencias table in Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.frequencias (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    data TEXT NOT NULL,        -- Format: YYYY-MM-DD
    period TEXT NOT NULL,      -- '8h' or '14h'
    status TEXT NOT NULL,      -- 'P' or 'A'
    justificativa TEXT DEFAULT '',
    professor TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    raw_timestamp BIGINT NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;

-- Add policies for public anonymous access (matching your current Supabase configuration)
DROP POLICY IF EXISTS "Public Read" ON public.frequencias;
CREATE POLICY "Public Read" ON public.frequencias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert" ON public.frequencias;
CREATE POLICY "Public Insert" ON public.frequencias FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update" ON public.frequencias;
CREATE POLICY "Public Update" ON public.frequencias FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete" ON public.frequencias;
CREATE POLICY "Public Delete" ON public.frequencias FOR DELETE USING (true);
