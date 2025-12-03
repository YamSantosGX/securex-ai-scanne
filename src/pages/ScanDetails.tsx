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
  AlertCircle,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useI18n } from '@/contexts/I18nContext';

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
  const { t } = useI18n();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

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

      // Check subscription status
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('user_id', user.id)
        .single();

      if (profile?.subscription_status === 'active') {
        setIsSubscribed(true);
      }

      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error(t('report.scan_not_found'));
        navigate('/dashboard');
        return;
      }

      setScan(data as unknown as Scan);
    } catch (error) {
      console.error('Error loading scan:', error);
      toast.error(t('report.error_loading'));
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

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'safe':
        return t('report.severity_safe');
      case 'warning':
        return t('report.severity_warning');
      case 'danger':
        return t('report.severity_danger');
      default:
        return severity;
    }
  };

  const getSeverityLevelText = (level: string) => {
    switch (level) {
      case 'critical':
        return t('report.level_critical');
      case 'high':
        return t('report.level_high');
      case 'medium':
        return t('report.level_medium');
      case 'low':
        return t('report.level_low');
      default:
        return level.toUpperCase();
    }
  };

  const exportToPDF = () => {
    if (!isSubscribed) {
      toast.error(t('report.pdf_pro_only'));
      navigate('/pricing');
      return;
    }

    try {
      const doc = new jsPDF();
      const result = scan?.result as ScanResult;
      
      // Header
      doc.setFontSize(20);
      doc.text(`${t('report.title')} - SecureX`, 20, 20);
      
      doc.setFontSize(12);
      doc.text(`${t('report.target')}: ${scan?.target}`, 20, 35);
      doc.text(`${t('report.date')}: ${new Date(scan?.created_at || '').toLocaleString()}`, 20, 42);
      doc.text(`${t('report.severity')}: ${getSeverityText(scan?.severity || 'safe')}`, 20, 49);
      
      // Summary
      doc.setFontSize(16);
      doc.text(t('report.summary'), 20, 65);
      doc.setFontSize(11);
      doc.text(`${t('report.total_vulnerabilities')}: ${result?.summary?.total || 0}`, 20, 75);
      doc.text(`${t('report.level_critical')}: ${result?.summary?.critical || 0} | ${t('report.level_high')}: ${result?.summary?.high || 0} | ${t('report.level_medium')}: ${result?.summary?.medium || 0} | ${t('report.level_low')}: ${result?.summary?.low || 0}`, 20, 82);
      
      // Vulnerabilities
      let yPos = 100;
      doc.setFontSize(16);
      doc.text(t('report.vulnerabilities_detected'), 20, yPos);
      yPos += 10;
      
      if (!result?.vulnerabilities || result.vulnerabilities.length === 0) {
        doc.setFontSize(11);
        doc.text(t('report.no_vulnerabilities'), 20, yPos);
      } else {
        result.vulnerabilities.forEach((vuln, index) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.text(`${index + 1}. ${vuln.title} [${vuln.severity.toUpperCase()}]`, 20, yPos);
          yPos += 7;
          
          doc.setFontSize(10);
          const descLines = doc.splitTextToSize(vuln.description, 170);
          doc.text(descLines, 25, yPos);
          yPos += descLines.length * 5 + 5;
          
          if (vuln.recommendation) {
            const recLines = doc.splitTextToSize(`${t('report.recommendation')}: ${vuln.recommendation}`, 170);
            doc.text(recLines, 25, yPos);
            yPos += recLines.length * 5 + 10;
          }
        });
      }
      
      doc.save(`scan-report-${scan?.id}.pdf`);
      toast.success(t('report.export_success'));
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(t('report.export_error'));
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
            {t('report.back_to_dashboard')}
          </Button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold">
              {t('report.title')} <span className="glow-text">{t('report.title_highlight')}</span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {isSubscribed && (
                <Button
                  onClick={exportToPDF}
                  className="btn-glow btn-zoom"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('report.export_pdf')}
                </Button>
              )}
              <Badge className={getSeverityColor(scan.severity || 'safe')}>
                {getSeverityText(scan.severity || 'safe')}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="break-all">{scan.target}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{new Date(scan.created_at).toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-8"
        >
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center">
            <div className="text-2xl sm:text-3xl font-bold mb-2">{result?.summary?.total || 0}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('report.total')}</div>
          </div>
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center border border-red-500/20">
            <div className="text-2xl sm:text-3xl font-bold text-red-500 mb-2">{result?.summary?.critical || 0}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('report.level_critical')}</div>
          </div>
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center border border-orange-500/20">
            <div className="text-2xl sm:text-3xl font-bold text-orange-500 mb-2">{result?.summary?.high || 0}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('report.level_high')}</div>
          </div>
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center border border-yellow-500/20">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-500 mb-2">{result?.summary?.medium || 0}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('report.level_medium')}</div>
          </div>
          <div className="glass-hover p-4 sm:p-6 rounded-xl text-center border border-blue-500/20 col-span-2 sm:col-span-1">
            <div className="text-2xl sm:text-3xl font-bold text-blue-500 mb-2">{result?.summary?.low || 0}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t('report.level_low')}</div>
          </div>
        </motion.div>

        {/* Vulnerabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="space-y-6"
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('report.vulnerabilities_detected')}</h2>

          {!result?.vulnerabilities || result.vulnerabilities.length === 0 ? (
            <div className="glass-hover p-8 sm:p-12 rounded-xl text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">{t('report.no_vulnerabilities')}</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                {t('report.all_checks_passed')}
              </p>
            </div>
          ) : (
            result.vulnerabilities.map((vuln, index) => (
              <div key={index} className="glass-hover p-4 sm:p-6 rounded-xl border border-border">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(vuln.severity)}
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold">{vuln.title}</h3>
                      <p className="text-sm text-muted-foreground">{vuln.type}</p>
                    </div>
                  </div>
                  <Badge className={`${getSeverityColor(vuln.severity)} border flex-shrink-0`}>
                    {getSeverityLevelText(vuln.severity)}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">{t('report.description')}:</h4>
                    <p className="text-muted-foreground text-sm sm:text-base">{vuln.description}</p>
                  </div>

                  {vuln.location && (
                    <div>
                      <h4 className="font-semibold mb-2">{t('report.location')}:</h4>
                      <code className="block bg-muted p-3 rounded-lg text-xs sm:text-sm overflow-x-auto">
                        {vuln.location}
                      </code>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">{t('report.recommendation')}:</h4>
                    <p className="text-muted-foreground text-sm sm:text-base">{vuln.recommendation}</p>
                  </div>

                  {vuln.code_example && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        {t('report.fix_example')}:
                      </h4>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <code className="text-xs sm:text-sm">{vuln.code_example}</code>
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
