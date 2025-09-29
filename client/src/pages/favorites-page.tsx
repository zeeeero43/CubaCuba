import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Heart, Package, Eye, MapPin } from "lucide-react";
import type { Listing } from "@shared/schema";

export default function FavoritesPage() {
  const { data: favorites = [], isLoading } = useQuery<Listing[]>({
    queryKey: ['/api/favorites'],
  });

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case 'new':
        return <Badge className="bg-green-500">Nuevo</Badge>;
      case 'used':
        return <Badge className="bg-blue-500">Usado</Badge>;
      case 'defective':
        return <Badge className="bg-orange-500">Con defectos</Badge>;
      default:
        return <Badge>{condition}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" asChild>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Mis Favoritos</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando favoritos...</p>
          </div>
        ) : favorites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No tienes favoritos</h3>
              <p className="text-muted-foreground mb-6">
                Guarda anuncios que te interesen para verlos aquí más tarde
              </p>
              <Link href="/" asChild>
                <Button data-testid="button-browse-listings">
                  Explorar anuncios
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {favorites.map((listing) => (
              <Link key={listing.id} href={`/listing/${listing.id}`} asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" data-testid={`card-favorite-${listing.id}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      {listing.images && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-10 h-10 text-gray-400" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                          {listing.title}
                        </h3>
                        <p className="text-2xl font-bold text-primary mb-2">
                          ${listing.price} <span className="text-sm font-normal text-muted-foreground">{listing.currency}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {getConditionBadge(listing.condition)}
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="w-3 h-3 mr-1" />
                            {listing.locationCity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {listing.views || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {listing.favorites || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
