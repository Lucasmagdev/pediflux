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
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_id: string
          created_at: string
          date: string
          duration: number
          id: string
          notes: string | null
          patient_id: string
          reason: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date: string
          duration?: number
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date?: string
          duration?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_patient_id_fkey"
            columns: ["clinic_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["clinic_id", "id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          active: boolean
          amount: number
          billing_interval: string
          checkout_url: string | null
          code: string
          mp_plan_id: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          billing_interval: string
          checkout_url?: string | null
          code: string
          mp_plan_id?: string | null
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          billing_interval?: string
          checkout_url?: string | null
          code?: string
          mp_plan_id?: string | null
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          child_birth: string
          child_name: string
          clinic_id: string
          created_at: string
          date: string
          guardian_name: string
          handled_at: string | null
          id: string
          phone: string
          reason: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          child_birth: string
          child_name: string
          clinic_id: string
          created_at?: string
          date: string
          guardian_name: string
          handled_at?: string | null
          id?: string
          phone: string
          reason?: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          child_birth?: string
          child_name?: string
          clinic_id?: string
          created_at?: string
          date?: string
          guardian_name?: string
          handled_at?: string | null
          id?: string
          phone?: string
          reason?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          created_at: string
          crm: string
          default_duration: number
          doctor_name: string
          doctor_short: string
          hours: Json
          id: string
          messages: Json
          name: string
          phone: string
          slug: string
          specialty: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          crm?: string
          default_duration?: number
          doctor_name?: string
          doctor_short?: string
          hours?: Json
          id?: string
          messages?: Json
          name: string
          phone?: string
          slug: string
          specialty?: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          crm?: string
          default_duration?: number
          doctor_name?: string
          doctor_short?: string
          hours?: Json
          id?: string
          messages?: Json
          name?: string
          phone?: string
          slug?: string
          specialty?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultations: {
        Row: {
          anamnesis: string
          appointment_id: string | null
          clinic_id: string
          complaint: string
          created_at: string
          created_by: string | null
          date: string
          diagnosis: string
          exam: string
          hr: number | null
          id: string
          patient_id: string
          plan: string
          return_in: string | null
          rr: number | null
          shared_with_family: boolean
          spo2: number | null
          temp: number | null
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
        }
        Insert: {
          anamnesis?: string
          appointment_id?: string | null
          clinic_id: string
          complaint?: string
          created_at?: string
          created_by?: string | null
          date: string
          diagnosis?: string
          exam?: string
          hr?: number | null
          id?: string
          patient_id: string
          plan?: string
          return_in?: string | null
          rr?: number | null
          shared_with_family?: boolean
          spo2?: number | null
          temp?: number | null
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Update: {
          anamnesis?: string
          appointment_id?: string | null
          clinic_id?: string
          complaint?: string
          created_at?: string
          created_by?: string | null
          date?: string
          diagnosis?: string
          exam?: string
          hr?: number | null
          id?: string
          patient_id?: string
          plan?: string
          return_in?: string | null
          rr?: number | null
          shared_with_family?: boolean
          spo2?: number | null
          temp?: number | null
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_clinic_id_patient_id_fkey"
            columns: ["clinic_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["clinic_id", "id"]
          },
        ]
      }
      exam_files: {
        Row: {
          category: Database["public"]["Enums"]["exam_category"]
          clinic_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["exam_kind"]
          name: string
          patient_id: string
          shared_with_family: boolean
          size_bytes: number
          storage_path: string
          taken_on: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["exam_category"]
          clinic_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["exam_kind"]
          name: string
          patient_id: string
          shared_with_family?: boolean
          size_bytes?: number
          storage_path: string
          taken_on?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["exam_category"]
          clinic_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["exam_kind"]
          name?: string
          patient_id?: string
          shared_with_family?: boolean
          size_bytes?: number
          storage_path?: string
          taken_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_files_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_files_clinic_id_patient_id_fkey"
            columns: ["clinic_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["clinic_id", "id"]
          },
        ]
      }
      families: {
        Row: {
          clinic_id: string
          created_at: string
          email: string | null
          guardian_name: string
          guardian_relation: Database["public"]["Enums"]["guardian_relation"]
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email?: string | null
          guardian_name: string
          guardian_relation?: Database["public"]["Enums"]["guardian_relation"]
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string | null
          guardian_name?: string
          guardian_relation?: Database["public"]["Enums"]["guardian_relation"]
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          clinic_id: string
          consultation_id: string | null
          created_at: string
          head: number | null
          height: number | null
          id: string
          measured_on: string
          patient_id: string
          weight: number | null
        }
        Insert: {
          clinic_id: string
          consultation_id?: string | null
          created_at?: string
          head?: number | null
          height?: number | null
          id?: string
          measured_on: string
          patient_id: string
          weight?: number | null
        }
        Update: {
          clinic_id?: string
          consultation_id?: string | null
          created_at?: string
          head?: number | null
          height?: number | null
          id?: string
          measured_on?: string
          patient_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_clinic_id_patient_id_fkey"
            columns: ["clinic_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["clinic_id", "id"]
          },
          {
            foreignKeyName: "measurements_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[]
          birth_date: string
          birth_length: number | null
          birth_weight: number | null
          clinic_id: string
          created_at: string
          family_id: string
          gestational_weeks: number | null
          id: string
          name: string
          next_return: string | null
          notes: string | null
          sex: Database["public"]["Enums"]["sex"]
          updated_at: string
        }
        Insert: {
          allergies?: string[]
          birth_date: string
          birth_length?: number | null
          birth_weight?: number | null
          clinic_id: string
          created_at?: string
          family_id: string
          gestational_weeks?: number | null
          id?: string
          name: string
          next_return?: string | null
          notes?: string | null
          sex: Database["public"]["Enums"]["sex"]
          updated_at?: string
        }
        Update: {
          allergies?: string[]
          birth_date?: string
          birth_length?: number | null
          birth_weight?: number | null
          clinic_id?: string
          created_at?: string
          family_id?: string
          gestational_weeks?: number | null
          id?: string
          name?: string
          next_return?: string | null
          notes?: string | null
          sex?: Database["public"]["Enums"]["sex"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_family_id_fkey"
            columns: ["clinic_id", "family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["clinic_id", "id"]
          },
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_links: {
        Row: {
          clinic_id: string
          created_at: string
          family_id: string
          id: string
          last_seen_at: string | null
          revoked_at: string | null
          token: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          family_id: string
          id?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          token?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          family_id?: string
          id?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_links_clinic_id_family_id_fkey"
            columns: ["clinic_id", "family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["clinic_id", "id"]
          },
          {
            foreignKeyName: "portal_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          email: string
          id: string
          mp_plan_id: string | null
          next_payment_at: string | null
          provider: string
          provider_subscription: string
          status: string
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          mp_plan_id?: string | null
          next_payment_at?: string | null
          provider?: string
          provider_subscription: string
          status: string
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mp_plan_id?: string | null
          next_payment_at?: string | null
          provider?: string
          provider_subscription?: string
          status?: string
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          clinic_id: string
          current_period_end: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          provider: string | null
          provider_customer: string | null
          provider_subscription: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string | null
          provider_customer?: string | null
          provider_subscription?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          current_period_end?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string | null
          provider_customer?: string | null
          provider_subscription?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      time_blocks: {
        Row: {
          clinic_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          label: string
          start_time: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          label?: string
          start_time: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          label?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_blocks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      billing_apply: {
        Args: {
          p_email: string
          p_mp_plan: string
          p_next_payment: string
          p_provider_subscription: string
          p_status: string
          p_tier: Database["public"]["Enums"]["plan_tier"]
        }
        Returns: undefined
      }
      billing_user_exists: { Args: { p_email: string }; Returns: boolean }
      create_booking_request: {
        Args: {
          p_child_birth: string
          p_child_name: string
          p_date: string
          p_guardian_name: string
          p_phone: string
          p_reason: string
          p_slug: string
          p_time: string
        }
        Returns: string
      }
      create_clinic: {
        Args: { p_doctor_name: string; p_name: string; p_slug: string }
        Returns: string
      }
      portal_exam_path: {
        Args: { p_exam: string; p_token: string }
        Returns: string
      }
      portal_snapshot: { Args: { p_token: string }; Returns: Json }
      public_booking_info: { Args: { p_slug: string }; Returns: Json }
    }
    Enums: {
      appointment_status:
        | "agendado"
        | "confirmado"
        | "aguardando"
        | "em_atendimento"
        | "atendido"
        | "faltou"
      appointment_type: "Puericultura" | "Doença aguda" | "Retorno" | "Vacina"
      booking_status: "pendente" | "confirmado" | "recusado"
      exam_category:
        | "Exame de sangue"
        | "Imagem"
        | "Laudo"
        | "Receita"
        | "Atestado"
        | "Outro"
      exam_kind: "pdf" | "image"
      guardian_relation: "Mãe" | "Pai" | "Responsável"
      member_role: "owner" | "doctor" | "secretary"
      plan_tier: "essencial" | "plus" | "pro"
      sex: "M" | "F"
      subscription_status: "trial" | "active" | "past_due" | "canceled"
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
      appointment_status: [
        "agendado",
        "confirmado",
        "aguardando",
        "em_atendimento",
        "atendido",
        "faltou",
      ],
      appointment_type: ["Puericultura", "Doença aguda", "Retorno", "Vacina"],
      booking_status: ["pendente", "confirmado", "recusado"],
      exam_category: [
        "Exame de sangue",
        "Imagem",
        "Laudo",
        "Receita",
        "Atestado",
        "Outro",
      ],
      exam_kind: ["pdf", "image"],
      guardian_relation: ["Mãe", "Pai", "Responsável"],
      member_role: ["owner", "doctor", "secretary"],
      plan_tier: ["essencial", "plus", "pro"],
      sex: ["M", "F"],
      subscription_status: ["trial", "active", "past_due", "canceled"],
    },
  },
} as const
