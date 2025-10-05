import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  role: 'admin' | 'editor' | 'viewer';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create client for checking the requesting user's permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      throw new Error('Only admins can create users');
    }

    // Parse the request body
    const { email, password, displayName, role }: CreateUserRequest = await req.json();

    console.log('Creating user:', email, 'with role:', role);

    // Create the new user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created:', newUser.user.id);

    // Create profile for the new user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        email: email,
        display_name: displayName
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    console.log('Profile created for user:', newUser.user.id);

    // Assign role to the new user
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        assigned_by: user.id
      });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
      throw roleInsertError;
    }

    console.log('Role assigned to user:', newUser.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: newUser.user.email } 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in admin-create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
