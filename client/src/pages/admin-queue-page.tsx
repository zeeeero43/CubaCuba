import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ban, AlertTriangle, Clock } from "lucide-react";

type RejectionLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  performedBy: string | null;
  details: string;
  createdAt: string;
  parsedDetails: {
    userId: string;
    title: string;
    confidence: number;
    reasons: string[];
    strikes: number;
  };
};

export default function AdminQueuePage() {
  const { data, isLoading } = useQuery<{ items: RejectionLog[]; total: number }>({
    queryKey: ["/api/admin/rejections"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
  });

  const reasonsInGerman: Record<string, string> = {
    "inappropriate_text": "Unangemessener Text",
    "cuba_policy_violation": "Verstoß gegen kubanische Richtlinien",
    "inappropriate_images": "Unangemessene Bilder",
    "blacklisted_content": "Gesperrte Inhalte",
    "political_content": "Politische Inhalte",
    "spam_detected": "Spam erkannt",
    "duplicate_listing": "Doppelte Anzeige",
  };

  const renderRejectionCard = (log: RejectionLog) => {
    const confidenceScore = log.parsedDetails?.confidence || 0;
    const scoreColor = confidenceScore >= 70 ? "text-green-600" : confidenceScore >= 50 ? "text-yellow-600" : "text-red-600";
    const reasons = log.parsedDetails?.reasons || [];
    const strikes = log.parsedDetails?.strikes || 0;

    return (
      <Card key={log.id} data-testid={`rejection-card-${log.id}`} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-600" />
                {log.parsedDetails?.title || "Unbekannter Titel"}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Abgelehnt: {new Date(log.createdAt).toLocaleString("de-DE")}
              </p>
            </div>
            <Badge variant="destructive">
              Strike {strikes}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">KI-Vertrauen:</span>
              <span className={`text-sm font-bold ${scoreColor}`}>
                {confidenceScore}%
              </span>
            </div>

            {reasons.length > 0 && (
              <div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Verstöße:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {reasons.map((reason, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                      {reasonsInGerman[reason] || reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {strikes >= 3 && (
              <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-xs text-orange-800 dark:text-orange-300">
                  Benutzer hat {strikes} Strikes - nähert sich der Sperre
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Live-Sperrungs-Log
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Alle DeepSeek AI-Ablehnungen in Echtzeit
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : !data?.items || data.items.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Keine Ablehnungen
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Derzeit keine Anzeigen von DeepSeek AI abgelehnt
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gesamt: {data.total} Ablehnungen
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.items.map(renderRejectionCard)}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
