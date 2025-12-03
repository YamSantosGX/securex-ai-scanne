import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check if user is returning from Stripe checkout
    const searchParams = new URLSearchParams(location.search);
    const canceled = searchParams.get('canceled');
    const success = searchParams.get('success');
    
    if (canceled === 'true') {
      setIsRedirecting(true);
      // Redirect to pricing page when user cancels Stripe checkout
      navigate('/pricing', { replace: true });
      return;
    }
    
    if (success === 'true') {
      setIsRedirecting(true);
      // Redirect to dashboard when payment is successful
      navigate('/dashboard', { replace: true });
      return;
    }

    // Check if there's a referrer from Stripe (user clicked back button on Stripe page)
    const referrer = document.referrer;
    if (referrer && (referrer.includes('stripe.com') || referrer.includes('checkout.stripe.com'))) {
      setIsRedirecting(true);
      navigate('/pricing', { replace: true });
      return;
    }

    // Only log in development to prevent information leakage
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, location.search, navigate]);

  // Show loading while redirecting
  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-2xl bg-primary/10">
            <Shield className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Página não encontrada</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate('/')}
            className="btn-glow"
          >
            Voltar ao Início
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/pricing')}
          >
            Ver Planos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
