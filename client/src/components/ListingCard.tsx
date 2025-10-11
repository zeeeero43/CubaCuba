import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye } from "lucide-react";
import { useLocation } from "wouter";
import type { Listing } from "@shared/schema";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Image */}
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center';
          }}
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
          className="absolute top-2 right-2 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          data-testid={`button-favorite-${listing.id}`}
        >
          <Heart 
            className={`w-4 h-4 ${localFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} 
          />
        </button>

        {/* Image Count */}
        {imageCount > 1 && (
          <Badge 
            className="absolute bottom-14 right-2 bg-black/60 text-white text-xs px-2 py-1"
            data-testid={`badge-images-${listing.id}`}
          >
            {imageCount}
          </Badge>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Text Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-medium line-clamp-1 mb-1"
                data-testid={`text-location-${listing.id}`}
              >
                {listing.locationCity || 'Sin ubicación'}
              </p>
              <h3 
                className="text-base font-bold line-clamp-2 mb-1"
                data-testid={`text-title-${listing.id}`}
              >
                {listing.title}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p 
              className="text-lg font-bold"
              data-testid={`text-price-${listing.id}`}
            >
              {formatPrice(listing)}
            </p>
            {listing.views !== undefined && (
              <div 
                className="flex items-center gap-1 text-xs text-white/80"
                data-testid={`text-views-${listing.id}`}
              >
                <Eye className="w-3 h-3" />
                {listing.views}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
