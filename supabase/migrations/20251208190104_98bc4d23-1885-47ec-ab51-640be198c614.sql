-- Enum para status de documento
CREATE TYPE doc_status AS ENUM ('processing', 'ready', 'failed');

-- Enum para tipo de fonte
CREATE TYPE doc_source_type AS ENUM ('pdf', 'text');

-- Tabela de documentos da base de conhecimento
CREATE TABLE public.qa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text DEFAULT 'global',
  title text NOT NULL,
  source_type doc_source_type NOT NULL,
  storage_path text NOT NULL,
  status doc_status DEFAULT 'processing',
  tags text[] DEFAULT '{}',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de chunks com embeddings para busca semântica
CREATE TABLE public.qa_doc_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.qa_documents(id) ON DELETE CASCADE NOT NULL,
  chunk_index int NOT NULL,
  content_text text NOT NULL,
  embedding vector(768),
  created_at timestamptz DEFAULT now()
);

-- Índice para busca por similaridade usando cosine distance
CREATE INDEX qa_doc_chunks_embedding_idx ON public.qa_doc_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Índice para buscar chunks por documento
CREATE INDEX qa_doc_chunks_document_idx ON public.qa_doc_chunks(document_id);

-- Atualizar enum artifact_type para incluir novos tipos
ALTER TYPE artifact_type ADD VALUE IF NOT EXISTS 'consultor_answer';
ALTER TYPE artifact_type ADD VALUE IF NOT EXISTS 'jira_suggestions';

-- Trigger para updated_at em qa_documents
CREATE TRIGGER update_qa_documents_updated_at
BEFORE UPDATE ON public.qa_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.qa_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_doc_chunks ENABLE ROW LEVEL SECURITY;

-- RLS: Documentos globais - leitura para todos autenticados
CREATE POLICY "Authenticated can read global docs"
ON public.qa_documents FOR SELECT
TO authenticated
USING (scope = 'global');

-- RLS: Admin pode gerenciar documentos
CREATE POLICY "Admin can insert docs"
ON public.qa_documents FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update docs"
ON public.qa_documents FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete docs"
ON public.qa_documents FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS para chunks: leitura para autenticados
CREATE POLICY "Authenticated can read chunks"
ON public.qa_doc_chunks FOR SELECT
TO authenticated
USING (true);

-- RLS para chunks: admin pode gerenciar
CREATE POLICY "Admin can insert chunks"
ON public.qa_doc_chunks FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update chunks"
ON public.qa_doc_chunks FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete chunks"
ON public.qa_doc_chunks FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Criar bucket para armazenar documentos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qa-knowledge', 'qa-knowledge', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para o bucket qa-knowledge
CREATE POLICY "Authenticated can read knowledge files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'qa-knowledge');

CREATE POLICY "Admin can upload knowledge files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'qa-knowledge' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update knowledge files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'qa-knowledge' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete knowledge files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'qa-knowledge' AND public.has_role(auth.uid(), 'admin'));

-- Função para buscar chunks similares
CREATE OR REPLACE FUNCTION public.search_similar_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index int,
  content_text text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.document_id,
    c.chunk_index,
    c.content_text,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM qa_doc_chunks c
  JOIN qa_documents d ON d.id = c.document_id
  WHERE d.status = 'ready'
    AND d.scope = 'global'
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;