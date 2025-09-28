import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Bell, 
  MapPin, 
  Heart, 
  ShoppingCart, 
  Settings,
  User,
  Home,
  ShirtIcon as Shirt,
  Monitor,
  Tag,
  TrendingUp,
  ArrowRight
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  const categories = [
    { id: "home", name: "Casa", nameEn: "Home", icon: Home, color: "bg-emerald-100", iconColor: "text-emerald-600" },
    { id: "clothes", name: "Ropa", nameEn: "Clothes", icon: Shirt, color: "bg-blue-100", iconColor: "text-blue-600" },
    { id: "electronics", name: "Electrónicos", nameEn: "Electronics", icon: Monitor, color: "bg-purple-100", iconColor: "text-purple-600" },
  ];

  const featuredProducts = [
    {
      id: "1",
      title: "Vaso de cristal azul",
      price: "4",
      currency: "CUP",
      imageUrl: "https://images.unsplash.com/photo-1509669803555-fd5c105ddc16?w=150&h=150&fit=crop&crop=center",
      category: "Casa"
    },
    {
      id: "2", 
      title: "Silla giratoria verde",
      price: "120",
      currency: "CUP",
      imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=150&h=150&fit=crop&crop=center",
      category: "Casa"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entrega express</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid="text-location">
                  Calle 23, La Habana
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md lg:max-w-6xl mx-auto">
        {/* Search Bar */}
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar"
              className="pl-10 pr-12 rounded-xl border-gray-200 dark:border-gray-700"
              data-testid="input-search"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2"
              data-testid="button-search-filter"
            >
              <div className="w-5 h-5 border border-gray-400 rounded grid grid-cols-2 gap-px">
                <div className="bg-gray-400 rounded-tl"></div>
                <div className="bg-gray-400 rounded-tr"></div>
                <div className="bg-gray-400 rounded-bl"></div>
                <div className="bg-gray-400 rounded-br"></div>
              </div>
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                  data-testid={`card-category-${category.id}`}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                      <IconComponent className={`w-6 h-6 ${category.iconColor}`} />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Promo Banner */}
        <div className="px-4 mb-6">
          <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 text-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-1">Pago inicial 0%</h3>
                  <p className="text-emerald-100 text-sm">Acción del 1 — 30 Abril</p>
                </div>
                <div className="bg-white text-emerald-700 px-3 py-2 rounded-lg font-bold text-sm">
                  RicoCuba
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Navigation */}
        <div className="px-4 mb-4">
          <div className="flex items-center space-x-4">
            <Button 
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full px-6 py-2 text-sm font-medium"
              data-testid="button-for-you"
            >
              Para ti
            </Button>
            <div className="flex items-center text-emerald-600">
              <Tag className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Precios del día</span>
            </div>
            <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 ml-auto" data-testid="button-view-all">
              Ver todo
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Featured Products */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {featuredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                data-testid={`card-product-${product.id}`}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white rounded-full"
                      data-testid={`button-favorite-${product.id}`}
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2" data-testid={`text-title-${product.id}`}>
                      {product.title}
                    </h4>
                    <p className="font-bold text-lg text-gray-900 dark:text-gray-100" data-testid={`text-price-${product.id}`}>
                      {product.price} {product.currency}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom spacing for navigation */}
        <div className="h-20"></div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            <Button variant="ghost" size="icon" className="flex flex-col items-center py-2" data-testid="nav-home">
              <Home className="w-5 h-5 text-gray-900 dark:text-gray-100" />
              <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Inicio</span>
            </Button>
            <Button variant="ghost" size="icon" className="flex flex-col items-center py-2" data-testid="nav-categories">
              <div className="w-5 h-5 border border-gray-600 dark:border-gray-300 rounded grid grid-cols-2 gap-px">
                <div className="bg-gray-600 dark:bg-gray-300 rounded-tl"></div>
                <div className="bg-gray-600 dark:bg-gray-300 rounded-tr"></div>
                <div className="bg-gray-600 dark:bg-gray-300 rounded-bl"></div>
                <div className="bg-gray-600 dark:bg-gray-300 rounded-br"></div>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Categorías</span>
            </Button>
            <Button variant="ghost" size="icon" className="flex flex-col items-center py-2" data-testid="nav-cart">
              <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Carrito</span>
            </Button>
            <Button variant="ghost" size="icon" className="flex flex-col items-center py-2" data-testid="nav-favorites">
              <Heart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Favoritos</span>
            </Button>
            <Button variant="ghost" size="icon" className="flex flex-col items-center py-2" data-testid="nav-profile">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-gray-600 dark:text-gray-300 mt-1">Perfil</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}