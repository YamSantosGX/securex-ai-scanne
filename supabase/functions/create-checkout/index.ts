import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Extract and verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { priceId, code, returnUrl } = await req.json();

    if (!priceId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing priceId or returnUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate returnUrl to prevent open redirect
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
    ];

    // Get the origin from the request to allow same-origin redirects
    const requestOrigin = req.headers.get('origin') || '';

    try {
      const url = new URL(returnUrl);
      const isLovableApp = url.hostname.endsWith('.lovable.app');
      const isAllowedOrigin = allowedOrigins.includes(url.origin);
      const isSameOrigin = requestOrigin && url.origin === requestOrigin;
      
      if (!isAllowedOrigin && !isLovableApp && !isSameOrigin) {
        return new Response(
          JSON.stringify({ error: 'Invalid returnUrl' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-12-15.clover',
    });

    // Create or retrieve Stripe customer for the user
    let customerId: string;
    const customers = await stripe.customers.list({ 
      email: user.email!, 
      limit: 1 
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ 
        email: user.email!,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;
    }

    console.log('Creating checkout session with:', { priceId, returnUrl, customerId, code });

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      client_reference_id: user.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}/dashboard?success=true`,
      cancel_url: `${returnUrl}/pricing?canceled=true`,
    };

    // If promo code provided, find and apply promotion_code from Stripe
    // IMPORTANT: Cannot use both allow_promotion_codes and discounts together
    let discountApplied = false;
    
    if (code) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: code.toUpperCase(),
          active: true,
          limit: 1,
        });

        if (promoCodes.data.length > 0) {
          sessionConfig.discounts = [{ promotion_code: promoCodes.data[0].id }];
          discountApplied = true;
          console.log('Applied promotion code:', promoCodes.data[0].id);
        } else {
          // Try as coupon code instead
          try {
            const coupon = await stripe.coupons.retrieve(code.toLowerCase());
            if (coupon && coupon.valid) {
              sessionConfig.discounts = [{ coupon: coupon.id }];
              discountApplied = true;
              console.log('Applied coupon:', coupon.id);
            }
          } catch (couponError) {
            console.log('Code not found as coupon either, proceeding without discount');
          }
        }
      } catch (promoError) {
        console.log('Error looking up promo code, proceeding without discount:', promoError);
      }
    }
    
    // Only allow manual promo code entry if no discount was applied
    if (!discountApplied) {
      sessionConfig.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
