import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, XCircle, Eye, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Report = {
  id: string;
  type: string;
  targetId: string;
  reportedBy: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  listing?: {
    id: string;
    title: string;
    description: string;
    price: string;
    images: string[];
    sellerId: string;
  } | null;
  reportedUser?: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolution, setResolution] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const { data: pendingData, isLoading: isPendingLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports", { status: "pending" }],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports?status=pending");
      if (!res.ok) throw new Error("Failed to fetch pending reports");
      return res.json();
    },
    enabled: activeTab === "pending",
  });

  const { data: resolvedData, isLoading: isResolvedLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/reports", { status: "resolved" }],
    queryFn: async () => {
      const res = await fetch("/api/admin/reports?status=resolved");
      if (!res.ok) throw new Error("Failed to fetch resolved reports");
      return res.json();
    },
    enabled: activeTab === "resolved",
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, resolution, action }: { reportId: string; resolution: string; action?: "dismiss" | "confirm" }) => {
      const res = await apiRequest("POST", `/api/admin/reports/${reportId}/resolve`, {
        resolution,
        action,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({
        title: "Meldung bearbeitet",
        description: "Die Meldung wurde erfolgreich bearbeitet",
      });
      setSelectedReport(null);
      setResolution("");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      scam: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      inappropriate: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      duplicate: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    };
    return colors[reason] || colors.other;
  };

  const renderReportCard = (report: Report) => (
    <Card key={report.id} data-testid={`report-card-${report.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">
              {report.type === "listing" ? "Anzeigenmeldung" : "Benutzermeldung"}
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gemeldet: {new Date(report.createdAt).toLocaleDateString("de-DE")}
            </p>
          </div>
          <Badge className={getReasonBadge(report.reason)}>
            {report.reason}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Show reported listing details */}
        {report.listing && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Gemeldete Anzeige:</p>
              <a
                href={`/listing/${report.listing.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                data-testid={`link-listing-${report.listing.id}`}
              >
                Anzeige ansehen
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {report.listing.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {report.listing.description}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Preis: ${report.listing.price}
              </p>
              {report.listing.images && report.listing.images.length > 0 && (
                <div className="flex gap-2">
                  {report.listing.images.slice(0, 3).map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Bild ${idx + 1}`}
                      className="h-16 w-16 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show reported user details */}
        {report.reportedUser && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Gemeldeter Benutzer:</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {report.reportedUser.name}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {report.reportedUser.phone}
            </p>
          </div>
        )}

        {report.description && (
          <div>
            <p className="text-sm font-medium mb-1">Beschreibung:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {report.description}
            </p>
          </div>
        )}

        {report.status === "resolved" && report.resolution && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-1">
              Lösung:
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {report.resolution}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Gelöst: {report.resolvedAt ? new Date(report.resolvedAt).toLocaleDateString("de-DE") : "-"}
            </p>
          </div>
        )}

        {report.status === "pending" && (
          <Button
            data-testid={`button-resolve-${report.id}`}
            onClick={() => setSelectedReport(report)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Meldung bearbeiten
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const isLoading = activeTab === "pending" ? isPendingLoading : isResolvedLoading;
  const items = activeTab === "pending" ? (pendingData || []) : (resolvedData || []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meldungen
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Verwalte Meldungen zu Anzeigen und Benutzern
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-reports">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Ausstehend ({pendingData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">
              Gelöst ({resolvedData?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {isPendingLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Keine ausstehenden Meldungen
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      Alle Meldungen wurden bearbeitet
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map(renderReportCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            {isResolvedLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Keine gelösten Meldungen
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map(renderReportCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => {
        if (!open && !resolveMutation.isPending) {
          setSelectedReport(null);
          setResolution("");
        }
      }}>
        <DialogContent data-testid="dialog-resolve">
          <DialogHeader>
            <DialogTitle>Meldung bearbeiten</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Typ:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedReport.type === "listing" ? "Anzeige" : "Benutzer"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Grund:</p>
                <Badge className={getReasonBadge(selectedReport.reason)}>
                  {selectedReport.reason}
                </Badge>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Beschreibung:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Lösung <span className="text-red-500">*</span>
                </label>
                <Textarea
                  data-testid="textarea-resolution"
                  placeholder="Beschreibe die ergriffenen Maßnahmen zur Lösung dieser Meldung..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReport(null);
                setResolution("");
              }}
              disabled={resolveMutation.isPending}
              data-testid="button-cancel"
              className="w-full sm:w-auto"
            >
              Abbrechen
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  if (selectedReport) {
                    resolveMutation.mutate({
                      reportId: selectedReport.id,
                      resolution: resolution || "Meldung abgelehnt - kein Verstoß festgestellt",
                      action: "dismiss",
                    });
                  }
                }}
                disabled={resolveMutation.isPending}
                data-testid="button-reject-report"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Meldung ablehnen
              </Button>
              {selectedReport?.listing && (
                <Button
                  variant="destructive"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    if (selectedReport) {
                      resolveMutation.mutate({
                        reportId: selectedReport.id,
                        resolution: resolution || "Meldung akzeptiert - Anzeige wurde entfernt",
                        action: "confirm",
                      });
                    }
                  }}
                  disabled={resolveMutation.isPending}
                  data-testid="button-accept-report"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Akzeptieren & Anzeige entfernen
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
