import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink, Upload } from "lucide-react";
import type { Banner, InsertBanner } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const POSITION_LABELS: Record<string, string> = {
  header: "Banner de Encabezado",
  sidebar: "Banner Lateral",
  footer: "Banner de Pie de Página",
  category: "Banner de Categoría",
};

const POSITION_OPTIONS = [
  { value: "header", label: "Encabezado (1920x200px recomendado)" },
  { value: "sidebar", label: "Lateral (300x600px recomendado)" },
  { value: "footer", label: "Pie de página (1920x150px recomendado)" },
  { value: "category", label: "Categoría (728x90px recomendado)" },
];

export default function AdminBannersPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    position: "header",
    imageUrl: "",
    linkUrl: "",
    displayOrder: 0,
    isActive: "true",
  });

  // Fetch all banners
  const { data: banners, isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
  });

  // Group banners by position
  const bannersByPosition = banners?.reduce((acc, banner) => {
    if (!acc[banner.position]) {
      acc[banner.position] = [];
    }
    acc[banner.position].push(banner);
    return acc;
  }, {} as Record<string, Banner[]>) || {};

  // Create banner mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertBanner) => {
      const response = await apiRequest("POST", "/api/admin/banners", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({ title: "Banner creado exitosamente" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al crear el banner", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update banner mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertBanner> }) => {
      const response = await apiRequest("PUT", `/api/admin/banners/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({ title: "Banner actualizado exitosamente" });
      setEditingBanner(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar el banner", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete banner mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/banners/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({ title: "Banner eliminado exitosamente" });
      setDeletingBanner(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar el banner", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/banners/${id}/toggle`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({ title: "Estado del banner actualizado" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar el estado", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      position: "header",
      imageUrl: "",
      linkUrl: "",
      displayOrder: 0,
      isActive: "true",
    });
  };

  const handleSubmit = () => {
    if (!formData.imageUrl) {
      toast({
        title: "Imagen requerida",
        description: "Por favor, cargue una imagen",
        variant: "destructive",
      });
      return;
    }

    if (editingBanner) {
      updateMutation.mutate({ 
        id: editingBanner.id, 
        data: {
          position: formData.position as "header" | "sidebar" | "footer" | "category",
          imageUrl: formData.imageUrl,
          linkUrl: formData.linkUrl,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive as "true" | "false"
        }
      });
    } else {
      createMutation.mutate({
        position: formData.position as "header" | "sidebar" | "footer" | "category",
        imageUrl: formData.imageUrl,
        linkUrl: formData.linkUrl,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive as "true" | "false"
      } as InsertBanner);
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      position: banner.position,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || "",
      displayOrder: banner.displayOrder,
      isActive: banner.isActive,
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de archivo inválido",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (2MB)
    if (file.size > 2097152) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo no debe superar los 2MB",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingImage(true);
    
    try {
      // Step 1: Get upload URL
      const uploadResponse = await apiRequest('POST', '/api/listings/upload-image');
      const { uploadURL, objectId } = await uploadResponse.json();
      
      // Step 2: Upload file directly to storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadFileResponse.ok) {
        throw new Error('Error al cargar el archivo');
      }
      
      // Step 3: Finalize upload and get object path
      const finalizeResponse = await apiRequest('POST', '/api/listings/finalize-upload', { objectId });
      const { objectPath } = await finalizeResponse.json();
      
      // Update form data
      setFormData(prev => ({ ...prev, imageUrl: objectPath }));
      
      toast({
        title: "Imagen cargada exitosamente",
        description: "La imagen se ha añadido al banner",
      });
    } catch (error) {
      console.error('Error al cargar la imagen:', error);
      toast({
        title: "Error al cargar la imagen",
        description: "Por favor, inténtelo de nuevo",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando banners...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="w-8 h-8 text-primary" />
            Gestión de Banners
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestionar banners publicitarios para diferentes posiciones
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-banner">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear nuevo banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Posición</Label>
                <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                  <SelectTrigger data-testid="select-banner-position">
                    <SelectValue placeholder="Seleccionar posición" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Imagen del Banner</Label>
                <div className="mt-2 space-y-3">
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img 
                        src={formData.imageUrl} 
                        alt="Vista previa del banner" 
                        className="w-full h-48 object-cover rounded-lg"
                        data-testid="img-banner-preview"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData({ ...formData, imageUrl: "" })}
                        data-testid="button-remove-banner-image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <Label 
                        htmlFor="banner-upload" 
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Haga clic aquí para cargar una imagen
                      </Label>
                      <input
                        id="banner-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        disabled={uploadingImage}
                        data-testid="input-banner-image"
                      />
                      {uploadingImage && (
                        <p className="text-sm text-gray-500 mt-2">Cargando...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>URL del enlace (opcional)</Label>
                <Input
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="input-banner-link"
                />
              </div>

              <div>
                <Label>Orden de visualización</Label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-banner-order"
                />
                <p className="text-xs text-gray-500 mt-1">Niedrigere Zahlen werden zuerst angezeigt</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive === "true"}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked ? "true" : "false" })}
                  data-testid="switch-banner-active"
                />
                <Label>Banner activo</Label>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={createMutation.isPending || !formData.imageUrl}
                data-testid="button-submit-banner"
              >
                {createMutation.isPending ? "Creando..." : "Crear banner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Banner grouped by position */}
      <div className="space-y-6">
        {POSITION_OPTIONS.map((position) => {
          const positionBanners = bannersByPosition[position.value] || [];
          
          return (
            <Card key={position.value} data-testid={`card-position-${position.value}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{POSITION_LABELS[position.value]}</span>
                  <span className="text-sm font-normal text-gray-500">
                    {positionBanners.length} {positionBanners.length === 1 ? "banner" : "banners"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {positionBanners.length === 0 ? (
                  <p className="text-gray-500 text-center py-8" data-testid={`text-no-banners-${position.value}`}>
                    No hay banners para esta posición
                  </p>
                ) : (
                  <div className="space-y-3">
                    {positionBanners.map((banner) => (
                      <div
                        key={banner.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        data-testid={`banner-item-${banner.id}`}
                      >
                        {/* Thumbnail */}
                        <img
                          src={banner.imageUrl}
                          alt="Banner publicitario"
                          className="w-32 h-20 object-cover rounded"
                          data-testid={`img-banner-${banner.id}`}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium" data-testid={`text-banner-order-${banner.id}`}>
                              Orden: {banner.displayOrder}
                            </span>
                            <span 
                              className={`text-xs px-2 py-1 rounded ${
                                banner.isActive === "true" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                              data-testid={`text-banner-status-${banner.id}`}
                            >
                              {banner.isActive === "true" ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          {banner.linkUrl && (
                            <a
                              href={banner.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                              data-testid={`link-banner-${banner.id}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {banner.linkUrl}
                            </a>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMutation.mutate(banner.id)}
                            disabled={toggleMutation.isPending}
                            data-testid={`button-toggle-${banner.id}`}
                          >
                            <Switch 
                              checked={banner.isActive === "true"} 
                              disabled={toggleMutation.isPending}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(banner)}
                            data-testid={`button-edit-${banner.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingBanner(banner)}
                            data-testid={`button-delete-${banner.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      {editingBanner && (
        <Dialog open={!!editingBanner} onOpenChange={(open) => {
          if (!open) {
            setEditingBanner(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar banner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Posición</Label>
                <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                  <SelectTrigger data-testid="select-edit-banner-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Imagen del Banner</Label>
                <div className="mt-2 space-y-3">
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img 
                        src={formData.imageUrl} 
                        alt="Vista previa del banner" 
                        className="w-full h-48 object-cover rounded-lg"
                        data-testid="img-edit-banner-preview"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData({ ...formData, imageUrl: "" })}
                        data-testid="button-remove-edit-banner-image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <Label 
                        htmlFor="edit-banner-upload" 
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Haga clic aquí para cargar una imagen
                      </Label>
                      <input
                        id="edit-banner-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        disabled={uploadingImage}
                        data-testid="input-edit-banner-image"
                      />
                      {uploadingImage && (
                        <p className="text-sm text-gray-500 mt-2">Cargando...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>URL del enlace (opcional)</Label>
                <Input
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="input-edit-banner-link"
                />
              </div>

              <div>
                <Label>Orden de visualización</Label>
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  data-testid="input-edit-banner-order"
                />
                <p className="text-xs text-gray-500 mt-1">Niedrigere Zahlen werden zuerst angezeigt</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive === "true"}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked ? "true" : "false" })}
                  data-testid="switch-edit-banner-active"
                />
                <Label>Banner activo</Label>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={updateMutation.isPending || !formData.imageUrl}
                data-testid="button-update-banner"
              >
                {updateMutation.isPending ? "Actualizando..." : "Actualizar banner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBanner} onOpenChange={(open) => !open && setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar banner?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar este banner? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBanner && deleteMutation.mutate(deletingBanner.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
