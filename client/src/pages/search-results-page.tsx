import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel, type SearchFilters } from "@/components/FilterPanel";
import { SavedSearches } from "@/components/SavedSearches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Eye, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Listing } from "@shared/schema";

interface SearchResponse {
  listings: Listing[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export default function SearchResultsPage() {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(useSearch());
  const [, navigate] = useLocation();

  const [filters, setFilters] = useState<SearchFilters>({
    categoryId: searchParams.get("categoryId") || undefined,
    subcategoryId: searchParams.get("subcategoryId") || undefined,
    region: searchParams.get("region") || undefined,
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : undefined,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : undefined,
    condition: searchParams.get("condition") || undefined,
    priceType: searchParams.get("priceType") || undefined,
    sortBy: searchParams.get("sortBy") || "recent",
  });

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const buildQueryString = (q: string, f: SearchFilters, p: number) => {
    const params = new URLSearchParams();
    
    if (q) params.set("q", q);
    if (f.categoryId) params.set("categoryId", f.categoryId);
    if (f.subcategoryId) params.set("subcategoryId", f.subcategoryId);
    if (f.region) params.set("region", f.region);
    if (f.priceMin !== undefined) params.set("priceMin", f.priceMin.toString());
    if (f.priceMax !== undefined) params.set("priceMax", f.priceMax.toString());
    if (f.condition) params.set("condition", f.condition);
    if (f.priceType) params.set("priceType", f.priceType);
    if (f.sortBy && f.sortBy !== "recent") params.set("sortBy", f.sortBy);
    if (p > 1) params.set("page", p.toString());

    return params.toString();
  };

  const updateURL = (q: string, f: SearchFilters, p: number) => {
    const queryString = buildQueryString(q, f, p);
    navigate(`/search${queryString ? `?${queryString}` : ""}`, { replace: true });
  };

  useEffect(() => {
    updateURL(query, filters, page);
  }, [query, filters, page]);

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ['/api/search', query, filters, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.subcategoryId) params.set("subcategoryId", filters.subcategoryId);
      if (filters.region) params.set("region", filters.region);
      if (filters.priceMin !== undefined) params.set("priceMin", filters.priceMin.toString());
      if (filters.priceMax !== undefined) params.set("priceMax", filters.priceMax.toString());
      if (filters.condition) params.set("condition", filters.condition);
      if (filters.priceType) params.set("priceType", filters.priceType);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (page > 1) params.set("page", page.toString());
      
      const url = `/api/search?${params.toString()}`;
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      sortBy: "recent"
    });
    setPage(1);
  };

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatPrice = (price: string, currency: string) => {
    return `${parseFloat(price).toLocaleString('es-ES')} ${currency}`;
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      new: "Nuevo",
      used: "Usado",
      defective: "Defectuoso"
    };
    return labels[condition] || condition;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Search */}
      <div className="bg-primary/5 border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Buscar en Rico-Cuba</h1>
              {user && (
                <SavedSearches 
                  currentSearchParams={buildQueryString(query, filters, page)}
                />
              )}
            </div>
            <SearchBar 
              defaultValue={query}
              onSearch={handleSearch}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              className="sticky top-4"
            />
          </aside>

          {/* Results */}
          <main className="lg:col-span-3">
            {/* Results Header */}
            <div className="mb-6">
              {data && (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    {data.totalCount === 0 ? (
                      "No se encontraron resultados"
                    ) : (
                      <>
                        Mostrando <span className="font-semibold">{data.totalCount}</span> {data.totalCount === 1 ? "resultado" : "resultados"}
                        {query && (
                          <> para <span className="font-semibold">"{query}"</span></>
                        )}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-48 w-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Error al cargar los resultados. Por favor, intenta de nuevo.
                </AlertDescription>
              </Alert>
            )}

            {/* Results Grid */}
            {!isLoading && !error && data && (
              <>
                {data.totalCount === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground mb-4">
                      No se encontraron anuncios que coincidan con tu búsqueda.
                    </p>
                    <Button onClick={handleClearFilters} variant="outline">
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.listings.map((listing) => (
                        <Card 
                          key={listing.id} 
                          className="hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => navigate(`/listings/${listing.id}`)}
                          data-testid={`card-listing-${listing.id}`}
                        >
                          <CardContent className="p-0">
                            {/* Image */}
                            {listing.images && listing.images.length > 0 ? (
                              <div className="aspect-video bg-muted relative overflow-hidden">
                                <img
                                  src={listing.images[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover"
                                />
                                {listing.condition === "new" && (
                                  <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                    Nuevo
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="aspect-video bg-muted flex items-center justify-center">
                                <span className="text-muted-foreground">Sin imagen</span>
                              </div>
                            )}

                            {/* Content */}
                            <div className="p-4">
                              <h3 className="font-semibold text-lg mb-2 line-clamp-2" data-testid={`text-title-${listing.id}`}>
                                {listing.title}
                              </h3>

                              <p className="text-2xl font-bold text-primary mb-2" data-testid={`text-price-${listing.id}`}>
                                {formatPrice(listing.price, listing.currency)}
                                {listing.priceType === "negotiable" && (
                                  <span className="text-sm text-muted-foreground ml-2">Negociable</span>
                                )}
                              </p>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <MapPin className="h-4 w-4" />
                                <span>{listing.locationCity}, {listing.locationRegion}</span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <span className="bg-muted px-2 py-1 rounded text-xs">
                                  {getConditionLabel(listing.condition)}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" />
                                  <span>{listing.views}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-4 w-4" />
                                  <span>{listing.favorites}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Pagination */}
                    {data.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          data-testid="button-prev-page"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>

                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                            let pageNum;
                            if (data.totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= data.totalPages - 2) {
                              pageNum = data.totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                data-testid={`button-page-${pageNum}`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === data.totalPages}
                          data-testid="button-next-page"
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
