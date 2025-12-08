import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import PoweredByFooter from '@/components/PoweredByFooter';
import { useI18n } from '@/contexts/I18nContext';

// Validation schemas
const emailSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/[a-z]/, 'Senha deve conter letras minúsculas')
    .regex(/[A-Z]/, 'Senha deve conter letras maiúsculas')
    .regex(/[0-9]/, 'Senha deve conter números'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type Step = 'request' | 'update' | 'success';

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.match(/[a-z]+/)) strength += 25;
    if (pwd.match(/[A-Z]+/)) strength += 25;
    if (pwd.match(/[0-9]+/)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    setPasswordStrength(calculatePasswordStrength(pwd));
  };

  // Check if we have a recovery token in the URL (user clicked the email link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('update');
      }
    });

    // Check URL hash for access_token (Supabase redirect)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      setStep('update');
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse({ email });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success(t('reset.email_sent'));
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      passwordSchema.parse({ password, confirmPassword });

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setStep('success');
      toast.success(t('reset.password_updated'));
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error(t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="p-4 rounded-2xl glass-hover"
            style={{ animation: 'float 6s ease-in-out infinite' }}
          >
            <Shield className="w-12 h-12 text-primary" />
          </motion.div>
        </div>

        {/* Form Card */}
        <div className="glass-hover p-8 rounded-2xl">
          {/* Step: Request Reset */}
          {step === 'request' && !emailSent && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2 glow-text">
                {t('reset.title')}
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                {t('reset.subtitle')}
              </p>

              <form onSubmit={handleRequestReset} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 glass"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? t('common.loading') : t('reset.send_link')}
                </Button>
              </form>
            </>
          )}

          {/* Step: Email Sent Confirmation */}
          {step === 'request' && emailSent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold glow-text">
                {t('reset.check_email')}
              </h1>
              <p className="text-muted-foreground">
                {t('reset.email_sent_desc')} <span className="text-foreground font-medium">{email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('reset.check_spam')}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full"
              >
                {t('reset.try_another_email')}
              </Button>
            </motion.div>
          )}

          {/* Step: Update Password */}
          {step === 'update' && (
            <>
              <h1 className="text-3xl font-bold text-center mb-2 glow-text">
                {t('reset.new_password_title')}
              </h1>
              <p className="text-center text-muted-foreground mb-8">
                {t('reset.new_password_subtitle')}
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('reset.new_password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={handlePasswordChange}
                      className="pl-10 glass"
                      disabled={isLoading}
                    />
                  </div>
                  
                  {password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[25, 50, 75, 100].map((threshold) => (
                          <div
                            key={threshold}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              passwordStrength >= threshold
                                ? 'bg-primary'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passwordStrength < 50 && t('reset.password_weak')}
                        {passwordStrength >= 50 && passwordStrength < 75 && t('reset.password_medium')}
                        {passwordStrength >= 75 && passwordStrength < 100 && t('reset.password_strong')}
                        {passwordStrength === 100 && t('reset.password_very_strong')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('reset.confirm_password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 glass"
                      disabled={isLoading}
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">{t('reset.passwords_dont_match')}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || password !== confirmPassword}
                  className="w-full btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoading ? t('common.loading') : t('reset.update_password')}
                </Button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-500">
                {t('reset.success_title')}
              </h1>
              <p className="text-muted-foreground">
                {t('reset.success_desc')}
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t('reset.go_to_dashboard')}
              </Button>
            </motion.div>
          )}

          {/* Back to login link */}
          {step === 'request' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('reset.back_to_login')}
              </button>
            </div>
          )}
        </div>

        <PoweredByFooter />
      </motion.div>
    </div>
  );
}
