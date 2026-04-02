import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
} | undefined;

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
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("kb-upload: Starting upload process");

    // Get user from auth header
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
      console.error("kb-upload: Auth error", authError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("kb-upload: User authenticated:", user.id);

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", { 
      _user_id: user.id, 
      _role: "admin" 
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores podem fazer upload." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const tags = formData.get("tags") as string;

    if (!file || !title) {
      return new Response(JSON.stringify({ error: "Arquivo e título são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("kb-upload: File received:", file.name, "Size:", file.size);

    // Determine source type
    const fileName = file.name.toLowerCase();
    let sourceType: "pdf" | "text";
    if (fileName.endsWith(".pdf")) {
      sourceType = "pdf";
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      sourceType = "text";
    } else {
      return new Response(JSON.stringify({ error: "Formato não suportado. Use PDF, TXT ou MD." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize filename: remove accents, special chars, replace spaces with underscores
    const sanitizeFileName = (name: string): string => {
      // Remove accents and diacritics
      const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Replace spaces and special characters with underscores
      const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
      // Remove consecutive underscores
      return sanitized.replace(/_+/g, "_");
    };

    // Generate unique storage path with sanitized filename
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(file.name);
    const storagePath = `documents/${timestamp}_${sanitizedFileName}`;
    
    console.log("kb-upload: Sanitized storage path:", storagePath);

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("qa-knowledge")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("kb-upload: Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Erro ao fazer upload do arquivo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("kb-upload: File uploaded to storage:", storagePath);

    // Parse tags
    const tagsArray = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("qa_documents")
      .insert({
        title,
        source_type: sourceType,
        storage_path: storagePath,
        status: "processing",
        tags: tagsArray,
        uploaded_by: user.id,
        scope: "global",
      })
      .select()
      .single();

    if (docError) {
      console.error("kb-upload: Document insert error:", docError);
      // Try to clean up uploaded file
      await supabase.storage.from("qa-knowledge").remove([storagePath]);
      return new Response(JSON.stringify({ error: "Erro ao criar registro do documento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("kb-upload: Document record created:", document.id);

    // Trigger processing in background using waitUntil for fire-and-forget
    const processDocument = async () => {
      try {
        console.log("kb-upload: Triggering kb-process-document for:", document.id);
        const processUrl = `${supabaseUrl}/functions/v1/kb-process-document`;
        
        const processResponse = await fetch(processUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ documentId: document.id }),
        });

        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.error("kb-upload: Process trigger failed:", processResponse.status, errorText);
          
          // Update document status to failed
          await supabase
            .from("qa_documents")
            .update({ 
              status: "failed", 
              error_message: `Erro ao iniciar processamento: ${processResponse.status}` 
            })
            .eq("id", document.id);
        } else {
          console.log("kb-upload: Process trigger successful for:", document.id);
        }
      } catch (err) {
        console.error("kb-upload: Error triggering processing:", err);
        // Update document status to failed
        await supabase
          .from("qa_documents")
          .update({ 
            status: "failed", 
            error_message: "Erro ao iniciar processamento do documento" 
          })
          .eq("id", document.id);
      }
    };

    // Use EdgeRuntime.waitUntil if available, otherwise just call
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processDocument());
    } else {
      // Fallback: trigger without waiting
      processDocument();
    }

    return new Response(JSON.stringify({ 
      success: true, 
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("kb-upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
