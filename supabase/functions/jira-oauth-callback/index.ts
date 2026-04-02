import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES-256-GCM encryption for secure token storage
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("spectra-salt-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(plaintext: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoder.encode(plaintext)
  );
  
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return "aes256gcm:" + btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get frontend URL from multiple sources
  const getFrontendUrl = (stateData?: { frontendUrl?: string }): string => {
    // 1. First try from state (most reliable - comes from the request origin)
    if (stateData?.frontendUrl) {
      return stateData.frontendUrl;
    }
    // 2. Fall back to environment variable
    const envUrl = Deno.env.get("FRONTEND_URL");
    if (envUrl) {
      return envUrl;
    }
    // 3. Default to production URL
    return "https://spectraqa.lovable.app";
  };

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error from Atlassian:", error);
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}/connections?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error("Missing code or state");
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}/connections?error=missing_params`);
    }

    let stateData: { connectionName: string; isDefault: boolean; userId?: string; frontendUrl?: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      console.error("Invalid state");
      const frontendUrl = getFrontendUrl();
      return Response.redirect(`${frontendUrl}/connections?error=invalid_state`);
    }

    const frontendUrl = getFrontendUrl(stateData);
    console.log("Frontend URL:", frontendUrl);

    // Validate userId is present in state
    if (!stateData.userId) {
      console.error("Missing userId in state");
      return Response.redirect(`${frontendUrl}/connections?error=missing_user`);
    }

    const clientId = Deno.env.get("JIRA_CLIENT_ID")!;
    const clientSecret = Deno.env.get("JIRA_CLIENT_SECRET")!;
    const encryptionSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const redirectUri = `${supabaseUrl}/functions/v1/jira-oauth-callback`;

    // Exchange code for tokens
    console.log("Exchanging code for tokens...");
    const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange error:", errorData);
      return Response.redirect(`${frontendUrl}/connections?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log("Tokens received successfully");

    // Get accessible resources (Jira sites)
    const resourcesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
        "Accept": "application/json",
      },
    });

    if (!resourcesResponse.ok) {
      console.error("Failed to get resources");
      return Response.redirect(`${frontendUrl}/connections?error=resources_failed`);
    }

    const resources = await resourcesResponse.json();
    if (!resources.length) {
      console.error("No Jira sites found");
      return Response.redirect(`${frontendUrl}/connections?error=no_sites`);
    }

    const jiraSite = resources[0];
    console.log("Jira site:", jiraSite.url);

    // Get user info
    const userResponse = await fetch(`https://api.atlassian.com/ex/jira/${jiraSite.id}/rest/api/3/myself`, {
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
        "Accept": "application/json",
      },
    });

    let userEmail = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userEmail = userData.emailAddress;
    }

    // Encrypt tokens server-side
    console.log("Encrypting tokens...");
    const encryptedAccessToken = await encryptToken(tokens.access_token, encryptionSecret);
    const encryptedRefreshToken = tokens.refresh_token 
      ? await encryptToken(tokens.refresh_token, encryptionSecret) 
      : null;

    // Calculate token expiration
    const tokenExpiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Save directly to database using service role
    console.log("Saving connection to database...");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If setting as default, unset other defaults first
    if (stateData.isDefault) {
      await supabase
        .from("jira_connections")
        .update({ is_default: false })
        .eq("user_id", stateData.userId);
    }

    const { data: connection, error: insertError } = await supabase
      .from("jira_connections")
      .insert({
        user_id: stateData.userId,
        name: stateData.connectionName.trim(),
        connection_type: "cloud",
        base_url: jiraSite.url,
        cloud_id: jiraSite.id, // Store cloud ID for API calls
        email: userEmail || null,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        status: "connected",
        is_default: stateData.isDefault || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return Response.redirect(`${frontendUrl}/connections?error=save_failed`);
    }

    console.log("Connection saved successfully:", connection.id);

    // Redirect to success page
    return Response.redirect(`${frontendUrl}/connections?oauth=success&connection=${connection.id}`);

  } catch (error: unknown) {
    console.error("jira-oauth-callback error:", error);
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://spectraqa.lovable.app";
    return Response.redirect(`${frontendUrl}/connections?error=callback_failed`);
  }
});
