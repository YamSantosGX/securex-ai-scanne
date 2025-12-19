import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { useI18n } from '@/contexts/I18nContext';

type MobileMenuProps = {
  isAuthenticated: boolean;
  onLogout: () => void;
};

export const MobileMenu = ({ isAuthenticated, onLogout }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className="relative z-50"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={toggleMenu}
          />
          <div className="fixed top-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-b border-primary/20 p-6 z-40 shadow-xl">
            <nav className="flex flex-col gap-4">
              <Link
                to="/pricing"
                className="text-lg text-foreground/80 hover:text-primary transition-colors"
                onClick={toggleMenu}
              >
                {t('nav.pricing')}
              </Link>
              
              <Link
                to="/redeem"
                className="text-lg text-foreground/80 hover:text-primary transition-colors flex items-center gap-2"
                onClick={toggleMenu}
              >
                Resgatar Código
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-lg text-foreground/80 hover:text-primary transition-colors"
                    onClick={toggleMenu}
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onLogout();
                      toggleMenu();
                    }}
                    className="w-full"
                  >
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={toggleMenu}
                  >
                    <Button variant="outline" className="w-full">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link
                    to="/auth"
                    onClick={toggleMenu}
                  >
                    <Button className="w-full btn-glow bg-primary hover:bg-primary/90">
                      {t('nav.start_free')}
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
};
