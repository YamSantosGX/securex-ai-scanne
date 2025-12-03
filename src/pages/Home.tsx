import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Scan, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import PoweredByFooter from '@/components/PoweredByFooter';
import discordIcon from '@/assets/discord-icon.png';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const features = [
    {
      icon: Scan,
      title: t('home.feature1.title') || 'Scan Inteligente com IA',
      description: t('home.feature1.desc') || 'Scanner avançado com inteligência artificial que detecta vulnerabilidades conhecidas e desconhecidas',
    },
    {
      icon: Bell,
      title: t('home.feature2.title') || 'Análise em Tempo Real',
      description: t('home.feature2.desc') || 'Monitore suas aplicações 24/7 com relatórios detalhados e alertas instantâneos de segurança',
    },
    {
      icon: CheckCircle2,
      title: t('home.feature3.title') || 'Correções Automáticas',
      description: t('home.feature3.desc') || 'Receba recomendações precisas e código pronto para corrigir vulnerabilidades identificadas',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center py-20">
          <div className="text-center max-w-5xl w-full">
            {/* Animated Shield Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl" 
                  style={{
                    animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
                <div className="relative p-6 md:p-8 rounded-3xl glass-hover" 
                  style={{
                    animation: 'float 6s ease-in-out infinite'
                  }}
                >
                  <Shield className="w-16 h-16 md:w-20 md:h-20 text-primary" strokeWidth={1.5} />
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight px-4"
            >
              {t('home.hero.title')} <span className="glow-text whitespace-nowrap">{t('home.hero.title_highlight')}</span>
              <br />
              {t('home.hero.subtitle_line2')} <span className="glow-text">{t('home.hero.applications')}</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto px-4"
            >
              {t('home.hero.subtitle')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 px-4"
            >
              {isAuthenticated ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/dashboard')}
                    className="btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-5 text-base w-full sm:w-auto"
                  >
                    {t('nav.dashboard')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>

                  <Button
                    size="lg"
                    onClick={() => navigate('/pricing')}
                    className="btn-glow btn-zoom bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-8 py-5 text-base w-full sm:w-auto ring-2 ring-primary/50"
                  >
                    {t('home.cta.plans')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-5 text-base w-full sm:w-auto"
                  >
                    {t('home.cta.start')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/pricing')}
                    className="px-8 py-5 text-base glass-hover btn-zoom w-full sm:w-auto"
                  >
                    {t('home.cta.plans')}
                  </Button>
                </>
              )}

              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open('https://discord.gg/X36RjdnReJ', '_blank')}
                className="px-8 py-5 text-base glass-hover btn-zoom w-full sm:w-auto"
              >
                <img src={discordIcon} alt="Discord" className="mr-2 w-5 h-5 brightness-0 invert" />
                {t('home.cta.discord')}
              </Button>
            </motion.div>

            {/* Features Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="grid md:grid-cols-3 gap-6 mt-16 px-4"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                  className="glass-hover p-6 rounded-2xl text-left"
                >
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <PoweredByFooter />
      <Footer />
    </div>
  );
}
