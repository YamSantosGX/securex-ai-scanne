import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Link as LinkIcon, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Crown, 
  XCircle, 
  Github, 
  GitBranch,
  TrendingUp,
  Activity,
  Filter,
  FileText,
  Download,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  scan_type: 'file' | 'url' | 'github';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  severity: 'safe' | 'warning' | 'danger' | null;
  vulnerabilities_count: number;
  created_at: string;
};

type Invoice = {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: number;
  period_end: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [scans, setScans] = useState<Scan[]>([]);
  const [filteredScans, setFilteredScans] = useState<Scan[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [scansThisMonth, setScansThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingScanData, setPendingScanData] = useState<{ url?: string; file?: File; githubUrl?: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const MAX_FREE_SCANS = 5;
  const MAX_FILE_SIZE_FREE = 50 * 1024 * 1024; // 50MB
  const MAX_FILE_SIZE_PRO = 600 * 1024 * 1024; // 600MB

  useEffect(() => {
    checkAuthAndSubscription();
    loadScans();
    loadInvoices();
    requestNotificationPermission();

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
                const message = `${vulnCount} vulnerabilidade${vulnCount > 1 ? 's críticas' : ' crítica'} detectada${vulnCount > 1 ? 's' : ''}!`;
                toast.error(
                  `Scan concluído: ${message}`,
                  {
                    description: 'Clique no relatório para ver os detalhes.',
                    duration: 5000,
                  }
                );
                // Send browser notification for critical vulnerabilities
                sendBrowserNotification(
                  '🔴 Alerta de Segurança Crítico',
                  message + ' Verifique o relatório imediatamente.'
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

  useEffect(() => {
    applyFilters();
  }, [scans, statusFilter, severityFilter]);

  const applyFilters = () => {
    let filtered = [...scans];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(scan => scan.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(scan => scan.severity === severityFilter);
    }

    setFilteredScans(filtered);
  };

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
        loadInvoices();
      }
      
      setScansThisMonth(profile?.scans_this_month || 0);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('Notificações ativadas! Você será alertado sobre vulnerabilidades críticas.');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const sendBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
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

  const loadInvoices = async () => {
    if (!isSubscribed) return;
    
    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-invoices');

      if (error) throw error;
      setInvoices(data?.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoadingInvoices(false);
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
      const maxSize = isSubscribed ? MAX_FILE_SIZE_PRO : MAX_FILE_SIZE_FREE;
      const maxSizeMB = maxSize / (1024 * 1024);
      
      if (file.size > maxSize) {
        toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
        return;
      }

      const allowedExtensions = /\.(js|ts|jsx|tsx|py|html|css|json|txt|php|rb|java|go|rs|c|cpp|cs|yml|yaml|xml|toml|ini|env|tf|dockerfile|kt|swift|sh|bash|ps1|bat|sql|md)$/i;

      if (!file.name.match(allowedExtensions)) {
        toast.error('Tipo de arquivo não suportado. Use arquivos de código-fonte, configuração ou scripts.');
        return;
      }
    }

    // Validate GitHub URL if provided
    if (githubUrl) {
      if (!githubUrl.match(/^https:\/\/github\.com\/[\w-]+\/[\w-]+/)) {
        toast.error('URL do GitHub inválida. Use o formato: https://github.com/usuario/repositorio');
        return;
      }
    }

    // Check scan limits for free users
    if (!isSubscribed && scansThisMonth >= MAX_FREE_SCANS) {
      toast.error(`Limite de ${MAX_FREE_SCANS} scans gratuitos por mês atingido. Faça upgrade para continuar.`);
      navigate('/pricing');
      return;
    }

    setPendingScanData({ url: url || undefined, file: file || undefined, githubUrl: githubUrl || undefined });
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

      const target = pendingScanData.file 
        ? pendingScanData.file.name 
        : pendingScanData.githubUrl 
          ? pendingScanData.githubUrl 
          : pendingScanData.url || '';
      
      const scanType = pendingScanData.file 
        ? 'file' 
        : pendingScanData.githubUrl 
          ? 'github' 
          : 'url';

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
      setGithubUrl('');
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

  const getInvoiceStatus = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pago</Badge>;
      case 'open':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Aberto</Badge>;
      case 'void':
        return <Badge className="bg-muted text-muted-foreground border-border">Cancelado</Badge>;
      case 'uncollectible':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Não Cobrável</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar isAuthenticated />
      
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
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
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto"
        >
          <div className="glass-hover p-6 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <div className="text-3xl font-bold">{scans.length}</div>
            </div>
            <div className="text-sm text-muted-foreground">Total de Scans</div>
          </div>
          <div className="glass-hover p-6 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div className="text-3xl font-bold">
                {scans.reduce((acc, scan) => acc + (scan.vulnerabilities_count || 0), 0)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Vulnerabilidades</div>
          </div>
          <div className="glass-hover p-6 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div className="text-3xl font-bold">
                {scans.filter(s => s.severity === 'safe').length}/{scans.length}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Seguros</div>
          </div>
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
              <div className="w-full overflow-x-auto scrollbar-hide mb-6">
                <TabsList className="inline-flex min-w-full md:grid md:grid-cols-3 md:w-full">
                  <TabsTrigger value="url" className="whitespace-nowrap flex-1 md:flex-none">URL do Site</TabsTrigger>
                  <TabsTrigger value="file" className="whitespace-nowrap flex-1 md:flex-none">Upload de Arquivo</TabsTrigger>
                  <TabsTrigger value="github" className="whitespace-nowrap flex-1 md:flex-none">
                    <Github className="w-4 h-4 mr-2" />
                    GitHub
                  </TabsTrigger>
                </TabsList>
              </div>

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
                  <Label htmlFor="file">Arquivo de Código-Fonte</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-all duration-500 cursor-pointer glass">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <Input
                      id="file"
                      type="file"
                      accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.txt,.php,.rb,.java,.go,.rs,.c,.cpp,.cs,.yml,.yaml,.xml,.toml,.ini,.env,.tf,.dockerfile,.kt,.swift,.sh,.bash,.ps1,.bat,.sql,.md"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      disabled={isScanning}
                    />
                    <label
                      htmlFor="file"
                      className="cursor-pointer text-primary hover:text-primary/80 transition-colors"
                    >
                      {file ? file.name : 'Clique para selecionar um arquivo'}
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Tamanho máximo: {isSubscribed ? '600MB' : '50MB'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Suportados: JavaScript, TypeScript, Python, Java, PHP, Ruby, Go, Rust, C/C++, C#, YAML, XML, SQL, Shell, e mais
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="github" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github">URL do Repositório GitHub</Label>
                  <div className="relative">
                    <GitBranch className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="github"
                      type="url"
                      placeholder="https://github.com/usuario/repositorio"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="pl-10 glass"
                      disabled={isScanning}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analisaremos os arquivos principais do repositório
                  </p>
                </div>
              </TabsContent>

              <Button
                onClick={handleScanRequest}
                disabled={isScanning || (!url && !file && !githubUrl)}
                className="w-full mt-6 btn-glow btn-zoom bg-primary hover:bg-primary/90"
              >
                {isScanning ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Iniciar Análise de Segurança
                  </>
                )}
              </Button>
            </Tabs>
          </div>
        </motion.div>
        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Histórico de Análises</h2>
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] glass">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px] glass">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="safe">Seguro</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="danger">Risco</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filteredScans.length === 0 ? (
            <div className="glass-hover p-12 rounded-xl text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma análise encontrada</h3>
              <p className="text-muted-foreground">
                {scans.length === 0 ? 'Comece fazendo sua primeira análise de segurança' : 'Tente ajustar os filtros'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScans.map((scan) => (
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

        {/* Invoices Section - Only for PRO users */}
        {isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="max-w-5xl mx-auto mt-12"
          >
            <Card className="glass-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Histórico de Faturas e Pagamentos
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie suas transações da assinatura PRO
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhuma fatura encontrada</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.number || invoice.id.substring(0, 8)}
                            </TableCell>
                            <TableCell>
                              {new Date(invoice.created * 1000).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(invoice.period_start * 1000).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: invoice.currency === 'USD' ? 'USD' : 'BRL',
                              }).format(invoice.amount)}
                            </TableCell>
                            <TableCell>
                              {getInvoiceStatus(invoice.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {invoice.invoice_pdf && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.invoice_pdf!, '_blank')}
                                    className="btn-zoom"
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    PDF
                                  </Button>
                                )}
                                {invoice.hosted_invoice_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                                    className="btn-zoom"
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Ver
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
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
