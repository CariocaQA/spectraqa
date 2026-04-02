import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Embedding API error:", response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
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

    const { query, matchCount = 5, matchThreshold = 0.5 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Query é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Searching for:", query);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, lovableApiKey);

    // Search for similar chunks using the RPC function
    const { data: chunks, error: searchError } = await supabase.rpc(
      "search_similar_chunks",
      {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_threshold: matchThreshold,
        match_count: matchCount,
      }
    );

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(JSON.stringify({ error: "Erro na busca semântica" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document info for each chunk
    const documentIds = [...new Set(chunks?.map((c: any) => c.document_id) || [])];
    
    let documents: any[] = [];
    if (documentIds.length > 0) {
      const { data: docs } = await supabase
        .from("qa_documents")
        .select("id, title, source_type, tags")
        .in("id", documentIds);
      documents = docs || [];
    }

    // Enrich chunks with document info
    const enrichedChunks = (chunks || []).map((chunk: any) => {
      const doc = documents.find((d) => d.id === chunk.document_id);
      return {
        ...chunk,
        document_title: doc?.title || "Documento desconhecido",
        document_source_type: doc?.source_type,
        document_tags: doc?.tags || [],
      };
    });

    console.log(`Found ${enrichedChunks.length} relevant chunks`);

    return new Response(JSON.stringify({ 
      success: true,
      chunks: enrichedChunks,
      totalFound: enrichedChunks.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("kb-search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
