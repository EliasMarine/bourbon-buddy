export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Account: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: string
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: string
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id: string
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId: string
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: string
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Account_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_account_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Comment: {
        Row: {
          content: string
          createdAt: string
          id: string
          reviewId: string | null
          updatedAt: string
          userId: string
          videoId: string | null
        }
        Insert: {
          content: string
          createdAt?: string
          id?: string
          reviewId?: string | null
          updatedAt?: string
          userId: string
          videoId?: string | null
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          reviewId?: string | null
          updatedAt?: string
          userId?: string
          videoId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Comment_reviewId_fkey"
            columns: ["reviewId"]
            isOneToOne: false
            referencedRelation: "Review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Comment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Comment_videoId_fkey"
            columns: ["videoId"]
            isOneToOne: false
            referencedRelation: "Video"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comment_review"
            columns: ["reviewId"]
            isOneToOne: false
            referencedRelation: "Review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comment_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comment_video"
            columns: ["videoId"]
            isOneToOne: false
            referencedRelation: "Video"
            referencedColumns: ["id"]
          },
        ]
      }
      Follows: {
        Row: {
          createdAt: string
          followerId: string
          followingId: string
        }
        Insert: {
          createdAt?: string
          followerId: string
          followingId: string
        }
        Update: {
          createdAt?: string
          followerId?: string
          followingId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_follows_follower"
            columns: ["followerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_follows_following"
            columns: ["followingId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Follows_followerId_fkey"
            columns: ["followerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Follows_followingId_fkey"
            columns: ["followingId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Review: {
        Row: {
          content: string
          createdAt: string
          id: string
          rating: number
          spiritId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          rating?: number
          spiritId: string
          updatedAt: string
          userId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          rating?: number
          spiritId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_review_spirit"
            columns: ["spiritId"]
            isOneToOne: false
            referencedRelation: "Spirit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_review_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Review_spiritId_fkey"
            columns: ["spiritId"]
            isOneToOne: false
            referencedRelation: "Spirit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Review_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Session: {
        Row: {
          expires: string
          id: string
          sessionToken: string
          userId: string
        }
        Insert: {
          expires: string
          id: string
          sessionToken: string
          userId: string
        }
        Update: {
          expires?: string
          id?: string
          sessionToken?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_session_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Session_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Spirit: {
        Row: {
          bottleLevel: number | null
          bottleSize: string | null
          brand: string
          category: string
          createdAt: string
          dateAcquired: string | null
          deletedAt: string | null
          description: string | null
          distillery: string | null
          finish: string | null
          id: string
          imageUrl: string | null
          isFavorite: boolean
          name: string
          nose: string | null
          notes: string | null
          ownerId: string
          palate: string | null
          price: number | null
          proof: number | null
          rating: number | null
          type: string
          updatedAt: string
        }
        Insert: {
          bottleLevel?: number | null
          bottleSize?: string | null
          brand: string
          category?: string
          createdAt?: string
          dateAcquired?: string | null
          deletedAt?: string | null
          description?: string | null
          distillery?: string | null
          finish?: string | null
          id: string
          imageUrl?: string | null
          isFavorite?: boolean
          name: string
          nose?: string | null
          notes?: string | null
          ownerId: string
          palate?: string | null
          price?: number | null
          proof?: number | null
          rating?: number | null
          type: string
          updatedAt: string
        }
        Update: {
          bottleLevel?: number | null
          bottleSize?: string | null
          brand?: string
          category?: string
          createdAt?: string
          dateAcquired?: string | null
          deletedAt?: string | null
          description?: string | null
          distillery?: string | null
          finish?: string | null
          id?: string
          imageUrl?: string | null
          isFavorite?: boolean
          name?: string
          nose?: string | null
          notes?: string | null
          ownerId?: string
          palate?: string | null
          price?: number | null
          proof?: number | null
          rating?: number | null
          type?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_spirit_owner"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Spirit_ownerId_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Stream: {
        Row: {
          createdAt: string
          description: string | null
          endedAt: string | null
          hostId: string
          id: string
          isLive: boolean
          privacy: string
          spiritId: string | null
          startedAt: string | null
          title: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          endedAt?: string | null
          hostId: string
          id: string
          isLive?: boolean
          privacy?: string
          spiritId?: string | null
          startedAt?: string | null
          title: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          endedAt?: string | null
          hostId?: string
          id?: string
          isLive?: boolean
          privacy?: string
          spiritId?: string | null
          startedAt?: string | null
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stream_host"
            columns: ["hostId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stream_spirit"
            columns: ["spiritId"]
            isOneToOne: false
            referencedRelation: "Spirit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Stream_hostId_fkey"
            columns: ["hostId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Stream_spiritId_fkey"
            columns: ["spiritId"]
            isOneToOne: false
            referencedRelation: "Spirit"
            referencedColumns: ["id"]
          },
        ]
      }
      StreamLike: {
        Row: {
          createdAt: string
          id: string
          streamId: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          streamId: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          streamId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_streamlike_stream"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streamlike_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamLike_streamId_fkey"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamLike_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StreamReport: {
        Row: {
          createdAt: string
          id: string
          reason: string | null
          status: string
          streamId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          reason?: string | null
          status?: string
          streamId: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          reason?: string | null
          status?: string
          streamId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_streamreport_stream"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streamreport_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamReport_streamId_fkey"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamReport_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StreamSubscription: {
        Row: {
          createdAt: string
          hostId: string
          id: string
          userId: string
        }
        Insert: {
          createdAt?: string
          hostId: string
          id: string
          userId: string
        }
        Update: {
          createdAt?: string
          hostId?: string
          id?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_streamsubscription_host"
            columns: ["hostId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streamsubscription_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamSubscription_hostId_fkey"
            columns: ["hostId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamSubscription_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      StreamTip: {
        Row: {
          amount: number
          createdAt: string
          hostId: string
          id: string
          message: string | null
          senderId: string
          streamId: string
        }
        Insert: {
          amount: number
          createdAt?: string
          hostId: string
          id: string
          message?: string | null
          senderId: string
          streamId: string
        }
        Update: {
          amount?: number
          createdAt?: string
          hostId?: string
          id?: string
          message?: string | null
          senderId?: string
          streamId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_streamtip_host"
            columns: ["hostId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streamtip_sender"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streamtip_stream"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamTip_hostId_fkey"
            columns: ["hostId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamTip_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamTip_streamId_fkey"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
        ]
      }
      StreamView: {
        Row: {
          id: string
          joinedAt: string
          leftAt: string | null
          streamId: string
          userId: string
        }
        Insert: {
          id: string
          joinedAt?: string
          leftAt?: string | null
          streamId: string
          userId: string
        }
        Update: {
          id?: string
          joinedAt?: string
          leftAt?: string | null
          streamId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_streamview_stream"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_streamview_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamView_streamId_fkey"
            columns: ["streamId"]
            isOneToOne: false
            referencedRelation: "Stream"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "StreamView_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          bio: string | null
          coverPhoto: string | null
          createdAt: string
          education: string | null
          email: string
          emailVerified: string | null
          id: string
          image: string | null
          location: string | null
          name: string | null
          occupation: string | null
          password: string | null
          publicProfile: boolean
          resetToken: string | null
          resetTokenExpiry: string | null
          updatedAt: string
          username: string | null
        }
        Insert: {
          bio?: string | null
          coverPhoto?: string | null
          createdAt?: string
          education?: string | null
          email: string
          emailVerified?: string | null
          id?: string
          image?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          password?: string | null
          publicProfile?: boolean
          resetToken?: string | null
          resetTokenExpiry?: string | null
          updatedAt: string
          username?: string | null
        }
        Update: {
          bio?: string | null
          coverPhoto?: string | null
          createdAt?: string
          education?: string | null
          email?: string
          emailVerified?: string | null
          id?: string
          image?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          password?: string | null
          publicProfile?: boolean
          resetToken?: string | null
          resetTokenExpiry?: string | null
          updatedAt?: string
          username?: string | null
        }
        Relationships: []
      }
      User_backup: {
        Row: {
          bio: string | null
          coverPhoto: string | null
          createdAt: string | null
          education: string | null
          email: string | null
          emailVerified: string | null
          id: string | null
          image: string | null
          location: string | null
          name: string | null
          occupation: string | null
          password: string | null
          publicProfile: boolean | null
          resetToken: string | null
          resetTokenExpiry: string | null
          updatedAt: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          coverPhoto?: string | null
          createdAt?: string | null
          education?: string | null
          email?: string | null
          emailVerified?: string | null
          id?: string | null
          image?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          password?: string | null
          publicProfile?: boolean | null
          resetToken?: string | null
          resetTokenExpiry?: string | null
          updatedAt?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          coverPhoto?: string | null
          createdAt?: string | null
          education?: string | null
          email?: string | null
          emailVerified?: string | null
          id?: string | null
          image?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          password?: string | null
          publicProfile?: boolean | null
          resetToken?: string | null
          resetTokenExpiry?: string | null
          updatedAt?: string | null
          username?: string | null
        }
        Relationships: []
      }
      User_id_backup: {
        Row: {
          changed_at: string | null
          new_uuid: string | null
          original_id: string | null
        }
        Insert: {
          changed_at?: string | null
          new_uuid?: string | null
          original_id?: string | null
        }
        Update: {
          changed_at?: string | null
          new_uuid?: string | null
          original_id?: string | null
        }
        Relationships: []
      }
      VerificationToken: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_verificationtoken_user"
            columns: ["identifier"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["email"]
          },
        ]
      }
      Video: {
        Row: {
          aspectRatio: string | null
          createdAt: string
          description: string | null
          duration: number | null
          id: string
          muxAssetId: string | null
          muxPlaybackId: string | null
          muxUploadId: string | null
          publiclyListed: boolean
          status: string
          thumbnailTime: number | null
          title: string
          updatedAt: string
          userId: string | null
          views: number
        }
        Insert: {
          aspectRatio?: string | null
          createdAt?: string
          description?: string | null
          duration?: number | null
          id: string
          muxAssetId?: string | null
          muxPlaybackId?: string | null
          muxUploadId?: string | null
          publiclyListed?: boolean
          status?: string
          thumbnailTime?: number | null
          title: string
          updatedAt: string
          userId?: string | null
          views?: number
        }
        Update: {
          aspectRatio?: string | null
          createdAt?: string
          description?: string | null
          duration?: number | null
          id?: string
          muxAssetId?: string | null
          muxPlaybackId?: string | null
          muxUploadId?: string | null
          publiclyListed?: boolean
          status?: string
          thumbnailTime?: number | null
          title?: string
          updatedAt?: string
          userId?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_video_user"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Video_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_video: {
        Args: {
          p_title: string
          p_description: string
          p_mux_upload_id: string
          p_user_id: string
          p_mux_playback_id: string
        }
        Returns: string
      }
      check_user_auth_sync: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
          auth_users_count: number
          db_users_count: number
          missing_from_db_count: number
          orphaned_in_db_count: number
        }[]
      }
      remove_orphaned_users: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      sync_missing_users: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      sync_users_with_auth: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          count: number
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
