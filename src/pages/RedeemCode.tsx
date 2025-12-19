import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

export default function RedeemCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast({
        title: 'Código inválido',
        description: 'Por favor, insira um código válido.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Verifica se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        toast({
          title: 'Autenticação necessária',
          description: 'Por favor, faça login para resgatar códigos.',
          variant: 'destructive',
        });
        return;
      }

      // Resgata o código via API externa
      const response = await fetch(`${API_URL}/codes/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message.replace(/^〔API〕»\s*/, '') || 'Erro ao resgatar código');
      }

      // Verifica se é um código de plano (type: 1)
      if (data.code.type !== 1) {
        toast({
          title: 'Código inválido',
          description: 'Este código não pode ser resgatado aqui. Use códigos de desconto na página de pagamento.',
          variant: 'destructive',
        });
        return;
      }

      // Atualiza o perfil do usuário com o plano
      const duration = data.code.duration;
      let expiresAt = new Date();
      
      // Calcula a data de expiração baseada na duração
      switch (duration.unit) {
        case 'DAYS':
          expiresAt.setDate(expiresAt.getDate() + duration.value);
          break;
        case 'MONTHS':
          expiresAt.setMonth(expiresAt.getMonth() + duration.value);
          break;
        case 'YEARS':
          expiresAt.setFullYear(expiresAt.getFullYear() + duration.value);
          break;
      }

      // Atualiza o status da assinatura
      // A logica de atribuicao do plano PRO ao usuario deve ser implementada aqui:

      setSuccess(true);
      toast({
        title: '✨ Código resgatado com sucesso!',
        description: `Você ganhou ${duration.value} ${
          duration.unit === 'DAYS' ? 'dias' :
          duration.unit === 'MONTHS' ? 'meses' : 'anos'
        } de acesso PRO!`,
      });

      // Redireciona para o dashboard após 3 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error: any) {
      console.error('Error redeeming code:', error);
      toast({
        title: 'Erro ao resgatar código',
        description: error.message || 'Verifique o código e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Gift className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Resgatar <span className="glow-text">Código</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Insira seu código promocional para ativar seu plano PRO
            </p>
          </div>

          <Card className="p-8 glass-hover">
            {success ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Código Resgatado!</h2>
                <p className="text-muted-foreground mb-6">
                  Redirecionando para o dashboard...
                </p>
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Código Promocional
                  </label>
                  <Input
                    placeholder="Digite seu código aqui"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                    className="text-center text-lg tracking-wider font-mono"
                    disabled={loading}
                    maxLength={20}
                  />
                </div>

                <Button
                  onClick={handleRedeem}
                  disabled={loading || !code.trim()}
                  className="w-full btn-glow"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Resgatar Código
                    </>
                  )}
                </Button>

                <div className="pt-6 border-t">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    O que você ganha:
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Scans ilimitados de URLs e arquivos
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Análise avançada com IA
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Histórico completo de scans
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Suporte prioritário
                    </li>
                  </ul>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Não tem um código?{' '}
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-primary hover:underline font-medium"
                  >
                    Ver planos disponíveis
                  </button>
                </div>
              </div>
            )}
          </Card>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-500 text-sm">
              <X className="w-4 h-4" />
              <span>Códigos de desconto não podem ser resgatados aqui</span>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
