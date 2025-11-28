import { Link, useNavigate } from 'react-router-dom';
import { Globe, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useRegion, REGIONS, Region } from '@/contexts/RegionContext';
import { useI18n } from '@/contexts/I18nContext';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/gorilla-logo.png';
import { useEffect, useState } from 'react';
import { MobileMenu } from './MobileMenu';

type NavbarProps = {
  isAuthenticated?: boolean;
};

export const Navbar = ({ isAuthenticated = false }: NavbarProps) => {
  const { region, setRegion, regionConfig } = useRegion();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [userAuthenticated, setUserAuthenticated] = useState(isAuthenticated);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary/10 group-hover:bg-primary/20 transition-all flex items-center justify-center">
              <img src={logo} alt="SecureX Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-bold glow-text">SecureX</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 ml-auto mr-6">
            <Link
              to="/pricing"
              className={`text-foreground/80 hover:text-primary transition-colors ${userAuthenticated ? 'font-bold text-primary' : ''}`}
            >
              {t('nav.pricing')}
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Region Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">{regionConfig.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass">
                {Object.values(REGIONS).map((r) => (
                  <DropdownMenuItem
                    key={r.code}
                    onClick={() => setRegion(r.code as Region)}
                    className={region === r.code ? 'bg-primary/10' : ''}
                  >
                    {r.name} ({r.currencySymbol})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center gap-3">
              {userAuthenticated ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    className="btn-glow btn-zoom bg-primary hover:bg-primary/90"
                  >
                    {t('nav.dashboard')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('nav.logout')}</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="btn-zoom"
                  >
                    {t('nav.login')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/auth')}
                    className="btn-glow btn-zoom bg-primary hover:bg-primary/90"
                  >
                    {t('nav.start_free')}
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <MobileMenu isAuthenticated={userAuthenticated} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </nav>
  );
};