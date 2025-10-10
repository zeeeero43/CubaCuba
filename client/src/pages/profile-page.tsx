import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { User, Phone, MapPin, Calendar, LogOut, Package, Eye, Heart, MoreVertical, Edit, Trash2, Pause, Play, ShoppingCart, Star, Users, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Listing } from "@shared/schema";

const provinces = [
  "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
  "Cienfuegos", "Villa Clara", "Sancti Spíritus", "Ciego de Ávila",
  "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
  "Guantánamo", "Isla de la Juventud"
];

const profileFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").refine(
    (val) => !/\d/.test(val),
    { message: "El nombre no puede contener números" }
  ),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  province: z.string().min(1, "Debe seleccionar una provincia"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(1, "Debes confirmar la nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

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

  // Profile edit form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      province: user?.province || "",
    },
    values: {
      name: user?.name || "",
      email: user?.email || "",
      province: user?.province || "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => 
      apiRequest('PATCH', '/api/user/profile', data),
    onSuccess: () => {
      toast({ title: "Perfil actualizado" });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'public'] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo actualizar el perfil", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => 
      apiRequest('PATCH', '/api/user/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast({ title: "Contraseña actualizada exitosamente" });
      passwordForm.reset();
      setPasswordDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo cambiar la contraseña", 
        variant: "destructive" 
      });
    },
  });

  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

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
            onClick={() => setEditDialogOpen(true)}
            data-testid="button-edit-profile"
          >
            <Edit className="w-5 h-5" />
          </Button>
        }
      />

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-profile">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Tu nombre" 
                            {...field} 
                            data-testid="input-profile-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="tu@email.com" 
                            {...field} 
                            data-testid="input-profile-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-profile-province">
                              <SelectValue placeholder="Selecciona tu provincia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {provinces.map((province) => (
                              <SelectItem 
                                key={province} 
                                value={province}
                                data-testid={`option-province-${province}`}
                              >
                                {province}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditDialogOpen(false)}
                      className="flex-1"
                      data-testid="button-cancel-edit"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

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
                  {new Date(user.createdAt!).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Miembro desde</p>
              </div>
            </div>
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
                    Crear primer anuncio
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
          
          {/* Change Password Button/Dialog */}
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
                data-testid="button-change-password"
              >
                <Lock className="w-4 h-4" />
                <span>Cambiar contraseña</span>
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-change-password">
              <DialogHeader>
                <DialogTitle>Cambiar contraseña</DialogTitle>
              </DialogHeader>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña actual</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Tu contraseña actual" 
                            {...field} 
                            data-testid="input-current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Mínimo 8 caracteres" 
                            {...field} 
                            data-testid="input-new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar nueva contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Repite la nueva contraseña" 
                            {...field} 
                            data-testid="input-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        passwordForm.reset();
                        setPasswordDialogOpen(false);
                      }}
                      className="flex-1"
                      data-testid="button-cancel-password"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={changePasswordMutation.isPending}
                      data-testid="button-save-password"
                    >
                      {changePasswordMutation.isPending ? "Guardando..." : "Cambiar contraseña"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center space-x-2"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>{logoutMutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}