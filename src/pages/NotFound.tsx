import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is returning from Stripe checkout
    const searchParams = new URLSearchParams(location.search);
    const canceled = searchParams.get('canceled');
    const success = searchParams.get('success');
    
    if (canceled === 'true') {
      // Redirect to pricing page when user cancels Stripe checkout
      navigate('/pricing', { replace: true });
      return;
    }
    
    if (success === 'true') {
      // Redirect to dashboard when payment is successful
      navigate('/dashboard', { replace: true });
      return;
    }

    // Only log in development to prevent information leakage
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
