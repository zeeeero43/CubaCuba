import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Save, Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PremiumOption = {
  id: string;
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  durationDays: number;
  order: number;
  active: string; // "true" | "false"
  createdAt: string;
};

export default function AdminPremiumPage() {
  const { toast } = useToast();
  const [editedFeatures, setEditedFeatures] = useState<Record<string, Partial<PremiumOption>>>({});

  const { data: features, isLoading } = useQuery<PremiumOption[]>({
    queryKey: ["/api/admin/premium-features"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PremiumOption> }) => {
      const res = await apiRequest("PUT", `/api/admin/premium-features/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/premium-features"] });
      setEditedFeatures({});
      toast({
        title: "Erfolgreich gespeichert",
        description: "Das Premium-Feature wurde aktualisiert",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (featureId: string, currentActive: string) => {
    const newActive = currentActive === "true" ? "false" : "true";
    updateMutation.mutate({ 
      id: featureId, 
      updates: { active: newActive } 
    });
  };

  const handlePriceChange = (featureId: string, value: string) => {
    setEditedFeatures(prev => ({
      ...prev,
      [featureId]: { ...prev[featureId], price: value }
    }));
  };

  const handleDurationChange = (featureId: string, value: string) => {
    setEditedFeatures(prev => ({
      ...prev,
      [featureId]: { ...prev[featureId], durationDays: parseInt(value) || 0 }
    }));
  };

  const handleSave = (featureId: string) => {
    const updates = editedFeatures[featureId];
    if (updates) {
      updateMutation.mutate({ id: featureId, updates });
    }
  };

  const hasChanges = (featureId: string) => {
    return editedFeatures[featureId] !== undefined;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Premium-Features
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Verwalte Premium-Features, Preise und Verfügbarkeit
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Feature-Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-left py-3 px-4">Beschreibung</th>
                    <th className="text-left py-3 px-4">Preis (CUP)</th>
                    <th className="text-left py-3 px-4">Laufzeit (Tage)</th>
                    <th className="text-center py-3 px-4">Aktiv</th>
                    <th className="text-center py-3 px-4">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {features?.map((feature) => {
                    const currentPrice = editedFeatures[feature.id]?.price !== undefined 
                      ? editedFeatures[feature.id].price 
                      : feature.price;
                    const currentDuration = editedFeatures[feature.id]?.durationDays !== undefined
                      ? editedFeatures[feature.id].durationDays
                      : feature.durationDays;

                    return (
                      <tr 
                        key={feature.id} 
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                        data-testid={`row-feature-${feature.code}`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium">{feature.name}</div>
                          <div className="text-xs text-gray-500">{feature.code}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {feature.description}
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            step="0.01"
                            value={currentPrice}
                            onChange={(e) => handlePriceChange(feature.id, e.target.value)}
                            className="w-24"
                            data-testid={`input-price-${feature.code}`}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            value={currentDuration}
                            onChange={(e) => handleDurationChange(feature.id, e.target.value)}
                            className="w-20"
                            data-testid={`input-duration-${feature.code}`}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Switch
                            checked={feature.active === "true"}
                            onCheckedChange={() => handleToggle(feature.id, feature.active)}
                            data-testid={`switch-active-${feature.code}`}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasChanges(feature.id) && (
                            <Button
                              size="sm"
                              onClick={() => handleSave(feature.id)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-${feature.code}`}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Speichern
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature-Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features?.map((feature) => (
                <div 
                  key={feature.id}
                  className={`p-4 rounded-lg border ${
                    feature.active === "true" 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                  data-testid={`status-card-${feature.code}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-sm text-gray-500">{feature.price} CUP</div>
                    </div>
                    {feature.active === "true" ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment-Vorbereitung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Stripe & PayPal Integration</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Die Datenbank ist bereits für Stripe und PayPal vorbereitet. 
                Die <code>premium_transactions</code> Tabelle enthält Spalten für:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>paymentMethod: 'stripe' | 'paypal' | 'pending'</li>
                <li>stripePaymentIntentId: Stripe Payment Intent</li>
                <li>paypalOrderId: PayPal Order ID</li>
                <li>paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
