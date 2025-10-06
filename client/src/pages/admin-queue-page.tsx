import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, XCircle, Eye, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: string;
  listingId: string;
  status: string;
  decision: string | null;
  aiConfidenceScore: string;
  moderatorNotes: string | null;
  reviewedAt: string | null;
  appealCount: number;
  listing: {
    id: string;
    title: string;
    description: string;
    price: string;
    images: string[];
  };
  aiAnalysis: {
    textScore: number;
    flags: string[];
    concerns: string[];
  };
};

export default function AdminQueuePage() {
  const { toast } = useToast();
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const { data: pendingData, isLoading: isPendingLoading } = useQuery<{ items: Review[]; total: number }>({
    queryKey: ["/api/admin/reviews/pending"],
    enabled: activeTab === "pending",
  });

  const { data: appealData, isLoading: isAppealLoading } = useQuery<{ items: Review[]; total: number }>({
    queryKey: ["/api/admin/reviews/appealed"],
    enabled: activeTab === "appeals",
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ reviewId, decision, notes }: { reviewId: string; decision: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/admin/reviews/${reviewId}/decide`, {
        decision,
        moderatorNotes: notes,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews/appealed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Revisión completada",
        description: "La decisión ha sido registrada exitosamente",
      });
      setSelectedReview(null);
      setReviewAction(null);
      setModeratorNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReviewDecision = () => {
    if (!selectedReview || !reviewAction) return;
    reviewMutation.mutate({
      reviewId: selectedReview.id,
      decision: reviewAction === "approve" ? "approved" : "rejected",
      notes: moderatorNotes,
    });
  };

  const renderReviewCard = (review: Review) => {
    const confidenceScore = parseFloat(review.aiConfidenceScore);
    const scoreColor = confidenceScore >= 70 ? "text-green-600" : confidenceScore >= 50 ? "text-yellow-600" : "text-red-600";

    return (
      <Card key={review.id} data-testid={`review-card-${review.id}`} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{review.listing.title}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Precio: ${review.listing.price} | ID: {review.listing.id.slice(0, 8)}
              </p>
            </div>
            <Badge variant={review.status === "appealed" ? "destructive" : "secondary"}>
              {review.status === "appealed" ? `Apelación #${review.appealCount}` : "Pendiente"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {review.listing.description}
            </p>
          </div>

          {review.listing.images && review.listing.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {review.listing.images.slice(0, 3).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Imagen ${idx + 1}`}
                  className="h-20 w-20 object-cover rounded"
                />
              ))}
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confianza IA:</span>
              <span className={`text-sm font-bold ${scoreColor}`}>
                {confidenceScore.toFixed(1)}%
              </span>
            </div>

            {review.aiAnalysis && review.aiAnalysis.flags && review.aiAnalysis.flags.length > 0 && (
              <div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Señales:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {review.aiAnalysis.flags.map((flag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {review.aiAnalysis && review.aiAnalysis.concerns && review.aiAnalysis.concerns.length > 0 && (
              <div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Preocupaciones:</span>
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                  {review.aiAnalysis.concerns.map((concern, idx) => (
                    <li key={idx}>• {concern}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              data-testid={`button-review-${review.id}`}
              onClick={() => {
                setSelectedReview(review);
                setReviewAction(null);
              }}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Revisar
            </Button>
            <Button
              data-testid={`button-approve-${review.id}`}
              onClick={() => {
                setSelectedReview(review);
                setReviewAction("approve");
              }}
              variant="default"
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
            <Button
              data-testid={`button-reject-${review.id}`}
              onClick={() => {
                setSelectedReview(review);
                setReviewAction("reject");
              }}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const isLoading = activeTab === "pending" ? isPendingLoading : isAppealLoading;
  const items = activeTab === "pending" ? pendingData?.items || [] : appealData?.items || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Cola de Revisión
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Revisa y modera anuncios pendientes y apelaciones
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-queue">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pendientes ({pendingData?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="appeals" data-testid="tab-appeals">
              Apelaciones ({appealData?.total || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isPendingLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      No hay revisiones pendientes
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      Todos los anuncios han sido revisados
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map(renderReviewCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appeals" className="mt-6">
            {isAppealLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      No hay apelaciones pendientes
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      No hay usuarios apelando decisiones de moderación
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map(renderReviewCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Decision Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => {
        if (!open && !reviewMutation.isPending) {
          setSelectedReview(null);
          setReviewAction(null);
          setModeratorNotes("");
        }
      }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-review-decision">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Aprobar Anuncio" : reviewAction === "reject" ? "Rechazar Anuncio" : "Revisar Anuncio"}
            </DialogTitle>
            <DialogDescription>
              {selectedReview?.listing.title}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Descripción del Anuncio</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedReview.listing.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Análisis de IA</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Puntuación:</span>{" "}
                      <span className={`font-bold ${parseFloat(selectedReview.aiConfidenceScore) >= 70 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(selectedReview.aiConfidenceScore).toFixed(1)}%
                      </span>
                    </p>
                    {selectedReview.aiAnalysis?.concerns && selectedReview.aiAnalysis.concerns.length > 0 && (
                      <div>
                        <p className="font-medium text-red-600 dark:text-red-400">Preocupaciones:</p>
                        <ul className="mt-1 space-y-1">
                          {selectedReview.aiAnalysis.concerns.map((concern, idx) => (
                            <li key={idx}>• {concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {reviewAction && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Notas del Moderador {reviewAction === "reject" && <span className="text-red-500">*</span>}
                    </label>
                    <Textarea
                      data-testid="textarea-moderator-notes"
                      placeholder={
                        reviewAction === "approve"
                          ? "Notas opcionales sobre la aprobación..."
                          : "Explica por qué este anuncio fue rechazado..."
                      }
                      value={moderatorNotes}
                      onChange={(e) => setModeratorNotes(e.target.value)}
                      rows={4}
                      className="w-full"
                    />
                  </div>
                )}

                {reviewAction === "approve" && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800 dark:text-green-300">
                      Este anuncio será publicado y visible para todos los usuarios.
                    </div>
                  </div>
                )}

                {reviewAction === "reject" && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800 dark:text-red-300">
                      El usuario será notificado y podrá apelar esta decisión.
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {reviewAction ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewAction(null);
                    setModeratorNotes("");
                  }}
                  data-testid="button-cancel-action"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleReviewDecision}
                  disabled={reviewMutation.isPending || (reviewAction === "reject" && !moderatorNotes.trim())}
                  variant={reviewAction === "approve" ? "default" : "destructive"}
                  data-testid="button-confirm-action"
                  className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {reviewMutation.isPending
                    ? "Procesando..."
                    : reviewAction === "approve"
                    ? "Confirmar Aprobación"
                    : "Confirmar Rechazo"}
                </Button>
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReview(null)}
                  className="flex-1"
                  data-testid="button-close-dialog"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => setReviewAction("approve")}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="button-choose-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  onClick={() => setReviewAction("reject")}
                  variant="destructive"
                  className="flex-1"
                  data-testid="button-choose-reject"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
