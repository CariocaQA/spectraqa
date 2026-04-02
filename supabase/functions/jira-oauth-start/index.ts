import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("JIRA_CLIENT_ID");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "JIRA_CLIENT_ID não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { connectionName, isDefault, frontendUrl: clientFrontendUrl } = await req.json();

    // Get the frontend URL from the request or use environment variable
    const frontendUrl = clientFrontendUrl || Deno.env.get("FRONTEND_URL") || "https://spectraqa.lovable.app";
    console.log("Frontend URL for callback:", frontendUrl);

    // Generate state with user data - INCLUDE userId and frontendUrl for callback
    const state = btoa(JSON.stringify({
      connectionName: connectionName || "Jira Cloud",
      isDefault: isDefault || false,
      userId: user.id,
      frontendUrl: frontendUrl,
      timestamp: Date.now(),
    }));

    const redirectUri = `${supabaseUrl}/functions/v1/jira-oauth-callback`;

    // Jira OAuth 2.0 authorization URL
    const scopes = [
      "read:jira-work",
      "read:jira-user",
      "offline_access",
    ].join(" ");

    const authUrl = new URL("https://auth.atlassian.com/authorize");
    authUrl.searchParams.set("audience", "api.atlassian.com");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("prompt", "consent");

    console.log("OAuth start for user:", user.id);
    console.log("OAuth redirect URI:", redirectUri);

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("jira-oauth-start error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
