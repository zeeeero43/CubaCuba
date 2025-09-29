import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Category, Listing } from "@shared/schema";
import { 
  Search, 
  Bell, 
  MapPin, 
  Settings,
  Home,
  ShirtIcon as Shirt,
  Monitor,
  Tag,
  TrendingUp,
  ArrowRight
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch categories from API
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });


  // Fetch featured listings from API
  const { data: featuredListings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ['/api/listings/featured'],
  });

  // Icon mapping for categories
  const iconMap: Record<string, any> = {
    'Home': Home,
    'Shirt': Shirt, 
    'Monitor': Monitor,
    'Car': Monitor, // fallback
    'Briefcase': Monitor, // fallback
    'Building': Monitor, // fallback
  };

  const colorMap: Record<string, { bg: string; icon: string }> = {
    '#10b981': { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    '#3b82f6': { bg: 'bg-blue-100', icon: 'text-blue-600' },
    '#8b5cf6': { bg: 'bg-purple-100', icon: 'text-purple-600' },
    '#f59e0b': { bg: 'bg-amber-100', icon: 'text-amber-600' },
    '#06b6d4': { bg: 'bg-cyan-100', icon: 'text-cyan-600' },
    '#ef4444': { bg: 'bg-red-100', icon: 'text-red-600' },
  };

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
          {categoriesLoading ? (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-2" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category) => {
                const IconComponent = iconMap[category.icon] || Home;
                const colors = colorMap[category.color] || colorMap['#10b981'];
                return (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                    data-testid={`card-category-${category.id}`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                        <IconComponent className={`w-6 h-6 ${colors.icon}`} />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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

        {/* Featured Listings - Newest Ads */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nuevos Anuncios</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/listings')}
              data-testid="button-view-all-listings"
            >
              Ver todo
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {listingsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Skeleton className="w-full h-32 rounded-t-lg" />
                    <div className="p-3">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {featuredListings.map((listing) => (
                <Card 
                  key={listing.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                  onClick={() => navigate(`/listing/${listing.id}`)}
                  data-testid={`card-listing-${listing.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <img
                        src={listing.images && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=center'}
                        alt={listing.title}
                        className="w-full h-32 object-cover rounded-t-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=center';
                        }}
                      />
                      {listing.condition === 'new' && (
                        <Badge className="absolute top-2 left-2 bg-emerald-500 text-white text-xs">
                          Nuevo
                        </Badge>
                      )}
                      {listing.priceType === 'negotiable' && (
                        <Badge className="absolute top-2 right-2 bg-blue-500 text-white text-xs">
                          Negociable
                        </Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2 line-clamp-2" data-testid={`text-title-${listing.id}`}>
                        {listing.title}
                      </h4>
                      <p className="font-bold text-lg text-gray-900 dark:text-gray-100" data-testid={`text-price-${listing.id}`}>
                        {listing.price} {listing.currency}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {listing.locationCity}, {listing.locationRegion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>


      </div>

    </div>
  );
}