import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import discordIcon from '@/assets/discord-icon.png';

export const Footer = () => {
  return (
    <footer className="glass border-t border-primary/20 mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-bold glow-text">SecureX</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Segurança de classe mundial para suas aplicações.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Planos
                </Link>
              </li>
              <li>
                <Link
                  to="/redeem"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Resgatar Código
                </Link>
              </li>
            </ul>
          </div>

          {/* Discord */}
          <div>
            <h3 className="font-semibold mb-4">Comunidade</h3>
            <a
              href="https://discord.gg/X36RjdnReJ"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all"
            >
              <img src={discordIcon} alt="Discord" className="w-5 h-5 brightness-0 invert" />
              Junte-se ao Discord
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 SecureX. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
