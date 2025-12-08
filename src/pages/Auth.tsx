import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import PoweredByFooter from '@/components/PoweredByFooter';

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128, 'Senha muito longa'),
});

const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(/[a-z]/, 'Senha deve conter letras minúsculas')
    .regex(/[A-Z]/, 'Senha deve conter letras maiúsculas')
    .regex(/[0-9]/, 'Senha deve conter números'),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(() => searchParams.get('mode') !== 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate inputs based on mode
      if (isLogin) {
        loginSchema.parse({ email, password });
        
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success('Login realizado com sucesso!');
      } else {
        signupSchema.parse({ name, email, password });
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
            }
          }
        });

        if (error) throw error;
        toast.success('Conta criada com sucesso!');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Erro ao processar formulário');
      }
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
          <h1 className="text-3xl font-bold text-center mb-2 glow-text">
            {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            {isLogin
              ? 'Entre para acessar sua conta'
              : 'Comece a proteger suas aplicações'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 glass"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 glass"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  className="pl-10 glass"
                />
              </div>
              
              {!isLogin && password && (
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
                    {passwordStrength < 50 && 'Senha fraca'}
                    {passwordStrength >= 50 && passwordStrength < 75 && 'Senha média'}
                    {passwordStrength >= 75 && passwordStrength < 100 && 'Senha forte'}
                    {passwordStrength === 100 && 'Senha muito forte'}
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
            >
              {isLogin
                ? 'Não tem uma conta? Cadastre-se'
                : 'Já tem uma conta? Faça login'}
            </button>
            {isLogin && (
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
              >
                Esqueceu sua senha?
              </button>
            )}
          </div>
        </div>

        <PoweredByFooter />
      </motion.div>
    </div>
  );
}
