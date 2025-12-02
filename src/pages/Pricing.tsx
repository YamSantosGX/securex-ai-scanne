import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useRegion } from '@/contexts/RegionContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { regionConfig } = useRegion();
  const { t } = useI18n();
  const navigate = useNavigate();

  const PRICE_IDS = {
    monthly: 'price_1SW0BQ1Ve27RXeTv816at3Mf',
    annual: 'price_1SW0BQ1Ve27RXeTvVaWITrHh',
  };

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  // Redirect Pro users away from pricing page
  useEffect(() => {
    if (isSubscribed) {
      navigate('/dashboard');
      toast({
        title: 'Você já é um membro PRO!',
        description: 'Aproveite todos os benefícios da sua assinatura.',
      });
    }
  }, [isSubscribed, navigate]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (profile?.subscription_status === 'active') {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        toast({
          title: t('common.error'),
          description: 'Por favor, faça login para continuar',
          variant: 'destructive',
        });
        return;
      }

      const priceId = isAnnual ? PRICE_IDS.annual : PRICE_IDS.monthly;
      const returnUrl = window.location.origin;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, returnUrl },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: t('common.error'),
        description: 'Erro ao iniciar checkout. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = (basePrice: number) => {
    const price = basePrice * regionConfig.priceMultiplier;
    const annualPrice = price * 12 * 0.9;
    return isAnnual ? annualPrice : price;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(regionConfig.language, {
      style: 'currency',
      currency: regionConfig.currency,
    }).format(price);
  };

  const plans = [
    {
      name: t('plan.free.name'),
      icon: Shield,
      price: 0,
      description: t('plan.free.description'),
      features: [
        t('plan.free.feature1'),
        t('plan.free.feature2'),
        t('plan.free.feature3'),
        t('plan.free.feature4'),
        t('plan.free.feature5'),
        t('plan.free.feature6'),
      ],
      cta: t('plan.free.cta'),
      highlighted: false,
    },
    {
      name: t('plan.pro.name'),
      icon: Crown,
      price: 1,
      description: t('plan.pro.description'),
      features: [
        t('plan.pro.feature1'),
        t('plan.pro.feature2'),
        t('plan.pro.feature3'),
        t('plan.pro.feature4'),
        t('plan.pro.feature5'),
        t('plan.pro.feature6'),
        t('plan.pro.feature7'),
        t('plan.pro.feature8'),
        t('plan.pro.feature9'),
        t('plan.pro.feature10'),
        t('plan.pro.feature11'),
        t('plan.pro.feature12'),
      ],
      cta: t('plan.pro.cta'),
      highlighted: true,
    },
  ];

  const faqs = [
    {
      question: t('faq.q1'),
      answer: t('faq.a1'),
    },
    {
      question: t('faq.q2'),
      answer: t('faq.a2'),
    },
    {
      question: t('faq.q3'),
      answer: t('faq.a3'),
    },
    {
      question: t('faq.q4'),
      answer: t('faq.a4'),
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('pricing.title')} <span className="glow-text">{t('pricing.title_highlight')}</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={!isAnnual ? 'text-primary' : 'text-muted-foreground'}>
              {t('pricing.monthly')}
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isAnnual ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-background transition-transform ${
                  isAnnual ? 'translate-x-7' : ''
                }`}
              />
            </button>
            <span className={isAnnual ? 'text-primary' : 'text-muted-foreground'}>
              {t('pricing.annual')}{' '}
              <span className="text-xs bg-primary/20 px-2 py-1 rounded-full">
                {t('pricing.discount')}
              </span>
            </span>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-hover p-8 rounded-2xl relative ${
                plan.highlighted ? 'ring-2 ring-primary glow-border' : ''
              }`}
            >
              {isSubscribed && plan.highlighted && (
                <Badge className="absolute top-4 right-4 bg-primary">
                  {t('plan.pro.badge')}
                </Badge>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <plan.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold glow-text">
                    {plan.price === 0
                      ? formatPrice(0)
                      : formatPrice(calculatePrice(plan.price))}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">
                      /{isAnnual ? t('pricing.per_year') : t('pricing.per_month')}
                    </span>
                  )}
                </div>
              </div>

              {plan.highlighted ? (
                isSubscribed ? (
                  <Button
                    className="w-full mb-6 bg-muted cursor-not-allowed"
                    disabled
                  >
                    {t('plan.pro.badge')}
                  </Button>
                ) : (
                  <Button
                    className="w-full mb-6 btn-glow bg-primary hover:bg-primary/90"
                    onClick={handleSubscribe}
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : plan.cta}
                  </Button>
                )
              ) : (
                <Button
                  className="w-full mb-6 bg-secondary hover:bg-secondary/80"
                  onClick={() => navigate('/dashboard')}
                >
                  {plan.cta}
                </Button>
              )}

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Payment Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-12"
        >
          <p className="text-sm text-muted-foreground">
            {t('pricing.payment_info')}{' '}
            <span className="text-primary font-semibold">Stripe</span>
          </p>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            {t('pricing.faq_title')} <span className="glow-text">{t('pricing.faq_title_highlight')}</span>
          </h2>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-hover rounded-xl px-6 border-0"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
