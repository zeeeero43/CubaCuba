import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/ListingCard";
import { useQuery } from "@tanstack/react-query";
import type { Category, Listing } from "@shared/schema";
import { 
  Home,
  ShirtIcon as Shirt,
  Monitor,
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
      {/* Hero Section with Search */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Encuentra lo que buscas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Miles de anuncios te esperan
            </p>
          </div>
          <div className="max-w-3xl mx-auto">
            <SearchBar 
              placeholder="¿Qué estás buscando?"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Main Categories - Horizontal Scroll */}
        <div className="my-8">
          <div className="px-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Categorías</h2>
          </div>
          {categoriesLoading ? (
            <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="w-24 h-28 flex-shrink-0 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Mobile: Only 3 categories + arrow */}
              <div className="flex md:hidden gap-4 px-4 overflow-x-auto no-scrollbar pb-2">
                {mainCategories.slice(0, 3).map((category) => {
                  const IconComponent = iconMap[category.icon] || ShoppingBag;
                  const colors = colorMap[category.color] || colorMap['cyan'];
                  return (
                    <button
                      key={category.id}
                      onClick={() => navigate(`/category/${category.id}`)}
                      className="flex-shrink-0 flex flex-col items-center gap-2 group"
                      data-testid={`button-category-${category.id}`}
                    >
                      <div className={`w-20 h-20 rounded-2xl ${colors.bg} flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm`}>
                        <IconComponent className={`w-10 h-10 ${colors.text}`} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[80px] leading-tight">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
                
                {/* Arrow button for mobile */}
                <button
                  onClick={() => navigate('/categories')}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  data-testid="button-view-all-categories-mobile"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
                    <ArrowRight className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[80px] leading-tight">
                    Ver todas
                  </span>
                </button>
              </div>

              {/* Desktop: All categories + arrow */}
              <div className="hidden md:flex gap-4 px-4 overflow-x-auto no-scrollbar pb-2">
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
                      <div className={`w-20 h-20 rounded-2xl ${colors.bg} flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm`}>
                        <IconComponent className={`w-10 h-10 ${colors.text}`} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[80px] leading-tight">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
                
                {/* Arrow button to view all categories */}
                <button
                  onClick={() => navigate('/categories')}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  data-testid="button-view-all-categories"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
                    <ArrowRight className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[80px] leading-tight">
                    Ver todas
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Latest Listings */}
        <div className="px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Últimos anuncios</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/listings')}
              data-testid="button-view-all-listings"
              className="text-primary hover:text-primary/80"
            >
              Ver todos
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {listingsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    <Skeleton className="w-full h-48 rounded-t-lg" />
                    <div className="p-3">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featuredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}