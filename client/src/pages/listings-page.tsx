import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Banner } from "@/components/Banner";
import { ListingCard } from "@/components/ListingCard";
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Eye,
  Star,
  Grid3X3,
  List,
  SlidersHorizontal,
  ArrowLeft
} from "lucide-react";
import type { Listing, Category } from "@shared/schema";

const provinces = [
  { value: "all", label: "Todas las provincias" },
  { value: "havana", label: "La Habana" },
  { value: "santiago", label: "Santiago de Cuba" },
  { value: "villa-clara", label: "Villa Clara" },
  { value: "matanzas", label: "Matanzas" },
  { value: "camagüey", label: "Camagüey" },
  { value: "holguín", label: "Holguín" },
  { value: "granma", label: "Granma" },
  { value: "las-tunas", label: "Las Tunas" },
  { value: "cienfuegos", label: "Cienfuegos" },
  { value: "sancti-spiritus", label: "Sancti Spíritus" },
  { value: "ciego-de-avila", label: "Ciego de Ávila" },
  { value: "pinar-del-rio", label: "Pinar del Río" },
  { value: "artemisa", label: "Artemisa" },
  { value: "mayabeque", label: "Mayabeque" },
  { value: "isla-de-la-juventud", label: "Isla de la Juventud" },
  { value: "guantanamo", label: "Guantánamo" },
];

interface ListingsResponse {
  listings: Listing[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface ListingFilters {
  q: string;
  categoryId: string;
  region: string;
  priceMin: string;
  priceMax: string;
  condition: string;
  page: number;
  pageSize: number;
}

// Helper function to format price display
function formatPrice(listing: Listing): string {
  if (!listing.price) {
    return "Precio a consultar";
  }
  return `${listing.price} ${listing.currency || "CUP"}`;
}

export default function ListingsPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ListingFilters>({
    q: "",
    categoryId: "",
    region: "",
    priceMin: "",
    priceMax: "",
    condition: "",
    page: 1,
    pageSize: 12,
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, q: searchTerm, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch listings
  const { data: listingsResponse, isLoading } = useQuery<ListingsResponse>({
    queryKey: ['/api/listings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== 0) {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/listings?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      return response.json();
    },
  });

  // Fetch active sponsored listings
  const { data: sponsoredListingsData = [] } = useQuery<any[]>({
    queryKey: ['/api/sponsored-listings/active'],
  });

  const updateFilter = (key: keyof ListingFilters, value: string | number) => {
    // Convert 'all' back to empty string for API
    const apiValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: apiValue, page: 1 }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      q: "",
      categoryId: "",
      region: "",
      priceMin: "",
      priceMax: "",
      condition: "",
      page: 1,
      pageSize: 12,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo(0, 0);
  };

  const listings = listingsResponse?.listings || [];
  const totalPages = listingsResponse?.totalPages || 0;
  const currentPage = listingsResponse?.currentPage || 1;
  const totalCount = listingsResponse?.totalCount || 0;

  // Get sponsored listing IDs for quick lookup
  const sponsoredListingIds = new Set(sponsoredListingsData.map((sl: any) => sl.listingId));

  // Separate sponsored and regular listings
  const sponsoredListings = listings.filter(listing => sponsoredListingIds.has(listing.id));
  const regularListings = listings.filter(listing => !sponsoredListingIds.has(listing.id));

  // Combine: sponsored first, then regular
  const displayListings = [...sponsoredListings, ...regularListings];

  const FilterContent = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Categoría</label>
        <Select
          value={filters.categoryId}
          onValueChange={(value) => updateFilter('categoryId', value)}
        >
          <SelectTrigger data-testid="select-category-filter">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Provincia</label>
        <Select
          value={filters.region}
          onValueChange={(value) => updateFilter('region', value)}
        >
          <SelectTrigger data-testid="select-region-filter">
            <SelectValue placeholder="Todas las provincias" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((province) => (
              <SelectItem key={province.value} value={province.value}>
                {province.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Rango de precio (CUP)</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Mín"
            value={filters.priceMin}
            onChange={(e) => updateFilter('priceMin', e.target.value)}
            data-testid="input-price-min"
          />
          <Input
            type="number"
            placeholder="Máx"
            value={filters.priceMax}
            onChange={(e) => updateFilter('priceMax', e.target.value)}
            data-testid="input-price-max"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Estado</label>
        <Select
          value={filters.condition}
          onValueChange={(value) => updateFilter('condition', value)}
        >
          <SelectTrigger data-testid="select-condition-filter">
            <SelectValue placeholder="Cualquier estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier estado</SelectItem>
            <SelectItem value="new">Nuevo</SelectItem>
            <SelectItem value="used">Usado - Buen estado</SelectItem>
            <SelectItem value="defective">Usado - Con defectos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button onClick={clearFilters} variant="outline" className="flex-1" data-testid="button-clear-filters">
          Limpiar filtros
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold flex-1">Anuncios</h1>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                data-testid="button-toggle-view"
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
              </Button>
              
              {/* Desktop Filters */}
              <div className="hidden md:block">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-filters-desktop">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Filtros de búsqueda</DialogTitle>
                    </DialogHeader>
                    <FilterContent />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Mobile Filters */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-filters-mobile">
                      <SlidersHorizontal className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Filtros de búsqueda</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-9">
        {/* Active Filters */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {filters.categoryId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Categoría: {categories.find(c => c.id === filters.categoryId)?.name}
                <button
                  onClick={() => updateFilter('categoryId', '')}
                  className="ml-1 hover:text-destructive"
                  data-testid="remove-category-filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.region && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Provincia: {provinces.find(p => p.value === filters.region)?.label}
                <button
                  onClick={() => updateFilter('region', '')}
                  className="ml-1 hover:text-destructive"
                  data-testid="remove-region-filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {(filters.priceMin || filters.priceMax) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Precio: {filters.priceMin || '0'} - {filters.priceMax || '∞'} CUP
                <button
                  onClick={() => {
                    updateFilter('priceMin', '');
                    updateFilter('priceMax', '');
                  }}
                  className="ml-1 hover:text-destructive"
                  data-testid="remove-price-filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.condition && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Estado: {filters.condition === 'new' ? 'Nuevo' : 
                         filters.condition === 'used' ? 'Usado' : 'Con defectos'}
                <button
                  onClick={() => updateFilter('condition', '')}
                  className="ml-1 hover:text-destructive"
                  data-testid="remove-condition-filter"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            {totalCount} anuncios encontrados
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-gray-300 dark:bg-gray-600 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && listings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No se encontraron anuncios</h3>
            <p className="text-muted-foreground mb-4">
              Prueba ajustando tus filtros de búsqueda
            </p>
            <Button onClick={clearFilters} variant="outline" data-testid="button-clear-all-filters">
              Limpiar todos los filtros
            </Button>
          </div>
        )}

        {/* Listings Grid/List */}
        {!isLoading && displayListings.length > 0 && (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
            : "space-y-4 mb-8"
          }>
            {displayListings.map((listing) => {
              const isSponsored = sponsoredListingIds.has(listing.id);
              
              if (viewMode === 'grid') {
                return (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isSponsored={isSponsored}
                  />
                );
              }
              
              return (
              <Card
                key={listing.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  isSponsored ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600' : ''
                }`}
                onClick={() => navigate(`/listing/${listing.id}`)}
                data-testid={`card-listing-${listing.id}`}
              >
                {viewMode === 'list' && (
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0 relative">
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            📷
                          </div>
                        )}
                        {isSponsored && (
                          <Badge className="absolute top-1 right-1 bg-yellow-500 text-white text-xs p-1" data-testid={`badge-sponsored-${listing.id}`}>
                            <Star className="w-2 h-2 fill-white" />
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                            {listing.title}
                          </h3>
                          {isSponsored && (
                            <Badge className="bg-yellow-500 text-white text-xs whitespace-nowrap" data-testid={`badge-sponsored-list-${listing.id}`}>
                              Gesponsert
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg font-bold text-primary mb-2">
                          {formatPrice(listing)}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground gap-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.locationCity}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(listing.createdAt).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              data-testid="button-prev-page"
            >
              Anterior
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    data-testid={`button-page-${pageNum}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <span className="px-2 py-1 text-sm text-muted-foreground">
                  ... {totalPages}
                </span>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              data-testid="button-next-page"
            >
              Siguiente
            </Button>
          </div>
        )}
          </div>

          {/* Desktop Sidebar - Right */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <Banner position="sidebar" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}