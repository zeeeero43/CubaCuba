import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Setting = {
  key: string;
  value: string;
  type: string;
  description: string;
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
  });

  // Update local state when data changes
  if (data && Object.keys(settings).length === 0) {
    const settingsMap: Record<string, string> = {};
    data.forEach((s: Setting) => { settingsMap[s.key] = s.value; });
    setSettings(settingsMap);
  }

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const res = await apiRequest("PUT", "/api/admin/settings", { settings: updates });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Configuración guardada",
        description: "Los cambios han sido guardados exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
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
              Configuración de Moderación
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Ajusta los parámetros del sistema de moderación
            </p>
          </div>
          <Button
            data-testid="button-save"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* AI Confidence Threshold */}
          <Card data-testid="card-ai-confidence">
            <CardHeader>
              <CardTitle>Umbral de Confianza IA</CardTitle>
              <CardDescription>
                Puntuación mínima (0-100) para aprobación automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.ai_confidence_threshold || "70"}
                  onChange={(e) => updateSetting("ai_confidence_threshold", e.target.value)}
                  className="w-32"
                  data-testid="input-confidence"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Actual: {settings.ai_confidence_threshold || "70"}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Strictness Level */}
          <Card data-testid="card-strictness">
            <CardHeader>
              <CardTitle>Nivel de Rigidez</CardTitle>
              <CardDescription>
                Qué tan estricto es el sistema de moderación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.strictness_level || "high"}
                onValueChange={(v) => updateSetting("strictness_level", v)}
              >
                <SelectTrigger data-testid="select-strictness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Cuba Rules Enforcement */}
          <Card data-testid="card-cuba-rules">
            <CardHeader>
              <CardTitle>Aplicación de Reglas Cubanas</CardTitle>
              <CardDescription>
                Nivel de aplicación de regulaciones cubanas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.cuba_rules_enforcement || "strict"}
                onValueChange={(v) => updateSetting("cuba_rules_enforcement", v)}
              >
                <SelectTrigger data-testid="select-cuba-rules">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">Relajado</SelectItem>
                  <SelectItem value="standard">Estándar</SelectItem>
                  <SelectItem value="strict">Estricto</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Max Appeals */}
          <Card data-testid="card-max-appeals">
            <CardHeader>
              <CardTitle>Máximo de Apelaciones</CardTitle>
              <CardDescription>
                Número máximo de apelaciones permitidas por anuncio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="0"
                max="10"
                value={settings.max_appeals_per_listing || "2"}
                onChange={(e) => updateSetting("max_appeals_per_listing", e.target.value)}
                className="w-32"
                data-testid="input-max-appeals"
              />
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card data-testid="card-features">
            <CardHeader>
              <CardTitle>Funcionalidades</CardTitle>
              <CardDescription>
                Activar o desactivar características del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-approve" className="flex-1">
                  <div>
                    <p className="font-medium">Aprobación Automática</p>
                    <p className="text-sm text-gray-500">
                      Aprobar anuncios automáticamente con alta confianza
                    </p>
                  </div>
                </Label>
                <Switch
                  id="auto-approve"
                  checked={settings.auto_approve_enabled === "true"}
                  onCheckedChange={(checked) => updateSetting("auto_approve_enabled", checked ? "true" : "false")}
                  data-testid="switch-auto-approve"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="manual-review" className="flex-1">
                  <div>
                    <p className="font-medium">Revisión Manual Requerida</p>
                    <p className="text-sm text-gray-500">
                      Requerir revisión manual para todos los anuncios
                    </p>
                  </div>
                </Label>
                <Switch
                  id="manual-review"
                  checked={settings.manual_review_required === "true"}
                  onCheckedChange={(checked) => updateSetting("manual_review_required", checked ? "true" : "false")}
                  data-testid="switch-manual-review"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="blacklist" className="flex-1">
                  <div>
                    <p className="font-medium">Lista Negra</p>
                    <p className="text-sm text-gray-500">
                      Verificar contra lista negra
                    </p>
                  </div>
                </Label>
                <Switch
                  id="blacklist"
                  checked={settings.blacklist_enabled === "true"}
                  onCheckedChange={(checked) => updateSetting("blacklist_enabled", checked ? "true" : "false")}
                  data-testid="switch-blacklist"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="spam" className="flex-1">
                  <div>
                    <p className="font-medium">Detección de Spam</p>
                    <p className="text-sm text-gray-500">
                      Detectar y bloquear spam automáticamente
                    </p>
                  </div>
                </Label>
                <Switch
                  id="spam"
                  checked={settings.spam_detection_enabled === "true"}
                  onCheckedChange={(checked) => updateSetting("spam_detection_enabled", checked ? "true" : "false")}
                  data-testid="switch-spam"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="duplicate" className="flex-1">
                  <div>
                    <p className="font-medium">Detección de Duplicados</p>
                    <p className="text-sm text-gray-500">
                      Detectar anuncios duplicados
                    </p>
                  </div>
                </Label>
                <Switch
                  id="duplicate"
                  checked={settings.duplicate_detection_enabled === "true"}
                  onCheckedChange={(checked) => updateSetting("duplicate_detection_enabled", checked ? "true" : "false")}
                  data-testid="switch-duplicate"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="image-mod" className="flex-1">
                  <div>
                    <p className="font-medium">Moderación de Imágenes</p>
                    <p className="text-sm text-gray-500">
                      Analizar imágenes con IA
                    </p>
                  </div>
                </Label>
                <Switch
                  id="image-mod"
                  checked={settings.image_moderation_enabled === "true"}
                  onCheckedChange={(checked) => updateSetting("image_moderation_enabled", checked ? "true" : "false")}
                  data-testid="switch-image-mod"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
