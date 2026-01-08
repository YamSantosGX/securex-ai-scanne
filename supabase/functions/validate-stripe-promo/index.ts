import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()

    if (!code || !code.trim()) {
      return new Response(
        JSON.stringify({ valid: false, error: 'PROMO_REQUIRED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ valid: false, error: 'INTERNAL_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const codeUpper = code.trim().toUpperCase()
    const codeLower = code.trim().toLowerCase()

    console.log('Validating promo code:', codeUpper)

    // Try to find as promotion code first (case insensitive search)
    try {
      const promoCodes = await stripe.promotionCodes.list({
        active: true,
        limit: 100,
      })

      // Find matching promo code (case insensitive)
      const matchingPromo = promoCodes.data.find(
        (pc: { code: string }) => pc.code.toUpperCase() === codeUpper
      )

      if (matchingPromo) {
        console.log('Found promotion code:', matchingPromo.id, matchingPromo.code)
        
        // Get coupon details for discount info
        const coupon = matchingPromo.coupon
        
        let discountKind: 'percent' | 'fixed' = 'percent'
        let discountValue = 0
        
        if (coupon.percent_off) {
          discountKind = 'percent'
          discountValue = coupon.percent_off
        } else if (coupon.amount_off) {
          discountKind = 'fixed'
          discountValue = coupon.amount_off / 100 // Convert cents to currency
        }

        return new Response(
          JSON.stringify({
            valid: true,
            code: matchingPromo.code,
            promoId: matchingPromo.id,
            discount: {
              kind: discountKind,
              value: discountValue,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (promoError) {
      console.log('Error searching promotion codes:', promoError)
    }

    // Try to find as coupon directly
    try {
      const coupon = await stripe.coupons.retrieve(codeLower)
      
      if (coupon && coupon.valid) {
        console.log('Found valid coupon:', coupon.id)
        
        let discountKind: 'percent' | 'fixed' = 'percent'
        let discountValue = 0
        
        if (coupon.percent_off) {
          discountKind = 'percent'
          discountValue = coupon.percent_off
        } else if (coupon.amount_off) {
          discountKind = 'fixed'
          discountValue = coupon.amount_off / 100
        }

        return new Response(
          JSON.stringify({
            valid: true,
            code: coupon.id,
            isCoupon: true,
            discount: {
              kind: discountKind,
              value: discountValue,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (couponError: unknown) {
      console.log('Coupon not found:', (couponError as Error).message)
    }

    // Code not found
    console.log('Promo code not found:', codeUpper)
    return new Response(
      JSON.stringify({ valid: false, error: 'PROMO_INVALID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('validate-stripe-promo error:', error)

    return new Response(
      JSON.stringify({ valid: false, error: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
