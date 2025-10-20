import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertListingSchema, type InsertListing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ArrowRight, Plus, X, Upload, MapPin, Euro, Phone, MessageCircle, Camera, AlertTriangle, Ban, FileText, Sparkles, CheckCircle, ChevronRight, type LucideIcon } from "lucide-react";
import type { Category } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { PremiumFeaturesSelector } from "@/components/PremiumFeaturesSelector";
import { Progress } from "@/components/ui/progress";
import { getIconComponent } from "@/lib/utils";

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

type RejectionData = {
  message: string;
  reasons: string[];
  specificIssues: string[];
  problematicWords?: string[];
  aiExplanation: string;
  confidence: number;
  warning: string;
  reviewId?: string;
  listingId?: string;
};

export default function CreateListingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch premium features
  const { data: premiumFeatures = [] } = useQuery<any[]>({
    queryKey: ['/api/premium-features'],
  });

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const hasPremiumFeatures = Array.isArray(premiumFeatures) && premiumFeatures.length > 0;
  const totalSteps = hasPremiumFeatures ? 5 : 4; // Skip premium step if no features available
  
  // Form state
  const [images, setImages] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("");
  const [selectedPremiumFeatures, setSelectedPremiumFeatures] = useState<string[]>([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [noPriceSelected, setNoPriceSelected] = useState(false);
  
  // Dialog state
  const [rejectionData, setRejectionData] = useState<RejectionData | null>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [showAppealDialog, setShowAppealDialog] = useState(false);
  const [appealReason, setAppealReason] = useState("");

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
      locationRegion: user?.province || "",
      images: [],
      condition: "used",
      contactPhone: "",
      contactWhatsApp: "true", // Default WhatsApp ON
    },
  });

  // Set user's province as default when user data is available
  useEffect(() => {
    if (user?.province && !form.getValues("locationRegion")) {
      form.setValue("locationRegion", user.province, { shouldValidate: true, shouldTouch: true });
    }
  }, [user, form]);

  // Watch form values
  const watchedCategoryId = form.watch("categoryId");
  const watchedLocationRegion = form.watch("locationRegion");
  const watchedCondition = form.watch("condition");
  const watchedDescription = form.watch("description");

  // Update phone number when user data loads
  useEffect(() => {
    if (user?.phone && !form.getValues("contactPhone")) {
      form.setValue("contactPhone", user.phone, { shouldValidate: true, shouldTouch: true });
    }
  }, [user?.phone]);

  // Sync images with form
  useEffect(() => {
    form.setValue("images", images);
  }, [images]);

  const purchasePremiumMutation = useMutation({
    mutationFn: async ({ listingId, featureIds }: { listingId: string; featureIds: string[] }) => {
      const response = await apiRequest('POST', `/api/listings/${listingId}/premium`, { featureIds });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Funciones premium activadas!",
        description: "Tu anuncio ahora tiene funciones premium activas.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        title: "Error al activar funciones premium",
        description: error.message || "Hubo un problema al activar las funciones premium.",
        variant: "destructive"
      });
    },
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: InsertListing) => {
      const response = await apiRequest('POST', '/api/listings', data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setCreatedListingId(data.id);
      
      if (selectedPremiumFeatures.length > 0) {
        purchasePremiumMutation.mutate({
          listingId: data.id,
          featureIds: selectedPremiumFeatures
        });
      } else {
        toast({
          title: "¡Anuncio creado exitosamente!",
          description: "Tu anuncio ha sido publicado y está disponible para otros usuarios.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
        navigate('/');
      }
    },
    onError: (error: any) => {
      let errorData: RejectionData = {
        message: "Hubo un problema al crear tu anuncio",
        reasons: [],
        specificIssues: [],
        aiExplanation: "",
        confidence: 0,
        warning: ""
      };
      
      if (error.message) {
        try {
          const jsonMatch = error.message.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.details) {
              errorData = {
                message: parsed.message || "Error de validación",
                reasons: [],
                specificIssues: [parsed.details],
                problematicWords: [],
                aiExplanation: parsed.details,
                confidence: 100,
                warning: "",
              };
            } else {
              errorData = {
                message: parsed.message || errorData.message,
                reasons: parsed.reasons || [],
                specificIssues: parsed.specificIssues || [],
                problematicWords: parsed.problematicWords || [],
                aiExplanation: parsed.aiExplanation || "",
                confidence: parsed.confidence || 0,
                warning: parsed.warning || "",
                reviewId: parsed.reviewId,
                listingId: parsed.listingId
              };
            }
          }
        } catch (e) {
          console.error('Error parsing rejection data:', e);
        }
      }
      
      setRejectionData(errorData);
      setShowRejectionDialog(true);
    },
  });

  const appealMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/moderation/appeal/${reviewId}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Apelación enviada",
        description: "Tu apelación ha sido enviada. Un moderador la revisará pronto.",
      });
      setShowAppealDialog(false);
      setAppealReason("");
      navigate('/profile');
    },
    onError: (error: any) => {
      toast({
        title: "Error al enviar apelación",
        description: error.message || "Hubo un problema al enviar tu apelación",
        variant: "destructive"
      });
    },
  });

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

    // Validar tamaño individual de cada archivo
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB por imagen
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

    // Validar tamaño total (las imágenes Base64 son ~33% más grandes)
    const estimatedBase64Size = totalSize * 1.33;
    if (estimatedBase64Size > 45 * 1024 * 1024) { // 45MB límite para estar seguro
      toast({
        title: "Demasiadas imágenes grandes",
        description: "El tamaño total de las imágenes es demasiado grande. Por favor, sube menos imágenes o comprime las imágenes.",
        variant: "destructive"
      });
      return;
    }

    // Subir las imágenes válidas
    for (const file of filesToUpload) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }

    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    const values = form.getValues();
    
    switch (step) {
      case 1: // Category
        if (!values.categoryId) {
          toast({
            title: "Categoría requerida",
            description: "Por favor selecciona una subcategoría",
            variant: "destructive"
          });
          return false;
        }
        return true;
        
      case 2: // Details
        if (!values.title || values.title.trim().length === 0) {
          toast({
            title: "Título requerido",
            description: "Por favor ingresa un título para tu anuncio",
            variant: "destructive"
          });
          return false;
        }
        if (!values.description || values.description.length < descriptionMinLength) {
          toast({
            title: "Descripción requerida",
            description: `La descripción debe tener al menos ${descriptionMinLength} caracteres`,
            variant: "destructive"
          });
          return false;
        }
        if (!values.locationRegion) {
          toast({
            title: "Provincia requerida",
            description: "Por favor selecciona tu provincia",
            variant: "destructive"
          });
          return false;
        }
        return true;
        
      case 3: // Images
        if (images.length === 0) {
          toast({
            title: "Al menos una imagen es requerida",
            description: "Por favor sube al menos una imagen de tu producto",
            variant: "destructive"
          });
          return false;
        }
        return true;
        
      case 4: // Price
        if (!noPriceSelected) {
          if (!values.price || values.price.trim() === "") {
            toast({
              title: "Precio requerido",
              description: "Por favor ingresa un precio o selecciona 'Precio a consultar'",
              variant: "destructive"
            });
            return false;
          }
        }
        if (!values.contactPhone || values.contactPhone.trim() === "") {
          toast({
            title: "Teléfono requerido",
            description: "Por favor ingresa tu número de teléfono",
            variant: "destructive"
          });
          return false;
        }
        return true;
        
      case 5: // Premium (optional)
        return true;
        
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: InsertListing) => {
    const finalData = {
      ...data,
      images,
      price: noPriceSelected ? null : data.price,
      priceType: noPriceSelected ? "consult" as const : "fixed" as const,
    };
    createListingMutation.mutate(finalData as InsertListing);
  };

  const handleFinalSubmit = () => {
    if (!validateStep(currentStep)) return;
    
    form.handleSubmit(
      (data) => onSubmit(data),
      (errors) => {
        console.error("Form validation errors:", errors);
        
        // Extract specific error messages
        const errorMessages = Object.entries(errors)
          .map(([field, error]: [string, any]) => {
            const fieldNames: Record<string, string> = {
              title: "Título",
              description: "Descripción",
              categoryId: "Categoría",
              locationRegion: "Provincia",
              locationCity: "Ciudad",
              contactPhone: "Teléfono",
              price: "Precio",
              images: "Imágenes",
              condition: "Condición",
              contactWhatsApp: "WhatsApp"
            };
            return `${fieldNames[field] || field}: ${error?.message || 'Campo requerido'}`;
          })
          .join("\n");
        
        toast({
          title: "Error de validación",
          description: errorMessages || "Por favor completa todos los campos requeridos correctamente",
          variant: "destructive"
        });
      }
    )();
  };

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: "Categoría" },
      { number: 2, label: "Detalles" },
      { number: 3, label: "Imágenes" },
      { number: 4, label: "Precio" },
      ...(hasPremiumFeatures ? [{ number: 5, label: "Premium" }] : []),
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  currentStep === step.number 
                    ? 'bg-green-600 text-white' 
                    : currentStep > step.number 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {currentStep > step.number ? <CheckCircle className="w-6 h-6" /> : step.number}
                </div>
                <span className="text-xs mt-2 font-medium text-center hidden sm:block">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 transition-colors ${
                  currentStep > step.number ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderCategoryStep();
      case 2:
        return renderDetailsStep();
      case 3:
        return renderImagesStep();
      case 4:
        return renderPriceStep();
      case 5:
        return hasPremiumFeatures ? renderPremiumStep() : null;
      default:
        return null;
    }
  };

  const renderCategoryStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Selecciona una categoría</h2>
        <p className="text-gray-600 dark:text-gray-400">Elige la categoría que mejor describa tu producto</p>
      </div>

      {!selectedMainCategory ? (
        <div>
          <Label className="text-lg mb-4 block">Categoría Principal *</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mainCategories.map((category) => {
              const IconComponent = getIconComponent(category.icon);
              return (
                <Card
                  key={category.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                    selectedMainCategory === category.id
                      ? 'border-2 border-green-600 bg-green-50 dark:bg-green-950'
                      : 'border hover:border-green-400'
                  }`}
                  onClick={() => {
                    setSelectedMainCategory(category.id);
                    form.setValue("categoryId", "");
                  }}
                  data-testid={`category-card-${category.id}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="mb-3 flex justify-center">
                      <IconComponent className="w-12 h-12 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg">Subcategoría *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedMainCategory("");
                form.setValue("categoryId", "");
              }}
              data-testid="button-change-category"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cambiar categoría
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableSubcategories.map((subcategory) => (
              <Card
                key={subcategory.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  watchedCategoryId === subcategory.id
                    ? 'border-2 border-green-600 bg-green-50 dark:bg-green-950'
                    : 'border hover:border-green-400'
                }`}
                onClick={() => {
                  form.setValue("categoryId", subcategory.id);
                  // Auto-navigate to next step after subcategory selection
                  setTimeout(() => {
                    if (validateStep(1)) {
                      setCurrentStep(2);
                    }
                  }, 300);
                }}
                data-testid={`subcategory-card-${subcategory.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ChevronRight className="w-5 h-5 text-green-600" />
                    <span className="font-medium">{subcategory.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Detalles del producto</h2>
        <p className="text-gray-600 dark:text-gray-400">Describe tu producto con detalle</p>
      </div>

      <div className="space-y-4">
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
              <SelectItem value="like-new">Como nuevo</SelectItem>
              <SelectItem value="used">Usado</SelectItem>
              <SelectItem value="refurbished">Reacondicionado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderImagesStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Imágenes del producto</h2>
        <p className="text-gray-600 dark:text-gray-400">Sube hasta 10 imágenes (máx. 5MB cada una)</p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            data-testid="input-image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <Camera className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Haz clic para subir imágenes</p>
            <p className="text-sm text-gray-500">O arrastra y suelta tus archivos aquí</p>
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
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                  </div>
                  <p className="text-xs text-center mt-1 text-gray-500">Imagen {index + 1}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPriceStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Precio y contacto</h2>
        <p className="text-gray-600 dark:text-gray-400">Configura el precio y tus datos de contacto</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
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
                  <SelectItem value="CUP">CUP (Pesos Cubanos)</SelectItem>
                  <SelectItem value="USD">USD (Dólares)</SelectItem>
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
            placeholder="+53 5 123 4567"
            data-testid="input-phone"
            {...form.register("contactPhone")}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="whatsapp"
            checked={form.watch("contactWhatsApp") === "true"}
            onChange={(e) => form.setValue("contactWhatsApp", e.target.checked ? "true" : "false")}
            data-testid="checkbox-whatsapp"
          />
          <Label htmlFor="whatsapp" className="cursor-pointer flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            Este número tiene WhatsApp
          </Label>
        </div>
      </div>
    </div>
  );

  const renderPremiumStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Funciones Premium (Opcional)</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Destaca tu anuncio con funciones premium para llegar a más personas
        </p>
      </div>

      <PremiumFeaturesSelector
        selectedFeatures={selectedPremiumFeatures}
        onSelectionChange={setSelectedPremiumFeatures}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <h1 className="text-3xl font-bold">Crear Anuncio</h1>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <Card>
          <CardContent className="p-6 min-h-[400px]">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            data-testid="button-prev-step"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={nextStep}
              data-testid="button-next-step"
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinalSubmit}
              disabled={createListingMutation.isPending || purchasePremiumMutation.isPending}
              data-testid="button-submit"
            >
              {createListingMutation.isPending ? "Creando..." : "Publicar Anuncio"}
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="dialog-rejection">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 break-words">
              <Ban className="h-6 w-6 flex-shrink-0" />
              <span className="break-words">Anuncio Rechazado</span>
            </DialogTitle>
            <DialogDescription className="break-words">
              Tu anuncio no cumple con nuestras políticas de contenido
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 overflow-x-hidden">
            {rejectionData && rejectionData.message && (
              <Alert variant="destructive" className="overflow-x-hidden">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <AlertTitle className="break-words">Mensaje:</AlertTitle>
                <AlertDescription className="break-words overflow-wrap-anywhere">{rejectionData.message}</AlertDescription>
              </Alert>
            )}

            {rejectionData && rejectionData.problematicWords && rejectionData.problematicWords.length > 0 && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-950 overflow-x-hidden">
                <Ban className="h-5 w-5 flex-shrink-0" />
                <AlertTitle className="font-bold break-words">Palabras/Frases Problemáticas Detectadas:</AlertTitle>
                <AlertDescription className="overflow-x-hidden">
                  <div className="mt-2 flex flex-wrap gap-2 break-words">
                    {rejectionData.problematicWords.map((word, idx) => (
                      <Badge key={idx} variant="destructive" className="text-sm sm:text-base px-2 sm:px-3 py-1 font-bold break-all max-w-full">
                        "{word}"
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {rejectionData && rejectionData.aiExplanation && (
              <Alert variant="destructive" className="overflow-x-hidden">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <AlertTitle className="break-words">Explicación de la IA:</AlertTitle>
                <AlertDescription className="break-words overflow-wrap-anywhere whitespace-pre-wrap">{rejectionData.aiExplanation}</AlertDescription>
              </Alert>
            )}

            {rejectionData && rejectionData.warning && (
              <Alert variant="destructive" className="border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950 overflow-x-hidden">
                <AlertTriangle className="h-5 w-5 text-red-700 dark:text-red-400 flex-shrink-0" />
                <AlertTitle className="text-red-800 dark:text-red-300 font-bold break-words">⚠️ ADVERTENCIA IMPORTANTE</AlertTitle>
                <AlertDescription className="text-sm text-red-900 dark:text-red-200 font-semibold break-words overflow-wrap-anywhere">
                  {rejectionData.warning}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-3 mt-6 flex-col sm:flex-row">
            <Button
              variant="default"
              onClick={() => {
                if (rejectionData?.reviewId) {
                  setShowRejectionDialog(false);
                  setTimeout(() => {
                    setShowAppealDialog(true);
                  }, 100);
                }
              }}
              data-testid="button-appeal"
              disabled={!rejectionData?.reviewId}
              size="lg"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              📋 Presentar Apelación
            </Button>
            <Button
              variant="default"
              onClick={() => setShowRejectionDialog(false)}
              data-testid="button-accept-rejection"
              size="lg"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              ✓ Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Appeal Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-appeal">
          <DialogHeader>
            <DialogTitle>Presentar Apelación</DialogTitle>
            <DialogDescription>
              Explica por qué crees que tu anuncio no debería haber sido rechazado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <Label htmlFor="appeal-reason">
                Motivo de la apelación (mínimo 10 caracteres) *
              </Label>
              <Textarea
                id="appeal-reason"
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Explica detalladamente por qué tu anuncio debería ser aprobado..."
                rows={5}
                data-testid="textarea-appeal-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAppealDialog(false);
                setAppealReason("");
              }}
              data-testid="button-cancel-appeal"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (appealReason.length < 10) {
                  toast({
                    title: "Motivo muy corto",
                    description: "El motivo debe tener al menos 10 caracteres",
                    variant: "destructive"
                  });
                  return;
                }
                if (rejectionData?.reviewId) {
                  appealMutation.mutate({
                    reviewId: rejectionData.reviewId,
                    reason: appealReason
                  });
                }
              }}
              disabled={appealMutation.isPending || appealReason.length < 10}
              data-testid="button-submit-appeal"
            >
              {appealMutation.isPending ? "Enviando..." : "Enviar Apelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
