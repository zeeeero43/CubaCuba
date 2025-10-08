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
        title: "Einstellungen gespeichert",
        description: "Die Änderungen wurden erfolgreich gespeichert",
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
              Moderationseinstellungen
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Passe die Parameter des Moderationssystems an
            </p>
          </div>
          <Button
            data-testid="button-save"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* AI Confidence Threshold */}
          <Card data-testid="card-ai-confidence">
            <CardHeader>
              <CardTitle>KI-Vertrauensschwelle</CardTitle>
              <CardDescription>
                Minimale Punktzahl (0-100) für automatische Genehmigung
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
                  Aktuell: {settings.ai_confidence_threshold || "70"}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Strictness Level */}
          <Card data-testid="card-strictness">
            <CardHeader>
              <CardTitle>Strenge-Level</CardTitle>
              <CardDescription>
                Wie streng das Moderationssystem arbeitet
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
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Cuba Rules Enforcement */}
          <Card data-testid="card-cuba-rules">
            <CardHeader>
              <CardTitle>Kubanische Regeln</CardTitle>
              <CardDescription>
                Durchsetzungslevel der kubanischen Vorschriften
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
                  <SelectItem value="relaxed">Entspannt</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="strict">Streng</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Max Strikes Before Ban */}
          <Card data-testid="card-max-strikes">
            <CardHeader>
              <CardTitle>Maximale Strikes vor Sperrung</CardTitle>
              <CardDescription>
                Anzahl der Verstöße bevor ein Benutzer automatisch gesperrt wird
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="1"
                max="20"
                value={settings.max_strikes_before_ban || "5"}
                onChange={(e) => updateSetting("max_strikes_before_ban", e.target.value)}
                className="w-32"
                data-testid="input-max-strikes"
              />
            </CardContent>
          </Card>

          {/* Max Appeals */}
          <Card data-testid="card-max-appeals">
            <CardHeader>
              <CardTitle>Maximale Einsprüche</CardTitle>
              <CardDescription>
                Maximal erlaubte Einsprüche pro Anzeige
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
              <CardTitle>Funktionen</CardTitle>
              <CardDescription>
                Systemfunktionen aktivieren oder deaktivieren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-approve" className="flex-1">
                  <div>
                    <p className="font-medium">Automatische Genehmigung</p>
                    <p className="text-sm text-gray-500">
                      Anzeigen mit hoher Vertrauenswürdigkeit automatisch genehmigen
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
                    <p className="font-medium">Manuelle Überprüfung erforderlich</p>
                    <p className="text-sm text-gray-500">
                      Manuelle Überprüfung für alle Anzeigen erforderlich
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
                <Label htmlFor="spam" className="flex-1">
                  <div>
                    <p className="font-medium">Spam-Erkennung</p>
                    <p className="text-sm text-gray-500">
                      Spam automatisch erkennen und blockieren
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
                    <p className="font-medium">Duplikatserkennung</p>
                    <p className="text-sm text-gray-500">
                      Doppelte Anzeigen erkennen
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
                    <p className="font-medium">Bildmoderation</p>
                    <p className="text-sm text-gray-500">
                      Bilder mit KI analysieren
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
