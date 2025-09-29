import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertListingSchema, type InsertListing } from "@shared/schema";
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

export default function CreateListingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<string[]>([]);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
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

  const createListingMutation = useMutation({
    mutationFn: (data: InsertListing) => apiRequest('POST', '/api/listings', {
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "¡Anuncio creado exitosamente!",
        description: "Tu anuncio ha sido publicado y está disponible para otros usuarios.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear el anuncio",
        description: error.message || "Hubo un problema al crear tu anuncio",
        variant: "destructive",
      });
    },
  });

  const addImageFromUpload = (imageUrl: string) => {
    if (imageUrl && images.length < 8 && !images.includes(imageUrl)) {
      const updatedImages = [...images, imageUrl];
      setImages(updatedImages);
      form.setValue('images', updatedImages);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    form.setValue('images', updatedImages);
  };

  const onSubmit = async (data: InsertListing) => {
    createListingMutation.mutate({
      ...data,
      images
    });
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
          <h1 className="text-lg font-semibold text-foreground">Crear Anuncio</h1>
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
                    defaultValue="fixed"
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
                <Select onValueChange={(value) => form.setValue("categoryId", value)}>
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
                  <Select onValueChange={(value) => form.setValue("locationRegion", value)}>
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
                  defaultValue="used"
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Sube hasta 8 imágenes para tu anuncio
                </p>
                {/* File upload component will be added here */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PNG, JPG, JPEG hasta 10MB
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={image} 
                      alt={`Imagen ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E";
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => removeImage(index)}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {images.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Agrega imágenes para mostrar tu producto
                  </p>
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
              disabled={createListingMutation.isPending}
              data-testid="button-submit"
            >
              {createListingMutation.isPending ? "Creando anuncio..." : "Publicar Anuncio"}
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