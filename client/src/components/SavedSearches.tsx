import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bookmark, Trash2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedSearch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SavedSearchesProps {
  currentSearchParams?: string;
  className?: string;
}

export function SavedSearches({ currentSearchParams, className = "" }: SavedSearchesProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");

  const { data: savedSearches = [], isLoading } = useQuery<SavedSearch[]>({
    queryKey: ['/api/search/saved'],
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest('POST', '/api/search/saved', {
        name,
        searchParams: currentSearchParams || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/saved'] });
      setIsSaveDialogOpen(false);
      setSearchName("");
      toast({
        title: "Búsqueda guardada",
        description: "Tu búsqueda ha sido guardada exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la búsqueda",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/search/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/saved'] });
      toast({
        title: "Búsqueda eliminada",
        description: "La búsqueda guardada ha sido eliminada",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la búsqueda",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (searchName.trim()) {
      saveMutation.mutate(searchName.trim());
    }
  };

  const handleLoadSearch = (search: SavedSearch) => {
    const params = search.searchParams.startsWith('?') 
      ? search.searchParams.substring(1) 
      : search.searchParams;
    navigate(`/search${params ? `?${params}` : ''}`);
    setIsOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de que quieres eliminar esta búsqueda guardada?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="button-saved-searches">
            <Bookmark className="h-4 w-4 mr-2" />
            Búsquedas Guardadas
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Búsquedas Guardadas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {currentSearchParams && (
              <div className="pb-4 border-b">
                <Button
                  onClick={() => setIsSaveDialogOpen(true)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-save-current-search"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Guardar búsqueda actual
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            ) : savedSearches.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No tienes búsquedas guardadas aún. Realiza una búsqueda y guárdala para acceder rápidamente más tarde.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleLoadSearch(search)}
                    data-testid={`saved-search-${search.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Search className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{search.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Guardada el {new Date(search.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(search.id, e)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${search.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Búsqueda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Nombre de la búsqueda</Label>
              <Input
                id="search-name"
                placeholder="Ej: iPhone en La Habana"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                data-testid="input-search-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              data-testid="button-cancel-save"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!searchName.trim() || saveMutation.isPending}
              data-testid="button-confirm-save"
            >
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
