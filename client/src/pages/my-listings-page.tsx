import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@shared/schema";
import { ArrowLeft, MoreVertical, Edit, Pause, Play, Trash2, CheckCircle, Eye, Phone } from "lucide-react";

export default function MyListingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Fetch user's listings
  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['/api/me/listings'],
  });

  // Delete listing mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/listings/${id}`),
    onSuccess: () => {
      toast({
        title: "Anuncio eliminado",
        description: "Tu anuncio ha sido eliminado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      setDeleteDialogOpen(false);
      setSelectedListing(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el anuncio",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest('PATCH', `/api/listings/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      const statusText = variables.status === 'active' ? 'activado' : variables.status === 'paused' ? 'pausado' : 'vendido';
      toast({
        title: "Estado actualizado",
        description: `Tu anuncio ha sido ${statusText}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Activo</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Pausado</Badge>;
      case 'sold':
        return <Badge className="bg-gray-500">Vendido</Badge>;
      default:
        return null;
    }
  };

  const handleDelete = (listing: Listing) => {
    setSelectedListing(listing);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedListing) {
      deleteMutation.mutate(selectedListing.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Mis Anuncios</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-24 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No tienes anuncios todavía</p>
            <Button onClick={() => navigate('/create-listing')} data-testid="button-create-first">
              Crear mi primer anuncio
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden" data-testid={`card-listing-${listing.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={listing.images && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=center'}
                        alt={listing.title}
                        className="w-24 h-24 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=center';
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1" data-testid={`text-title-${listing.id}`}>
                            {listing.title}
                          </h3>
                          {getStatusBadge(listing.status)}
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${listing.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/edit-listing/${listing.id}`)} data-testid={`menu-edit-${listing.id}`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            {listing.status === 'active' ? (
                              <DropdownMenuItem 
                                onClick={() => updateStatusMutation.mutate({ id: listing.id, status: 'paused' })}
                                data-testid={`menu-pause-${listing.id}`}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Pausar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => updateStatusMutation.mutate({ id: listing.id, status: 'active' })}
                                data-testid={`menu-activate-${listing.id}`}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                            )}
                            
                            {listing.status !== 'sold' && (
                              <DropdownMenuItem 
                                onClick={() => updateStatusMutation.mutate({ id: listing.id, status: 'sold' })}
                                data-testid={`menu-sold-${listing.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como vendido
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => handleDelete(listing)}
                              className="text-destructive"
                              data-testid={`menu-delete-${listing.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2" data-testid={`text-price-${listing.id}`}>
                        {listing.price} {listing.currency}
                      </p>

                      {/* Statistics */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1" data-testid={`text-views-${listing.id}`}>
                          <Eye className="w-4 h-4" />
                          <span>{listing.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" data-testid={`text-contacts-${listing.id}`}>
                          <Phone className="w-4 h-4" />
                          <span>{listing.contacts || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar anuncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El anuncio será eliminado permanentemente junto con todas sus imágenes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
