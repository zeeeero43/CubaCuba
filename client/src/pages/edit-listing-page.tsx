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
import { ArrowLeft, X, Camera, Save, ChevronRight } from "lucide-react";
import type { Category } from "@shared/schema";
import { PageHeader } from "@/components/PageHeader";

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
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("");
  const [noPriceSelected, setNoPriceSelected] = useState(false);

  // Extract listing ID from URL
  const urlParts = window.location.pathname.split('/');
  const id = urlParts[urlParts.length - 1];

  // Fetch description min length setting
  const { data: descriptionMinLengthSetting } = useQuery<{ minLength: number }>({
    queryKey: ['/api/settings/description-min-length'],
    queryFn: async () => {
      const response = await fetch('/api/settings/description-min-length');
      if (!response.ok) return { minLength: 50 };
      return response.json();
    },
  });

  const descriptionMinLength = descriptionMinLengthSetting?.minLength || 50;

  // Fetch hierarchical categories
  const { data: categoriesTree } = useQuery<{
    mainCategories: Category[];
    subcategories: Record<string, Category[]>;
  }>({
    queryKey: ['/api/categories/tree'],
  });

  const mainCategories = categoriesTree?.mainCategories || [];
  const subcategories = categoriesTree?.subcategories || {};
  const availableSubcategories = selectedMainCategory ? (subcategories[selectedMainCategory] || []) : [];

  // Fetch existing listing data
  const { data: existingListing, isLoading: listingLoading } = useQuery<Listing>({
    queryKey: ['/api/listings', id],
    enabled: !!id,
  });

  // Fetch the category of the existing listing to determine main category
  const { data: existingCategory } = useQuery<Category>({
    queryKey: ['/api/categories', existingListing?.categoryId],
    enabled: !!existingListing?.categoryId,
  });

  const form = useForm<InsertListing>({
    resolver: zodResolver(insertListingSchema.extend({
      description: insertListingSchema.shape.description.min(
        descriptionMinLength,
        `La descripción debe tener al menos ${descriptionMinLength} caracteres`
      ),
    })),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      currency: "CUP",
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

  const watchedDescription = form.watch("description");
  const watchedCategoryId = form.watch("categoryId");
  const watchedLocationRegion = form.watch("locationRegion");
  const watchedCondition = form.watch("condition");
  const watchedContactWhatsApp = form.watch("contactWhatsApp");

  const updateListingMutation = useMutation({
    mutationFn: (data: InsertListing) => apiRequest('PUT', `/api/listings/${id}`, data),
    onSuccess: () => {
      toast({
        title: "¡Anuncio actualizado!",
        description: "Los cambios han sido guardados exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      navigate('/profile');
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message || "Hubo un problema al actualizar tu anuncio",
        variant: "destructive",
      });
    },
  });

  // Image upload handler (using Base64 like create-listing-page)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 10) {
      toast({
        title: "Límite de imágenes excedido",
        description: "Puedes subir un máximo de 10 imágenes",
        variant: "destructive"
      });
      return;
    }

    // Validate individual file size
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB per image
    const filesToUpload: File[] = [];
    let totalSize = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Imagen demasiado grande",
          description: `"${file.name}" supera los 3MB. Por favor, comprime la imagen antes de subirla.`,
          variant: "destructive"
        });
        continue;
      }

      totalSize += file.size;
      filesToUpload.push(file);
    }

    // Validate total size (Base64 images are ~33% larger)
    const estimatedBase64Size = totalSize * 1.33;
    if (estimatedBase64Size > 45 * 1024 * 1024) { // 45MB limit to be safe
      toast({
        title: "Demasiadas imágenes grandes",
        description: "El tamaño total de las imágenes es demasiado grande. Por favor, sube menos imágenes o comprime las imágenes.",
        variant: "destructive"
      });
      return;
    }

    // Upload valid images
    for (const file of filesToUpload) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => {
          const newImages = [...prev, reader.result as string];
          form.setValue('images', newImages);
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    }

    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const updatedImages = prev.filter((_, i) => i !== index);
      form.setValue('images', updatedImages);
      return updatedImages;
    });
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
    // Validate images
    if (images.length === 0) {
      toast({
        title: "Faltan imágenes",
        description: "Debes subir al menos una imagen",
        variant: "destructive"
      });
      return;
    }

    const finalData = {
      ...data,
      images,
      price: noPriceSelected ? null : data.price,
      priceType: noPriceSelected ? "consult" as const : "fixed" as const,
    };
    
    updateListingMutation.mutate(finalData as InsertListing);
  };

  // Load existing listing data into form AND set category selection
  useEffect(() => {
    if (existingListing && existingCategory) {
      const hasPrice = existingListing.price !== null && existingListing.price !== undefined;
      setNoPriceSelected(!hasPrice);

      // Set main category if this is a subcategory
      if (existingCategory.parentId) {
        setSelectedMainCategory(existingCategory.parentId);
      }

      form.reset({
        title: existingListing.title,
        description: existingListing.description,
        price: hasPrice && existingListing.price ? existingListing.price.toString() : "",
        currency: (existingListing.currency as "CUP" | "USD") || "CUP",
        priceType: (existingListing.priceType as "fixed" | "consult") || "fixed",
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
  }, [existingListing, existingCategory]);

  if (listingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <PageHeader 
        title="Editar Anuncio" 
        backTo="/profile"
      />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Categoría</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Categoría Principal</Label>
                <Select
                  value={selectedMainCategory}
                  onValueChange={(value) => {
                    setSelectedMainCategory(value);
                    form.setValue("categoryId", "");
                  }}
                >
                  <SelectTrigger data-testid="select-main-category">
                    <SelectValue placeholder="Selecciona categoría principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMainCategory && availableSubcategories.length > 0 && (
                <div>
                  <Label>Subcategoría *</Label>
                  <Select
                    value={watchedCategoryId || ""}
                    onValueChange={(value) => form.setValue("categoryId", value)}
                  >
                    <SelectTrigger data-testid="select-subcategory">
                      <SelectValue placeholder="Selecciona subcategoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.categoryId && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.categoryId.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título del anuncio *</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  placeholder="Ej: iPhone 12 Pro Max 256GB"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">
                  Descripción * (mínimo {descriptionMinLength} caracteres)
                </Label>
                <Textarea
                  id="description"
                  data-testid="input-description"
                  placeholder="Describe tu producto: estado, características, motivo de venta, etc."
                  rows={6}
                  {...form.register("description")}
                />
                <div className="flex justify-between items-center mt-1">
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {watchedDescription?.length || 0} / {descriptionMinLength}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="condition">Condición del producto *</Label>
                <Select
                  value={watchedCondition || "used"}
                  onValueChange={(value) => form.setValue("condition", value as any)}
                >
                  <SelectTrigger data-testid="select-condition">
                    <SelectValue placeholder="Selecciona condición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nuevo</SelectItem>
                    <SelectItem value="used">Usado</SelectItem>
                    <SelectItem value="defective">Defectuoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="locationRegion">Provincia *</Label>
                  <Select
                    value={watchedLocationRegion || ""}
                    onValueChange={(value) => form.setValue("locationRegion", value)}
                  >
                    <SelectTrigger data-testid="select-region">
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
                </div>

                <div>
                  <Label htmlFor="locationCity">Ciudad (opcional)</Label>
                  <Input
                    id="locationCity"
                    data-testid="input-city"
                    placeholder="Ej: Centro Habana"
                    {...form.register("locationCity")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Imágenes ({images.length}/10)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  data-testid="input-image-upload"
                  disabled={images.length >= 10}
                />
                <label htmlFor="image-upload" className={`cursor-pointer ${images.length >= 10 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    Haz clic para subir imágenes
                  </p>
                  <p className="text-sm text-gray-500">Hasta 10 imágenes (máx. 5MB cada una)</p>
                </label>
              </div>

              {images.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Arrastra las imágenes para cambiar su orden. La primera imagen será la principal.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`relative group cursor-move transition-all ${
                          draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                        }`}
                        data-testid={`image-preview-${index}`}
                      >
                        <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 transition-colors">
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover"
                          />
                          {index === 0 && (
                            <Badge className="absolute top-2 left-2 bg-green-600 shadow-lg">
                              📸 Principal
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
                            data-testid={`button-remove-image-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-center mt-1 text-gray-500">Imagen {index + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price and Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Precio y Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="no-price"
                  checked={noPriceSelected}
                  onChange={(e) => {
                    setNoPriceSelected(e.target.checked);
                    if (e.target.checked) {
                      form.setValue("price", "");
                    }
                  }}
                  data-testid="checkbox-no-price"
                />
                <Label htmlFor="no-price" className="cursor-pointer">
                  Precio a consultar
                </Label>
              </div>

              {!noPriceSelected && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="price">Precio *</Label>
                    <Input
                      id="price"
                      type="text"
                      placeholder="1000"
                      data-testid="input-price"
                      {...form.register("price")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Moneda *</Label>
                    <Select
                      value={form.watch("currency") || "CUP"}
                      onValueChange={(value) => form.setValue("currency", value as any)}
                    >
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUP">CUP</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="contactPhone">Teléfono de contacto *</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+53 5555 5555"
                  data-testid="input-contact-phone"
                  {...form.register("contactPhone")}
                />
                {form.formState.errors.contactPhone && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.contactPhone.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="whatsapp"
                  checked={watchedContactWhatsApp === "true"}
                  onChange={(e) => form.setValue("contactWhatsApp", e.target.checked ? "true" : "false")}
                  data-testid="checkbox-whatsapp"
                />
                <Label htmlFor="whatsapp" className="cursor-pointer">
                  Este número tiene WhatsApp
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={updateListingMutation.isPending}
            data-testid="button-save"
          >
            <Save className="w-5 h-5 mr-2" />
            {updateListingMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </div>
    </div>
  );
}
