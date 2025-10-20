import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye } from "lucide-react";
import { useLocation } from "wouter";
import type { Listing } from "@shared/schema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OptimizedImage } from "@/components/OptimizedImage";

interface ListingCardProps {
  listing: Listing;
  isSponsored?: boolean;
  isFavorite?: boolean;
  showFollowedBadge?: boolean;
}

export function ListingCard({ listing, isSponsored = false, isFavorite = false, showFollowedBadge = false }: ListingCardProps) {
  const [, navigate] = useLocation();
  const [localFavorite, setLocalFavorite] = useState(isFavorite);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (localFavorite) {
        await apiRequest('DELETE', `/api/favorites/${listing.id}`);
      } else {
        await apiRequest('POST', `/api/favorites/${listing.id}`);
      }
    },
    onMutate: () => {
      setLocalFavorite(!localFavorite);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
    onError: () => {
      setLocalFavorite(!localFavorite);
    }
  });

  const handleCardClick = () => {
    navigate(`/listing/${listing.id}`);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate();
  };

  const formatPrice = (listing: Listing): string => {
    if (!listing.price) {
      return "Precio a consultar";
    }
    return `${listing.price} ${listing.currency || "CUP"}`;
  };

  const imageUrl = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center';

  const imageCount = listing.images?.length || 0;

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all overflow-hidden group ${
        isSponsored ? 'ring-2 ring-yellow-500 dark:ring-yellow-400' : ''
      }`}
      onClick={handleCardClick}
      data-testid={`card-listing-${listing.id}`}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <OptimizedImage
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
        />

        {/* TOP Badge for sponsored/premium */}
        {isSponsored && (
          <Badge 
            className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1"
            data-testid={`badge-sponsored-${listing.id}`}
          >
            TOP
          </Badge>
        )}

        {/* Followed Badge */}
        {showFollowedBadge && (
          <Badge 
            className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1"
            data-testid={`badge-followed-${listing.id}`}
          >
            Seguido
          </Badge>
        )}

        {/* Favorite Icon */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow-sm"
          data-testid={`button-favorite-${listing.id}`}
        >
          <Heart 
            className={`w-4 h-4 ${localFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
          />
        </button>

        {/* Image Count */}
        {imageCount > 1 && (
          <Badge 
            className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5"
            data-testid={`badge-images-${listing.id}`}
          >
            {imageCount}
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3">
        {/* Location */}
        <p 
          className="text-xs text-gray-500 dark:text-gray-400 mb-1 line-clamp-1"
          data-testid={`text-location-${listing.id}`}
        >
          {listing.locationCity || 'Sin ubicación'}
        </p>

        {/* Title */}
        <h3 
          className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2"
          data-testid={`text-title-${listing.id}`}
        >
          {listing.title}
        </h3>

        {/* Price */}
        <p 
          className="font-bold text-primary text-lg"
          data-testid={`text-price-${listing.id}`}
        >
          {formatPrice(listing)}
        </p>

        {/* Views (optional) */}
        {listing.views !== undefined && (
          <div 
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1"
            data-testid={`text-views-${listing.id}`}
          >
            <Eye className="w-3 h-3" />
            {listing.views}
          </div>
        )}
      </div>
    </Card>
  );
}
