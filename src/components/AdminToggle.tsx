import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminToggleProps {
  isSubscribed: boolean;
  onToggle: (newStatus: boolean) => void;
}

export function AdminToggle({ isSubscribed, onToggle }: AdminToggleProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user has admin role by querying user_roles table
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
      }

      setIsAdmin(!!roles);
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (toggling) return;
    
    setToggling(true);
    try {
      const { data, error } = await supabase.functions.invoke('toggle-admin-pro');

      if (error) throw error;

      const newStatus = data.newStatus === 'active';
      onToggle(newStatus);
      
      toast.success(
        newStatus 
          ? '🎉 Modo PRO ativado para testes!' 
          : 'Modo PRO desativado'
      );
    } catch (error) {
      console.error('Error toggling admin pro:', error);
      toast.error('Erro ao alternar modo PRO');
    } finally {
      setToggling(false);
    }
  };

  // Don't render if not admin or still loading
  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="glass-hover p-4 rounded-xl border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Modo Admin</span>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                TESTE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Ativar/desativar acesso PRO para testes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSubscribed && (
            <Badge className="bg-primary text-primary-foreground gap-1">
              <Crown className="w-3 h-3" />
              PRO
            </Badge>
          )}
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={toggling}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
    </div>
  );
}
