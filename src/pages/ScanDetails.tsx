import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft,
  Clock,
  FileText,
  Code,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Vulnerability = {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  recommendation: string;
  code_example?: string;
};

type ScanResult = {
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  overall_severity: 'safe' | 'warning' | 'danger';
};

type Scan = {
  id: string;
  target: string;
  scan_type: 'file' | 'url';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  severity: 'safe' | 'warning' | 'danger' | null;
  vulnerabilities_count: number;
  created_at: string;
  result: ScanResult;
};

export default function ScanDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanDetails();
  }, [id]);

  const loadScanDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error('Scan não encontrado');
        navigate('/dashboard');
        return;
      }

      setScan(data as unknown as Scan);
    } catch (error) {
      console.error('Error loading scan:', error);
      toast.error('Erro ao carregar detalhes do scan');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      case 'low':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!scan) {
    return null;
  }

  const result = scan.result as ScanResult;

  return (
    <div className="min-h-screen">
      <Navbar isAuthenticated />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 btn-zoom"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>

          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">
              Relatório de <span className="glow-text">Segurança</span>
            </h1>
            <Badge className={getSeverityColor(scan.severity || 'safe')}>
              {scan.severity === 'safe' ? 'Seguro' : 
               scan.severity === 'warning' ? 'Atenção' : 'Risco Alto'}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{scan.target}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{new Date(scan.created_at).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
        >
          <div className="glass-hover p-6 rounded-xl text-center">
            <div className="text-3xl font-bold mb-2">{result?.summary?.total || 0}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="glass-hover p-6 rounded-xl text-center border border-red-500/20">
            <div className="text-3xl font-bold text-red-500 mb-2">{result?.summary?.critical || 0}</div>
            <div className="text-sm text-muted-foreground">Crítico</div>
          </div>
          <div className="glass-hover p-6 rounded-xl text-center border border-orange-500/20">
            <div className="text-3xl font-bold text-orange-500 mb-2">{result?.summary?.high || 0}</div>
            <div className="text-sm text-muted-foreground">Alto</div>
          </div>
          <div className="glass-hover p-6 rounded-xl text-center border border-yellow-500/20">
            <div className="text-3xl font-bold text-yellow-500 mb-2">{result?.summary?.medium || 0}</div>
            <div className="text-sm text-muted-foreground">Médio</div>
          </div>
          <div className="glass-hover p-6 rounded-xl text-center border border-blue-500/20">
            <div className="text-3xl font-bold text-blue-500 mb-2">{result?.summary?.low || 0}</div>
            <div className="text-sm text-muted-foreground">Baixo</div>
          </div>
        </motion.div>

        {/* Vulnerabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold mb-4">Vulnerabilidades Detectadas</h2>

          {!result?.vulnerabilities || result.vulnerabilities.length === 0 ? (
            <div className="glass-hover p-12 rounded-xl text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma Vulnerabilidade Detectada</h3>
              <p className="text-muted-foreground">
                Sua aplicação passou em todas as verificações de segurança
              </p>
            </div>
          ) : (
            result.vulnerabilities.map((vuln, index) => (
              <div key={index} className="glass-hover p-6 rounded-xl border border-border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(vuln.severity)}
                    <div>
                      <h3 className="text-xl font-bold">{vuln.title}</h3>
                      <p className="text-sm text-muted-foreground">{vuln.type}</p>
                    </div>
                  </div>
                  <Badge className={`${getSeverityColor(vuln.severity)} border`}>
                    {vuln.severity.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Descrição:</h4>
                    <p className="text-muted-foreground">{vuln.description}</p>
                  </div>

                  {vuln.location && (
                    <div>
                      <h4 className="font-semibold mb-2">Localização:</h4>
                      <code className="block bg-muted p-3 rounded-lg text-sm">
                        {vuln.location}
                      </code>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Recomendação:</h4>
                    <p className="text-muted-foreground">{vuln.recommendation}</p>
                  </div>

                  {vuln.code_example && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Exemplo de Correção:
                      </h4>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm">{vuln.code_example}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
