import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/crypto.ts";
import { 
  isValidIssueKey, 
  isValidUUID, 
  sanitizeForLog, 
  GENERIC_ERRORS, 
  handleError 
} from "../_shared/validation.ts";

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
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.AUTH_REQUIRED }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.AUTH_INVALID }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { connectionId, issueKey } = body;

    // Validate inputs
    if (!connectionId || !isValidUUID(connectionId)) {
      console.warn("Invalid connectionId:", sanitizeForLog(String(connectionId)));
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!issueKey || !isValidIssueKey(issueKey)) {
      console.warn("Invalid issueKey format:", sanitizeForLog(String(issueKey)));
      return new Response(JSON.stringify({ error: "Formato de chave de ticket inválido" }), {
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
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.NOT_FOUND }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build auth header and URL based on connection type
    let jiraAuthHeader: string;
    let issueUrl: string;
    
    if (connection.connection_type === "server" && connection.email && connection.api_token_encrypted) {
      // Server/DC: Basic auth with email:token, direct URL
      const apiToken = await decryptToken(connection.api_token_encrypted, encryptionSecret);
      jiraAuthHeader = `Basic ${btoa(`${connection.email}:${apiToken}`)}`;
      issueUrl = `${connection.base_url}/rest/api/2/issue/${encodeURIComponent(issueKey)}?expand=renderedFields`;
    } else if (connection.connection_type === "cloud" && connection.access_token_encrypted) {
      // Cloud: OAuth Bearer token, use Atlassian API gateway with cloud_id
      const accessToken = await decryptToken(connection.access_token_encrypted, encryptionSecret);
      jiraAuthHeader = `Bearer ${accessToken}`;
      
      // Cloud connections MUST use the Atlassian API gateway with cloud_id
      if (!connection.cloud_id) {
        console.error("Cloud connection missing cloud_id");
        return new Response(JSON.stringify({ 
          error: "Conexão Cloud incompleta. Por favor, reconecte sua conta Jira." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      issueUrl = `https://api.atlassian.com/ex/jira/${connection.cloud_id}/rest/api/2/issue/${encodeURIComponent(issueKey)}?expand=renderedFields`;
    } else {
      return new Response(JSON.stringify({ error: "Credenciais não configuradas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch issue
    console.log("Fetching issue:", sanitizeForLog(issueUrl, 150));

    const jiraResponse = await fetch(issueUrl, {
      method: "GET",
      headers: {
        "Authorization": jiraAuthHeader,
        "Accept": "application/json",
      },
    });

    if (!jiraResponse.ok) {
      // Log error details server-side only
      const errorText = await jiraResponse.text();
      console.error("Jira API error:", jiraResponse.status, sanitizeForLog(errorText, 300));
      
      if (jiraResponse.status === 404) {
        return new Response(JSON.stringify({ error: `Ticket ${issueKey} não encontrado` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (jiraResponse.status === 401 || jiraResponse.status === 403) {
        return new Response(JSON.stringify({ error: "Credenciais inválidas ou expiradas" }), {
          status: jiraResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return generic error for other cases
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.EXTERNAL_SERVICE }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const issue = await jiraResponse.json();
    console.log("Issue fetched:", sanitizeForLog(issue.key));

    // Extract relevant fields
    const fields = issue.fields;
    const renderedFields = issue.renderedFields || {};
    
    // Convert HTML description to plain text
    // Use renderedFields.description (HTML) if available, otherwise try to extract from ADF
    let description = "";
    if (renderedFields.description) {
      // Strip HTML tags and convert to readable text
      description = renderedFields.description
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } else if (typeof fields.description === 'string') {
      description = fields.description;
    }
    
    console.log("Ticket summary:", sanitizeForLog(fields.summary));
    console.log("Description length:", description.length);
    
    // Try to find acceptance criteria in common custom field locations
    // Note: Different Jira projects use different custom fields for acceptance criteria
    let acceptanceCriteria = "";
    
    // Helper to check if a value looks like valid acceptance criteria text (not a Jira development object)
    const isValidACText = (val: unknown): val is string => {
      if (typeof val !== 'string') return false;
      // Filter out Jira development panel fields (contain pullrequest, commit data, etc.)
      if (val.includes('pullrequest') || val.includes('dataType=') || val.startsWith('{')) return false;
      return val.length > 10; // Acceptance criteria should have meaningful content
    };
    
    // Check common custom field names for acceptance criteria
    // These field IDs vary per Jira instance - common ones for AC
    const customFieldNames = [
      "customfield_10014", // Common for Acceptance Criteria in Jira Cloud
      "customfield_10015",
      "customfield_10016",
      "customfield_10020",
      "customfield_10021",
      "customfield_10101",
      "customfield_10100",
    ];
    
    for (const fieldName of customFieldNames) {
      // Try rendered version first (HTML)
      const renderedVal = renderedFields[fieldName];
      if (isValidACText(renderedVal)) {
        acceptanceCriteria = renderedVal
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        break;
      }
      
      // Fallback to plain field
      const plainVal = fields[fieldName];
      if (isValidACText(plainVal)) {
        acceptanceCriteria = plainVal;
        break;
      }
    }

    // Also check if it's in the description (common pattern)
    if (!acceptanceCriteria) {
      const acMatch = description.match(/(?:acceptance criteria|critérios de aceite|critérios de aceitação)[:\s]*([\s\S]*?)(?:$|(?=\n\n))/i);
      if (acMatch) {
        acceptanceCriteria = acMatch[1].trim();
      }
    }
    
    console.log("Acceptance criteria length:", acceptanceCriteria.length);

    return new Response(JSON.stringify({ 
      success: true,
      issue: {
        key: issue.key,
        summary: fields.summary,
        description: description,
        descriptionHtml: issue.renderedFields?.description || "",
        acceptanceCriteria: acceptanceCriteria,
        issueType: fields.issuetype?.name,
        status: fields.status?.name,
        priority: fields.priority?.name,
        labels: fields.labels || [],
        components: (fields.components || []).map((c: any) => c.name),
        assignee: fields.assignee?.displayName,
        reporter: fields.reporter?.displayName,
        created: fields.created,
        updated: fields.updated,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const { message, status } = handleError(error, "jira-fetch-issue");
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
