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
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_adjustments: {
        Row: {
          amount: number
          applied_by: string
          applied_to_payment_id: string | null
          approved_by: string | null
          created_at: string | null
          description: string
          id: string
          landlord_id: string
          status: string | null
          subscription_id: string
          type: string
        }
        Insert: {
          amount: number
          applied_by: string
          applied_to_payment_id?: string | null
          approved_by?: string | null
          created_at?: string | null
          description: string
          id?: string
          landlord_id: string
          status?: string | null
          subscription_id: string
          type: string
        }
        Update: {
          amount?: number
          applied_by?: string
          applied_to_payment_id?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string
          id?: string
          landlord_id?: string
          status?: string | null
          subscription_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_adjustments_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_applied_to_payment_id_fkey"
            columns: ["applied_to_payment_id"]
            isOneToOne: false
            referencedRelation: "subscription_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_adjustments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      caretakers: {
        Row: {
          access_level: string | null
          created_at: string | null
          email: string
          employee_id: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          landlord_id: string
          last_name: string
          phone: string | null
          property_id: string
          responsibilities: string[] | null
          shift_schedule: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          email: string
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_id: string
          last_name: string
          phone?: string | null
          property_id: string
          responsibilities?: string[] | null
          shift_schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_id?: string
          last_name?: string
          phone?: string | null
          property_id?: string
          responsibilities?: string[] | null
          shift_schedule?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caretakers_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caretakers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          description: string | null
          email: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          landlord_id: string
          name: string
          phone: string | null
          rating: number
          rating_count: number
          specialty: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          landlord_id: string
          name: string
          phone?: string | null
          rating?: number
          rating_count?: number
          specialty: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          landlord_id?: string
          name?: string
          phone?: string | null
          rating?: number
          rating_count?: number
          specialty?: string
          updated_at?: string
        }
        Relationships: []
      }
      cron_log: {
        Row: {
          created_at: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          applicable_plans: Json | null
          code: string
          created_at: string | null
          created_by: string | null
          current_redemptions: number | null
          duration: string
          duration_in_months: number | null
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          type: string
          updated_at: string | null
          valid_from: string
          valid_until: string | null
          value: number
        }
        Insert: {
          applicable_plans?: Json | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_redemptions?: number | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          type: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
          value: number
        }
        Update: {
          applicable_plans?: Json | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_redemptions?: number | null
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          type?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          available_hours: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string
          contact_type: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_24_7: boolean | null
          is_active: boolean | null
          landlord_id: string
          property_id: string
          updated_at: string | null
        }
        Insert: {
          available_hours?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone: string
          contact_type: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_24_7?: boolean | null
          is_active?: boolean | null
          landlord_id: string
          property_id: string
          updated_at?: string | null
        }
        Update: {
          available_hours?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string
          contact_type?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_24_7?: boolean | null
          is_active?: boolean | null
          landlord_id?: string
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
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
      landlord_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          landlord_id: string
          metadata: Json | null
          plan_id: string
          status: string
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          landlord_id: string
          metadata?: Json | null
          plan_id: string
          status?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          landlord_id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landlord_subscriptions_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landlord_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      landlords: {
        Row: {
          account_reference: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          paybill_number: string | null
          phone: string | null
          profile_id: string | null
          subaccount_code: string
          updated_at: string | null
        }
        Insert: {
          account_reference?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          paybill_number?: string | null
          phone?: string | null
          profile_id?: string | null
          subaccount_code: string
          updated_at?: string | null
        }
        Update: {
          account_reference?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          paybill_number?: string | null
          phone?: string | null
          profile_id?: string | null
          subaccount_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landlords_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_templates: {
        Row: {
          additional_terms: Json | null
          content: Json | null
          created_at: string | null
          footer_content: string | null
          header_content: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          landlord_contact: Json | null
          landlord_id: string
          name: string
          standard_terms: string | null
          terms_version: string | null
          updated_at: string | null
        }
        Insert: {
          additional_terms?: Json | null
          content?: Json | null
          created_at?: string | null
          footer_content?: string | null
          header_content?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          landlord_contact?: Json | null
          landlord_id: string
          name: string
          standard_terms?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_terms?: Json | null
          content?: Json | null
          created_at?: string | null
          footer_content?: string | null
          header_content?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          landlord_contact?: Json | null
          landlord_id?: string
          name?: string
          standard_terms?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      leases: {
        Row: {
          created_at: string
          deposit_amount: number
          end_date: string
          id: string
          late_fee_grace_period_days: number | null
          late_fee_max_percentage: number | null
          late_fee_type: string | null
          late_fee_value: number | null
          lease_document_url: string | null
          rent_amount: number
          security_deposit: number | null
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
          late_fee_grace_period_days?: number | null
          late_fee_max_percentage?: number | null
          late_fee_type?: string | null
          late_fee_value?: number | null
          lease_document_url?: string | null
          rent_amount: number
          security_deposit?: number | null
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
          late_fee_grace_period_days?: number | null
          late_fee_max_percentage?: number | null
          late_fee_type?: string | null
          late_fee_value?: number | null
          lease_document_url?: string | null
          rent_amount?: number
          security_deposit?: number | null
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_info_id_fkey"
            columns: ["tenant_info_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["tenant_id"]
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
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
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
      leases_backup: {
        Row: {
          created_at: string | null
          deposit_amount: number | null
          end_date: string | null
          id: string | null
          lease_document_url: string | null
          rent_amount: number | null
          start_date: string | null
          status: string | null
          tenant_id: string | null
          tenant_info_id: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          id?: string | null
          lease_document_url?: string | null
          rent_amount?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          tenant_info_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          id?: string | null
          lease_document_url?: string | null
          rent_amount?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string | null
          tenant_info_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_contractor_id: string | null
          assigned_to: string | null
          category: string
          completed_date: string | null
          cost_deducted_from_deposit: boolean | null
          cost_deduction_date: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          images: Json | null
          maintenance_cost: number | null
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
          assigned_contractor_id?: string | null
          assigned_to?: string | null
          category: string
          completed_date?: string | null
          cost_deducted_from_deposit?: boolean | null
          cost_deduction_date?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          maintenance_cost?: number | null
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
          assigned_contractor_id?: string | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          cost_deducted_from_deposit?: boolean | null
          cost_deduction_date?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          images?: Json | null
          maintenance_cost?: number | null
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
            foreignKeyName: "maintenance_requests_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
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
      notification_preferences: {
        Row: {
          application_updates: boolean
          created_at: string
          email_enabled: boolean
          id: string
          lease_updates: boolean
          maintenance_updates: boolean
          messages: boolean
          payment_confirmations: boolean
          profile_id: string
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          rent_reminders: boolean
          security_alerts: boolean
          sms_enabled: boolean
          updated_at: string
          visitor_notifications: boolean
        }
        Insert: {
          application_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          lease_updates?: boolean
          maintenance_updates?: boolean
          messages?: boolean
          payment_confirmations?: boolean
          profile_id: string
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          rent_reminders?: boolean
          security_alerts?: boolean
          sms_enabled?: boolean
          updated_at?: string
          visitor_notifications?: boolean
        }
        Update: {
          application_updates?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          lease_updates?: boolean
          maintenance_updates?: boolean
          messages?: boolean
          payment_confirmations?: boolean
          profile_id?: string
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          rent_reminders?: boolean
          security_alerts?: boolean
          sms_enabled?: boolean
          updated_at?: string
          visitor_notifications?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          data: Json | null
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
          data?: Json | null
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
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          bill_id: string | null
          checkout_request_id: string
          created_at: string | null
          id: string
          lease_id: string | null
          merchant_request_id: string | null
          phone_number: string
          result_code: number | null
          result_description: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bill_id?: string | null
          checkout_request_id: string
          created_at?: string | null
          id?: string
          lease_id?: string | null
          merchant_request_id?: string | null
          phone_number: string
          result_code?: number | null
          result_description?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string | null
          checkout_request_id?: string
          created_at?: string | null
          id?: string
          lease_id?: string | null
          merchant_request_id?: string | null
          phone_number?: string
          result_code?: number | null
          result_description?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "unit_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["lease_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          landlord_id: string
          lease_id: string | null
          paid_at: string | null
          payment_method: string | null
          paystack_reference: string | null
          paystack_response: Json | null
          property_id: string | null
          reference: string
          status: string
          subaccount_code: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          landlord_id: string
          lease_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          paystack_reference?: string | null
          paystack_response?: Json | null
          property_id?: string | null
          reference: string
          status?: string
          subaccount_code?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          landlord_id?: string
          lease_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          paystack_reference?: string | null
          paystack_response?: Json | null
          property_id?: string | null
          reference?: string
          status?: string
          subaccount_code?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_payments: {
        Row: {
          amount: number
          bill_id: string | null
          created_at: string | null
          email: string
          id: string
          reference: string
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bill_id?: string | null
          created_at?: string | null
          email: string
          id: string
          reference: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          reference?: string
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "unit_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          kcb_account_name: string | null
          kcb_account_number: string | null
          kcb_branch: string | null
          kcb_payments_enabled: boolean | null
          last_name: string | null
          license_number: string | null
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          kcb_account_name?: string | null
          kcb_account_number?: string | null
          kcb_branch?: string | null
          kcb_payments_enabled?: boolean | null
          last_name?: string | null
          license_number?: string | null
          phone?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          kcb_account_name?: string | null
          kcb_account_number?: string | null
          kcb_branch?: string | null
          kcb_payments_enabled?: boolean | null
          last_name?: string | null
          license_number?: string | null
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
      property_inventory: {
        Row: {
          category: string
          cost_per_unit: number | null
          created_at: string
          current_stock: number
          id: string
          item_name: string
          last_restocked_at: string | null
          last_restocked_by: string | null
          location: string | null
          minimum_stock: number
          notes: string | null
          property_id: string
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          item_name: string
          last_restocked_at?: string | null
          last_restocked_by?: string | null
          location?: string | null
          minimum_stock?: number
          notes?: string | null
          property_id: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          item_name?: string
          last_restocked_at?: string | null
          last_restocked_by?: string | null
          location?: string | null
          minimum_stock?: number
          notes?: string | null
          property_id?: string
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_inventory_last_restocked_by_fkey"
            columns: ["last_restocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inventory_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      push_notification_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          notification_id: string | null
          payload: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_id?: string | null
          payload: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_id?: string | null
          payload?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh: string
          profile_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh: string
          profile_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh?: string
          profile_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          processed_by_cron: boolean | null
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
          processed_by_cron?: boolean | null
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
          processed_by_cron?: boolean | null
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
          {
            foreignKeyName: "rent_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["lease_id"]
          },
        ]
      }
      security_deposit_deductions: {
        Row: {
          created_at: string | null
          deducted_at: string | null
          deducted_by: string | null
          deduction_amount: number
          deduction_reason: string
          id: string
          maintenance_request_id: string | null
          notes: string | null
          remaining_balance: number
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deducted_at?: string | null
          deducted_by?: string | null
          deduction_amount: number
          deduction_reason: string
          id?: string
          maintenance_request_id?: string | null
          notes?: string | null
          remaining_balance: number
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deducted_at?: string | null
          deducted_by?: string | null
          deduction_amount?: number
          deduction_reason?: string
          id?: string
          maintenance_request_id?: string | null
          notes?: string | null
          remaining_balance?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_deposit_deductions_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_deposit_deductions_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_with_contractor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_deposit_deductions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "security_deposit_deductions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
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
      security_patrols: {
        Row: {
          created_at: string | null
          duration_minutes: number
          end_time: string | null
          id: string
          location: string
          notes: string | null
          property_id: string
          scheduled_time: string
          security_id: string
          start_time: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          location: string
          notes?: string | null
          property_id: string
          scheduled_time: string
          security_id: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number
          end_time?: string | null
          id?: string
          location?: string
          notes?: string | null
          property_id?: string
          scheduled_time?: string
          security_id?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_patrols_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_patrols_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_personnel: {
        Row: {
          access_level: string | null
          created_at: string | null
          email: string
          employee_id: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          landlord_id: string
          last_name: string
          phone: string | null
          property_id: string
          shift_schedule: string | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          email: string
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_id: string
          last_name: string
          phone?: string | null
          property_id: string
          shift_schedule?: string | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          landlord_id?: string
          last_name?: string
          phone?: string | null
          property_id?: string
          shift_schedule?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_personnel_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "landlords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_personnel_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          property_id: string
          role: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          property_id: string
          role: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          property_id?: string
          role?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_discounts: {
        Row: {
          applied_by: string | null
          created_at: string | null
          discount_code_id: string | null
          end_date: string | null
          id: string
          reason: string | null
          start_date: string
          subscription_id: string
          type: string
          value: number
        }
        Insert: {
          applied_by?: string | null
          created_at?: string | null
          discount_code_id?: string | null
          end_date?: string | null
          id?: string
          reason?: string | null
          start_date?: string
          subscription_id: string
          type: string
          value: number
        }
        Update: {
          applied_by?: string | null
          created_at?: string | null
          discount_code_id?: string | null
          end_date?: string | null
          id?: string
          reason?: string | null
          start_date?: string
          subscription_id?: string
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_discounts_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_discounts_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_discounts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          landlord_id: string
          metadata: Json | null
          new_plan_id: string | null
          new_status: string | null
          notes: string | null
          old_plan_id: string | null
          old_status: string | null
          performed_by: string | null
          subscription_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          landlord_id: string
          metadata?: Json | null
          new_plan_id?: string | null
          new_status?: string | null
          notes?: string | null
          old_plan_id?: string | null
          old_status?: string | null
          performed_by?: string | null
          subscription_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          landlord_id?: string
          metadata?: Json | null
          new_plan_id?: string | null
          new_status?: string | null
          notes?: string | null
          old_plan_id?: string | null
          old_status?: string | null
          performed_by?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_new_plan_id_fkey"
            columns: ["new_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_old_plan_id_fkey"
            columns: ["old_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_overrides: {
        Row: {
          applied_by: string
          created_at: string | null
          id: string
          override_key: string
          override_type: string
          override_value: Json
          reason: string | null
          subscription_id: string
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          applied_by: string
          created_at?: string | null
          id?: string
          override_key: string
          override_type: string
          override_value: Json
          reason?: string | null
          subscription_id: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          applied_by?: string
          created_at?: string | null
          id?: string
          override_key?: string
          override_type?: string
          override_value?: Json
          reason?: string | null
          subscription_id?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_overrides_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_overrides_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          landlord_id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          result_description: string | null
          status: string
          subscription_id: string
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          landlord_id: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          result_description?: string | null
          status?: string
          subscription_id: string
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          landlord_id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          result_description?: string | null
          status?: string
          subscription_id?: string
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string | null
          currency: string | null
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean | null
          limits: Json
          name: string
          price: number
          sort_order: number | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          billing_period?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean | null
          limits?: Json
          name: string
          price?: number
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean | null
          limits?: Json
          name?: string
          price?: number
          sort_order?: number | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          created_at: string | null
          current_value: number
          id: string
          landlord_id: string
          limit_value: number | null
          metric: string
          period_end: string
          period_start: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number
          id?: string
          landlord_id: string
          limit_value?: number | null
          metric: string
          period_end?: string
          period_start?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number
          id?: string
          landlord_id?: string
          limit_value?: number | null
          metric?: string
          period_end?: string
          period_start?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "landlord_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_creation_logs: {
        Row: {
          application_id: string
          created_at: string
          error_message: string | null
          id: string
          rollback_actions: Json | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          rollback_actions?: Json | null
          status: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          rollback_actions?: Json | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_creation_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "unit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_creation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_info: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          current_balance: number | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          full_name: string | null
          id: string
          landlord_id: string
          last_name: string
          move_in_date: string | null
          notes: string | null
          payment_status: string | null
          phone: string | null
          profile_id: string | null
          security_deposit_amount: number | null
          security_deposit_paid: boolean | null
          security_deposit_paid_date: string | null
          security_deposit_refund_amount: number | null
          security_deposit_refund_date: string | null
          security_deposit_refunded: boolean | null
          security_deposit_remaining: number | null
          tenant_status: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          current_balance?: number | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          full_name?: string | null
          id?: string
          landlord_id: string
          last_name: string
          move_in_date?: string | null
          notes?: string | null
          payment_status?: string | null
          phone?: string | null
          profile_id?: string | null
          security_deposit_amount?: number | null
          security_deposit_paid?: boolean | null
          security_deposit_paid_date?: string | null
          security_deposit_refund_amount?: number | null
          security_deposit_refund_date?: string | null
          security_deposit_refunded?: boolean | null
          security_deposit_remaining?: number | null
          tenant_status?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          landlord_id?: string
          last_name?: string
          move_in_date?: string | null
          notes?: string | null
          payment_status?: string | null
          phone?: string | null
          profile_id?: string | null
          security_deposit_amount?: number | null
          security_deposit_paid?: boolean | null
          security_deposit_paid_date?: string | null
          security_deposit_refund_amount?: number | null
          security_deposit_refund_date?: string | null
          security_deposit_refunded?: boolean | null
          security_deposit_remaining?: number | null
          tenant_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tenant_info_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_security_deposit_amount: number | null
          new_security_deposit_paid: boolean | null
          new_security_deposit_paid_date: string | null
          new_security_deposit_refund_date: string | null
          new_security_deposit_refunded: boolean | null
          new_security_deposit_remaining: number | null
          old_security_deposit_amount: number | null
          old_security_deposit_paid: boolean | null
          old_security_deposit_paid_date: string | null
          old_security_deposit_refund_date: string | null
          old_security_deposit_refunded: boolean | null
          old_security_deposit_remaining: number | null
          tenant_info_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_security_deposit_amount?: number | null
          new_security_deposit_paid?: boolean | null
          new_security_deposit_paid_date?: string | null
          new_security_deposit_refund_date?: string | null
          new_security_deposit_refunded?: boolean | null
          new_security_deposit_remaining?: number | null
          old_security_deposit_amount?: number | null
          old_security_deposit_paid?: boolean | null
          old_security_deposit_paid_date?: string | null
          old_security_deposit_refund_date?: string | null
          old_security_deposit_refunded?: boolean | null
          old_security_deposit_remaining?: number | null
          tenant_info_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_security_deposit_amount?: number | null
          new_security_deposit_paid?: boolean | null
          new_security_deposit_paid_date?: string | null
          new_security_deposit_refund_date?: string | null
          new_security_deposit_refunded?: boolean | null
          new_security_deposit_remaining?: number | null
          old_security_deposit_amount?: number | null
          old_security_deposit_paid?: boolean | null
          old_security_deposit_paid_date?: string | null
          old_security_deposit_refund_date?: string | null
          old_security_deposit_refunded?: boolean | null
          old_security_deposit_remaining?: number | null
          tenant_info_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          id: string
          landlord_id: string
          lease_end_date: string | null
          lease_start_date: string | null
          rent_amount: number
          security_deposit: number
          status: string
          tenant_info_id: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          id?: string
          landlord_id: string
          lease_end_date?: string | null
          lease_start_date?: string | null
          rent_amount?: number
          security_deposit?: number
          status?: string
          tenant_info_id: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          id?: string
          landlord_id?: string
          lease_end_date?: string | null
          lease_start_date?: string | null
          rent_amount?: number
          security_deposit?: number
          status?: string
          tenant_info_id?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_tenant_info_id_fkey"
            columns: ["tenant_info_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tenants_tenant_info_id_fkey"
            columns: ["tenant_info_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
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
      unit_bills: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          landlord_id: string | null
          month: string
          payment_reason: string | null
          paystack_reference: string | null
          status: string | null
          tenant_id: string | null
          unit_id: string | null
          updated_at: string | null
          utility_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          landlord_id?: string | null
          month: string
          payment_reason?: string | null
          paystack_reference?: string | null
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
          utility_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          landlord_id?: string | null
          month?: string
          payment_reason?: string | null
          paystack_reference?: string | null
          status?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string | null
          utility_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_bills_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "security_deposit_summary"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "unit_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_bills_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_bills_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_bills_utility_id_fkey"
            columns: ["utility_id"]
            isOneToOne: false
            referencedRelation: "utilities"
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
          late_fee_grace_period_days: number | null
          late_fee_max_percentage: number | null
          late_fee_type: string | null
          late_fee_value: number | null
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
          late_fee_grace_period_days?: number | null
          late_fee_max_percentage?: number | null
          late_fee_type?: string | null
          late_fee_value?: number | null
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
          late_fee_grace_period_days?: number | null
          late_fee_max_percentage?: number | null
          late_fee_type?: string | null
          late_fee_value?: number | null
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
      utilities: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
          unit_id: string | null
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
          unit_id?: string | null
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
          unit_id?: string | null
          updated_at?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_requests_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "visitor_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
        Relationships: [
          {
            foreignKeyName: "visitors_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_visiting_tenant_id_fkey"
            columns: ["visiting_tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_visiting_unit_id_fkey"
            columns: ["visiting_unit_id"]
            isOneToOne: false
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "visitors_visiting_unit_id_fkey"
            columns: ["visiting_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_visitor_request_id_fkey"
            columns: ["visitor_request_id"]
            isOneToOne: false
            referencedRelation: "visitor_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      landlord_late_fee_settings: {
        Row: {
          grace_period_description: string | null
          landlord_id: string | null
          late_fee_description: string | null
          late_fee_grace_period_days: number | null
          late_fee_max_percentage: number | null
          late_fee_type: string | null
          late_fee_value: number | null
          property_id: string | null
          property_name: string | null
          unit_id: string | null
          unit_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_with_contractor: {
        Row: {
          actual_cost: number | null
          assigned_contractor_id: string | null
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          contractor_email: string | null
          contractor_hourly_rate: number | null
          contractor_name: string | null
          contractor_phone: string | null
          contractor_specialty: string | null
          cost_deducted_from_deposit: boolean | null
          cost_deduction_date: string | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          id: string | null
          images: Json | null
          maintenance_cost: number | null
          notes: string | null
          priority: string | null
          property_id: string | null
          property_name: string | null
          scheduled_date: string | null
          status: string | null
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_rating: number | null
          title: string | null
          unit_id: string | null
          unit_number: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_stats: {
        Row: {
          count: number | null
          date: string | null
          status: string | null
        }
        Relationships: []
      }
      security_deposit_summary: {
        Row: {
          auth_user_id: string | null
          deduction_count: number | null
          lease_end_date: string | null
          lease_id: string | null
          lease_start_date: string | null
          lease_status: string | null
          property_name: string | null
          security_deposit_amount: number | null
          security_deposit_paid: boolean | null
          security_deposit_paid_date: string | null
          security_deposit_refund_amount: number | null
          security_deposit_refund_date: string | null
          security_deposit_refunded: boolean | null
          security_deposit_remaining: number | null
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string | null
          total_deductions: number | null
          unit_id: string | null
          unit_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
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
      tenant_creation_health: {
        Row: {
          count: number | null
          date: string | null
          error_count: number | null
          status: string | null
        }
        Relationships: []
      }
      visitors_history: {
        Row: {
          created_at: string | null
          emergency_contact: string | null
          id: string | null
          purpose: string | null
          security_id: string | null
          security_notes: string | null
          status: string | null
          time_in: string | null
          time_out: string | null
          time_since_checkout: unknown
          updated_at: string | null
          visit_duration_minutes: number | null
          visiting_tenant_id: string | null
          visiting_unit_id: string | null
          visitor_name: string | null
          visitor_phone: string | null
          visitor_request_id: string | null
        }
        Insert: {
          created_at?: string | null
          emergency_contact?: string | null
          id?: string | null
          purpose?: string | null
          security_id?: string | null
          security_notes?: string | null
          status?: string | null
          time_in?: string | null
          time_out?: string | null
          time_since_checkout?: never
          updated_at?: string | null
          visit_duration_minutes?: never
          visiting_tenant_id?: string | null
          visiting_unit_id?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
          visitor_request_id?: string | null
        }
        Update: {
          created_at?: string | null
          emergency_contact?: string | null
          id?: string | null
          purpose?: string | null
          security_id?: string | null
          security_notes?: string | null
          status?: string | null
          time_in?: string | null
          time_out?: string | null
          time_since_checkout?: never
          updated_at?: string | null
          visit_duration_minutes?: never
          visiting_tenant_id?: string | null
          visiting_unit_id?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
          visitor_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitors_security_id_fkey"
            columns: ["security_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_visiting_tenant_id_fkey"
            columns: ["visiting_tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_visiting_unit_id_fkey"
            columns: ["visiting_unit_id"]
            isOneToOne: false
            referencedRelation: "landlord_late_fee_settings"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "visitors_visiting_unit_id_fkey"
            columns: ["visiting_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_visitor_request_id_fkey"
            columns: ["visitor_request_id"]
            isOneToOne: false
            referencedRelation: "visitor_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_manual_security_deposit_deduction: {
        Args: {
          p_deducted_by: string
          p_deduction_amount: number
          p_notes?: string
          p_reason: string
          p_tenant_id: string
        }
        Returns: Json
      }
      caretaker_can_view_tenant_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      check_landlord_subscription: {
        Args: { landlord_uuid: string }
        Returns: {
          days_remaining: number
          has_active_subscription: boolean
          is_trial: boolean
          plan_name: string
          subscription_status: string
        }[]
      }
      check_subscription_limit: {
        Args: { landlord_uuid: string; limit_key: string }
        Returns: {
          current_usage: number
          has_reached_limit: boolean
          limit_value: number
          remaining: number
        }[]
      }
      checkout_visitor: { Args: { p_visitor_id: string }; Returns: Json }
      cleanup_expired_password_reset_tokens: { Args: never; Returns: undefined }
      cleanup_inactive_push_subscriptions: { Args: never; Returns: undefined }
      cleanup_old_visitor_history: { Args: never; Returns: number }
      cleanup_push_notification_queue: { Args: never; Returns: undefined }
      create_lease_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_maintenance_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_message_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_payment_notification: {
        Args: {
          p_action_url?: string
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_staff_member: {
        Args: {
          p_email: string
          p_first_name: string
          p_landlord_id: string
          p_last_name: string
          p_notes?: string
          p_phone: string
          p_property_ids: string[]
          p_role: string
        }
        Returns: Json
      }
      create_system_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_tenant_with_auth: {
        Args: {
          p_email: string
          p_first_name: string
          p_landlord_id: string
          p_last_name: string
          p_lease_end_date?: string
          p_lease_start_date?: string
          p_phone: string
          p_rent_amount?: number
          p_security_deposit?: number
          p_unit_id?: string
        }
        Returns: Json
      }
      create_utility_bill_notification: {
        Args: {
          p_amount: number
          p_bill_id: string
          p_due_date: string
          p_tenant_id: string
          p_utility_name: string
        }
        Returns: undefined
      }
      create_visitor_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      current_user_is_landlord_of_property: {
        Args: { _property_id: string }
        Returns: boolean
      }
      current_user_profile_id: { Args: never; Returns: string }
      daily_monthly_rent_check: { Args: never; Returns: undefined }
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
      detect_orphaned_applications: {
        Args: never
        Returns: {
          application_id: string
          approved_at: string
          days_since_approval: number
          property_name: string
          tenant_name: string
          unit_number: string
        }[]
      }
      detect_overdue_payments: { Args: never; Returns: undefined }
      detect_overdue_payments_custom: { Args: never; Returns: undefined }
      expire_overdue_visitors: { Args: never; Returns: undefined }
      fn_process_push_queue_post: { Args: never; Returns: string }
      generate_rent_payments: {
        Args: { p_lease_id: string }
        Returns: undefined
      }
      get_landlord_bills: {
        Args: { landlord_profile_id: string }
        Returns: {
          amount: number
          created_at: string
          due_date: string
          id: string
          month: string
          paystack_reference: string
          property_name: string
          status: string
          tenant_name: string
          unit_id: string
          unit_number: string
          utility_name: string
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
      get_low_stock_items: {
        Args: { p_property_id?: string }
        Returns: {
          category: string
          current_stock: number
          id: string
          item_name: string
          minimum_stock: number
          property_id: string
          property_name: string
          stock_deficit: number
        }[]
      }
      get_patrol_stats: {
        Args: {
          p_end_date?: string
          p_property_id: string
          p_start_date?: string
        }
        Returns: {
          avg_duration_minutes: number
          completed_patrols: number
          completion_rate: number
          in_progress_patrols: number
          scheduled_patrols: number
          total_patrols: number
        }[]
      }
      get_profile_id_by_user: { Args: { p_user_uuid: string }; Returns: string }
      get_tenant_bills: {
        Args: { tenant_profile_id: string }
        Returns: {
          amount: number
          created_at: string
          due_date: string
          id: string
          month: string
          paystack_reference: string
          status: string
          unit_id: string
          utility_name: string
        }[]
      }
      get_tenant_by_auth_user: {
        Args: { p_auth_user_id: string }
        Returns: {
          email: string
          first_name: string
          landlord_id: string
          last_name: string
          phone: string
          property_name: string
          rent_amount: number
          security_deposit: number
          status: string
          tenant_id: string
          tenant_info_id: string
          unit_id: string
          unit_number: string
        }[]
      }
      get_tenant_creation_stats: {
        Args: never
        Returns: {
          failed_creations: number
          orphaned_applications: number
          recovery_attempts: number
          success_rate: number
          successful_creations: number
          total_attempts: number
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
      get_tenant_landlord_v2: {
        Args: { tenant_profile_id: string }
        Returns: {
          landlord_avatar_url: string
          landlord_company_name: string
          landlord_email: string
          landlord_first_name: string
          landlord_id: string
          landlord_last_name: string
          landlord_phone: string
          property_name: string
          unit_number: string
        }[]
      }
      get_tenant_primary_unit: {
        Args: { tenant_profile_id: string }
        Returns: string
      }
      get_user_push_subscriptions: {
        Args: { user_profile_id: string }
        Returns: {
          auth_key: string
          endpoint: string
          p256dh: string
          subscription_id: string
        }[]
      }
      get_visitor_history_stats: {
        Args: { p_days?: number; p_property_id?: string }
        Returns: {
          avg_visit_duration_minutes: number
          most_frequent_purpose: string
          total_visit_time_hours: number
          total_visitors: number
          unique_tenants: number
        }[]
      }
      is_security_user: { Args: never; Returns: boolean }
      landlord_can_view_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      log_tenant_creation_attempt: {
        Args: {
          p_application_id: string
          p_error_message?: string
          p_rollback_actions?: Json
          p_status: string
          p_tenant_id: string
        }
        Returns: string
      }
      manual_cleanup_visitor_history: {
        Args: { p_days?: number }
        Returns: {
          cleanup_date: string
          deleted_count: number
          message: string
        }[]
      }
      mark_overdue_bills: { Args: never; Returns: undefined }
      process_push_notification_queue: { Args: never; Returns: undefined }
      process_security_deposit_refund: {
        Args: {
          p_notes?: string
          p_processed_by: string
          p_refund_amount: number
          p_tenant_id: string
        }
        Returns: Json
      }
      recover_orphaned_applications: { Args: never; Returns: number }
      tenant_can_view_assigned_caretaker_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      tenant_can_view_landlord_profile: {
        Args: { _target_profile_id: string }
        Returns: boolean
      }
      user_can_view_lease: { Args: { _lease_id: string }; Returns: boolean }
      user_can_view_profile: { Args: { _profile_id: string }; Returns: boolean }
      user_can_view_property: {
        Args: { _property_id: string }
        Returns: boolean
      }
      user_can_view_unit: { Args: { _unit_id: string }; Returns: boolean }
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
