import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  isAdmin: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { email, isAdmin }: PasswordResetRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // If admin is resetting another user's password, verify admin role
    if (isAdmin) {
      const { data: roleData } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role !== "admin") {
        throw new Error("Only admins can reset other users' passwords");
      }
    }

    // Generate password reset link
    const redirectUrl = `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/auth`;
    
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl,
      }
    );

    if (resetError) {
      throw resetError;
    }

    // Send confirmation email via Resend
    const emailResponse = await resend.emails.send({
      from: "DataSheet Pro <onboarding@resend.dev>",
      to: [email],
      subject: "Password Reset Request",
      html: `
        <h1>Password Reset</h1>
        <p>A password reset has been requested for your account.</p>
        <p>Please check your email for the password reset link from our authentication provider.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The DataSheet Pro Team</p>
      `,
    });

    console.log("Password reset email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
