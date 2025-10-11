import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Banner } from "@/components/Banner";
import { ListingCard } from "@/components/ListingCard";
import { useQuery } from "@tanstack/react-query";
import type { Category, Listing } from "@shared/schema";
import { 
  Bell, 
  MapPin, 
  Settings,
  Home,
  ShirtIcon as Shirt,
  Monitor,
  Tag,
  TrendingUp,
  ArrowRight,
  ShoppingBag,
  Wrench,
  Car,
  Building2,
  GraduationCap,
  Briefcase,
  Building,
  Package2
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Fetch hierarchical categories from API
  const { data: categoriesTree, isLoading: categoriesLoading } = useQuery<{
    mainCategories: Category[];
    subcategories: Record<string, Category[]>;
  }>({
    queryKey: ['/api/categories/tree'],
  });

  const mainCategories = categoriesTree?.mainCategories || [];


  // Fetch featured listings from API
  const { data: featuredListings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ['/api/listings/featured'],
  });

  // Fetch followed listings (only if authenticated)
  const { data: followedListings = [], isLoading: followedLoading } = useQuery<Listing[]>({
    queryKey: ['/api/listings/following'],
    enabled: !!user,
  });

  // Icon mapping for categories
  const iconMap: Record<string, any> = {
    'Home': Home,
    'Shirt': Shirt, 
    'Monitor': Monitor,
    'ShoppingBag': ShoppingBag,
    'Wrench': Wrench,
    'Car': Car,
    'Building2': Building2,
    'GraduationCap': GraduationCap,
    'Briefcase': Briefcase,
    'Building': Building,
    'Package2': Package2,
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    'cyan': { bg: 'bg-cyan-500', text: 'text-white' },
    'black': { bg: 'bg-gray-900', text: 'text-white' },
    'yellow': { bg: 'bg-yellow-400', text: 'text-gray-900' },
    'green': { bg: 'bg-green-600', text: 'text-white' },
    'white': { bg: 'bg-white border border-gray-200', text: 'text-gray-900' },
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
          <SearchBar 
            placeholder="Buscar productos, servicios..."
            className="w-full"
          />
        </div>

        {/* Header Banner */}
        <div className="px-4 mb-4">
          <Banner position="header" />
        </div>

        {/* Main Categories - Horizontal Scroll */}
        <div className="mb-6">
          {categoriesLoading ? (
            <div className="flex gap-2 px-4 overflow-x-auto no-scrollbar">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="w-20 h-24 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-2">
              {mainCategories.map((category) => {
                const IconComponent = iconMap[category.icon] || ShoppingBag;
                const colors = colorMap[category.color] || colorMap['cyan'];
                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/category/${category.id}`)}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group"
                    data-testid={`button-category-${category.id}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                      <IconComponent className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[70px] leading-tight">
                      {category.name}
                    </span>
                  </button>
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

        {/* Followed Users' Listings */}
        {user && followedListings.length > 0 && (
          <div className="px-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  De quienes sigues
                </h2>
              </div>
            </div>
            {followedLoading ? (
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
                {followedListings.slice(0, 6).map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    showFollowedBadge={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

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
                <ListingCard
                  key={listing.id}
                  listing={listing}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Banner */}
        <div className="px-4 mb-6">
          <Banner position="footer" />
        </div>

      </div>

    </div>
  );
}