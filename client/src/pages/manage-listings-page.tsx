import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  MessageCircle,
  Pause,
  Play,
  ShoppingCart,
  Star,
  Calendar,
  MapPin,
  MoreVertical,
  TrendingUp
} from "lucide-react";
import type { Listing } from "@shared/schema";

export default function ManageListingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Fetch user's listings
  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['/api/me/listings'],
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/listings/${id}`),
    onSuccess: () => {
      toast({
        title: "Anuncio eliminado",
        description: "Tu anuncio ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el anuncio",
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest('PATCH', `/api/listings/${id}/status`, { status }),
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado de tu anuncio ha sido actualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    },
  });

  // Mark as sold mutation
  const markSoldMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/listings/${id}/sold`),
    onSuccess: () => {
      toast({
        title: "Marcado como vendido",
        description: "Tu anuncio ha sido marcado como vendido.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo marcar como vendido",
        variant: "destructive",
      });
    },
  });

  const handleDeleteListing = (id: string) => {
    deleteListingMutation.mutate(id);
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleMarkSold = (id: string) => {
    markSoldMutation.mutate(id);
  };

  const filteredListings = listings.filter(listing => 
    selectedStatus === "all" || listing.status === selectedStatus
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'sold':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'paused':
        return 'Pausado';
      case 'sold':
        return 'Vendido';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/profile')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Mis Anuncios</h1>
            </div>
            <Button 
              onClick={() => navigate('/create-listing')} 
              data-testid="button-create-listing"
            >
              <Plus className="w-4 h-4 mr-2" />
              Publicar Anuncio
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="mb-6">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los anuncios</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
              <SelectItem value="sold">Vendidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredListings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold mb-2">
              {selectedStatus === "all" ? "No tienes anuncios aún" : `No tienes anuncios ${getStatusText(selectedStatus).toLowerCase()}s`}
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedStatus === "all" 
                ? "Crea tu primer anuncio para empezar a vender"
                : "Prueba cambiando el filtro para ver otros anuncios"
              }
            </p>
            {selectedStatus === "all" && (
              <Button onClick={() => navigate('/create-listing')} data-testid="button-create-first">
                <Plus className="w-4 h-4 mr-2" />
                Publicar mi primer anuncio
              </Button>
            )}
          </div>
        )}

        {/* Listings */}
        {!isLoading && filteredListings.length > 0 && (
          <>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground" data-testid="text-listings-count">
                {filteredListings.length} anuncio{filteredListings.length !== 1 ? 's' : ''}
                {selectedStatus !== "all" && ` ${getStatusText(selectedStatus).toLowerCase()}${filteredListings.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="space-y-4">
              {filteredListings.map((listing) => (
                <Card key={listing.id} data-testid={`card-listing-${listing.id}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => navigate(`/listing/${listing.id}`)}
                            onError={(e) => {
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-muted-foreground cursor-pointer"
                            onClick={() => navigate(`/listing/${listing.id}`)}
                          >
                            📷
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-semibold text-foreground mb-1 line-clamp-1 cursor-pointer hover:underline"
                              onClick={() => navigate(`/listing/${listing.id}`)}
                              data-testid={`text-title-${listing.id}`}
                            >
                              {listing.title}
                            </h3>
                            <p className="text-lg font-bold text-primary mb-1" data-testid={`text-price-${listing.id}`}>
                              {listing.price} CUP
                            </p>
                          </div>
                          
                          <Badge className={getStatusColor(listing.status)} data-testid={`badge-status-${listing.id}`}>
                            {getStatusText(listing.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground gap-4 mb-3">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.locationCity}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(listing.createdAt).toLocaleDateString('es-ES')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {(listing as any).viewCount || 0} vistas
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {(listing as any).contactCount || 0} contactos
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/listing/${listing.id}`)}
                            data-testid={`button-view-${listing.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/create-listing?edit=${listing.id}`)}
                            data-testid={`button-edit-${listing.id}`}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>

                          {listing.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(listing.id, 'paused')}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-pause-${listing.id}`}
                            >
                              <Pause className="w-3 h-3 mr-1" />
                              Pausar
                            </Button>
                          )}

                          {listing.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(listing.id, 'active')}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-activate-${listing.id}`}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Activar
                            </Button>
                          )}

                          {listing.status !== 'sold' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkSold(listing.id)}
                              disabled={markSoldMutation.isPending}
                              data-testid={`button-mark-sold-${listing.id}`}
                            >
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Marcar vendido
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-trigger-${listing.id}`}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar anuncio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El anuncio será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${listing.id}`}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteListing(listing.id)}
                                  disabled={deleteListingMutation.isPending}
                                  data-testid={`button-confirm-delete-${listing.id}`}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteListingMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}