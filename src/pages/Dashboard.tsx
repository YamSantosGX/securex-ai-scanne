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
  CreditCard,
  Lock
} from 'lucide-react';
import { AdminToggle } from '@/components/AdminToggle';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t, language } = useI18n();
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
  const [showProDialog, setShowProDialog] = useState(false);
  const [pendingScanData, setPendingScanData] = useState<{ url?: string; file?: File; githubUrl?: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const MAX_FREE_SCANS = 5;
  const MAX_FILE_SIZE_FREE = 50 * 1024 * 1024; // 50MB
  const MAX_FILE_SIZE_PRO = 600 * 1024 * 1024; // 600MB

  const getLocale = () => {
    switch (language) {
      case 'en': return 'en-US';
      case 'de': return 'de-DE';
      case 'fr': return 'fr-FR';
      case 'es': return 'es-ES';
      case 'it': return 'it-IT';
      default: return 'pt-BR';
    }
  };

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
                const message = `${vulnCount} ${t('dashboard.vulnerabilities_detected')}!`;
                toast.error(message, {
                  description: t('dashboard.view_report'),
                  duration: 5000,
                });
                sendBrowserNotification(
                  '🔴 ' + t('dashboard.status_danger'),
                  message
                );
              } else if (severity === 'warning' && vulnCount > 0) {
                toast.warning(
                  `${vulnCount} ${t('dashboard.vulnerabilities_detected')}`,
                  {
                    description: t('dashboard.view_report'),
                    duration: 5000,
                  }
                );
              } else {
                toast.success(t('dashboard.status_safe'), { duration: 3000 });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, t]);

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
          toast.success(t('common.success'));
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

  const handleGithubTabClick = () => {
    if (!isSubscribed) {
      setShowProDialog(true);
      return false;
    }
    return true;
  };

  const handleScanRequest = () => {
    if (!url && !file && !githubUrl) {
      toast.error(t('common.error'));
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
        toast.error(`${t('dashboard.file_max_size')}: ${maxSizeMB}MB`);
        return;
      }

      const allowedExtensions = /\.(js|ts|jsx|tsx|py|html|css|json|txt|php|rb|java|go|rs|c|cpp|cs|yml|yaml|xml|toml|ini|env|tf|dockerfile|kt|swift|sh|bash|ps1|bat|sql|md)$/i;

      if (!file.name.match(allowedExtensions)) {
        toast.error(t('common.error'));
        return;
      }
    }

    // Validate GitHub URL if provided
    if (githubUrl) {
      if (!isSubscribed) {
        setShowProDialog(true);
        return;
      }
      if (!githubUrl.match(/^https:\/\/github\.com\/[\w-]+\/[\w-]+/)) {
        toast.error(t('common.error'));
        return;
      }
    }

    // Check scan limits for free users
    if (!isSubscribed && scansThisMonth >= MAX_FREE_SCANS) {
      toast.error(`${t('dashboard.confirm_scan_usage').replace('{max}', String(MAX_FREE_SCANS))}`);
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
    toast.info(t('dashboard.scanning'));

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
      toast.success(t('dashboard.start_scan'));
    } catch (error) {
      console.error('Error during scan:', error);
      toast.error(t('common.error'));
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
      return t('dashboard.status_analyzing');
    }
    if (status === 'failed') {
      return t('dashboard.status_failed');
    }
    
    switch (severity) {
      case 'safe':
        return t('dashboard.status_safe');
      case 'warning':
        return t('dashboard.status_warning');
      case 'danger':
        return t('dashboard.status_danger');
      default:
        return t('dashboard.status_processing');
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
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{t('dashboard.invoice_paid')}</Badge>;
      case 'open':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t('dashboard.invoice_open')}</Badge>;
      case 'void':
        return <Badge className="bg-muted text-muted-foreground border-border">{t('dashboard.invoice_void')}</Badge>;
      case 'uncollectible':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{t('dashboard.invoice_uncollectible')}</Badge>;
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
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              {t('dashboard.title')} <span className="glow-text">{t('dashboard.title_highlight')}</span>
            </h1>
            {isSubscribed && (
              <Badge className="bg-primary text-primary-foreground gap-1">
                <Crown className="w-4 h-4" />
                PRO
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">
            {t('dashboard.subtitle')}
          </p>
        </motion.div>

        {/* Admin Toggle - Only visible for admin users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02, duration: 0.8 }}
          className="max-w-md mx-auto mb-8"
        >
          <AdminToggle 
            isSubscribed={isSubscribed} 
            onToggle={(newStatus) => {
              setIsSubscribed(newStatus);
              // Reload scans to update UI based on new subscription status
              loadScans();
            }} 
          />
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto"
        >
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-primary" />
              <div className="text-2xl sm:text-3xl font-bold">{scans.length}</div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.total_scans')}</div>
          </div>
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div className="text-2xl sm:text-3xl font-bold">
                {scans.reduce((acc, scan) => acc + (scan.vulnerabilities_count || 0), 0)}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.vulnerabilities')}</div>
          </div>
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div className="text-2xl sm:text-3xl font-bold">
                {scans.filter(s => s.severity === 'safe').length}/{scans.length}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('dashboard.safe')}</div>
          </div>
        </motion.div>

        {/* Scan Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="max-w-3xl mx-auto mb-12"
        >
          <div className="glass-hover p-4 sm:p-8 rounded-2xl">
            <Tabs defaultValue="url" className="w-full">
              <div className="w-full overflow-x-auto scrollbar-hide mb-6">
                <TabsList className="inline-flex min-w-full md:grid md:grid-cols-3 md:w-full">
                  <TabsTrigger value="url" className="whitespace-nowrap flex-1 md:flex-none">{t('dashboard.url_tab')}</TabsTrigger>
                  <TabsTrigger value="file" className="whitespace-nowrap flex-1 md:flex-none">{t('dashboard.file_tab')}</TabsTrigger>
                  <TabsTrigger 
                    value="github" 
                    className="whitespace-nowrap flex-1 md:flex-none"
                    onClick={(e) => {
                      if (!isSubscribed) {
                        e.preventDefault();
                        setShowProDialog(true);
                      }
                    }}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    {t('dashboard.github_tab')}
                    {!isSubscribed && <Lock className="w-3 h-3 ml-1" />}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">{t('dashboard.url_label')}</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder={t('dashboard.url_placeholder')}
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
                  <Label htmlFor="file">{t('dashboard.file_label')}</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 sm:p-8 text-center hover:border-primary/50 transition-all duration-500 cursor-pointer glass">
                    <Upload className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground" />
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
                      className="cursor-pointer text-primary hover:text-primary/80 transition-colors text-sm sm:text-base"
                    >
                      {file ? file.name : t('dashboard.file_select')}
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('dashboard.file_max_size')}: {isSubscribed ? '600MB' : '50MB'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      {t('dashboard.file_supported')}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="github" className="space-y-4">
                {isSubscribed ? (
                  <div className="space-y-2">
                    <Label htmlFor="github">{t('dashboard.github_label')}</Label>
                    <div className="relative">
                      <GitBranch className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="github"
                        type="url"
                        placeholder={t('dashboard.github_placeholder')}
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="pl-10 glass"
                        disabled={isScanning}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.github_info')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('dashboard.github_pro_only')}</p>
                    <Button 
                      className="mt-4 btn-glow" 
                      onClick={() => navigate('/pricing')}
                    >
                      {t('home.cta.plans')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <Button
                onClick={handleScanRequest}
                disabled={isScanning || (!url && !file && !githubUrl)}
                className="w-full mt-6 btn-glow btn-zoom bg-primary hover:bg-primary/90"
              >
                {isScanning ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {t('dashboard.scanning')}
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    {t('dashboard.start_scan')}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">{t('dashboard.history_title')}</h2>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] glass">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">{t('dashboard.filter_all')}</SelectItem>
                  <SelectItem value="completed">{t('dashboard.filter_completed')}</SelectItem>
                  <SelectItem value="pending">{t('dashboard.filter_pending')}</SelectItem>
                  <SelectItem value="processing">{t('dashboard.filter_processing')}</SelectItem>
                  <SelectItem value="failed">{t('dashboard.filter_failed')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] glass">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="glass">
                  <SelectItem value="all">{t('dashboard.filter_all')}</SelectItem>
                  <SelectItem value="safe">{t('dashboard.filter_safe')}</SelectItem>
                  <SelectItem value="warning">{t('dashboard.filter_warning')}</SelectItem>
                  <SelectItem value="danger">{t('dashboard.filter_danger')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filteredScans.length === 0 ? (
            <div className="glass-hover p-8 sm:p-12 rounded-xl text-center">
              <Shield className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('dashboard.no_scans')}</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                {scans.length === 0 ? t('dashboard.no_scans_start') : t('dashboard.no_scans_filter')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScans.map((scan) => (
                <div key={scan.id} className="glass-hover p-4 sm:p-6 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="flex-shrink-0 mt-1 sm:mt-0">
                        {getStatusIcon(scan.status, scan.severity)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate" title={scan.target}>
                          {scan.target}
                        </h3>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(scan.created_at).toLocaleString(getLocale())}
                          </span>
                        </div>
                        {scan.vulnerabilities_count > 0 && scan.status === 'completed' && (
                          <p className="text-xs sm:text-sm text-red-500 mt-1">
                            {scan.vulnerabilities_count} {t('dashboard.vulnerabilities_detected')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end flex-shrink-0">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap ${
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
                          className="btn-zoom text-xs sm:text-sm"
                          onClick={() => navigate(`/scan/${scan.id}`)}
                        >
                          {t('dashboard.view_report')}
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
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {t('dashboard.invoices_title')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('dashboard.invoices_description')}
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
                    <p className="text-muted-foreground">{t('dashboard.invoices_empty')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('dashboard.invoice_number')}</TableHead>
                          <TableHead>{t('dashboard.invoice_date')}</TableHead>
                          <TableHead className="hidden sm:table-cell">{t('dashboard.invoice_period')}</TableHead>
                          <TableHead>{t('dashboard.invoice_amount')}</TableHead>
                          <TableHead>{t('dashboard.invoice_status')}</TableHead>
                          <TableHead className="text-right">{t('dashboard.invoice_actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {invoice.number || invoice.id.substring(0, 8)}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {new Date(invoice.created * 1000).toLocaleDateString(getLocale())}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                              {new Date(invoice.period_start * 1000).toLocaleDateString(getLocale(), { month: 'short', year: 'numeric' })}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {new Intl.NumberFormat(getLocale(), {
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
                                    className="btn-zoom text-xs"
                                  >
                                    <Download className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">PDF</span>
                                  </Button>
                                )}
                                {invoice.hosted_invoice_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                                    className="btn-zoom text-xs"
                                  >
                                    <FileText className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">{t('dashboard.view_report')}</span>
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

      {/* PRO Required Dialog */}
      <Dialog open={showProDialog} onOpenChange={setShowProDialog}>
        <DialogContent className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              {t('plan.pro.name')}
            </DialogTitle>
            <DialogDescription>
              {t('dashboard.github_pro_only')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowProDialog(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={() => { setShowProDialog(false); navigate('/pricing'); }} className="btn-glow w-full sm:w-auto">
              {t('home.cta.plans')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="glass max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.confirm_scan_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.confirm_scan_description')}
              <br />
              <strong className="text-foreground break-all">
                {pendingScanData?.file ? pendingScanData.file.name : pendingScanData?.githubUrl || pendingScanData?.url}
              </strong>
              <br /><br />
              {t('dashboard.confirm_scan_includes')}
              <ul className="list-disc list-inside text-sm mt-2">
                <li>SQL Injection</li>
                <li>Cross-Site Scripting (XSS)</li>
                <li>CSRF e OWASP Top 10</li>
              </ul>
              <br />
              {!isSubscribed && (
                <span className="text-yellow-500">
                  {t('dashboard.confirm_scan_usage').replace('{max}', String(MAX_FREE_SCANS))}
                  <br />
                  {t('dashboard.confirm_scan_remaining').replace('{remaining}', String(MAX_FREE_SCANS - scansThisMonth - 1))}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="btn-zoom w-full sm:w-auto">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmScan}
              className="btn-glow btn-zoom bg-primary hover:bg-primary/90 w-full sm:w-auto"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
