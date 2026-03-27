import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is authenticated and admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Não autorizado");

    // Check caller is admin
    const { data: hasAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!hasAdmin) throw new Error("Apenas administradores podem convidar usuários");

    // Get caller's empresa_id
    const { data: empresaId } = await supabaseAdmin.rpc("get_user_empresa_id", {
      _user_id: caller.id,
    });
    if (!empresaId) throw new Error("Empresa não configurada");

    const { email, nome, role, extra } = await req.json();
    if (!email) throw new Error("E-mail é obrigatório");

    // Create user with a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nome: nome || "" },
    });
    if (createError) {
      if (createError.message.includes("already been registered")) {
        throw new Error("Este e-mail já está cadastrado no sistema");
      }
      throw createError;
    }

    // Update profile with empresa_id and extra fields
    const profileUpdate: Record<string, any> = { empresa_id: empresaId };
    if (extra) {
      const allowedFields = ["cpf", "rg", "apelido", "celular", "logradouro", "numero", "complemento", "cep", "bairro", "cidade", "estado", "perfil_acesso_id"];
      for (const field of allowedFields) {
        if (extra[field] !== undefined && extra[field] !== null && extra[field] !== "") {
          profileUpdate[field] = extra[field];
        }
      }
    }
    await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", newUser.user!.id);

    // Link to empresa
    await supabaseAdmin
      .from("user_empresas")
      .insert({ user_id: newUser.user!.id, empresa_id: empresaId });

    // Set role
    if (role && role !== "operador") {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", newUser.user!.id);
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user!.id, role });
    }

    // Send password reset so user sets their own password
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuário ${email} convidado com sucesso`,
        temp_password: tempPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
