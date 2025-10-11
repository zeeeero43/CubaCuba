import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
  Flag,
  UserPlus,
  UserMinus,
  Edit,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import type { Listing, Category } from "@shared/schema";
import { ReportDialog } from "@/components/ReportDialog";
import { PremiumFeaturesSelector } from "@/components/PremiumFeaturesSelector";

// Types for seller profile
interface SellerProfile {
  user: {
    id: string;
    name: string;
    createdAt: string;
  };
  followersCount: number;
  followingCount: number;
  avgRating: number;
  ratingsCount: number;
  isFollowing: boolean;
}

// Types for ratings
interface Rating {
  id: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

interface RatingsData {
  items: Rating[];
  total: number;
  avg: number;
}

// Helper function to format price display
function formatPrice(listing: Listing): string {
  if (!listing.price) {
    return "Precio a consultar";
  }
  return `${listing.price} ${listing.currency || "CUP"}`;
}

// Similar Listings Component
function SimilarListings({ categoryId, currentListingId }: { categoryId: string; currentListingId: string }) {
  const [, setLocation] = useLocation();

  // Fetch similar listings from same category
  const { data: listingsData, isLoading } = useQuery<{
    listings: Listing[];
    totalCount: number;
  }>({
    queryKey: [`/api/listings?categoryId=${categoryId}&pageSize=6`],
    enabled: !!categoryId,
  });

  const similarListings = listingsData?.listings.filter(l => l.id !== currentListingId).slice(0, 4) || [];

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Anuncios similares</h2>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-300 dark:bg-gray-600 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (similarListings.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Anuncios similares</h2>
      <div className="grid grid-cols-2 gap-4">
        {similarListings.map((listing) => (
          <Card
            key={listing.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation(`/listing/${listing.id}`)}
            data-testid={`similar-listing-${listing.id}`}
          >
            <div className="aspect-square overflow-hidden rounded-t-lg">
              <img
                src={listing.images?.[0] || '/placeholder.jpg'}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-3">
              <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                {listing.title}
              </h4>
              <p className="text-primary font-bold text-base">
                {formatPrice(listing)}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{listing.locationCity}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Seller Info Component
function SellerInfo({ 
  sellerId, 
  currentUserId,
  contactPhone,
  contactWhatsApp,
  onContact,
  onReport
}: { 
  sellerId: string; 
  currentUserId?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  onContact?: (type: 'phone' | 'whatsapp') => void;
  onReport?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch seller profile
  const { data: profile, isLoading } = useQuery<SellerProfile>({
    queryKey: ['/api/users', sellerId, 'public'],
    enabled: !!sellerId,
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/users/${sellerId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', sellerId, 'public'] });
      toast({ title: "Ahora sigues a este vendedor" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para seguir vendedores",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/users/${sellerId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', sellerId, 'public'] });
      toast({ title: "Has dejado de seguir a este vendedor" });
    },
  });

  const handleFollowToggle = () => {
    if (profile?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  const joinDate = new Date(profile.user.createdAt).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  // Hide follow button for own listings
  const isOwnListing = currentUserId === sellerId;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div 
            className="flex-1 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => setLocation(`/profile/${sellerId}`)}
            data-testid="link-seller-profile"
          >
            <h3 className="font-semibold text-lg" data-testid="text-seller-name">
              {profile.user.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Miembro desde {joinDate}
            </p>
          </div>
          {!isOwnListing && currentUserId && (
            <Button
              size="sm"
              variant={profile.isFollowing ? "outline" : "default"}
              onClick={handleFollowToggle}
              disabled={followMutation.isPending || unfollowMutation.isPending}
              data-testid={profile.isFollowing ? "button-unfollow" : "button-follow"}
            >
              {profile.isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-1" />
                  Siguiendo
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Seguir
                </>
              )}
            </Button>
          )}
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary" data-testid="text-followers-count">
              {profile.followersCount}
            </p>
            <p className="text-xs text-muted-foreground">Seguidores</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary" data-testid="text-following-count">
              {profile.followingCount}
            </p>
            <p className="text-xs text-muted-foreground">Siguiendo</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <p className="text-2xl font-bold text-primary" data-testid="text-avg-rating">
                {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '-'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {profile.ratingsCount} {profile.ratingsCount === 1 ? 'valoración' : 'valoraciones'}
            </p>
          </div>
        </div>

        {/* Contact Buttons */}
        {contactPhone && onContact && (
          <>
            <Separator />
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => onContact('phone')}
                data-testid="button-call"
              >
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </Button>
              
              {contactWhatsApp === "true" && (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => onContact('whatsapp')}
                  data-testid="button-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              )}

              <div className="pt-2 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Teléfono de contacto
                </p>
                <p className="font-mono text-sm" data-testid="text-phone">
                  {contactPhone}
                </p>
              </div>
              
              {/* Report Button */}
              <Button
                variant="outline"
                className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                onClick={onReport}
                data-testid="button-report"
              >
                <Flag className="w-4 h-4 mr-2" />
                Reportar Anuncio
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Ratings Component
function SellerRatings({ sellerId, currentUserId }: { sellerId: string; currentUserId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedScore, setSelectedScore] = useState(5);
  const [comment, setComment] = useState("");

  // Fetch ratings
  const { data: ratingsData, isLoading } = useQuery<RatingsData>({
    queryKey: ['/api/users', sellerId, 'ratings'],
    enabled: !!sellerId,
  });

  // Submit rating mutation
  const submitRatingMutation = useMutation({
    mutationFn: () => 
      apiRequest('POST', `/api/users/${sellerId}/ratings`, {
        score: selectedScore,
        comment: comment.trim() || null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', sellerId, 'ratings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', sellerId, 'public'] });
      toast({ title: "Valoración enviada exitosamente" });
      setShowRatingForm(false);
      setComment("");
      setSelectedScore(5);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la valoración",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    submitRatingMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ratings = ratingsData?.items || [];
  const avgRating = ratingsData?.avg || 0;
  const totalRatings = ratingsData?.total || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Valoraciones</h2>
        {currentUserId && currentUserId !== sellerId && !showRatingForm && (
          <Button
            size="sm"
            onClick={() => setShowRatingForm(true)}
            data-testid="button-add-rating"
          >
            <Star className="w-4 h-4 mr-1" />
            Valorar
          </Button>
        )}
      </div>

      {/* Rating Summary */}
      {totalRatings > 0 && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center mb-1">
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                <span className="text-3xl font-bold" data-testid="text-rating-avg">
                  {avgRating.toFixed(1)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {totalRatings} {totalRatings === 1 ? 'valoración' : 'valoraciones'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rating Form */}
      {showRatingForm && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tu calificación</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setSelectedScore(score)}
                      className="p-1"
                      data-testid={`button-star-${score}`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          score <= selectedScore
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Comentario (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte tu experiencia..."
                  className="w-full p-2 border rounded-md min-h-[100px] bg-background"
                  maxLength={500}
                  data-testid="textarea-rating-comment"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {comment.length}/500 caracteres
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitRatingMutation.isPending}
                  data-testid="button-submit-rating"
                >
                  {submitRatingMutation.isPending ? "Enviando..." : "Enviar valoración"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRatingForm(false);
                    setComment("");
                    setSelectedScore(5);
                  }}
                  data-testid="button-cancel-rating"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ratings List */}
      {ratings.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aún no hay valoraciones</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ratings.slice(0, 5).map((rating) => (
            <Card key={rating.id} data-testid={`card-rating-${rating.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rating.score
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rating.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {rating.comment && (
                  <p className="text-sm text-foreground" data-testid={`text-rating-comment-${rating.id}`}>
                    {rating.comment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingDetailPage() {
  const [match, params] = useRoute("/listing/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [selectedPremiumFeatures, setSelectedPremiumFeatures] = useState<string[]>([]);

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
    onSuccess: () => {
      // Refetch listing to update view count
      queryClient.invalidateQueries({ queryKey: ['/api/listings', listingId] });
    },
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

  // Purchase premium features
  const purchasePremiumMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/listings/${listingId}/premium`, { 
        featureIds: selectedPremiumFeatures 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Funciones premium activadas!",
        description: "Tu anuncio ahora tiene funciones premium activas.",
      });
      // Invalidate all relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/listings', listingId] });
      queryClient.invalidateQueries({ queryKey: ['/api/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/listings'] });
      setPremiumDialogOpen(false);
      setSelectedPremiumFeatures([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error al activar funciones premium",
        description: error.message || "Hubo un problema al activar las funciones premium",
        variant: "destructive"
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
      // Remove any non-numeric characters from phone number
      let cleanPhone = listing.contactPhone.replace(/\D/g, '');
      // If number starts with 5 and is 8 digits (Cuban mobile), add country code 53
      if (cleanPhone.length === 8 && cleanPhone.startsWith('5')) {
        cleanPhone = '53' + cleanPhone;
      }
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
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
    const priceDisplay = formatPrice(listing);
    const safePrice = escapeHtml(priceDisplay);
    
    const conditionText = listing.condition === 'new' ? 'Nuevo' : 
                         listing.condition === 'used' ? 'Usado - Buen estado' : 'Usado - Con defectos';
    const priceTypeText = listing.price ? (listing.priceType === 'negotiable' ? '(Negociable)' : '(Precio fijo)') : '';

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
          <div class="price">${safePrice} ${priceTypeText}</div>
          
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
            {user?.id === listing.sellerId && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(`/edit-listing/${listing.id}`)}
                  data-testid="button-edit-listing"
                >
                  <Edit className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setPremiumDialogOpen(true)}
                  data-testid="button-promote-listing"
                  className="text-primary hover:text-primary"
                >
                  <Sparkles className="w-5 h-5" />
                </Button>
              </>
            )}
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
              className="bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center min-h-[300px] max-h-[500px]"
              onClick={() => setImageDialogOpen(true)}
              data-testid="image-container"
            >
              <img
                src={listing.images[currentImageIndex]}
                alt={`Imagen ${currentImageIndex + 1} de ${listing.title}`}
                className="w-full h-auto max-h-[500px] object-contain"
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
                  {formatPrice(listing)}
                </span>
                {listing.price && (
                  <Badge variant={listing.priceType === 'negotiable' ? 'secondary' : 'outline'}>
                    {listing.priceType === 'negotiable' ? 'Negociable' : 'Precio fijo'}
                  </Badge>
                )}
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
                  {listing.views || 0} vistas
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

            <Separator />

            {listing.categoryId && (
              <>
                <Separator />

                {/* Similar Listings */}
                <SimilarListings categoryId={listing.categoryId} currentListingId={listing.id} />
              </>
            )}
          </div>

          {/* Contact Sidebar */}
          <div className="space-y-4">
            {/* Seller Info with Contact */}
            <SellerInfo 
              sellerId={listing.sellerId} 
              currentUserId={user?.id}
              contactPhone={listing.contactPhone}
              contactWhatsApp={listing.contactWhatsApp}
              onContact={handleContact}
              onReport={() => setReportDialogOpen(true)}
            />

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

      {/* Premium Features Dialog */}
      <Dialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Promocionar Anuncio
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
            <PremiumFeaturesSelector
              selectedFeatures={selectedPremiumFeatures}
              onSelectionChange={setSelectedPremiumFeatures}
            />
          </div>
          <div className="flex gap-2 justify-end flex-shrink-0 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setPremiumDialogOpen(false);
                setSelectedPremiumFeatures([]);
              }}
              data-testid="button-cancel-premium"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => purchasePremiumMutation.mutate()}
              disabled={selectedPremiumFeatures.length === 0 || purchasePremiumMutation.isPending}
              data-testid="button-confirm-premium"
            >
              {purchasePremiumMutation.isPending ? "Activando..." : "Activar Premium"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        targetType="listing"
        targetId={listingId || ""}
      />
    </div>
  );
}