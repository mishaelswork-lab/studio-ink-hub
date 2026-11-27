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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      artist_availability: {
        Row: {
          artist_id: string
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
          timezone: string | null
          weekday: number
        }
        Insert: {
          artist_id: string
          end_time: string
          id?: string
          is_active?: boolean | null
          start_time: string
          timezone?: string | null
          weekday: number
        }
        Update: {
          artist_id?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
          timezone?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_availability_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "artist_certifications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_leads: {
        Row: {
          artist_name: string
          city: string | null
          contact_permission: string | null
          country: string | null
          created_at: string | null
          id: string
          instagram_url: string | null
          lead_status: string | null
          notes: string | null
          qualification_score: number | null
          source: string | null
          studio_name: string | null
          styles: string[] | null
          website: string | null
        }
        Insert: {
          artist_name: string
          city?: string | null
          contact_permission?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          lead_status?: string | null
          notes?: string | null
          qualification_score?: number | null
          source?: string | null
          studio_name?: string | null
          styles?: string[] | null
          website?: string | null
        }
        Update: {
          artist_name?: string
          city?: string | null
          contact_permission?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          lead_status?: string | null
          notes?: string | null
          qualification_score?: number | null
          source?: string | null
          studio_name?: string | null
          styles?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      artists: {
        Row: {
          available: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          experience_years: number
          hourly_rate: number
          id: string
          name: string | null
          rejection_reason: string | null
          slug: string
          specialty: string | null
          status: string | null
          studio_name: string | null
          styles: string[] | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          available?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          experience_years?: number
          hourly_rate?: number
          id?: string
          name?: string | null
          rejection_reason?: string | null
          slug: string
          specialty?: string | null
          status?: string | null
          studio_name?: string | null
          styles?: string[] | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          available?: boolean
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          experience_years?: number
          hourly_rate?: number
          id?: string
          name?: string | null
          rejection_reason?: string | null
          slug?: string
          specialty?: string | null
          status?: string | null
          studio_name?: string | null
          styles?: string[] | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          artist_id: string
          ends_at: string
          id: string
          is_available: boolean | null
          reason: string | null
          starts_at: string
        }
        Insert: {
          artist_id: string
          ends_at: string
          id?: string
          is_available?: boolean | null
          reason?: string | null
          starts_at: string
        }
        Update: {
          artist_id?: string
          ends_at?: string
          id?: string
          is_available?: boolean | null
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_minor: number | null
          artist_id: string
          cover_charge_paid: boolean
          created_at: string | null
          currency: string | null
          customer_id: string | null
          design_request_id: string | null
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          starts_at: string
          status: string | null
        }
        Insert: {
          amount_minor?: number | null
          artist_id: string
          cover_charge_paid?: boolean
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          design_request_id?: string | null
          ends_at: string
          hold_expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          starts_at: string
          status?: string | null
        }
        Update: {
          amount_minor?: number | null
          artist_id?: string
          cover_charge_paid?: boolean
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          design_request_id?: string | null
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          starts_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_design_request_id_fkey"
            columns: ["design_request_id"]
            isOneToOne: false
            referencedRelation: "design_requests"
            referencedColumns: ["id"]
          },
        ]
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
          policy_version: string
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
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          artist_id: string
          created_at: string | null
          customer_id: string | null
          design_request_id: string | null
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          customer_id?: string | null
          design_request_id?: string | null
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          customer_id?: string | null
          design_request_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_design_request_id_fkey"
            columns: ["design_request_id"]
            isOneToOne: false
            referencedRelation: "design_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      design_requests: {
        Row: {
          artist_id: string
          brief: string
          created_at: string | null
          currency: string | null
          customer_id: string | null
          design_id: string | null
          id: string
          placement: string | null
          quoted_amount_minor: number | null
          reel_url: string | null
          reference_images: Json | null
          size_description: string | null
          status: string | null
        }
        Insert: {
          artist_id: string
          brief: string
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          design_id?: string | null
          id?: string
          placement?: string | null
          quoted_amount_minor?: number | null
          reel_url?: string | null
          reference_images?: Json | null
          size_description?: string | null
          status?: string | null
        }
        Update: {
          artist_id?: string
          brief?: string
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          design_id?: string | null
          id?: string
          placement?: string | null
          quoted_amount_minor?: number | null
          reel_url?: string | null
          reference_images?: Json | null
          size_description?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_requests_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_requests_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          artist_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          is_public: boolean | null
          placement: string | null
          style: string | null
          title: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_public?: boolean | null
          placement?: string | null
          style?: string | null
          title: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_public?: boolean | null
          placement?: string | null
          style?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
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
          expires_at: string
          id: string
          priority: number
        }
        Insert: {
          active?: boolean
          artist_id: string
          created_at?: string
          expires_at: string
          id?: string
          priority?: number
        }
        Update: {
          active?: boolean
          artist_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_connections: {
        Row: {
          access_token_ciphertext: string
          access_token_iv: string
          artist_id: string
          created_at: string
          id: string
          instagram_user_id: string
          instagram_username: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          access_token_iv: string
          artist_id: string
          created_at?: string
          id?: string
          instagram_user_id: string
          instagram_username: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          access_token_iv?: string
          artist_id?: string
          created_at?: string
          id?: string
          instagram_user_id?: string
          instagram_username?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_oauth_states: {
        Row: {
          artist_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          artist_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          state: string
          user_id: string
        }
        Update: {
          artist_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_oauth_states_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
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
          currency?: string
          expires_at?: string | null
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
          currency?: string
          expires_at?: string | null
          id?: string
          plan?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          body: string | null
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string | null
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
      payments: {
        Row: {
          amount_minor: number
          artist_id: string | null
          booking_id: string | null
          created_at: string | null
          currency: string
          customer_id: string | null
          id: string
          metadata: Json
          payment_type: string | null
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_signature: string | null
          status: string | null
        }
        Insert: {
          amount_minor: number
          artist_id?: string | null
          booking_id?: string | null
          created_at?: string | null
          currency: string
          customer_id?: string | null
          id?: string
          metadata?: Json
          payment_type?: string | null
          provider: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: string | null
        }
        Update: {
          amount_minor?: number
          artist_id?: string | null
          booking_id?: string | null
          created_at?: string | null
          currency?: string
          customer_id?: string | null
          id?: string
          metadata?: Json
          payment_type?: string | null
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          status?: string | null
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
          meta: Json
          url: string | null
          value: number | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          meta?: Json
          url?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          meta?: Json
          url?: string | null
          value?: number | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          approved: boolean | null
          artist_id: string
          caption: string | null
          created_at: string | null
          id: string
          instagram_media_id: string | null
          media_type: string | null
          media_url: string
          source_url: string | null
        }
        Insert: {
          approved?: boolean | null
          artist_id: string
          caption?: string | null
          created_at?: string | null
          id?: string
          instagram_media_id?: string | null
          media_type?: string | null
          media_url: string
          source_url?: string | null
        }
        Update: {
          approved?: boolean | null
          artist_id?: string
          caption?: string | null
          created_at?: string | null
          id?: string
          instagram_media_id?: string | null
          media_type?: string | null
          media_url?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chat_count: number
          city: string | null
          country: string | null
          created_at: string | null
          deletion_pending_at: string | null
          display_name: string
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          chat_count?: number
          city?: string | null
          country?: string | null
          created_at?: string | null
          deletion_pending_at?: string | null
          display_name: string
          id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          chat_count?: number
          city?: string | null
          country?: string | null
          created_at?: string | null
          deletion_pending_at?: string | null
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string | null
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
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
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
          instagram_media_id: string | null
          instagram_url: string | null
          likes: number
          moderation_reason: string | null
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
          instagram_media_id?: string | null
          instagram_url?: string | null
          likes?: number
          moderation_reason?: string | null
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
          instagram_media_id?: string | null
          instagram_url?: string | null
          likes?: number
          moderation_reason?: string | null
          moderation_status?: string
          source?: string
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "reels_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          artist_id: string
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          artist_id: string
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          artist_id?: string
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_designs: {
        Row: {
          created_at: string | null
          design_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          design_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          design_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_designs_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_designs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_review_artist: {
        Args: { p_artist_id: string; p_decision: string; p_reason?: string }
        Returns: {
          available: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          experience_years: number
          hourly_rate: number
          id: string
          name: string | null
          rejection_reason: string | null
          slug: string
          specialty: string | null
          status: string | null
          studio_name: string | null
          styles: string[] | null
          user_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "artists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_reel: {
        Args: { p_decision: string; p_reason?: string; p_reel_id: string }
        Returns: {
          moderation_status: string
          reel_id: string
        }[]
      }
      admin_write_audit: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_reason?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      artist_confirm_booking: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          booking_status: string
        }[]
      }
      artist_replace_weekly_availability: {
        Args: { p_schedule: Json }
        Returns: number
      }
      artist_resubmit_application: { Args: never; Returns: boolean }
      artist_set_availability: {
        Args: { p_available: boolean }
        Returns: boolean
      }
      artist_update_own_profile: {
        Args: {
          p_avatar_url?: string
          p_bio: string
          p_experience_years: number
          p_hourly_rate: number
          p_name: string
          p_specialty: string
          p_studio_name: string
        }
        Returns: {
          available: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          experience_years: number
          hourly_rate: number
          id: string
          name: string | null
          rejection_reason: string | null
          slug: string
          specialty: string | null
          status: string | null
          studio_name: string | null
          styles: string[] | null
          user_id: string | null
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "artists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_booking_hold: {
        Args: {
          p_artist_id: string
          p_brief: string
          p_ends_at: string
          p_idempotency_key: string
          p_placement: string
          p_service_type: string
          p_size_description: string
          p_starts_at: string
        }
        Returns: {
          booking_id: string
          booking_status: string
          design_request_id: string
          hold_expires_at: string
        }[]
      }
      finalize_razorpay_payment: {
        Args: {
          p_payment_id: string
          p_provider_payment_id: string
          p_provider_signature: string
        }
        Returns: Json
      }
      get_my_artist_profile: {
        Args: never
        Returns: {
          available: boolean
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          experience_years: number
          hourly_rate: number
          id: string
          name: string | null
          rejection_reason: string | null
          slug: string
          specialty: string | null
          status: string | null
          studio_name: string | null
          styles: string[] | null
          user_id: string | null
          verified_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "artists"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      prepare_account_deletion: { Args: { p_user_id: string }; Returns: Json }
      start_consultation: {
        Args: { p_artist_id: string; p_brief: string; p_reference_images?: Json }
        Returns: string
      }
      conversation_peer: {
        Args: { p_conversation_id: string }
        Returns: { peer_user_id: string; peer_name: string | null; peer_avatar_url: string | null }[]
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
