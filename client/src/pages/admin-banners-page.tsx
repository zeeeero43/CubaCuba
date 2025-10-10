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
  header: "Header-Banner",
  sidebar: "Sidebar-Banner",
  footer: "Footer-Banner",
  mobile: "Mobile-Banner",
  category: "Kategorie-Banner",
};

const POSITION_OPTIONS = [
  { value: "header", label: "Header" },
  { value: "sidebar", label: "Sidebar" },
  { value: "footer", label: "Footer" },
  { value: "mobile", label: "Mobile" },
  { value: "category", label: "Kategorie" },
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
      toast({ title: "Banner erfolgreich erstellt" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Erstellen des Banners", 
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
      toast({ title: "Banner erfolgreich aktualisiert" });
      setEditingBanner(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Aktualisieren des Banners", 
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
      toast({ title: "Banner erfolgreich gelöscht" });
      setDeletingBanner(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Löschen des Banners", 
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
      toast({ title: "Banner-Status aktualisiert" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Aktualisieren des Status", 
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
        title: "Bild erforderlich",
        description: "Bitte laden Sie ein Bild hoch",
        variant: "destructive",
      });
      return;
    }

    if (editingBanner) {
      updateMutation.mutate({ 
        id: editingBanner.id, 
        data: {
          position: formData.position as "header" | "sidebar" | "footer" | "mobile" | "category",
          imageUrl: formData.imageUrl,
          linkUrl: formData.linkUrl,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive as "true" | "false"
        }
      });
    } else {
      createMutation.mutate({
        position: formData.position as "header" | "sidebar" | "footer" | "mobile" | "category",
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
        title: "Ungültiger Dateityp",
        description: "Nur Bilddateien sind erlaubt",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast({
        title: "Datei zu groß",
        description: "Die Datei darf nicht größer als 10MB sein",
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
        throw new Error('Fehler beim Hochladen der Datei');
      }
      
      // Step 3: Finalize upload and get object path
      const finalizeResponse = await apiRequest('POST', '/api/listings/finalize-upload', { objectId });
      const { objectPath } = await finalizeResponse.json();
      
      // Update form data
      setFormData(prev => ({ ...prev, imageUrl: objectPath }));
      
      toast({
        title: "Bild erfolgreich hochgeladen",
        description: "Das Bild wurde zum Banner hinzugefügt",
      });
    } catch (error) {
      console.error('Fehler beim Hochladen des Bildes:', error);
      toast({
        title: "Fehler beim Hochladen des Bildes",
        description: "Bitte versuchen Sie es erneut",
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
          <p className="text-gray-500">Lade Banner...</p>
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
            Banner-Verwaltung
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Werbe-Banner für verschiedene Positionen verwalten
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-banner">
              <Plus className="w-4 h-4 mr-2" />
              Neues Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Neues Banner erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Position</Label>
                <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                  <SelectTrigger data-testid="select-banner-position">
                    <SelectValue placeholder="Position wählen" />
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
                <Label>Banner-Bild</Label>
                <div className="mt-2 space-y-3">
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img 
                        src={formData.imageUrl} 
                        alt="Banner Vorschau" 
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
                        Klicken Sie hier, um ein Bild hochzuladen
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
                        <p className="text-sm text-gray-500 mt-2">Lädt hoch...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Link-URL (optional)</Label>
                <Input
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="input-banner-link"
                />
              </div>

              <div>
                <Label>Anzeigereihenfolge</Label>
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
                <Label>Banner aktiv</Label>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={createMutation.isPending || !formData.imageUrl}
                data-testid="button-submit-banner"
              >
                {createMutation.isPending ? "Erstelle..." : "Banner erstellen"}
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
                    {positionBanners.length} {positionBanners.length === 1 ? "Banner" : "Banner"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {positionBanners.length === 0 ? (
                  <p className="text-gray-500 text-center py-8" data-testid={`text-no-banners-${position.value}`}>
                    Keine Banner für diese Position
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
                          alt="Banner"
                          className="w-32 h-20 object-cover rounded"
                          data-testid={`img-banner-${banner.id}`}
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium" data-testid={`text-banner-order-${banner.id}`}>
                              Reihenfolge: {banner.displayOrder}
                            </span>
                            <span 
                              className={`text-xs px-2 py-1 rounded ${
                                banner.isActive === "true" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                              }`}
                              data-testid={`text-banner-status-${banner.id}`}
                            >
                              {banner.isActive === "true" ? "Aktiv" : "Inaktiv"}
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
              <DialogTitle>Banner bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Position</Label>
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
                <Label>Banner-Bild</Label>
                <div className="mt-2 space-y-3">
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img 
                        src={formData.imageUrl} 
                        alt="Banner Vorschau" 
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
                        Klicken Sie hier, um ein Bild hochzuladen
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
                        <p className="text-sm text-gray-500 mt-2">Lädt hoch...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Link-URL (optional)</Label>
                <Input
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://example.com"
                  data-testid="input-edit-banner-link"
                />
              </div>

              <div>
                <Label>Anzeigereihenfolge</Label>
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
                <Label>Banner aktiv</Label>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={updateMutation.isPending || !formData.imageUrl}
                data-testid="button-update-banner"
              >
                {updateMutation.isPending ? "Aktualisiere..." : "Banner aktualisieren"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingBanner} onOpenChange={(open) => !open && setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Banner löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie dieses Banner löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBanner && deleteMutation.mutate(deletingBanner.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Lösche..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
