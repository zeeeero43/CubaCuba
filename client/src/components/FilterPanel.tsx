import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { X, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";

const CUBAN_PROVINCES = [
  "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
  "Cienfuegos", "Villa Clara", "Sancti Spíritus", "Ciego de Ávila",
  "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
  "Guantánamo", "Isla de la Juventud"
];

export interface SearchFilters {
  categoryId?: string;
  subcategoryId?: string;
  region?: string;
  priceMin?: number;
  priceMax?: number;
  condition?: string;
  priceType?: string;
  sortBy?: string;
}

interface FilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

export function FilterPanel({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  className = ""
}: FilterPanelProps) {
  const [localPriceMin, setLocalPriceMin] = useState(filters.priceMin?.toString() || "");
  const [localPriceMax, setLocalPriceMax] = useState(filters.priceMax?.toString() || "");

  const { data: categoriesData } = useQuery<{ mainCategories: Category[]; subcategories: Record<string, Category[]> }>({
    queryKey: ['/api/categories/tree'],
  });

  const mainCategories = categoriesData?.mainCategories || [];
  const subcategories = filters.categoryId ? (categoriesData?.subcategories[filters.categoryId] || []) : [];

  useEffect(() => {
    setLocalPriceMin(filters.priceMin?.toString() || "");
    setLocalPriceMax(filters.priceMax?.toString() || "");
  }, [filters.priceMin, filters.priceMax]);

  const handleFilterChange = (key: keyof SearchFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    
    // If category changes, clear subcategory
    if (key === "categoryId") {
      newFilters.subcategoryId = undefined;
    }
    
    onFiltersChange(newFilters);
  };

  const handlePriceBlur = () => {
    const newFilters = { ...filters };
    
    if (localPriceMin) {
      const min = parseFloat(localPriceMin);
      newFilters.priceMin = isNaN(min) ? undefined : min;
    } else {
      newFilters.priceMin = undefined;
    }
    
    if (localPriceMax) {
      const max = parseFloat(localPriceMax);
      newFilters.priceMax = isNaN(max) ? undefined : max;
    } else {
      newFilters.priceMax = undefined;
    }
    
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== "");

  return (
    <div className={`bg-background border border-border rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            data-testid="button-clear-filters"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      <Separator className="mb-4" />

      {/* Category Filter */}
      <div className="space-y-2 mb-4">
        <Label htmlFor="category">Categoría</Label>
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(value) => handleFilterChange("categoryId", value === "all" ? undefined : value)}
        >
          <SelectTrigger id="category" data-testid="select-category">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {mainCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory Filter */}
      {filters.categoryId && subcategories.length > 0 && (
        <div className="space-y-2 mb-4">
          <Label htmlFor="subcategory">Subcategoría</Label>
          <Select
            value={filters.subcategoryId || "all"}
            onValueChange={(value) => handleFilterChange("subcategoryId", value === "all" ? undefined : value)}
          >
            <SelectTrigger id="subcategory" data-testid="select-subcategory">
              <SelectValue placeholder="Todas las subcategorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las subcategorías</SelectItem>
              {subcategories.map((subcat) => (
                <SelectItem key={subcat.id} value={subcat.id}>
                  {subcat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Region Filter */}
      <div className="space-y-2 mb-4">
        <Label htmlFor="region">Provincia</Label>
        <Select
          value={filters.region || "all"}
          onValueChange={(value) => handleFilterChange("region", value === "all" ? undefined : value)}
        >
          <SelectTrigger id="region" data-testid="select-region">
            <SelectValue placeholder="Todas las provincias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las provincias</SelectItem>
            {CUBAN_PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-2 mb-4">
        <Label>Rango de Precio (CUP)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Mín"
            value={localPriceMin}
            onChange={(e) => setLocalPriceMin(e.target.value)}
            onBlur={handlePriceBlur}
            min="0"
            step="1"
            data-testid="input-price-min"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Máx"
            value={localPriceMax}
            onChange={(e) => setLocalPriceMax(e.target.value)}
            onBlur={handlePriceBlur}
            min="0"
            step="1"
            data-testid="input-price-max"
          />
        </div>
      </div>

      {/* Condition Filter */}
      <div className="space-y-2 mb-4">
        <Label htmlFor="condition">Estado</Label>
        <Select
          value={filters.condition || "all"}
          onValueChange={(value) => handleFilterChange("condition", value === "all" ? undefined : value)}
        >
          <SelectTrigger id="condition" data-testid="select-condition">
            <SelectValue placeholder="Cualquier estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier estado</SelectItem>
            <SelectItem value="new">Nuevo</SelectItem>
            <SelectItem value="used">Usado</SelectItem>
            <SelectItem value="defective">Defectuoso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Type Filter */}
      <div className="space-y-2 mb-4">
        <Label htmlFor="priceType">Tipo de Precio</Label>
        <Select
          value={filters.priceType || "all"}
          onValueChange={(value) => handleFilterChange("priceType", value === "all" ? undefined : value)}
        >
          <SelectTrigger id="priceType" data-testid="select-price-type">
            <SelectValue placeholder="Cualquier tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier tipo</SelectItem>
            <SelectItem value="fixed">Precio Fijo</SelectItem>
            <SelectItem value="negotiable">Negociable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="mb-4" />

      {/* Sort By */}
      <div className="space-y-2">
        <Label htmlFor="sortBy">Ordenar por</Label>
        <Select
          value={filters.sortBy || "recent"}
          onValueChange={(value) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger id="sortBy" data-testid="select-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más Recientes</SelectItem>
            <SelectItem value="popular">Más Populares</SelectItem>
            <SelectItem value="price_asc">Precio: Menor a Mayor</SelectItem>
            <SelectItem value="price_desc">Precio: Mayor a Menor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
