import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ban, AlertTriangle, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

type AppealReview = {
  id: string;
  listingId: string;
  decision: string;
  status: string;
  aiConfidence: number;
  reasons: string[];
  appealReason: string | null;
  appealedAt: string | null;
  createdAt: string;
  listing: {
    title: string;
    description: string;
  };
};

export default function AdminQueuePage() {
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery<{ items: RejectionLog[]; total: number }>({
    queryKey: ["/api/admin/rejections"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
  });

  const { data: appealsData, isLoading: appealsLoading } = useQuery<{ items: AppealReview[]; total: number }>({
    queryKey: ["/api/admin/reviews/appealed"],
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ reviewId, decision }: { reviewId: string; decision: "approved" | "rejected" }) => {
      const res = await apiRequest("POST", `/api/admin/reviews/${reviewId}/decide`, { decision });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/appealed"] });
      toast({
        title: "Entscheidung gespeichert",
        description: "Die Entscheidung wurde erfolgreich gespeichert",
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
            Moderations-Queue
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Ablehnungen und Einsprüche verwalten
          </p>
        </div>

        <Tabs defaultValue="rejections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rejections" data-testid="tab-rejections">
              <Ban className="h-4 w-4 mr-2" />
              Live-Sperrungs-Log
            </TabsTrigger>
            <TabsTrigger value="appeals" data-testid="tab-appeals">
              <MessageSquare className="h-4 w-4 mr-2" />
              Einsprüche ({appealsData?.total || 0})
            </TabsTrigger>
          </TabsList>

          {/* Rejections Tab */}
          <TabsContent value="rejections" className="space-y-4">
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
          </TabsContent>

          {/* Appeals Tab */}
          <TabsContent value="appeals" className="space-y-4">
            {appealsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : !appealsData?.items || appealsData.items.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Keine Einsprüche
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      Keine ausstehenden Einsprüche zur Überprüfung
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gesamt: {appealsData.total} Einsprüche
                  </p>
                </div>
                <div className="grid gap-4">
                  {appealsData.items.map((appeal) => (
                    <Card key={appeal.id} data-testid={`appeal-card-${appeal.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{appeal.listing.title}</CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Einspruch: {new Date(appeal.appealedAt!).toLocaleString("de-DE")}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">
                            Ausstehend
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {appeal.appealReason && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                              Begründung des Einspruchs:
                            </p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              {appeal.appealReason}
                            </p>
                          </div>
                        )}
                        
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Ursprüngliche Ablehnung:
                          </p>
                          {appeal.reasons && appeal.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {appeal.reasons.map((reason, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20">
                                  {reasonsInGerman[reason] || reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            data-testid={`button-approve-${appeal.id}`}
                            onClick={() => decisionMutation.mutate({ reviewId: appeal.id, decision: "approved" })}
                            className="flex-1"
                            variant="default"
                            disabled={decisionMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Genehmigen
                          </Button>
                          <Button
                            data-testid={`button-reject-${appeal.id}`}
                            onClick={() => decisionMutation.mutate({ reviewId: appeal.id, decision: "rejected" })}
                            className="flex-1"
                            variant="destructive"
                            disabled={decisionMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Ablehnen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
