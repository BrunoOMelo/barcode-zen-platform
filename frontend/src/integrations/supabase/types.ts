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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contagens: {
        Row: {
          created_at: string
          data_contagem: string
          id: string
          inventario_id: string
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["count_type"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          data_contagem?: string
          id?: string
          inventario_id: string
          produto_id: string
          quantidade: number
          tipo?: Database["public"]["Enums"]["count_type"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          data_contagem?: string
          id?: string
          inventario_id?: string
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["count_type"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contagens_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          estado: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          responsavel_apelido: string | null
          responsavel_celular: string | null
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome: string
          numero?: string | null
          responsavel_apelido?: string | null
          responsavel_celular?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          responsavel_apelido?: string | null
          responsavel_celular?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventario_produtos: {
        Row: {
          created_at: string
          divergencia: number | null
          estoque_contado: number | null
          estoque_sistema: number
          id: string
          inventario_id: string
          produto_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          divergencia?: number | null
          estoque_contado?: number | null
          estoque_sistema?: number
          id?: string
          inventario_id: string
          produto_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          divergencia?: number | null
          estoque_contado?: number | null
          estoque_sistema?: number
          id?: string
          inventario_id?: string
          produto_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_produtos_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventarios: {
        Row: {
          created_at: string
          criado_por: string | null
          data_fim: string | null
          data_inicio: string | null
          empresa_id: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["inventory_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["inventory_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_permissoes: {
        Row: {
          id: string
          modulo: string
          perfil_id: string
          pode_alterar: boolean
          pode_compartilhar: boolean
          pode_excluir: boolean
          pode_ler: boolean
        }
        Insert: {
          id?: string
          modulo: string
          perfil_id: string
          pode_alterar?: boolean
          pode_compartilhar?: boolean
          pode_excluir?: boolean
          pode_ler?: boolean
        }
        Update: {
          id?: string
          modulo?: string
          perfil_id?: string
          pode_alterar?: boolean
          pode_compartilhar?: boolean
          pode_excluir?: boolean
          pode_ler?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "perfil_permissoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_acesso: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_acesso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          created_at: string
          custo: number | null
          data_validade: string | null
          descricao: string
          empresa_id: string
          id: string
          lote: string | null
          marca: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          custo?: number | null
          data_validade?: string | null
          descricao: string
          empresa_id: string
          id?: string
          lote?: string | null
          marca?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          created_at?: string
          custo?: number | null
          data_validade?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          lote?: string | null
          marca?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apelido: string | null
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          email: string
          empresa_id: string | null
          estado: string | null
          foto_perfil_url: string | null
          id: string
          logradouro: string | null
          nome: string
          numero: string | null
          perfil_acesso_id: string | null
          rg: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apelido?: string | null
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          estado?: string | null
          foto_perfil_url?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          perfil_acesso_id?: string | null
          rg?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apelido?: string | null
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          estado?: string | null
          foto_perfil_url?: string | null
          id?: string
          logradouro?: string | null
          nome?: string
          numero?: string | null
          perfil_acesso_id?: string | null
          rg?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_perfil_acesso_id_fkey"
            columns: ["perfil_acesso_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      user_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inventario_belongs_to_user_empresa: {
        Args: { _inventario_id: string; _user_id: string }
        Returns: boolean
      }
      perfil_belongs_to_user_empresa: {
        Args: { _perfil_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "operador"
      count_type: "primeira" | "recontagem"
      inventory_status:
        | "criado"
        | "em_contagem"
        | "em_recontagem"
        | "em_analise"
        | "finalizado"
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
      app_role: ["admin", "supervisor", "operador"],
      count_type: ["primeira", "recontagem"],
      inventory_status: [
        "criado",
        "em_contagem",
        "em_recontagem",
        "em_analise",
        "finalizado",
      ],
    },
  },
} as const
