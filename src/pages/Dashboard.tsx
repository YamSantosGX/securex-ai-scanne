import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Shield, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { z } from 'zod';

// URL validation schema
const urlSchema = z.string()
  .trim()
  .url('URL inválida')
  .max(2048, 'URL muito longa')
  .regex(/^https?:\/\//, 'Apenas protocolos HTTP e HTTPS são permitidos');

type ScanHistory = {
  id: string;
  date: string;
  target: string;
  status: 'safe' | 'warning' | 'danger';
  type: 'file' | 'url';
};

const mockHistory: ScanHistory[] = [
  { id: '1', date: '2025-01-15', target: 'app.js', status: 'safe', type: 'file' },
  { id: '2', date: '2025-01-14', target: 'https://exemplo.com', status: 'warning', type: 'url' },
  { id: '3', date: '2025-01-13', target: 'index.html', status: 'safe', type: 'file' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>(mockHistory);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleScan = async () => {
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

    setIsScanning(true);
    toast.info('Analisando vulnerabilidades...');

    // Simulate scan
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const newScan: ScanHistory = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      target: file ? file.name : url,
      status: 'safe',
      type: file ? 'file' : 'url',
    };

    setHistory([newScan, ...history]);
    setIsScanning(false);
    setUrl('');
    setFile(null);
    toast.success('Scan concluído! Nenhuma vulnerabilidade detectada.');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'safe':
        return 'Seguro';
      case 'warning':
        return 'Atenção';
      case 'danger':
        return 'Risco';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar isAuthenticated />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Central de <span className="glow-text">Análise de Segurança</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Escaneie seus arquivos e sites com IA avançada
          </p>
        </motion.div>

        {/* Scan Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
                  <Label htmlFor="file">Arquivo da Aplicação</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer glass">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      disabled={isScanning}
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      <p className="text-sm text-muted-foreground">
                        {file ? file.name : 'Clique para fazer upload ou arraste o arquivo'}
                      </p>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full mt-6 btn-glow bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Shield className="w-5 h-5 mr-2" />
              {isScanning ? 'Analisando...' : 'Iniciar Scan com IA'}
            </Button>
          </div>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <h2 className="text-2xl font-bold mb-6">Histórico de Scans</h2>
          <div className="space-y-4">
            {history.map((scan) => (
              <div key={scan.id} className="glass-hover p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(scan.status)}
                    <div>
                      <h3 className="font-semibold">{scan.target}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Clock className="w-4 h-4" />
                        {scan.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      scan.status === 'safe' ? 'bg-green-500/10 text-green-500' :
                      scan.status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {getStatusText(scan.status)}
                    </span>
                    <Button variant="ghost" size="sm">
                      Ver Relatório
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
