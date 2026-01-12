import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: 0 }),
        // 0 - CODE_REQUIRED
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🔐 API
    const response = await fetch(
      `${Deno.env.get('API_URL')}/codes?code=${code}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${Deno.env.get('API_TOKEN')}`,
        },
      }
    )

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: false, error: 1 }),
        // 1 - CODE_NOT_FOUND
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const promo = await response.json()

    if (promo.type !== 2) {
      return new Response(
        JSON.stringify({ valid: false, error: 2 }),
        // 2 - CODE_NOT_DISCOUNT
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (promo.used) {
      return new Response(
        JSON.stringify({ valid: false, error: 3 }),
        // 3 - CODE_ALREADY_USED
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        valid: true,
        code: promo.code,
        discount: {
          kind: promo.discount.kind,
          value: promo.discount.value,
        },
        message: "ok"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('validate-promo error:', error)

    return new Response(
      JSON.stringify({ valid: false, error: 4 }),
      // 4 - INTERNAL_ERROR
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})