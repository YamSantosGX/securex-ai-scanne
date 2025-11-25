import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Shield, Clock, CheckCircle, AlertTriangle, Crown, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// URL validation schema
const urlSchema = z.string()
  .trim()
  .url('URL inválida')
  .max(2048, 'URL muito longa')
  .regex(/^https?:\/\//, 'Apenas protocolos HTTP e HTTPS são permitidos');

type Scan = {
  id: string;
  target: string;
  scan_type: 'file' | 'url';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  severity: 'safe' | 'warning' | 'danger' | null;
  vulnerabilities_count: number;
  created_at: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [scansThisMonth, setScansThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingScanData, setPendingScanData] = useState<{ url?: string; file?: File } | null>(null);

  const MAX_FREE_SCANS = 5;

  useEffect(() => {
    checkAuthAndSubscription();
    loadScans();

    // Set up realtime subscription for scan updates
    const channel = supabase
      .channel('scans-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scans'
        },
        (payload) => {
          console.log('Scan update received:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            loadScans();
            
            // Show notification when scan completes
            if (payload.new.status === 'completed') {
              const newScan = payload.new as Scan;
              const severity = newScan.severity;
              const vulnCount = newScan.vulnerabilities_count;
              
              if (severity === 'danger' && vulnCount > 0) {
                toast.error(
                  `Scan concluído: ${vulnCount} vulnerabilidade${vulnCount > 1 ? 's' : ''} ${vulnCount > 1 ? 'encontradas' : 'encontrada'}!`,
                  {
                    description: 'Clique no relatório para ver os detalhes.',
                    duration: 5000,
                  }
                );
              } else if (severity === 'warning' && vulnCount > 0) {
                toast.warning(
                  `Scan concluído: ${vulnCount} problema${vulnCount > 1 ? 's' : ''} ${vulnCount > 1 ? 'encontrados' : 'encontrado'}`,
                  {
                    description: 'Verifique o relatório para mais informações.',
                    duration: 5000,
                  }
                );
              } else {
                toast.success(
                  'Scan concluído com sucesso!',
                  {
                    description: 'Nenhuma vulnerabilidade detectada.',
                    duration: 3000,
                  }
                );
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const checkAuthAndSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, scans_this_month')
        .eq('user_id', user.id)
        .single();

      if (profile?.subscription_status === 'active') {
        setIsSubscribed(true);
      }
      
      setScansThisMonth(profile?.scans_this_month || 0);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans((data as unknown as Scan[]) || []);
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const handleScanRequest = () => {
    if (!url && !file) {
      toast.error('Por favor, forneça uma URL ou arquivo para escanear');
      return;
    }

    // Validate URL if provided
    if (url) {
      try {
        urlSchema.parse(url);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.errors[0].message);
          return;
        }
      }
    }

    // Validate file if provided
    if (file) {
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 20MB');
        return;
      }

      const allowedTypes = [
        'text/plain',
        'application/javascript',
        'text/javascript',
        'application/json',
        'text/html',
        'text/css',
        'application/x-python',
        'text/x-python',
      ];

      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(js|ts|jsx|tsx|py|html|css|json|txt)$/i)) {
        toast.error('Tipo de arquivo não suportado. Use arquivos de código-fonte.');
        return;
      }
    }

    // Check scan limits for free users
    if (!isSubscribed && scansThisMonth >= MAX_FREE_SCANS) {
      toast.error(`Limite de ${MAX_FREE_SCANS} scans gratuitos por mês atingido. Faça upgrade para continuar.`);
      navigate('/pricing');
      return;
    }

    setPendingScanData({ url: url || undefined, file: file || undefined });
    setShowConfirmDialog(true);
  };

  const handleConfirmScan = async () => {
    if (!pendingScanData) return;

    setShowConfirmDialog(false);
    setIsScanning(true);
    toast.info('Iniciando análise de segurança com IA...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const target = pendingScanData.file ? pendingScanData.file.name : pendingScanData.url || '';
      const scanType = pendingScanData.file ? 'file' : 'url';

      // Create scan record
      const { data: newScan, error } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          target,
          scan_type: scanType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function for AI analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-security', {
        body: {
          target,
          scanType,
          scanId: newScan.id
        }
      });

      if (analysisError) {
        console.error('Analysis error:', analysisError);
        throw analysisError;
      }

      console.log('Analysis complete:', analysisData);

      await loadScans();
      await checkAuthAndSubscription();
      
      setUrl('');
      setFile(null);
      setPendingScanData(null);
      toast.success('Análise de segurança iniciada! Aguarde a conclusão...');
    } catch (error) {
      console.error('Error during scan:', error);
      toast.error('Erro ao realizar scan. Tente novamente.');
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusIcon = (status: string, severity: string | null) => {
    if (status === 'processing' || status === 'pending') {
      return <Clock className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
    if (status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    
    switch (severity) {
      case 'safe':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Shield className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string, severity: string | null) => {
    if (status === 'processing' || status === 'pending') {
      return 'Analisando...';
    }
    if (status === 'failed') {
      return 'Falhou';
    }
    
    switch (severity) {
      case 'safe':
        return 'Seguro';
      case 'warning':
        return 'Atenção';
      case 'danger':
        return 'Risco Alto';
      default:
        return 'Processando';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar isAuthenticated />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Central de <span className="glow-text">Análise de Segurança</span>
            </h1>
            {isSubscribed && (
              <Badge className="bg-primary text-primary-foreground gap-1">
                <Crown className="w-4 h-4" />
                PRO
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            Escaneie seus arquivos e sites com IA avançada
          </p>
          {!isSubscribed && (
            <p className="text-sm text-muted-foreground mt-2">
              Scans este mês: {scansThisMonth}/{MAX_FREE_SCANS}
            </p>
          )}
        </motion.div>

        {/* Scan Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="max-w-3xl mx-auto mb-12"
        >
          <div className="glass-hover p-8 rounded-2xl">
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="url">URL do Site</TabsTrigger>
                <TabsTrigger value="file">Upload de Arquivo</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">URL do Site</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://seusite.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10 glass"
                      disabled={isScanning}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Arquivo da Aplicação (código-fonte)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-all duration-500 cursor-pointer glass">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <Input
                      id="file"
                      type="file"
                      accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.txt"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      disabled={isScanning}
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      <p className="text-sm text-muted-foreground">
                        {file ? file.name : 'Clique para fazer upload ou arraste o arquivo'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Formatos: .js, .ts, .py, .html, .css, .json (máx. 20MB)
                      </p>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleScanRequest}
              disabled={isScanning}
              className="w-full mt-6 btn-glow btn-zoom bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Shield className="w-5 h-5 mr-2" />
              {isScanning ? 'Analisando...' : 'Iniciar Análise de Segurança'}
            </Button>
          </div>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-2xl font-bold mb-6">Histórico de Análises</h2>
          {scans.length === 0 ? (
            <div className="glass-hover p-12 rounded-xl text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma análise realizada ainda</h3>
              <p className="text-muted-foreground">
                Comece fazendo sua primeira análise de segurança
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {scans.map((scan) => (
                <div key={scan.id} className="glass-hover p-6 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(scan.status, scan.severity)}
                      <div>
                        <h3 className="font-semibold">{scan.target}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="w-4 h-4" />
                          {new Date(scan.created_at).toLocaleString('pt-BR')}
                        </div>
                        {scan.vulnerabilities_count > 0 && scan.status === 'completed' && (
                          <p className="text-sm text-red-500 mt-1">
                            {scan.vulnerabilities_count} vulnerabilidade{scan.vulnerabilities_count > 1 ? 's' : ''} detectada{scan.vulnerabilities_count > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        scan.status === 'completed' && scan.severity === 'safe' ? 'bg-green-500/10 text-green-500' :
                        scan.status === 'completed' && scan.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                        scan.status === 'completed' && scan.severity === 'danger' ? 'bg-red-500/10 text-red-500' :
                        scan.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {getStatusText(scan.status, scan.severity)}
                      </span>
                      {scan.status === 'completed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="btn-zoom"
                          onClick={() => navigate(`/scan/${scan.id}`)}
                        >
                          Ver Relatório
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Análise de Segurança</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a iniciar uma análise completa de segurança em:
              <br />
              <strong className="text-foreground">
                {pendingScanData?.file ? pendingScanData.file.name : pendingScanData?.url}
              </strong>
              <br /><br />
              A análise incluirá verificação de:
              <ul className="list-disc list-inside text-sm mt-2">
                <li>SQL Injection</li>
                <li>Cross-Site Scripting (XSS)</li>
                <li>CSRF e outras vulnerabilidades OWASP Top 10</li>
              </ul>
              <br />
              {!isSubscribed && (
                <span className="text-yellow-500">
                  Isso usará 1 de seus {MAX_FREE_SCANS} scans gratuitos mensais.
                  <br />
                  Scans restantes: {MAX_FREE_SCANS - scansThisMonth - 1}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-zoom">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmScan}
              className="btn-glow btn-zoom bg-primary hover:bg-primary/90"
            >
              Confirmar Análise
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
