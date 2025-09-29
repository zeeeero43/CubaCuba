import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertListingSchema, type InsertListing, type Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, X, Upload, MapPin, Euro, Tag, Phone, MessageCircle, Camera } from "lucide-react";
import type { Category } from "@shared/schema";

const provinces = [
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

export default function EditListingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [listingId, setListingId] = useState<string>("");

  // Extract listing ID from URL
  const urlParts = window.location.pathname.split('/');
  const id = urlParts[urlParts.length - 1];

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch existing listing data
  const { data: existingListing, isLoading: listingLoading } = useQuery<Listing>({
    queryKey: ['/api/listings', id],
    enabled: !!id,
  });

  const form = useForm<InsertListing>({
    resolver: zodResolver(insertListingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      priceType: "fixed",
      categoryId: "",
      locationCity: "",
      locationRegion: "",
      images: [],
      condition: "used",
      contactPhone: "",
      contactWhatsApp: "false",
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: (data: InsertListing) => apiRequest('PUT', `/api/listings/${id}`, data),
    onSuccess: () => {
      toast({
        title: "¡Anuncio actualizado!",
        description: "Los cambios han sido guardados exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      navigate('/my-listings');
    },
    onError: (error: any) => {
      console.log('Mutation error:', error);
      toast({
        title: "Error al actualizar",
        description: error.message || "Hubo un problema al actualizar tu anuncio",
        variant: "destructive",
      });
    },
  });

  const addImageFromUpload = (imageUrl: string) => {
    if (imageUrl) {
      setImages(prev => {
        // Check if image already exists or if we've reached the limit
        if (prev.includes(imageUrl) || prev.length >= 8) {
          return prev;
        }
        const updatedImages = [...prev, imageUrl];
        form.setValue('images', updatedImages);
        return updatedImages;
      });
    }
  };

  // Simple file upload handler
  const handleFileUpload = async (files: FileList) => {
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
    
    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo no puede superar los 10MB",
        variant: "destructive",
      });
      return;
    }
    
    // Check if we've reached the image limit
    if (images.length >= 8) {
      toast({
        title: "Límite de imágenes alcanzado",
        description: "Solo puedes subir un máximo de 8 imágenes",
        variant: "destructive",
      });
      return;
    }
    
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
        throw new Error('Failed to upload file');
      }
      
      // Step 3: Finalize upload and get object path
      const finalizeResponse = await apiRequest('POST', '/api/listings/finalize-upload', { objectId });
      
      const { objectPath } = await finalizeResponse.json();
      
      // Update images state
      setImages(prev => {
        const newImages = [...prev, objectPath];
        form.setValue('images', newImages);
        return newImages;
      });
      
      toast({
        title: "¡Imagen subida exitosamente!",
        description: "La imagen se ha agregado a tu anuncio",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error al subir imagen",
        description: "Hubo un problema al subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    form.setValue('images', updatedImages);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setImages(newImages);
    setDraggedIndex(index);
    form.setValue('images', newImages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const onSubmit = async (data: InsertListing) => {
    console.log('Form submission data:', {
      ...data,
      images
    });
    console.log('Form errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);
    console.log('Form state details:', {
      isValidating: form.formState.isValidating,
      isSubmitting: form.formState.isSubmitting,
      touchedFields: form.formState.touchedFields,
      dirtyFields: form.formState.dirtyFields,
    });
    
    // Manually trigger validation to see what happens
    const isValid = await form.trigger();
    console.log('Manual validation result:', isValid);
    console.log('Errors after manual validation:', form.formState.errors);
    
    if (!isValid) {
      console.log('Form validation failed, not submitting');
      return;
    }
    
    updateListingMutation.mutate({
      ...data,
      images
    });
  };

  // Load existing listing data into form
  useEffect(() => {
    if (existingListing) {
      form.reset({
        title: existingListing.title,
        description: existingListing.description,
        price: existingListing.price.toString(),
        priceType: existingListing.priceType as "fixed" | "negotiable",
        categoryId: existingListing.categoryId || "",
        locationCity: existingListing.locationCity,
        locationRegion: existingListing.locationRegion,
        images: existingListing.images || [],
        condition: existingListing.condition as "new" | "used" | "defective",
        contactPhone: existingListing.contactPhone,
        contactWhatsApp: existingListing.contactWhatsApp as "true" | "false",
      });
      setImages(existingListing.images || []);
    }
  }, [existingListing]);

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
          <h1 className="text-lg font-semibold text-foreground">Editar Anuncio</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título del anuncio *</Label>
                <Input
                  id="title"
                  placeholder="Ej: iPhone 14 Pro en perfecto estado"
                  {...form.register("title")}
                  data-testid="input-title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe tu producto detalladamente..."
                  className="min-h-24"
                  {...form.register("description")}
                  data-testid="textarea-description"
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (CUP) *</Label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-10"
                      {...form.register("price")}
                      data-testid="input-price"
                    />
                  </div>
                  {form.formState.errors.price && (
                    <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceType">Tipo de precio *</Label>
                  <Select 
                    onValueChange={(value) => form.setValue("priceType", value as "fixed" | "negotiable")}
                    value={form.watch("priceType") || ""}
                  >
                    <SelectTrigger data-testid="select-price-type">
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Precio fijo</SelectItem>
                      <SelectItem value="negotiable">Negociable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category and Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Categoría y Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoría *</Label>
                <Select 
                  onValueChange={(value) => form.setValue("categoryId", value)}
                  value={form.watch("categoryId") || ""}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locationCity">Ciudad *</Label>
                  <Input
                    id="locationCity"
                    placeholder="Ej: Centro Habana"
                    {...form.register("locationCity")}
                    data-testid="input-city"
                  />
                  {form.formState.errors.locationCity && (
                    <p className="text-sm text-destructive">{form.formState.errors.locationCity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locationRegion">Provincia *</Label>
                  <Select 
                    onValueChange={(value) => form.setValue("locationRegion", value)}
                    value={form.watch("locationRegion") || ""}
                  >
                    <SelectTrigger data-testid="select-province">
                      <SelectValue placeholder="Selecciona provincia" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.value} value={province.value}>
                          {province.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.locationRegion && (
                    <p className="text-sm text-destructive">{form.formState.errors.locationRegion.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Estado del artículo *</Label>
                <Select 
                  onValueChange={(value) => form.setValue("condition", value as "new" | "used" | "defective")}
                  value={form.watch("condition") || ""}
                >
                  <SelectTrigger data-testid="select-condition">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nuevo</SelectItem>
                    <SelectItem value="used">Usado - Buen estado</SelectItem>
                    <SelectItem value="defective">Usado - Con defectos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Imágenes (máximo 8)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 px-4">
                  Sube hasta 8 imágenes para tu anuncio
                </p>
                
                {/* Simple file upload input */}
                <div className="px-4">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={images.length >= 8}
                      data-testid="input-image-upload"
                    />
                    <div className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary transition-colors bg-transparent flex flex-col items-center cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm font-medium">
                        Arrastra archivos aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-400 px-4">
                        PNG, JPG, JPEG hasta 10MB (máximo {8 - images.length} restantes)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Arrastra las imágenes para reordenarlas. La primera imagen será la principal.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((image, index) => (
                      <div 
                        key={index} 
                        className={`relative cursor-move transition-all ${
                          draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100'
                        }`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <img 
                          src={image} 
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E";
                          }}
                        />
                        {index === 0 && (
                          <Badge className="absolute top-2 left-2 bg-primary text-white">
                            Principal
                          </Badge>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7 shadow-lg"
                          onClick={() => removeImage(index)}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Imágenes: {images.length}/8
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Teléfono de contacto *</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+1 305 123456 o 54123456"
                  {...form.register("contactPhone")}
                  data-testid="input-contact-phone"
                />
                {form.formState.errors.contactPhone && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactPhone.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="whatsapp"
                  checked={form.watch("contactWhatsApp") === "true"}
                  onChange={(e) => form.setValue("contactWhatsApp", e.target.checked ? "true" : "false")}
                  className="rounded"
                  data-testid="checkbox-whatsapp"
                />
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  También disponible en WhatsApp
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="space-y-4">
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={updateListingMutation.isPending}
              data-testid="button-submit"
            >
              {updateListingMutation.isPending ? "Guardando cambios..." : "Guardar Cambios"}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              Al publicar, aceptas nuestros términos y condiciones
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}