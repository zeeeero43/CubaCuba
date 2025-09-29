import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Home,
  Plus, 
  Heart, 
  User
} from "lucide-react";

export default function BottomNavigation() {
  const [, navigate] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex flex-col items-center py-2" 
            onClick={() => navigate('/')}
            data-testid="nav-home"
          >
            <Home className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Inicio</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex flex-col items-center py-2" 
            data-testid="nav-categories"
          >
            <div className="w-5 h-5 border border-gray-600 dark:border-gray-300 rounded grid grid-cols-2 gap-px">
              <div className="bg-gray-600 dark:bg-gray-300 rounded-tl"></div>
              <div className="bg-gray-600 dark:bg-gray-300 rounded-tr"></div>
              <div className="bg-gray-600 dark:bg-gray-300 rounded-bl"></div>
              <div className="bg-gray-600 dark:bg-gray-300 rounded-br"></div>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Categorías</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex flex-col items-center py-2" 
            onClick={() => navigate('/create-listing')}
            data-testid="nav-create"
          >
            <Plus className="w-5 h-5 text-primary" />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Crear</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex flex-col items-center py-2" 
            onClick={() => navigate('/favorites')}
            data-testid="nav-favorites"
          >
            <Heart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Favoritos</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex flex-col items-center py-2" 
            onClick={() => navigate('/profile')}
            data-testid="nav-profile"
          >
            <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Perfil</span>
          </Button>
        </div>
      </div>
    </div>
  );
}