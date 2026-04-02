-- Permitir que usuários excluam seus próprios feedbacks
CREATE POLICY "Users can delete own feedbacks"
ON public.feedbacks
FOR DELETE
TO authenticated
USING (auth.uid() = criado_por);