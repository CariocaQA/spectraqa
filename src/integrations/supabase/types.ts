export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          area: string
          criado_em: string
          criado_por: string
          criado_por_nome: string | null
          descricao: string
          id: string
          mesclado_em_id: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          tipo: Database["public"]["Enums"]["feedback_tipo"]
          titulo: string
          updated_at: string
          votos: number
        }
        Insert: {
          area: string
          criado_em?: string
          criado_por: string
          criado_por_nome?: string | null
          descricao: string
          id?: string
          mesclado_em_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          tipo: Database["public"]["Enums"]["feedback_tipo"]
          titulo: string
          updated_at?: string
          votos?: number
        }
        Update: {
          area?: string
          criado_em?: string
          criado_por?: string
          criado_por_nome?: string | null
          descricao?: string
          id?: string
          mesclado_em_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          tipo?: Database["public"]["Enums"]["feedback_tipo"]
          titulo?: string
          updated_at?: string
          votos?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_mesclado_em_id_fkey"
            columns: ["mesclado_em_id"]
            isOneToOne: false
            referencedRelation: "feedbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_connections: {
        Row: {
          access_token_encrypted: string | null
          api_token_encrypted: string | null
          base_url: string
          cloud_id: string | null
          connection_type: Database["public"]["Enums"]["jira_connection_type"]
          created_at: string | null
          email: string | null
          id: string
          is_default: boolean | null
          name: string
          refresh_token_encrypted: string | null
          status: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          api_token_encrypted?: string | null
          base_url: string
          cloud_id?: string | null
          connection_type: Database["public"]["Enums"]["jira_connection_type"]
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          api_token_encrypted?: string | null
          base_url?: string
          cloud_id?: string | null
          connection_type?: Database["public"]["Enums"]["jira_connection_type"]
          created_at?: string | null
          email?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          last_login_at: string | null
          trial_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_blocked?: boolean | null
          last_login_at?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          last_login_at?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_contexts: {
        Row: {
          created_at: string
          id: string
          jira_project_keys: string[] | null
          name: string
          notes: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jira_project_keys?: string[] | null
          name: string
          notes?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jira_project_keys?: string[] | null
          name?: string
          notes?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_artifacts: {
        Row: {
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          created_at: string | null
          id: string
          input_data: Json | null
          is_demo: boolean | null
          jira_connection_id: string | null
          output_content: string
          ticket_key: string | null
          ticket_summary: string | null
          user_id: string
        }
        Insert: {
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          created_at?: string | null
          id?: string
          input_data?: Json | null
          is_demo?: boolean | null
          jira_connection_id?: string | null
          output_content: string
          ticket_key?: string | null
          ticket_summary?: string | null
          user_id: string
        }
        Update: {
          artifact_type?: Database["public"]["Enums"]["artifact_type"]
          created_at?: string | null
          id?: string
          input_data?: Json | null
          is_demo?: boolean | null
          jira_connection_id?: string | null
          output_content?: string
          ticket_key?: string | null
          ticket_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_artifacts_jira_connection_id_fkey"
            columns: ["jira_connection_id"]
            isOneToOne: false
            referencedRelation: "jira_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_doc_chunks: {
        Row: {
          chunk_index: number
          content_text: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
        }
        Insert: {
          chunk_index: number
          content_text: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
        }
        Update: {
          chunk_index?: number
          content_text?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_doc_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "qa_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_documents: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          scope: string | null
          source_type: Database["public"]["Enums"]["doc_source_type"]
          status: Database["public"]["Enums"]["doc_status"] | null
          storage_path: string
          tags: string[] | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          scope?: string | null
          source_type: Database["public"]["Enums"]["doc_source_type"]
          status?: Database["public"]["Enums"]["doc_status"] | null
          storage_path: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          scope?: string | null
          source_type?: Database["public"]["Enums"]["doc_source_type"]
          status?: Database["public"]["Enums"]["doc_status"] | null
          storage_path?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_access: {
        Args: { _user_id: string }
        Returns: {
          can_access: boolean
          is_blocked: boolean
          is_trial_expired: boolean
          trial_expires_at: string
        }[]
      }
      get_my_jira_connections: {
        Args: never
        Returns: {
          base_url: string
          connection_type: Database["public"]["Enums"]["jira_connection_type"]
          created_at: string
          email: string
          id: string
          is_default: boolean
          name: string
          status: Database["public"]["Enums"]["connection_status"]
          token_expires_at: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_similar_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content_text: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      artifact_type: "bdd" | "k6" | "consultor_answer" | "jira_suggestions"
      connection_status: "connected" | "expired" | "error"
      doc_source_type: "pdf" | "text"
      doc_status: "processing" | "ready" | "failed"
      feedback_status:
        | "novo"
        | "em_analise"
        | "planejado"
        | "em_andamento"
        | "concluido"
        | "mesclado"
      feedback_tipo: "bug" | "melhoria" | "nova_funcionalidade"
      jira_connection_type: "cloud" | "server"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      artifact_type: ["bdd", "k6", "consultor_answer", "jira_suggestions"],
      connection_status: ["connected", "expired", "error"],
      doc_source_type: ["pdf", "text"],
      doc_status: ["processing", "ready", "failed"],
      feedback_status: [
        "novo",
        "em_analise",
        "planejado",
        "em_andamento",
        "concluido",
        "mesclado",
      ],
      feedback_tipo: ["bug", "melhoria", "nova_funcionalidade"],
      jira_connection_type: ["cloud", "server"],
    },
  },
} as const
