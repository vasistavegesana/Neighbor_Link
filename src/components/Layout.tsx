import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Handshake, Plus, User, LogOut, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { toast } from 'sonner';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Handshake className="h-5 w-5" />
            </div>
            <span>NeighborLink</span>
          </Link>

          {user && (
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" asChild>
                <Link to="/post/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Post
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="relative">
                <Link to="/messages">
                  <MessageCircle className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-scale-in"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/profile/${user.id}`}>
                  <User className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default Layout;
