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
      job_checklist: {
        Row: {
          check_appearance: boolean
          check_cage: boolean
          check_chamfer: boolean
          check_hardness: boolean
          check_inner_dia: boolean
          check_noise: boolean
          check_oil_hole: boolean
          check_outer_dia: boolean
          check_radial_play: boolean
          check_spin: boolean
          check_vibration: boolean
          check_width: boolean
          extra_instructions: string | null
          job_id: string
        }
        Insert: {
          check_appearance?: boolean
          check_cage?: boolean
          check_chamfer?: boolean
          check_hardness?: boolean
          check_inner_dia?: boolean
          check_noise?: boolean
          check_oil_hole?: boolean
          check_outer_dia?: boolean
          check_radial_play?: boolean
          check_spin?: boolean
          check_vibration?: boolean
          check_width?: boolean
          extra_instructions?: string | null
          job_id: string
        }
        Update: {
          check_appearance?: boolean
          check_cage?: boolean
          check_chamfer?: boolean
          check_hardness?: boolean
          check_inner_dia?: boolean
          check_noise?: boolean
          check_oil_hole?: boolean
          check_outer_dia?: boolean
          check_radial_play?: boolean
          check_spin?: boolean
          check_vibration?: boolean
          check_width?: boolean
          extra_instructions?: string | null
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_checklist_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "test_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_returns: {
        Row: {
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          job_id: string
          note: string | null
          quantity: number
          status: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          job_id: string
          note?: string | null
          quantity?: number
          status?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          job_id?: string
          note?: string | null
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_returns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "test_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stations: {
        Row: {
          checkpoint_key: string
          claimed_by: string | null
          claimed_date: string | null
          completed_at: string | null
          created_at: string
          id: string
          job_id: string
          measurements: Json | null
          note: string | null
          result: string | null
          status: string
        }
        Insert: {
          checkpoint_key: string
          claimed_by?: string | null
          claimed_date?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id: string
          measurements?: Json | null
          note?: string | null
          result?: string | null
          status?: string
        }
        Update: {
          checkpoint_key?: string
          claimed_by?: string | null
          claimed_date?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          job_id?: string
          measurements?: Json | null
          note?: string | null
          result?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "test_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tolerances: {
        Row: {
          hardness_inner_max: number | null
          hardness_inner_min: number | null
          hardness_outer_max: number | null
          hardness_outer_min: number | null
          inner_dia_max: number | null
          inner_dia_min: number | null
          noise_max: number | null
          outer_dia_max: number | null
          outer_dia_min: number | null
          product_id: string
          radial_play_max: number | null
          radial_play_min: number | null
          unit_dim: string | null
          updated_at: string
          vibration_high_max: number | null
          vibration_low_max: number | null
          vibration_mid_max: number | null
          width_max: number | null
          width_min: number | null
        }
        Insert: {
          hardness_inner_max?: number | null
          hardness_inner_min?: number | null
          hardness_outer_max?: number | null
          hardness_outer_min?: number | null
          inner_dia_max?: number | null
          inner_dia_min?: number | null
          noise_max?: number | null
          outer_dia_max?: number | null
          outer_dia_min?: number | null
          product_id: string
          radial_play_max?: number | null
          radial_play_min?: number | null
          unit_dim?: string | null
          updated_at?: string
          vibration_high_max?: number | null
          vibration_low_max?: number | null
          vibration_mid_max?: number | null
          width_max?: number | null
          width_min?: number | null
        }
        Update: {
          hardness_inner_max?: number | null
          hardness_inner_min?: number | null
          hardness_outer_max?: number | null
          hardness_outer_min?: number | null
          inner_dia_max?: number | null
          inner_dia_min?: number | null
          noise_max?: number | null
          outer_dia_max?: number | null
          outer_dia_min?: number | null
          product_id?: string
          radial_play_max?: number | null
          radial_play_min?: number | null
          unit_dim?: string | null
          updated_at?: string
          vibration_high_max?: number | null
          vibration_low_max?: number | null
          vibration_mid_max?: number | null
          width_max?: number | null
          width_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_tolerances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bearing_type: string | null
          created_at: string
          has_laser_marking: boolean
          id: string
          laser_text: string | null
          name: string | null
          nominal_inner_dia: number | null
          nominal_outer_dia: number | null
          nominal_width: number | null
          packing_type: string | null
          reference: string
          remark: string | null
          updated_at: string
        }
        Insert: {
          bearing_type?: string | null
          created_at?: string
          has_laser_marking?: boolean
          id?: string
          laser_text?: string | null
          name?: string | null
          nominal_inner_dia?: number | null
          nominal_outer_dia?: number | null
          nominal_width?: number | null
          packing_type?: string | null
          reference: string
          remark?: string | null
          updated_at?: string
        }
        Update: {
          bearing_type?: string | null
          created_at?: string
          has_laser_marking?: boolean
          id?: string
          laser_text?: string | null
          name?: string | null
          nominal_inner_dia?: number | null
          nominal_outer_dia?: number | null
          nominal_width?: number | null
          packing_type?: string | null
          reference?: string
          remark?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      test_jobs: {
        Row: {
          created_at: string
          customer: string | null
          decision: string | null
          decision_note: string | null
          defect_count: number | null
          defect_note: string | null
          destination_country: string | null
          id: string
          incoming_qty: number | null
          inspection_tag: string | null
          instructions: string
          laser_text: string | null
          marked_at: string | null
          office_note: string | null
          order_number: string | null
          packed_at: string | null
          product_id: string
          quantity_total: number
          received_at: string | null
          received_by: string | null
          sample_general: number
          sample_inner: number
          sample_outer: number
          sample_width: number
          scheduled_date: string
          shipment_mode: string | null
          shipment_status: string | null
          shipped_at: string | null
          status: string
          storage_location: string | null
          supplier: string | null
          transported_at: string | null
          transported_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer?: string | null
          decision?: string | null
          decision_note?: string | null
          defect_count?: number | null
          defect_note?: string | null
          destination_country?: string | null
          id?: string
          incoming_qty?: number | null
          inspection_tag?: string | null
          instructions?: string
          laser_text?: string | null
          marked_at?: string | null
          office_note?: string | null
          order_number?: string | null
          packed_at?: string | null
          product_id: string
          quantity_total?: number
          received_at?: string | null
          received_by?: string | null
          sample_general?: number
          sample_inner?: number
          sample_outer?: number
          sample_width?: number
          scheduled_date: string
          shipment_mode?: string | null
          shipment_status?: string | null
          shipped_at?: string | null
          status?: string
          storage_location?: string | null
          supplier?: string | null
          transported_at?: string | null
          transported_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer?: string | null
          decision?: string | null
          decision_note?: string | null
          defect_count?: number | null
          defect_note?: string | null
          destination_country?: string | null
          id?: string
          incoming_qty?: number | null
          inspection_tag?: string | null
          instructions?: string
          laser_text?: string | null
          marked_at?: string | null
          office_note?: string | null
          order_number?: string | null
          packed_at?: string | null
          product_id?: string
          quantity_total?: number
          received_at?: string | null
          received_by?: string | null
          sample_general?: number
          sample_inner?: number
          sample_outer?: number
          sample_width?: number
          scheduled_date?: string
          shipment_mode?: string | null
          shipment_status?: string | null
          shipped_at?: string | null
          status?: string
          storage_location?: string | null
          supplier?: string | null
          transported_at?: string | null
          transported_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
