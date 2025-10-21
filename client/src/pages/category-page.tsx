import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Category, Listing } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banner } from "@/components/Banner";
import { ArrowLeft, MapPin, Heart, Eye } from "lucide-react";
import { useState } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const [, navigate] = useLocation();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Fetch main category
  const { data: mainCategory, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: ['/api/categories', categoryId],
  });

  // Fetch subcategories
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories', categoryId, 'subcategories'],
    enabled: !!categoryId,
  });

  // Check if this is a main category (has subcategories and no parentId)
  const isMainCategory = mainCategory?.parentId === null && subcategories.length > 0;

  // Fetch listings only if it's a subcategory OR if a subcategory is selected
  const activeCategory = selectedSubcategory || (!isMainCategory ? categoryId : null);
  const { data: listingsData, isLoading: listingsLoading } = useQuery<{ listings: Listing[]; total: number }>({
    queryKey: ['/api/listings', activeCategory],
    queryFn: async () => {
      if (!activeCategory) return { listings: [], total: 0 };
      
      const params = new URLSearchParams({
        categoryId: activeCategory,
        status: 'active',
        page: '1',
        pageSize: '20'
      });
      
      const response = await fetch(`/api/listings?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      
      return response.json();
    },
    enabled: !!activeCategory,
  });

  const listings = listingsData?.listings || [];

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!mainCategory) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-6">
          <p className="text-center text-gray-500">Categoría no encontrada</p>
        </div>
      </div>
    );
  }

  const colorMap: Record<string, { bg: string; text: string; badge: string }> = {
    'cyan': { bg: 'bg-cyan-500', text: 'text-white', badge: 'bg-cyan-100 text-cyan-700' },
    'black': { bg: 'bg-gray-900', text: 'text-white', badge: 'bg-gray-100 text-gray-900' },
    'yellow': { bg: 'bg-yellow-400', text: 'text-gray-900', badge: 'bg-yellow-100 text-yellow-800' },
    'green': { bg: 'bg-green-600', text: 'text-white', badge: 'bg-green-100 text-green-700' },
    'white': { bg: 'bg-white border border-gray-200', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-900' },
  };

  const colors = colorMap[mainCategory.color] || colorMap['cyan'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Category Name */}
      <div className={`${colors.bg} ${colors.text} shadow-sm`}>
        <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className={`${colors.text} hover:bg-white/20`}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{mainCategory.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Category Banner */}
      <div className="max-w-md lg:max-w-6xl mx-auto px-4 pt-4">
        <Banner position="category" />
      </div>

      <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-6">
        {/* Subcategories - Show as list for main categories */}
        {isMainCategory && !selectedSubcategory ? (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Selecciona una subcategoría
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subcategories.map((subcat) => (
                <Card
                  key={subcat.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedSubcategory(subcat.id)}
                  data-testid={`card-subcategory-${subcat.id}`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {subcat.name}
                    </span>
                    <Badge className={colors.badge}>Ver</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : subcategories.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Subcategorías
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Badge
                className={`cursor-pointer whitespace-nowrap ${
                  !selectedSubcategory
                    ? colors.badge + ' font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedSubcategory(null)}
                data-testid="badge-all"
              >
                Todas
              </Badge>
              {subcategories.map((subcat) => (
                <Badge
                  key={subcat.id}
                  className={`cursor-pointer whitespace-nowrap ${
                    selectedSubcategory === subcat.id
                      ? colors.badge + ' font-semibold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedSubcategory(subcat.id)}
                  data-testid={`badge-subcategory-${subcat.id}`}
                >
                  {subcat.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {/* Listings Grid */}
        {listingsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <Skeleton className="w-full h-40" />
                <CardContent className="p-3">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No hay anuncios en esta categoría
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate('/create-listing')}
              data-testid="button-create-first"
            >
              Crear el primer anuncio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <Card
                key={listing.id}
                className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                onClick={() => navigate(`/listing/${listing.id}`)}
                data-testid={`card-listing-${listing.id}`}
              >
                <div className="relative">
                  {listing.images && listing.images.length > 0 ? (
                    <OptimizedImage
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-40 object-cover"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400">Sin imagen</span>
                    </div>
                  )}
                  {listing.featured === "true" && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                      Destacado
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-gray-900 dark:text-gray-100">
                    {listing.title}
                  </h3>
                  <p className="text-lg font-bold text-primary mb-2">
                    ${listing.price} {listing.currency}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{listing.locationCity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{listing.views}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
