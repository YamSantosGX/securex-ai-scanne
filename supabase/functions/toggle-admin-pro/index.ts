import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.email);

    // Use service role client to check admin role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin role using the has_role function
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasAdminRole) {
      console.log('User does not have admin role');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User has admin role, proceeding with toggle');

    // Get current subscription status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Error fetching profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Toggle subscription status
    const newStatus = profile?.subscription_status === 'active' ? 'inactive' : 'active';

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_status: newStatus })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error updating subscription status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Subscription status toggled to: ${newStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newStatus,
        message: newStatus === 'active' ? 'PRO mode activated' : 'PRO mode deactivated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in toggle-admin-pro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
