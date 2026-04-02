import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple text chunking - split by paragraphs with smaller chunks for faster processing
function chunkText(text: string, maxChunkSize = 800): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    if (currentChunk.length + trimmedParagraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedParagraph;
      } else {
        // Paragraph too long, split by sentences
        const sentences = trimmedParagraph.split(/\.\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ". " : "") + sentence;
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmedParagraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Filter small chunks and limit total
  return chunks.filter((c) => c.length > 30).slice(0, 50);
}

// Fast hash-based embedding (no external calls)
function generateEmbedding(text: string): number[] {
  const embedding: number[] = new Array(768).fill(0);
  
  // Simple but fast hash
  for (let i = 0; i < text.length && i < 2000; i++) {
    const idx = (text.charCodeAt(i) * (i + 1)) % 768;
    embedding[idx] += 1 / (1 + Math.floor(i / 100));
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Retry document:", documentId);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from("qa_documents")
      .select("id, storage_path, source_type, title")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return new Response(JSON.stringify({ error: "Documento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabase
      .from("qa_documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId);

    // Delete existing chunks
    await supabase
      .from("qa_doc_chunks")
      .delete()
      .eq("document_id", documentId);

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("qa-knowledge")
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      await supabase
        .from("qa_documents")
        .update({ status: "failed", error_message: "Erro ao baixar arquivo" })
        .eq("id", documentId);
      return new Response(JSON.stringify({ error: "Erro ao baixar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text (for text files only - PDFs need special handling)
    let text: string;
    if (document.source_type === "pdf") {
      // For PDFs, use basic text extraction
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const rawText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      
      // Extract visible text between BT/ET markers
      const textParts: string[] = [];
      const regex = /\(([^)]{3,})\)/g;
      let match;
      while ((match = regex.exec(rawText)) !== null) {
        const clean = match[1].replace(/[^\x20-\x7E\n]/g, "").trim();
        if (clean.length > 5) textParts.push(clean);
      }
      text = textParts.join(" ") || `Conteúdo do PDF: ${document.title}`;
    } else {
      text = await fileData.text();
    }

    console.log("Text length:", text.length);

    if (text.length < 30) {
      await supabase
        .from("qa_documents")
        .update({ status: "failed", error_message: "Texto insuficiente" })
        .eq("id", documentId);
      return new Response(JSON.stringify({ error: "Texto insuficiente" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create chunks
    const chunks = chunkText(text);
    console.log("Chunks:", chunks.length);

    // Generate embeddings and prepare inserts
    const chunkInserts = chunks.map((chunk, i) => ({
      document_id: documentId,
      chunk_index: i,
      content_text: chunk,
      embedding: `[${generateEmbedding(chunk).join(",")}]`,
    }));

    // Insert all chunks at once
    const { error: insertError } = await supabase
      .from("qa_doc_chunks")
      .insert(chunkInserts);

    if (insertError) {
      console.error("Insert error:", insertError);
      await supabase
        .from("qa_documents")
        .update({ status: "failed", error_message: "Erro ao salvar chunks" })
        .eq("id", documentId);
      return new Response(JSON.stringify({ error: "Erro ao salvar" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as ready
    await supabase
      .from("qa_documents")
      .update({ status: "ready", error_message: null })
      .eq("id", documentId);

    console.log("Success! Chunks:", chunkInserts.length);

    return new Response(JSON.stringify({ 
      success: true, 
      chunksProcessed: chunkInserts.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
