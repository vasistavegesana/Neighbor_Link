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
      barters: {
        Row: {
          created_at: string | null
          id: string
          offer_a_id: string
          offer_b_id: string
          status: string
          taalk_conversation_id: string | null
          updated_at: string | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_a_id: string
          offer_b_id: string
          status?: string
          taalk_conversation_id?: string | null
          updated_at?: string | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_a_id?: string
          offer_b_id?: string
          status?: string
          taalk_conversation_id?: string | null
          updated_at?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barters_offer_a_id_fkey"
            columns: ["offer_a_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barters_offer_b_id_fkey"
            columns: ["offer_b_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barters_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barters_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          matched: boolean | null
          matched_by: string[] | null
          offer_id: string
          participant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          matched?: boolean | null
          matched_by?: string[] | null
          offer_id: string
          participant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          matched?: boolean | null
          matched_by?: string[] | null
          offer_id?: string
          participant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          city: string | null
          completed_at: string | null
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          images: string[] | null
          lat: number | null
          lon: number | null
          skill: string
          status: string
          tags: string[] | null
          type: string
          updated_at: string | null
          user_id: string
          zip: string
        }
        Insert: {
          city?: string | null
          completed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          lat?: number | null
          lon?: number | null
          skill: string
          status?: string
          tags?: string[] | null
          type: string
          updated_at?: string | null
          user_id: string
          zip: string
        }
        Update: {
          city?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          lat?: number | null
          lon?: number | null
          skill?: string
          status?: string
          tags?: string[] | null
          type?: string
          updated_at?: string | null
          user_id?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          badges: string[] | null
          bio: string | null
          city: string | null
          completed_swaps: number | null
          created_at: string | null
          email: string
          id: string
          interests: string[] | null
          lat: number | null
          lon: number | null
          name: string
          phone: string | null
          rating: number | null
          reviews_count: number | null
          skills_needed: string[] | null
          skills_offered: string[] | null
          taalk_user_id: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          city?: string | null
          completed_swaps?: number | null
          created_at?: string | null
          email: string
          id: string
          interests?: string[] | null
          lat?: number | null
          lon?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          skills_needed?: string[] | null
          skills_offered?: string[] | null
          taalk_user_id?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: string[] | null
          bio?: string | null
          city?: string | null
          completed_swaps?: number | null
          created_at?: string | null
          email?: string
          id?: string
          interests?: string[] | null
          lat?: number | null
          lon?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          reviews_count?: number | null
          skills_needed?: string[] | null
          skills_offered?: string[] | null
          taalk_user_id?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          barter_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          offer_id: string | null
          reviewee_id: string
          reviewer_id: string
          stars: number
        }
        Insert: {
          barter_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          offer_id?: string | null
          reviewee_id: string
          reviewer_id: string
          stars: number
        }
        Update: {
          barter_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          offer_id?: string | null
          reviewee_id?: string
          reviewer_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_barter_id_fkey"
            columns: ["barter_id"]
            isOneToOne: false
            referencedRelation: "barters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_profile_rating: {
        Args: { profile_id: string }
        Returns: {
          avg_rating: number
          total_reviews: number
        }[]
      }
      get_unread_message_count: {
        Args: { user_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
