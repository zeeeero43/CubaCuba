import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/Avatar";

export default function TopNavigation() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const handleCreateListing = () => {
    if (!user) {
      // Store redirect path for after login
      navigate('/auth?redirect=/create-listing');
    } else {
      navigate('/create-listing');
    }
  };

  const handleProfile = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="hidden md:block sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div 
            className="cursor-pointer" 
            onClick={() => navigate('/')}
            data-testid="nav-brand"
          >
            <h1 className="text-2xl font-bold text-primary">Rico-Cuba</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateListing}
              className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
              data-testid="button-create-listing-desktop"
            >
              <Plus className="w-5 h-5 mr-2" />
              Publicar anuncio
            </Button>
            
            <Button
              variant="outline"
              onClick={handleProfile}
              className="border-gray-300 dark:border-gray-600"
              data-testid="button-profile-desktop"
            >
              {user ? (
                <>
                  <Avatar
                    src={user.profilePicture}
                    alt={user.name}
                    size="sm"
                    className="mr-2"
                  />
                  Mi perfil
                </>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Iniciar sesión
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
