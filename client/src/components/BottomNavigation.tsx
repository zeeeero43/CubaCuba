import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Home,
  Plus, 
  Heart, 
  User,
  LayoutGrid
} from "lucide-react";

export default function BottomNavigation() {
  const [location, navigate] = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${location === '/' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => navigate('/')}
            data-testid="nav-home"
          >
            <Home className={`w-6 h-6 ${location === '/' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Inicio</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${location === '/categories' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => navigate('/categories')}
            data-testid="nav-categories"
          >
            <LayoutGrid className={`w-6 h-6 ${location === '/categories' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Categorías</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${location === '/create-listing' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => navigate('/create-listing')}
            data-testid="nav-create"
          >
            <Plus className={`w-6 h-6 ${location === '/create-listing' ? 'text-primary' : 'text-primary'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Crear</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${location === '/favorites' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => navigate('/favorites')}
            data-testid="nav-favorites"
          >
            <Heart className={`w-6 h-6 ${location === '/favorites' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Favoritos</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${location === '/profile' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            onClick={() => navigate('/profile')}
            data-testid="nav-profile"
          >
            <User className={`w-6 h-6 ${location === '/profile' ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Perfil</span>
          </Button>
        </div>
      </div>
    </div>
  );
}