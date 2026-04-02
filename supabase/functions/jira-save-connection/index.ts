import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encryptionSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      name,
      connectionType,
      baseUrl,
      email,
      apiToken,
      isDefault = false
    } = await req.json();

    // Validate required fields
    if (!name || !connectionType || !baseUrl) {
      return new Response(JSON.stringify({ error: "Nome, tipo e URL são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (connectionType === "server" && (!email || !apiToken)) {
      return new Response(JSON.stringify({ error: "Email e API Token são obrigatórios para Jira Server/DC" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize base URL
    let normalizedUrl = baseUrl.trim();
    if (normalizedUrl.endsWith("/")) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from("jira_connections")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    // Encrypt sensitive data using AES-256-GCM
    const encryptedApiToken = apiToken ? await encryptToken(apiToken, encryptionSecret) : null;

    // Insert connection
    const { data: connection, error: insertError } = await supabase
      .from("jira_connections")
      .insert({
        user_id: user.id,
        name: name.trim(),
        connection_type: connectionType,
        base_url: normalizedUrl,
        email: email || null,
        api_token_encrypted: encryptedApiToken,
        status: "connected",
        is_default: isDefault,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao salvar conexão" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Connection saved:", connection.id);

    return new Response(JSON.stringify({ 
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        connection_type: connection.connection_type,
        base_url: connection.base_url,
        status: connection.status,
        is_default: connection.is_default,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("jira-save-connection error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
