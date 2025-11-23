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
import logo from '@/assets/logo.jpg';

type NavbarProps = {
  isAuthenticated?: boolean;
};

export const Navbar = ({ isAuthenticated = false }: NavbarProps) => {
  const { region, setRegion, regionConfig } = useRegion();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/auth');
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
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-foreground/80 hover:text-primary transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
            )}
            <Link
              to="/pricing"
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              {t('nav.pricing')}
            </Link>
            <a
              href="https://discord.gg/X36RjdnReJ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/80 hover:text-primary transition-colors"
            >
              {t('nav.discord')}
            </a>
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

            {/* Auth Actions */}
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('nav.logout')}</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  {t('nav.login')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="btn-glow bg-primary hover:bg-primary/90"
                >
                  {t('nav.start_free')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};