import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Share2,
  UserPlus,
  UserMinus,
  Star,
  Search,
  MapPin,
  Calendar,
  Eye
} from "lucide-react";
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

export default function UserProfilePage() {
  const [, params] = useRoute("/profile/:userId");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const userId = params?.userId;

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<SellerProfile>({
    queryKey: ['/api/users', userId, 'public'],
    enabled: !!userId,
  });

  // Fetch user's listings
  const { data: listingsData, isLoading: listingsLoading } = useQuery<{
    listings: Listing[];
    totalCount: number;
  }>({
    queryKey: [`/api/listings?sellerId=${userId}&pageSize=100`],
    enabled: !!userId,
  });

  const listings = listingsData?.listings || [];

  // Fetch ratings
  const { data: ratingsData } = useQuery<RatingsData>({
    queryKey: ['/api/users', userId, 'ratings'],
    enabled: !!userId,
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/users/${userId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'public'] });
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
    mutationFn: () => apiRequest('DELETE', `/api/users/${userId}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'public'] });
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

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Perfil de ${profile?.user.name} en Rico-Cuba`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Enlace copiado al portapapeles" });
      } catch (err) {
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        });
      }
    }
  };

  // Filter listings by search query
  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Usuario no encontrado</p>
          <Button className="mt-4" onClick={() => setLocation("/")}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const joinDate = new Date(profile.user.createdAt).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  const isOwnProfile = user?.id === userId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Perfil</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            data-testid="button-share-profile"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-primary">
                  {profile.user.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* User Info */}
              <h2 className="text-2xl font-bold mb-2" data-testid="text-profile-name">
                {profile.user.name}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-profile-location">{profile.user.province}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Miembro desde {joinDate}
              </p>

              {/* Follow Button */}
              {!isOwnProfile && user && (
                <Button
                  variant={profile.isFollowing ? "outline" : "default"}
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className="w-full max-w-xs"
                  data-testid={profile.isFollowing ? "button-unfollow" : "button-follow"}
                >
                  {profile.isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Siguiendo
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Seguir
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator className="mb-6" />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary" data-testid="text-listings-count">
                  {listings.length}
                </p>
                <p className="text-sm text-muted-foreground">Anuncios</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary" data-testid="text-followers-count">
                  {profile.followersCount}
                </p>
                <p className="text-sm text-muted-foreground">Seguidores</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  <p className="text-3xl font-bold text-primary" data-testid="text-avg-rating">
                    {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '-'}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.ratingsCount} {profile.ratingsCount === 1 ? 'valoración' : 'valoraciones'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar en este perfil"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-profile"
            />
          </div>
        </div>

        {/* Listings Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Anuncios ({filteredListings.length})
          </h3>

          {listingsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-300 dark:bg-gray-600 rounded-lg mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No se encontraron anuncios" : "Este usuario no tiene anuncios"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredListings.map((listing) => (
                <Card
                  key={listing.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setLocation(`/listing/${listing.id}`)}
                  data-testid={`card-listing-${listing.id}`}
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
                    <p className="text-primary font-bold text-lg mb-2">
                      ${listing.price} {listing.priceType === 'negotiable' && (
                        <span className="text-xs text-muted-foreground font-normal">
                          negociable
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{listing.locationCity}</span>
                    </div>
                    {listing.views && listing.views > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Eye className="w-3 h-3" />
                        <span>{listing.views} vistas</span>
                      </div>
                    )}
                    {listing.status === 'premium' && (
                      <Badge variant="default" className="mt-2">
                        Premium
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Ratings Section */}
        {ratingsData && ratingsData.items.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Valoraciones ({ratingsData.total})
            </h3>
            <div className="space-y-4">
              {ratingsData.items.map((rating) => (
                <Card key={rating.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rating.score
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">
                        {new Date(rating.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-muted-foreground">{rating.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
