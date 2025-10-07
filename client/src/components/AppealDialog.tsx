import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AppealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  rejectionReason?: string | null;
  appealCount?: number;
};

export function AppealDialog({ 
  open, 
  onOpenChange, 
  listingId, 
  rejectionReason,
  appealCount = 0 
}: AppealDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");

  const appealMutation = useMutation({
    mutationFn: async (data: { listingId: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/moderation/appeal", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-listings"] });
      toast({
        title: "Apelación enviada",
        description: "Tu apelación ha sido enviada para revisión manual",
      });
      onOpenChange(false);
      setReason("");
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
    if (reason.trim()) {
      appealMutation.mutate({ listingId, reason });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && !appealMutation.isPending) {
        onOpenChange(false);
        setReason("");
      }
    }}>
      <DialogContent data-testid="dialog-appeal">
        <DialogHeader>
          <DialogTitle>Apelar Rechazo</DialogTitle>
          <DialogDescription>
            Explica por qué crees que este anuncio debe ser aprobado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {rejectionReason && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Razón del rechazo:</strong> {rejectionReason}
              </AlertDescription>
            </Alert>
          )}

          {appealCount > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Has apelado este anuncio {appealCount} {appealCount === 1 ? "vez" : "veces"}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Motivo de la apelación <span className="text-red-500">*</span>
            </label>
            <Textarea
              data-testid="textarea-appeal-reason"
              placeholder="Explica detalladamente por qué este anuncio cumple con las normas..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mínimo 20 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={appealMutation.isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={appealMutation.isPending || reason.trim().length < 20}
            data-testid="button-submit-appeal"
          >
            {appealMutation.isPending ? "Enviando..." : "Enviar Apelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
