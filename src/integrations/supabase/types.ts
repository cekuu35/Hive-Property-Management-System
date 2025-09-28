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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          landlord_id: string
          property_id: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          landlord_id: string
          property_id?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          landlord_id?: string
          property_id?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          caretaker_id: string
          category: string
          created_at: string
          current_stock: number
          id: string
          last_restocked: string | null
          minimum_stock: number
          name: string
          property_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          caretaker_id: string
          category: string
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked?: string | null
          minimum_stock?: number
          name: string
          property_id?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          caretaker_id?: string
          category?: string
          created_at?: string
          current_stock?: number
          id?: string
          last_restocked?: string | null
          minimum_stock?: number
          name?: string
          property_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      leases: {
        Row: {
          created_at: string
          deposit_amount: number
          end_date: string
          id: string
          lease_document_url: string | null
          rent_amount: number
          start_date: string
          status: string
          tenant_id: string
          tenant_info_id: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount: number
          end_date: string
          id?: string
          lease_document_url?: string | null
          rent_amount: number
          start_date: string
          status?: string
          tenant_id: string
          tenant_info_id?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number
          end_date?: string
          id?: string
          lease_document_url?: string | null
          rent_amount?: number
          start_date?: string
          status?: string
          tenant_id?: string
          tenant_info_id?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_info_id_fkey"
            columns: ["tenant_info_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          category: string
          completed_date: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          images: Json | null
          notes: string | null
          priority: string
          scheduled_date: string | null
          status: string
          tenant_id: string
          tenant_rating: number | null
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          category: string
          completed_date?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          notes?: string | null
          priority?: string
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          tenant_rating?: number | null
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          notes?: string | null
          priority?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          tenant_rating?: number | null
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message: string
          property_id: string | null
          read: boolean
          receiver_id: string
          sender_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          property_id?: string | null
          read?: boolean
          receiver_id: string
          sender_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          property_id?: string | null
          read?: boolean
          receiver_id?: string
          sender_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
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
          bio: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: Json | null
          created_at: string
          description: string | null
          id: string
          images: Json | null
          landlord_id: string
          name: string
          policies_documents: Json | null
          total_units: number
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          landlord_id: string
          name: string
          policies_documents?: Json | null
          total_units?: number
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          landlord_id?: string
          name?: string
          policies_documents?: Json | null
          total_units?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_notices: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          landlord_id: string
          priority: string
          property_id: string
          title: string
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          landlord_id: string
          priority?: string
          property_id: string
          title: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          landlord_id?: string
          priority?: string
          property_id?: string
          title?: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          late_fee: number | null
          lease_id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          status: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          late_fee?: number | null
          lease_id: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          late_fee?: number | null
          lease_id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          description: string
          id: string
          images: Json | null
          incident_type: string
          location: string | null
          property_id: string
          resolved_date: string | null
          security_id: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          images?: Json | null
          incident_type: string
          location?: string | null
          property_id: string
          resolved_date?: string | null
          security_id: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          images?: Json | null
          incident_type?: string
          location?: string | null
          property_id?: string
          resolved_date?: string | null
          security_id?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_logs_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_info: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          landlord_id: string
          last_name: string
          phone: string | null
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          landlord_id: string
          last_name: string
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          landlord_id?: string
          last_name?: string
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      unit_applications: {
        Row: {
          application_message: string | null
          created_at: string
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_at: string | null
          deposit_payment_reference: string | null
          documents: Json | null
          employment_info: Json | null
          id: string
          personal_references: Json | null
          preferred_move_in_date: string | null
          property_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          application_message?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_payment_reference?: string | null
          documents?: Json | null
          employment_info?: Json | null
          id?: string
          personal_references?: Json | null
          preferred_move_in_date?: string | null
          property_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          application_message?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_payment_reference?: string | null
          documents?: Json | null
          employment_info?: Json | null
          id?: string
          personal_references?: Json | null
          preferred_move_in_date?: string | null
          property_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          amenities: Json | null
          created_at: string
          deposit_amount: number
          id: string
          images: Json | null
          property_id: string
          rent_amount: number
          square_feet: number | null
          status: string
          type: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          created_at?: string
          deposit_amount: number
          id?: string
          images?: Json | null
          property_id: string
          rent_amount: number
          square_feet?: number | null
          status?: string
          type: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          created_at?: string
          deposit_amount?: number
          id?: string
          images?: Json | null
          property_id?: string
          rent_amount?: number
          square_feet?: number | null
          status?: string
          type?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expected_arrival: string
          expected_duration: number | null
          id: string
          purpose: string
          security_id: string | null
          security_notes: string | null
          special_instructions: string | null
          status: string
          tenant_id: string
          updated_at: string
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expected_arrival: string
          expected_duration?: number | null
          id?: string
          purpose: string
          security_id?: string | null
          security_notes?: string | null
          special_instructions?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expected_arrival?: string
          expected_duration?: number | null
          id?: string
          purpose?: string
          security_id?: string | null
          security_notes?: string | null
          special_instructions?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_requests_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          created_at: string
          emergency_contact: string | null
          id: string
          purpose: string
          security_id: string
          security_notes: string | null
          status: string
          time_in: string
          time_out: string | null
          updated_at: string
          visiting_tenant_id: string | null
          visiting_unit_id: string | null
          visitor_name: string
          visitor_phone: string | null
          visitor_request_id: string | null
        }
        Insert: {
          created_at?: string
          emergency_contact?: string | null
          id?: string
          purpose: string
          security_id: string
          security_notes?: string | null
          status?: string
          time_in?: string
          time_out?: string | null
          updated_at?: string
          visiting_tenant_id?: string | null
          visiting_unit_id?: string | null
          visitor_name: string
          visitor_phone?: string | null
          visitor_request_id?: string | null
        }
        Update: {
          created_at?: string
          emergency_contact?: string | null
          id?: string
          purpose?: string
          security_id?: string
          security_notes?: string | null
          status?: string
          time_in?: string
          time_out?: string | null
          updated_at?: string
          visiting_tenant_id?: string | null
          visiting_unit_id?: string | null
          visitor_name?: string
          visitor_phone?: string | null
          visitor_request_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      caretaker_can_view_tenant_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      current_user_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      debug_tenant_units: {
        Args: { tenant_profile_id: string }
        Returns: {
          assignment_type: string
          property_name: string
          status: string
          unit_id: string
          unit_number: string
        }[]
      }
      get_landlord_tenants: {
        Args: { landlord_profile_id: string }
        Returns: {
          property_name: string
          tenant_avatar_url: string
          tenant_first_name: string
          tenant_id: string
          tenant_last_name: string
          unit_number: string
        }[]
      }
      get_tenant_landlord: {
        Args: { tenant_profile_id: string }
        Returns: {
          landlord_avatar_url: string
          landlord_first_name: string
          landlord_id: string
          landlord_last_name: string
          property_name: string
          unit_number: string
        }[]
      }
      get_tenant_primary_unit: {
        Args: { tenant_profile_id: string }
        Returns: string
      }
      landlord_can_view_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      tenant_can_view_assigned_caretaker_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      tenant_can_view_landlord_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      user_can_view_lease: {
        Args: { _lease_id: string }
        Returns: boolean
      }
      user_can_view_unit: {
        Args: { _unit_id: string }
        Returns: boolean
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
