-- Create enum for feedback types
CREATE TYPE public.feedback_tipo AS ENUM ('bug', 'melhoria', 'nova_funcionalidade');

-- Create enum for feedback status
CREATE TYPE public.feedback_status AS ENUM ('novo', 'em_analise', 'planejado', 'em_andamento', 'concluido', 'mesclado');

-- Create feedbacks table
CREATE TABLE public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo feedback_tipo NOT NULL,
  area TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status feedback_status NOT NULL DEFAULT 'novo',
  votos INTEGER NOT NULL DEFAULT 1,
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_por_nome TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  mesclado_em_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create feedback_votes table for tracking individual votes
CREATE TABLE public.feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(feedback_id, user_id)
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feedbacks

-- All authenticated users can read all feedbacks
CREATE POLICY "Anyone can read feedbacks"
ON public.feedbacks FOR SELECT
TO authenticated
USING (true);

-- Users can create their own feedbacks
CREATE POLICY "Users can create own feedbacks"
ON public.feedbacks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criado_por);

-- Only admins can update feedbacks (status, merge)
CREATE POLICY "Admins can update feedbacks"
ON public.feedbacks FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete feedbacks
CREATE POLICY "Admins can delete feedbacks"
ON public.feedbacks FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for feedback_votes

-- All authenticated users can read votes
CREATE POLICY "Anyone can read votes"
ON public.feedback_votes FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can vote"
ON public.feedback_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can unvote"
ON public.feedback_votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to update vote count
CREATE OR REPLACE FUNCTION public.update_feedback_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feedbacks 
    SET votos = votos + 1, updated_at = NOW()
    WHERE id = NEW.feedback_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feedbacks 
    SET votos = GREATEST(0, votos - 1), updated_at = NOW()
    WHERE id = OLD.feedback_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for vote count
CREATE TRIGGER on_feedback_vote_insert
  AFTER INSERT ON public.feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feedback_vote_count();

CREATE TRIGGER on_feedback_vote_delete
  AFTER DELETE ON public.feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feedback_vote_count();

-- Create index for better performance
CREATE INDEX idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX idx_feedbacks_tipo ON public.feedbacks(tipo);
CREATE INDEX idx_feedbacks_votos ON public.feedbacks(votos DESC);
CREATE INDEX idx_feedback_votes_feedback_id ON public.feedback_votes(feedback_id);
CREATE INDEX idx_feedback_votes_user_id ON public.feedback_votes(user_id);