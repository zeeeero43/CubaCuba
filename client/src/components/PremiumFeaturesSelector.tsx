import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, Star, TrendingUp, Images, Award, Clock, BarChart3 } from "lucide-react";
import type { PremiumOption } from "@shared/schema";

const featureIcons: Record<string, any> = {
  "Hochschieben": ArrowUpCircle,
  "Hervorhebung": Star,
  "Top-Platzierung": TrendingUp,
  "Mehr Bilder": Images,
  "Featured-Status": Award,
  "Längere Laufzeit": Clock,
  "Statistik-Plus": BarChart3,
};

interface PremiumFeaturesSelectorProps {
  selectedFeatures: string[];
  onSelectionChange: (featureIds: string[]) => void;
  showTotal?: boolean;
}

export function PremiumFeaturesSelector({
  selectedFeatures,
  onSelectionChange,
  showTotal = true
}: PremiumFeaturesSelectorProps) {
  const [total, setTotal] = useState(0);

  const { data: features = [], isLoading } = useQuery<PremiumOption[]>({
    queryKey: ['/api/premium-features'],
  });

  // Calculate total price
  useEffect(() => {
    const selectedPrices = features
      .filter(f => selectedFeatures.includes(f.id))
      .reduce((sum, f) => sum + parseFloat(f.price), 0);
    setTotal(selectedPrices);
  }, [selectedFeatures, features]);

  const toggleFeature = (featureId: string) => {
    if (selectedFeatures.includes(featureId)) {
      onSelectionChange(selectedFeatures.filter(id => id !== featureId));
    } else {
      onSelectionChange([...selectedFeatures, featureId]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
        <div className="h-24 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay funciones premium disponibles en este momento
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {features.map((feature) => {
          const Icon = featureIcons[feature.name] || Star;
          const isSelected = selectedFeatures.includes(feature.id);
          
          return (
            <Card
              key={feature.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => toggleFeature(feature.id)}
              data-testid={`premium-feature-${feature.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleFeature(feature.id)}
                    className="mt-1"
                    data-testid={`checkbox-feature-${feature.id}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">{feature.name}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        €{parseFloat(feature.price).toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                    {feature.durationDays > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duración: {feature.durationDays} días
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showTotal && selectedFeatures.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Total</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFeatures.length} función{selectedFeatures.length !== 1 ? 'es' : ''} seleccionada{selectedFeatures.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary" data-testid="total-price">
                  €{total.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
