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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      artist_certifications: {
        Row: {
          artist_id: string
          certificate_url: string | null
          certification_name: string
          created_at: string
          id: string
          issuing_body: string | null
          verified: boolean
        }
        Insert: {
          artist_id: string
          certificate_url?: string | null
          certification_name: string
          created_at?: string
          id?: string
          issuing_body?: string | null
          verified?: boolean
        }
        Update: {
          artist_id?: string
          certificate_url?: string | null
          certification_name?: string
          created_at?: string
          id?: string
          issuing_body?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      artists: {
        Row: {
          application_status: string
          availability_hours: Json | null
          available: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          experience_years: number | null
          hourly_rate: number
          id: string
          instagram_url: string | null
          name: string
          portfolio_images: string[] | null
          rating: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          studio_name: string | null
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_status?: string
          availability_hours?: Json | null
          available?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number
          id?: string
          instagram_url?: string | null
          name: string
          portfolio_images?: string[] | null
          rating?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          studio_name?: string | null
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_status?: string
          availability_hours?: Json | null
          available?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number
          id?: string
          instagram_url?: string | null
          name?: string
          portfolio_images?: string[] | null
          rating?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          studio_name?: string | null
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          ip: string | null
          kind: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          ip?: string | null
          kind: string
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          ip?: string | null
          kind?: string
          success?: boolean
        }
        Relationships: []
      }
      booking_notifications: {
        Row: {
          booking_id: string
          created_at: string
          event: string
          id: string
          message: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          event: string
          id?: string
          message?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          event?: string
          id?: string
          message?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          artist_id: string
          cover_charge_paid: boolean | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          date: string
          description: string | null
          id: string
          placement: string
          size: string | null
          status: string
          style: string
          time: string
          total_estimate: number | null
          updated_at: string
        }
        Insert: {
          artist_id: string
          cover_charge_paid?: boolean | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          date: string
          description?: string | null
          id?: string
          placement: string
          size?: string | null
          status?: string
          style: string
          time: string
          total_estimate?: number | null
          updated_at?: string
        }
        Update: {
          artist_id?: string
          cover_charge_paid?: boolean | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          date?: string
          description?: string | null
          id?: string
          placement?: string
          size?: string | null
          status?: string
          style?: string
          time?: string
          total_estimate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      change_audit_log: {
        Row: {
          changed_by: string | null
          changed_fields: Json | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_by?: string | null
          changed_fields?: Json | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_by?: string | null
          changed_fields?: Json | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          anon_id: string | null
          created_at: string
          granted: boolean
          id: string
          policy_version: string
          purpose: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string
          granted: boolean
          id?: string
          policy_version?: string
          purpose: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string
          granted?: boolean
          id?: string
          policy_version?: string
          purpose?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      consultation_messages: {
        Row: {
          consultation_id: string
          created_at: string
          id: string
          image_url: string | null
          message: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          consultation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          consultation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          artist_id: string
          created_at: string
          customer_id: string
          design_description: string | null
          id: string
          reference_images: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          customer_id: string
          design_description?: string | null
          id?: string
          reference_images?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          customer_id?: string
          design_description?: string | null
          id?: string
          reference_images?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_designs: {
        Row: {
          description: string | null
          external_id: string
          fetched_at: string
          id: string
          image_url: string
          photographer: string | null
          source_url: string | null
          thumb_url: string | null
        }
        Insert: {
          description?: string | null
          external_id: string
          fetched_at?: string
          id?: string
          image_url: string
          photographer?: string | null
          source_url?: string | null
          thumb_url?: string | null
        }
        Update: {
          description?: string | null
          external_id?: string
          fetched_at?: string
          id?: string
          image_url?: string
          photographer?: string | null
          source_url?: string | null
          thumb_url?: string | null
        }
        Relationships: []
      }
      design_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          design_id: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          design_id: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          design_id?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_reports_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "daily_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      design_views: {
        Row: {
          design_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          design_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          design_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_views_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "daily_designs"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      featured_artists: {
        Row: {
          active: boolean
          artist_id: string
          created_at: string
          expires_at: string | null
          id: string
          priority: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          artist_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          priority?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          artist_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      featured_requests: {
        Row: {
          admin_notes: string | null
          artist_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          artist_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          artist_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          plan: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_leads: {
        Row: {
          city: string | null
          contacted: boolean
          contacted_at: string | null
          created_at: string
          email: string | null
          id: string
          instagram_url: string | null
          name: string | null
          source_url: string | null
        }
        Insert: {
          city?: string | null
          contacted?: boolean
          contacted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_url?: string | null
          name?: string | null
          source_url?: string | null
        }
        Update: {
          city?: string | null
          contacted?: boolean
          contacted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instagram_url?: string | null
          name?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          artist_id: string | null
          booking_id: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          id: string
          payment_type: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          artist_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          id?: string
          payment_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          artist_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          id?: string
          payment_type?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      perf_metrics: {
        Row: {
          created_at: string
          event: string
          id: string
          meta: Json | null
          url: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          meta?: Json | null
          url?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          meta?: Json | null
          url?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chat_count: number
          created_at: string
          display_name: string | null
          id: string
          last_active_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          chat_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          chat_count?: number
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reels: {
        Row: {
          artist_id: string
          caption: string | null
          created_at: string
          id: string
          instagram_url: string | null
          likes: number
          moderation_status: string
          source: string
          thumbnail_url: string | null
          updated_at: string
          video_url: string
          views: number
        }
        Insert: {
          artist_id: string
          caption?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          likes?: number
          moderation_status?: string
          source?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url: string
          views?: number
        }
        Update: {
          artist_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          instagram_url?: string | null
          likes?: number
          moderation_status?: string
          source?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "reels_artist_fk"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          used: boolean
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          used?: boolean
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          used?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artist_id: string
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number
        }
        Insert: {
          artist_id: string
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating: number
        }
        Update: {
          artist_id?: string
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          category: string
          created_at: string
          event: string
          id: string
          meta: Json
        }
        Insert: {
          category: string
          created_at?: string
          event: string
          id?: string
          meta?: Json
        }
        Update: {
          category?: string
          created_at?: string
          event?: string
          id?: string
          meta?: Json
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      artist_confirm_booking: {
        Args: { p_booking_id: string }
        Returns: { booking_id: string; booking_status: string }[]
      }
      create_booking_hold: {
        Args: {
          p_artist_id: string
          p_starts_at: string
          p_ends_at: string
          p_service_type: string
          p_brief: string
          p_placement: string
          p_size_description: string
          p_idempotency_key: string
        }
        Returns: {
          booking_id: string
          design_request_id: string
          booking_status: string
          hold_expires_at: string
        }[]
      }
      can_write_media: { Args: { _name: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      in_consultation_path: { Args: { _name: string }; Returns: boolean }
      is_blocked_pair: { Args: { _a: string; _b: string }; Returns: boolean }
      shares_consultation: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "artist" | "admin"
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
  public: {
    Enums: {
      app_role: ["customer", "artist", "admin"],
    },
  },
} as const
