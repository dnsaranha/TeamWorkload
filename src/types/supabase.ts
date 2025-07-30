export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assessment_responses: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          level_number: number
          meets_requirement: boolean | null
          question_id: number
          updated_at: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          level_number: number
          meets_requirement?: boolean | null
          question_id: number
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          level_number?: number
          meets_requirement?: boolean | null
          question_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "maturity_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_items: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          priority: number
          status: Database["public"]["Enums"]["backlog_status"]
          target_project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["backlog_status"]
          target_project_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["backlog_status"]
          target_project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_items_target_project_id_fkey"
            columns: ["target_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          risk_id: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          risk_id?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          risk_id?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          description: string | null
          file_path: string
          file_type: string
          id: string
          name: string
          project_id: string
          size_bytes: number
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_path: string
          file_type: string
          id?: string
          name: string
          project_id: string
          size_bytes: number
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_path?: string
          file_type?: string
          id?: string
          name?: string
          project_id?: string
          size_bytes?: number
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      m3u_sources: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          updated_at: string
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      maturity_assessments: {
        Row: {
          company_size: string | null
          created_at: string | null
          has_project_experience: boolean | null
          id: string
          is_pharmaceutical: boolean | null
          level_2_score: number | null
          level_3_score: number | null
          level_4_score: number | null
          level_5_score: number | null
          overall_maturity: number | null
          pharmaceutical_type: string | null
          respondent_id: string | null
          session_id: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          company_size?: string | null
          created_at?: string | null
          has_project_experience?: boolean | null
          id?: string
          is_pharmaceutical?: boolean | null
          level_2_score?: number | null
          level_3_score?: number | null
          level_4_score?: number | null
          level_5_score?: number | null
          overall_maturity?: number | null
          pharmaceutical_type?: string | null
          respondent_id?: string | null
          session_id?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          company_size?: string | null
          created_at?: string | null
          has_project_experience?: boolean | null
          id?: string
          is_pharmaceutical?: boolean | null
          level_2_score?: number | null
          level_3_score?: number | null
          level_4_score?: number | null
          level_5_score?: number | null
          overall_maturity?: number | null
          pharmaceutical_type?: string | null
          respondent_id?: string | null
          session_id?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          owner_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          owner_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          owner_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          impact: number | null
          mitigation_plan: string | null
          name: string
          owner_id: string | null
          probability: number | null
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          mitigation_plan?: string | null
          name: string
          owner_id?: string | null
          probability?: number | null
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          mitigation_plan?: string | null
          name?: string
          owner_id?: string | null
          probability?: number | null
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          id: string
          predecessor_id: string
          successor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          predecessor_id: string
          successor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          predecessor_id?: string
          successor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_successor_id_fkey"
            columns: ["successor_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          duration: number
          id: string
          is_group: boolean
          is_milestone: boolean
          name: string
          parent_id: string | null
          priority: number | null
          progress: number
          project_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration: number
          id?: string
          is_group?: boolean
          is_milestone?: boolean
          name: string
          parent_id?: string | null
          priority?: number | null
          progress?: number
          project_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_group?: boolean
          is_milestone?: boolean
          name?: string
          parent_id?: string | null
          priority?: number | null
          progress?: number
          project_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          remove_duplicates: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          remove_duplicates?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          remove_duplicates?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_task: {
        Args: {
          task_uuid: string
          user_uuid: string
          required_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_update_project: {
        Args: { project_uuid: string; user_uuid: string }
        Returns: boolean
      }
      can_view_project: {
        Args: { project_uuid: string; user_uuid: string }
        Returns: boolean
      }
      create_project: {
        Args: {
          project_name: string
          project_description: string
          project_start_date: string
          project_end_date: string
          project_owner_id: string
        }
        Returns: string
      }
      create_task: {
        Args: {
          task_name: string
          task_description: string
          task_start_date: string
          task_duration: number
          task_project_id: string
          task_parent_id?: string
          task_assignees?: string[]
        }
        Returns: string
      }
      get_project_member_role: {
        Args: { project_uuid: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_project_member: {
        Args: {
          project_uuid: string
          user_uuid: string
          required_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_project_owner: {
        Args: { project_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      backlog_status: "pending" | "in_progress" | "done" | "converted"
      user_role: "admin" | "editor" | "viewer"
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
      backlog_status: ["pending", "in_progress", "done", "converted"],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const
