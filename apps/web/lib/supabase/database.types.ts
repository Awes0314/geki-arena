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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      charts: {
        Row: {
          chart_constant: number
          difficulty_type: string
          id: string
          level: string
          music_id: string
        }
        Insert: {
          chart_constant: number
          difficulty_type: string
          id?: string
          level: string
          music_id: string
        }
        Update: {
          chart_constant?: number
          difficulty_type?: string
          id?: string
          level?: string
          music_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charts_music_id_fkey"
            columns: ["music_id"]
            isOneToOne: false
            referencedRelation: "musics"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_participants: {
        Row: {
          best_submission_id: string | null
          competition_id: string
          joined_at: string
          removed_at: string | null
          removed_by: string | null
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          best_submission_id?: string | null
          competition_id: string
          joined_at?: string
          removed_at?: string | null
          removed_by?: string | null
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          best_submission_id?: string | null
          competition_id?: string
          joined_at?: string
          removed_at?: string | null
          removed_by?: string | null
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_best_submission_id_fkey"
            columns: ["best_submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition_status"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_participants_removed_by_fkey"
            columns: ["removed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_target_charts: {
        Row: {
          chart_id: string
          competition_id: string
          order_index: number
        }
        Insert: {
          chart_id: string
          competition_id: string
          order_index: number
        }
        Update: {
          chart_id?: string
          competition_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_target_charts_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_target_charts_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition_status"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "competition_target_charts_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          continuous_play_required: boolean
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_at: string
          id: string
          name: string
          organizer_id: string
          participation_rating_max_id: number | null
          participation_rating_min_id: number | null
          start_at: string
          updated_at: string
        }
        Insert: {
          continuous_play_required?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_at: string
          id?: string
          name: string
          organizer_id: string
          participation_rating_max_id?: number | null
          participation_rating_min_id?: number | null
          start_at: string
          updated_at?: string
        }
        Update: {
          continuous_play_required?: boolean
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_at?: string
          id?: string
          name?: string
          organizer_id?: string
          participation_rating_max_id?: number | null
          participation_rating_min_id?: number | null
          start_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_participation_rating_max_id_fkey"
            columns: ["participation_rating_max_id"]
            isOneToOne: false
            referencedRelation: "rating_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_participation_rating_min_id_fkey"
            columns: ["participation_rating_min_id"]
            isOneToOne: false
            referencedRelation: "rating_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_badges: {
        Row: {
          course_id: string
          id: string
          svg_asset_url: string
        }
        Insert: {
          course_id: string
          id?: string
          svg_asset_url: string
        }
        Update: {
          course_id?: string
          id?: string
          svg_asset_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_badges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_challenge_results: {
        Row: {
          achieved_at: string | null
          course_id: string
          latest_submission_id: string
          result: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          course_id: string
          latest_submission_id: string
          result: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          course_id?: string
          latest_submission_id?: string
          result?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_challenge_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_challenge_results_latest_submission_id_fkey"
            columns: ["latest_submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_challenge_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_charts: {
        Row: {
          chart_id: string
          course_id: string
          order_index: number
        }
        Insert: {
          chart_id: string
          course_id: string
          order_index: number
        }
        Update: {
          chart_id?: string
          course_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_charts_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_charts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          chapter_number: number
          clear_condition: Json
          course_name: string
          created_at: string
          id: string
          reward_badge_id: string
          updated_at: string
        }
        Insert: {
          chapter_number: number
          clear_condition: Json
          course_name: string
          created_at?: string
          id?: string
          reward_badge_id: string
          updated_at?: string
        }
        Update: {
          chapter_number?: number
          clear_condition?: Json
          course_name?: string
          created_at?: string
          id?: string
          reward_badge_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_reward_badge_id_fkey"
            columns: ["reward_badge_id"]
            isOneToOne: false
            referencedRelation: "course_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      musics: {
        Row: {
          artist: string
          genre: string | null
          id: string
          jacket_image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          artist: string
          genre?: string | null
          id: string
          jacket_image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string
          genre?: string | null
          id?: string
          jacket_image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      one_v_one_matches: {
        Row: {
          created_at: string
          creator_chart_id: string
          creator_id: string
          creator_submission_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          end_at: string | null
          id: string
          opponent_range_max: number | null
          opponent_range_min: number | null
          opponent_range_type: string | null
          opponent_selected_chart_id: string | null
          opponent_submission_id: string | null
          opponent_user_id: string | null
          random_range_max: number
          random_range_min: number
          random_range_type: string
          random_selected_chart_id: string | null
          recruiting_rating_max_id: number | null
          recruiting_rating_min_id: number | null
          start_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_chart_id: string
          creator_id: string
          creator_submission_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_at?: string | null
          id?: string
          opponent_range_max?: number | null
          opponent_range_min?: number | null
          opponent_range_type?: string | null
          opponent_selected_chart_id?: string | null
          opponent_submission_id?: string | null
          opponent_user_id?: string | null
          random_range_max: number
          random_range_min: number
          random_range_type: string
          random_selected_chart_id?: string | null
          recruiting_rating_max_id?: number | null
          recruiting_rating_min_id?: number | null
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_chart_id?: string
          creator_id?: string
          creator_submission_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_at?: string | null
          id?: string
          opponent_range_max?: number | null
          opponent_range_min?: number | null
          opponent_range_type?: string | null
          opponent_selected_chart_id?: string | null
          opponent_submission_id?: string | null
          opponent_user_id?: string | null
          random_range_max?: number
          random_range_min?: number
          random_range_type?: string
          random_selected_chart_id?: string | null
          recruiting_rating_max_id?: number | null
          recruiting_rating_min_id?: number | null
          start_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_v_one_matches_creator_chart_id_fkey"
            columns: ["creator_chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_creator_submission_id_fkey"
            columns: ["creator_submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_opponent_selected_chart_id_fkey"
            columns: ["opponent_selected_chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_opponent_submission_id_fkey"
            columns: ["opponent_submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_opponent_user_id_fkey"
            columns: ["opponent_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_random_selected_chart_id_fkey"
            columns: ["random_selected_chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_recruiting_rating_max_id_fkey"
            columns: ["recruiting_rating_max_id"]
            isOneToOne: false
            referencedRelation: "rating_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_v_one_matches_recruiting_rating_min_id_fkey"
            columns: ["recruiting_rating_min_id"]
            isOneToOne: false
            referencedRelation: "rating_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_logs: {
        Row: {
          action_type: string
          created_at: string
          detail: Json
          id: string
          operator_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          created_at?: string
          detail?: Json
          id?: string
          operator_id: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          created_at?: string
          detail?: Json
          id?: string
          operator_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_classes: {
        Row: {
          code: string
          id: number
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          id: number
          label: string
          sort_order: number
        }
        Update: {
          code?: string
          id?: number
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      score_submissions: {
        Row: {
          context_id: string
          context_type: string
          created_at: string
          id: string
          submitted_at: string
          submitter_id: string
          total_score: number
          update_applied: boolean
          validation_status: string
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          submitted_at?: string
          submitter_id: string
          total_score: number
          update_applied?: boolean
          validation_status: string
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          submitted_at?: string
          submitter_id?: string
          total_score?: number
          update_applied?: boolean
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      song_scores: {
        Row: {
          bell_count: string | null
          break_count: number | null
          chart_id: string | null
          critical_break: number | null
          damage_count: number | null
          hit_count: number | null
          jacket_image_url: string | null
          max_combo: number | null
          miss_count: number | null
          order_index: number
          play_date_time: string
          submission_id: string
          technical_score: number
        }
        Insert: {
          bell_count?: string | null
          break_count?: number | null
          chart_id?: string | null
          critical_break?: number | null
          damage_count?: number | null
          hit_count?: number | null
          jacket_image_url?: string | null
          max_combo?: number | null
          miss_count?: number | null
          order_index: number
          play_date_time: string
          submission_id: string
          technical_score: number
        }
        Update: {
          bell_count?: string | null
          break_count?: number | null
          chart_id?: string | null
          critical_break?: number | null
          damage_count?: number | null
          hit_count?: number | null
          jacket_image_url?: string | null
          max_combo?: number | null
          miss_count?: number | null
          order_index?: number
          play_date_time?: string
          submission_id?: string
          technical_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "song_scores_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_scores_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "score_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          displayed_badge_id: string | null
          icon_url: string | null
          id: string
          rating_class_id: number | null
          recovery_code_hash: string
          role: string
          settings: Json
          sns_links: Json
          status: string
          updated_at: string
          user_id: string
          user_no: number
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          displayed_badge_id?: string | null
          icon_url?: string | null
          id: string
          rating_class_id?: number | null
          recovery_code_hash: string
          role?: string
          settings?: Json
          sns_links?: Json
          status?: string
          updated_at?: string
          user_id: string
          user_no?: never
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          displayed_badge_id?: string | null
          icon_url?: string | null
          id?: string
          rating_class_id?: number | null
          recovery_code_hash?: string
          role?: string
          settings?: Json
          sns_links?: Json
          status?: string
          updated_at?: string
          user_id?: string
          user_no?: never
        }
        Relationships: [
          {
            foreignKeyName: "users_displayed_badge_id_fkey"
            columns: ["displayed_badge_id"]
            isOneToOne: false
            referencedRelation: "course_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_rating_class_id_fkey"
            columns: ["rating_class_id"]
            isOneToOne: false
            referencedRelation: "rating_classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      competition_rankings: {
        Row: {
          competition_id: string | null
          rank: number | null
          submitted_at: string | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition_status"
            referencedColumns: ["competition_id"]
          },
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_status: {
        Row: {
          competition_id: string | null
          status: string | null
        }
        Insert: {
          competition_id?: string | null
          status?: never
        }
        Update: {
          competition_id?: string | null
          status?: never
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
