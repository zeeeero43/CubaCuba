import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Flag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "listing" | "user";
  targetId: string;
};

export function ReportDialog({ 
  open, 
  onOpenChange, 
  targetType, 
  targetId 
}: ReportDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");

  const reportMutation = useMutation({
    mutationFn: async (data: { type: string; targetId: string; reason: string; description: string }) => {
      const res = await apiRequest("POST", "/api/reports", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({
        title: "Reporte enviado",
        description: `Tu reporte ha sido enviado correctamente`,
      });
      onOpenChange(false);
      setReason("");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (reason) {
      reportMutation.mutate({
        type: targetType,
        targetId,
        reason,
        description,
      });
    }
  };

  const reasonOptions = [
    { value: "spam", label: "Spam o contenido repetitivo" },
    { value: "scam", label: "Estafa o fraude" },
    { value: "inappropriate", label: "Contenido inapropiado" },
    { value: "duplicate", label: "Anuncio duplicado" },
    { value: "other", label: "Otro motivo" },
  ];

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && !reportMutation.isPending) {
        onOpenChange(false);
        setReason("");
        setDescription("");
      }
    }}>
      <DialogContent data-testid="dialog-report">
        <DialogHeader>
          <DialogTitle>
            Reportar {targetType === "listing" ? "Anuncio" : "Usuario"}
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener la plataforma segura reportando contenido inapropiado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Flag className="h-4 w-4" />
            <AlertDescription>
              Los reportes son revisados manualmente por nuestro equipo de moderación
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="reason" className="mb-2 block">
              Motivo del reporte <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" data-testid="select-reason">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block">
              Descripción (opcional)
            </Label>
            <Textarea
              id="description"
              data-testid="textarea-description"
              placeholder="Proporciona más detalles sobre el problema..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reportMutation.isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reportMutation.isPending || !reason}
            data-testid="button-submit-report"
          >
            {reportMutation.isPending ? "Enviando..." : "Enviar Reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
