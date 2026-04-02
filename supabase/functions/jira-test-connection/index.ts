import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to refresh OAuth token
async function refreshOAuthToken(
  refreshTokenEncrypted: string,
  encryptionSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  try {
    const clientId = Deno.env.get("JIRA_CLIENT_ID");
    const clientSecret = Deno.env.get("JIRA_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      console.error("Missing JIRA_CLIENT_ID or JIRA_CLIENT_SECRET");
      return null;
    }

    const refreshToken = await decryptToken(refreshTokenEncrypted, encryptionSecret);
    
    console.log("Attempting to refresh OAuth token...");
    
    const response = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to refresh token:", response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    console.log("Token refreshed successfully");

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
      expiresAt,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

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

    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connection
    const { data: connection, error: connError } = await supabase
      .from("jira_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Conexão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build auth header and test URL using decryption
    let jiraAuthHeader: string;
    let testUrl: string;
    let currentAccessToken: string | null = null;

    if (connection.connection_type === "server" && connection.email && connection.api_token_encrypted) {
      // Server/DC: Basic auth with email:token, direct URL
      const apiToken = await decryptToken(connection.api_token_encrypted, encryptionSecret);
      jiraAuthHeader = `Basic ${btoa(`${connection.email}:${apiToken}`)}`;
      testUrl = `${connection.base_url}/rest/api/2/myself`;
    } else if (connection.connection_type === "cloud" && connection.access_token_encrypted) {
      // Cloud: OAuth Bearer token, use Atlassian API gateway with cloud_id
      currentAccessToken = await decryptToken(connection.access_token_encrypted, encryptionSecret);
      jiraAuthHeader = `Bearer ${currentAccessToken}`;
      
      // Cloud connections MUST use the Atlassian API gateway with cloud_id
      if (!connection.cloud_id) {
        console.error("Cloud connection missing cloud_id");
        return new Response(JSON.stringify({ 
          success: false,
          error: "Conexão Cloud incompleta. Por favor, delete e reconecte sua conta Jira." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      testUrl = `https://api.atlassian.com/ex/jira/${connection.cloud_id}/rest/api/3/myself`;
    } else {
      return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test connection by fetching myself endpoint
    console.log("Testing connection:", testUrl);

    let jiraResponse = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Authorization": jiraAuthHeader,
        "Accept": "application/json",
      },
    });

    // If 401 and it's a cloud connection, try to refresh the token
    if (jiraResponse.status === 401 && connection.connection_type === "cloud" && connection.refresh_token_encrypted) {
      console.log("Access token expired, attempting refresh...");
      
      const newTokens = await refreshOAuthToken(connection.refresh_token_encrypted, encryptionSecret);
      
      if (newTokens) {
        // Encrypt and save new tokens
        const newAccessTokenEncrypted = await encryptToken(newTokens.accessToken, encryptionSecret);
        const newRefreshTokenEncrypted = await encryptToken(newTokens.refreshToken, encryptionSecret);
        
        await supabase
          .from("jira_connections")
          .update({
            access_token_encrypted: newAccessTokenEncrypted,
            refresh_token_encrypted: newRefreshTokenEncrypted,
            token_expires_at: newTokens.expiresAt.toISOString(),
            status: "connected",
          })
          .eq("id", connectionId);

        // Retry the request with new token
        jiraAuthHeader = `Bearer ${newTokens.accessToken}`;
        jiraResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Authorization": jiraAuthHeader,
            "Accept": "application/json",
          },
        });
        
        console.log("Retried with new token, status:", jiraResponse.status);
      } else {
        console.log("Token refresh failed");
        
        // Update connection status to expired
        await supabase
          .from("jira_connections")
          .update({ status: "expired" })
          .eq("id", connectionId);

        return new Response(JSON.stringify({ 
          success: false,
          error: "Token OAuth expirado. Por favor, reconecte sua conta Jira." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      console.error("Jira test failed:", jiraResponse.status, errorText);
      
      // Update connection status
      const newStatus = jiraResponse.status === 401 ? "expired" : "error";
      await supabase
        .from("jira_connections")
        .update({ status: newStatus })
        .eq("id", connectionId);

      return new Response(JSON.stringify({ 
        success: false,
        error: jiraResponse.status === 401 
          ? "Token expirado. Reconecte sua conta Jira." 
          : `Erro ao conectar: ${jiraResponse.status}`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jiraUser = await jiraResponse.json();
    console.log("Jira user found:", jiraUser.displayName || jiraUser.name);

    // Update connection status to connected
    await supabase
      .from("jira_connections")
      .update({ status: "connected" })
      .eq("id", connectionId);

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        displayName: jiraUser.displayName || jiraUser.name,
        emailAddress: jiraUser.emailAddress,
        avatarUrl: jiraUser.avatarUrls?.["48x48"],
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("jira-test-connection error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
