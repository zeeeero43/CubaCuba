import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { User, Phone, MapPin, Calendar, Settings, LogOut, Package, Eye, Heart, MoreVertical, Edit, Trash2, Pause, Play, ShoppingCart, Star, Users, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Listing } from "@shared/schema";

interface SellerProfile {
  user: {
    id: string;
    name: string;
    phone: string;
    province: string;
    createdAt: string;
  };
  followersCount: number;
  followingCount: number;
  avgRating: number;
  ratingsCount: number;
  isFollowing: boolean;
}

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's listings
  const { data: listings = [], isLoading: listingsLoading } = useQuery<Listing[]>({
    queryKey: ['/api/me/listings'],
    enabled: !!user,
  });

  // Fetch user's public profile for stats
  const { data: profileStats } = useQuery<SellerProfile>({
    queryKey: ['/api/users', user?.id, 'public'],
    enabled: !!user?.id,
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/listings/${id}`),
    onSuccess: () => {
      toast({ title: "Anuncio eliminado", description: "Tu anuncio ha sido eliminado exitosamente." });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo eliminar el anuncio", variant: "destructive" });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest('PATCH', `/api/listings/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Estado actualizado" });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
  });

  // Mark as sold mutation
  const markSoldMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/listings/${id}/sold`),
    onSuccess: () => {
      toast({ title: "Marcado como vendido" });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
    },
  });

  // Boost listing mutation with optimistic update
  const boostListingMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/listings/${id}/boost`),
    onMutate: async (id: string) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['/api/me/listings'] });
      
      // Snapshot current state
      const previousListings = queryClient.getQueryData<Listing[]>(['/api/me/listings']);
      
      // Optimistically update the one listing
      queryClient.setQueryData<Listing[]>(['/api/me/listings'], (old) => {
        if (!old) return old;
        return old.map(listing => 
          listing.id === id 
            ? { ...listing, lastBoostedAt: new Date() as any }
            : listing
        );
      });
      
      return { previousListings };
    },
    onSuccess: (_, id) => {
      toast({ title: "¡Anuncio impulsado!", description: "Tu anuncio ahora aparece más arriba en los resultados" });
      // Refetch to get accurate server state
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings/featured/paginated'] });
    },
    onError: (error: any, _, context) => {
      // Rollback optimistic update
      if (context?.previousListings) {
        queryClient.setQueryData(['/api/me/listings'], context.previousListings);
      }
      toast({ 
        title: "No se pudo impulsar", 
        description: error.message || "Intenta de nuevo más tarde",
        variant: "destructive" 
      });
    },
  });

  // Calculate boost availability
  const getBoostStatus = (listing: Listing) => {
    if (!listing.lastBoostedAt) {
      return { canBoost: true, text: "Impulsar anuncio" };
    }

    const lastBoost = new Date(listing.lastBoostedAt);
    const now = new Date();
    const hoursSince = (now.getTime() - lastBoost.getTime()) / (1000 * 60 * 60);

    if (hoursSince >= 24) {
      return { canBoost: true, text: "Impulsar anuncio" };
    }

    const hoursRemaining = Math.ceil(24 - hoursSince);
    return { 
      canBoost: false, 
      text: `Disponible en ${hoursRemaining}h` 
    };
  };

  if (!user) return <></>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Activo</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Pausado</Badge>;
      case 'sold':
        return <Badge className="bg-blue-500">Vendido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <PageHeader 
        title="Mi Perfil" 
        backTo="/"
        action={
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/settings')}
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        }
      />

      <div className="max-w-md mx-auto px-6 py-6">
        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {user.phone ? "Cuenta verificada ✓" : "Cuenta no verificada"}
            </p>
          </CardHeader>
        </Card>

        {/* Profile Statistics */}
        {profileStats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-around items-center text-center">
                <div data-testid="stat-followers">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-followers-count">
                    {profileStats.followersCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div data-testid="stat-following">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-following-count">
                    {profileStats.followingCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Siguiendo</p>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div data-testid="stat-ratings">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    <span data-testid="text-avg-rating">
                      {profileStats.avgRating > 0 ? profileStats.avgRating.toFixed(1) : '0.0'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span data-testid="text-ratings-count">{profileStats.ratingsCount}</span> valoraciones
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user.phone.startsWith('+') ? user.phone : '+' + user.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{user.province}</p>
                <p className="text-xs text-muted-foreground">Provincia</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {(() => {
                    if (!user.createdAt) return 'Fecha no disponible';
                    const parsed = new Date(user.createdAt);
                    if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible';
                    return parsed.toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Miembro desde</p>
              </div>
            </div>
            
            {user.role === "admin" ? (
              <div className="flex items-center space-x-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-600">
                    Administrador
                  </p>
                  <p className="text-xs text-muted-foreground">Sin límite de strikes</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <AlertTriangle className={`w-5 h-5 ${(user.moderationStrikes || 0) >= 3 ? 'text-red-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-medium ${(user.moderationStrikes || 0) >= 3 ? 'text-red-600' : 'text-foreground'}`}>
                    {user.moderationStrikes || 0} strikes
                  </p>
                  <p className="text-xs text-muted-foreground">Estado de moderación</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User's Listings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Mis Anuncios ({listings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando anuncios...
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No tienes anuncios publicados</p>
                <Link href="/create-listing" asChild>
                  <Button data-testid="button-create-first-listing">
                    Publicar primer anuncio
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((listing) => (
                  <Card key={listing.id} className="hover:shadow-md transition-shadow" data-testid={`card-listing-${listing.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {/* Image - Clickable */}
                        <Link href={`/listing/${listing.id}`} asChild>
                          <div className="cursor-pointer">
                            {listing.images && listing.images.length > 0 ? (
                              <img
                                src={listing.images[0]}
                                alt={listing.title}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </Link>
                        
                        {/* Content - Clickable */}
                        <Link href={`/listing/${listing.id}`} asChild>
                          <div className="flex-1 min-w-0 cursor-pointer">
                            <h3 className="font-semibold text-sm line-clamp-1 mb-1">{listing.title}</h3>
                            <p className="text-lg font-bold text-primary mb-2">
                              ${listing.price} {listing.priceType === 'negotiable' ? '(Negociable)' : ''}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {listing.views || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {listing.favorites || 0}
                              </div>
                              {getStatusBadge(listing.status || 'active')}
                            </div>
                          </div>
                        </Link>

                        {/* Actions Menu */}
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
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: listing.id, status: 'paused' })} data-testid={`menu-pause-${listing.id}`}>
                                <Pause className="w-4 h-4 mr-2" />
                                Pausar
                              </DropdownMenuItem>
                            ) : listing.status === 'paused' ? (
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: listing.id, status: 'active' })} data-testid={`menu-activate-${listing.id}`}>
                                <Play className="w-4 h-4 mr-2" />
                                Activar
                              </DropdownMenuItem>
                            ) : null}
                            {listing.status !== 'sold' && (
                              <DropdownMenuItem onClick={() => markSoldMutation.mutate(listing.id)} data-testid={`menu-sold-${listing.id}`}>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Marcar vendido
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deleteListingMutation.mutate(listing.id)} 
                              className="text-destructive focus:text-destructive"
                              data-testid={`menu-delete-${listing.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Boost Button - Full Width */}
                      {listing.status === 'active' && (
                        <div className="mt-3 pt-3 border-t">
                          <Button
                            onClick={() => boostListingMutation.mutate(listing.id)}
                            disabled={!getBoostStatus(listing).canBoost || boostListingMutation.isPending}
                            className="w-full"
                            variant={getBoostStatus(listing).canBoost ? "default" : "outline"}
                            data-testid={`button-boost-${listing.id}`}
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            {boostListingMutation.isPending ? "Impulsando..." : getBoostStatus(listing).text}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          {!user.phone && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Tu cuenta no está verificada. Verifica tu teléfono para acceder a todas las funciones.
                  </p>
                  <Link href="/auth" asChild>
                    <Button className="w-full" data-testid="button-verify-account">
                      Verificar cuenta
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}