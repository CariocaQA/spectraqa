import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

export const useJiraValidation = () => {
    const [isValidating, setIsValidating] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const validateConnection = async (connectionId: string): Promise<boolean> => {
        if (!connectionId) return false;

        setIsValidating(true);
        try {
            // 1. Fetch connection details usually
            const { data: connection, error } = await supabase
                .from('jira_connections')
                .select('*')
                .eq('id', connectionId)
                .single();

            if (error || !connection) {
                throw new Error('Conexão não encontrada');
            }

            // 2. Check type and expiry
            if (connection.connection_type === 'cloud') {
                const now = new Date().getTime();
                const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
                const TEN_MINUTES = 10 * 60 * 1000;

                // If expired or expiring soon (< 10 mins), try refresh
                if (expiresAt - now < TEN_MINUTES) {
                    console.log('Token expiring soon or expired, attempting refresh...');

                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error('Sessão expirada');

                    // Call the test connection endpoint which handles refresh logic backend side
                    const response = await fetch(
                        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-test-connection`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ connectionId }),
                        }
                    );

                    const result = await response.json();

                    if (!result.success) {
                        throw new Error(result.error || 'Falha na renovação do token');
                    }
                }
            }

            return true;

        } catch (error) {
            console.error('Validation error:', error);

            toast({
                title: "Problema na Conexão",
                description: "Não foi possível validar ou renovar sua conexão com o Jira. Por favor, reconecte.",
                variant: "destructive",
                action: (
                    <ToastAction altText="Conectar" onClick={() => navigate('/connections')}>
                        Ir para Conexões
                    </ToastAction>
                ),
            });
            return false;
        } finally {
            setIsValidating(false);
        }
    };

    return { validateConnection, isValidating };
};
