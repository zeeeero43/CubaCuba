import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Share2,
  Heart,
  MapPin,
  Phone,
  MessageCircle,
  Calendar,
  Eye,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Flag
} from "lucide-react";
import { useLocation } from "wouter";
import type { Listing, Category } from "@shared/schema";

export default function ListingDetailPage() {
  const [match, params] = useRoute("/listing/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const listingId = params?.id;

  // Fetch listing details
  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ['/api/listings', listingId],
    enabled: !!listingId,
  });

  // Check if favorited
  const { data: favoriteData } = useQuery<{ isFavorite: boolean }>({
    queryKey: ['/api/favorites', listingId, 'check'],
    enabled: !!listingId,
  });

  const isFavorited = favoriteData?.isFavorite || false;

  // Record view when listing loads
  const recordViewMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/listings/${listingId}/view`),
  });

  // Record contact
  const recordContactMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/listings/${listingId}/contact`),
  });

  // Toggle favorite
  const toggleFavoriteMutation = useMutation({
    mutationFn: () => {
      if (isFavorited) {
        return apiRequest('DELETE', `/api/favorites/${listingId}`);
      } else {
        return apiRequest('POST', `/api/favorites/${listingId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', listingId, 'check'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings', listingId] });
      toast({
        title: isFavorited ? "Eliminado de favoritos" : "Añadido a favoritos",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para guardar favoritos",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (listing && !hasRecordedView) {
      recordViewMutation.mutate();
      setHasRecordedView(true);
    }
  }, [listing, hasRecordedView]);

  const handleContact = (type: 'phone' | 'whatsapp') => {
    if (!listing) return;

    recordContactMutation.mutate();

    if (type === 'whatsapp') {
      const message = encodeURIComponent(`Hola, estoy interesado en tu anuncio: ${listing.title}`);
      window.open(`https://wa.me/53${listing.contactPhone}?text=${message}`, '_blank');
    } else {
      window.open(`tel:${listing.contactPhone}`, '_self');
    }
  };

  const handleShareWhatsApp = () => {
    if (!listing) return;
    const url = window.location.href;
    const text = encodeURIComponent(`Mira este anuncio en Rico-Cuba: ${listing.title}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShareDialogOpen(false);
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    setShareDialogOpen(false);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Enlace copiado",
      description: "El enlace ha sido copiado al portapapeles",
    });
    setShareDialogOpen(false);
  };

  const generatePDF = () => {
    if (!listing) return;
    
    // Safe PDF generation with XSS prevention
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const safeTitle = escapeHtml(listing.title);
    const safeDescription = escapeHtml(listing.description);
    const safeCity = escapeHtml(listing.locationCity);
    const safeRegion = escapeHtml(listing.locationRegion);
    const safePhone = escapeHtml(listing.contactPhone);
    const safePrice = escapeHtml(listing.price);
    
    const conditionText = listing.condition === 'new' ? 'Nuevo' : 
                         listing.condition === 'used' ? 'Usado - Buen estado' : 'Usado - Con defectos';
    const priceTypeText = listing.priceType === 'negotiable' ? '(Negociable)' : '(Precio fijo)';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rico-Cuba - ${safeTitle}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            .price { font-size: 24px; font-weight: bold; color: #059669; }
            .details { margin: 20px 0; }
            .detail-item { margin: 5px 0; }
            .images { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
            .images img { max-width: 200px; height: auto; border: 1px solid #ddd; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${safeTitle}</h1>
          <div class="price">${safePrice} CUP ${priceTypeText}</div>
          
          <div class="details">
            <div class="detail-item"><strong>Descripción:</strong> ${safeDescription}</div>
            <div class="detail-item"><strong>Estado:</strong> ${conditionText}</div>
            <div class="detail-item"><strong>Ubicación:</strong> ${safeCity}, ${safeRegion}</div>
            <div class="detail-item"><strong>Contacto:</strong> ${safePhone}</div>
            <div class="detail-item"><strong>Fecha:</strong> ${new Date(listing.createdAt).toLocaleDateString('es-ES')}</div>
          </div>

          ${listing.images && listing.images.length > 0 ? `
            <div class="images">
              ${listing.images.map(img => {
                const safeImg = escapeHtml(img);
                return `<img src="${safeImg}" alt="Imagen del producto" />`;
              }).join('')}
            </div>
          ` : ''}
          
          <p style="margin-top: 40px; font-size: 12px; color: #666;">
            Generado desde Rico-Cuba - ${window.location.origin}
          </p>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const nextImage = () => {
    if (listing?.images && listing.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images!.length);
    }
  };

  const prevImage = () => {
    if (listing?.images && listing.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images!.length) % listing.images!.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="animate-pulse">
          <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40 p-4">
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="p-4">
            <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
            <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Anuncio no encontrado</h2>
          <p className="text-muted-foreground mb-4">El anuncio que buscas no existe o ha sido eliminado</p>
          <Button onClick={() => navigate('/')} data-testid="button-back-home">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => toggleFavoriteMutation.mutate()}
              data-testid="button-favorite"
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShareDialogOpen(true)} data-testid="button-share">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={generatePDF} data-testid="button-pdf">
              <FileDown className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Image Gallery */}
        {listing.images && listing.images.length > 0 ? (
          <div className="relative mb-6">
            <div 
              className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setImageDialogOpen(true)}
              data-testid="image-container"
            >
              <img
                src={listing.images[currentImageIndex]}
                alt={`Imagen ${currentImageIndex + 1} de ${listing.title}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'%3E%3C/path%3E%3C/svg%3E";
                }}
              />
            </div>
            
            {listing.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={prevImage}
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={nextImage}
                  data-testid="button-next-image"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-3 py-1">
                  <span className="text-white text-sm">
                    {currentImageIndex + 1} / {listing.images.length}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-6 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-2 opacity-50">
                📷
              </div>
              <p>Sin imágenes</p>
            </div>
          </div>
        )}

        {/* Thumbnail strip for multiple images */}
        {listing.images && listing.images.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {listing.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                  index === currentImageIndex
                    ? 'border-primary'
                    : 'border-transparent'
                }`}
                data-testid={`thumbnail-${index}`}
              >
                <img
                  src={image}
                  alt={`Miniatura ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Title and Price */}
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-title">
                {listing.title}
              </h1>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold text-primary" data-testid="text-price">
                  {listing.price} CUP
                </span>
                <Badge variant={listing.priceType === 'negotiable' ? 'secondary' : 'outline'}>
                  {listing.priceType === 'negotiable' ? 'Negociable' : 'Precio fijo'}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {listing.locationCity}, {listing.locationRegion}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(listing.createdAt).toLocaleDateString('es-ES')}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {(listing as any).viewCount || 0} vistas
                </span>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Descripción</h2>
              <p className="text-foreground whitespace-pre-wrap" data-testid="text-description">
                {listing.description}
              </p>
            </div>

            <Separator />

            {/* Details */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Detalles</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <p className="font-medium">
                    {listing.condition === 'new' ? 'Nuevo' : 
                     listing.condition === 'used' ? 'Usado - Buen estado' : 
                     'Usado - Con defectos'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Ubicación</span>
                  <p className="font-medium">{listing.locationCity}, {listing.locationRegion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Contactar vendedor</h3>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    onClick={() => handleContact('phone')}
                    data-testid="button-call"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Llamar
                  </Button>
                  
                  {listing.contactWhatsApp === "true" && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => handleContact('whatsapp')}
                      data-testid="button-whatsapp"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Teléfono de contacto
                  </p>
                  <p className="font-mono text-sm" data-testid="text-phone">
                    {listing.contactPhone}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-yellow-500" />
                  Consejos de seguridad
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Reúnete en lugares públicos</li>
                  <li>• Inspecciona el producto antes de pagar</li>
                  <li>• No envíes dinero por adelantado</li>
                  <li>• Confía en tu instinto</li>
                </ul>
              </CardContent>
            </Card>

            {/* Report */}
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              <Flag className="w-4 h-4 mr-2" />
              Reportar anuncio
            </Button>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir anuncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleShareWhatsApp}
              data-testid="button-share-whatsapp"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Compartir por WhatsApp
            </Button>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleShareFacebook}
              data-testid="button-share-facebook"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Compartir en Facebook
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={handleCopyLink}
              data-testid="button-copy-link"
            >
              <FileDown className="w-5 h-5 mr-2" />
              Copiar enlace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>
              Imagen {currentImageIndex + 1} de {listing.images?.length || 0}
            </DialogTitle>
          </DialogHeader>
          <div className="relative bg-black">
            <img
              src={listing.images?.[currentImageIndex]}
              alt={`Imagen ${currentImageIndex + 1} de ${listing.title}`}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            {listing.images && listing.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}