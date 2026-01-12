import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");

  if (!stripeSecretKey || !stripeWebhookSecret || !discordWebhookUrl) {
    console.error("Missing required environment variables");
    return new Response(JSON.stringify({ error: "Configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  });

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("No stripe-signature header found");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", errorMessage);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Received Stripe event:", event.type);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get user info
      const customerEmail = session.customer_email || session.customer_details?.email || "Email não disponível";
      const customerName = session.customer_details?.name || customerEmail.split("@")[0];
      
      // Determine plan type from metadata or amount
      let planType = "PRO";
      if (session.metadata?.plan_type) {
        planType = session.metadata.plan_type === "annual" ? "PRO Anual" : "PRO Mensal";
      } else if (session.amount_total) {
        // If amount is around yearly price, it's annual
        planType = session.amount_total > 5000 ? "PRO Anual" : "PRO Mensal";
      }

      // Format date and time in Brazil timezone
      const now = new Date();
      const brDate = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const brTime = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });

      // Create Discord embed
      const discordPayload = {
        embeds: [
          {
            title: "🎉 Nova Assinatura PRO!",
            color: 0x00FF00, // Green
            fields: [
              {
                name: "👤 Usuário",
                value: customerName,
                inline: true,
              },
              {
                name: "📧 Email",
                value: customerEmail,
                inline: true,
              },
              {
                name: "💳 Plano",
                value: planType,
                inline: true,
              },
              {
                name: "📅 Data",
                value: brDate,
                inline: true,
              },
              {
                name: "⏰ Hora",
                value: brTime,
                inline: true,
              },
            ],
            footer: {
              text: "✅ Benefícios já estão liberados!",
            },
            timestamp: now.toISOString(),
          },
        ],
      };

      // Send to Discord
      console.log("Sending notification to Discord...");
      const discordResponse = await fetch(discordWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(discordPayload),
      });

      if (!discordResponse.ok) {
        const errorText = await discordResponse.text();
        console.error("Discord webhook failed:", errorText);
        return new Response(JSON.stringify({ error: "Discord notification failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Discord notification sent successfully!");

      if (session.metadata?.code) {
        const code = session.metadata.code;
        try {
          const res = await fetch(
            `${Deno.env.get("API_URL")}/codes/redeem`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json", 
                Authorization: `Bearer ${Deno.env.get("API_TOKEN")}`,
              },
              body: JSON.stringify({ 
                code,
                id: customerEmail
               }),
            }
          );
          if (!res.ok) {
            const errorText = await res.text();
            console.error("Code redemption failed:", errorText);
          }
        } catch (error) {
          console.error("Error redeeming code:", error);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
