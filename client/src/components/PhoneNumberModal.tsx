import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePhoneSchema, type UpdatePhone } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const provinces = [
  { value: "havana", label: "La Habana" },
  { value: "santiago", label: "Santiago de Cuba" },
  { value: "villa-clara", label: "Villa Clara" },
  { value: "matanzas", label: "Matanzas" },
  { value: "camagüey", label: "Camagüey" },
  { value: "holguín", label: "Holguín" },
  { value: "granma", label: "Granma" },
  { value: "las-tunas", label: "Las Tunas" },
  { value: "cienfuegos", label: "Cienfuegos" },
  { value: "sancti-spiritus", label: "Sancti Spíritus" },
  { value: "ciego-de-avila", label: "Ciego de Ávila" },
  { value: "pinar-del-rio", label: "Pinar del Río" },
  { value: "artemisa", label: "Artemisa" },
  { value: "mayabeque", label: "Mayabeque" },
  { value: "isla-de-la-juventud", label: "Isla de la Juventud" },
  { value: "guantanamo", label: "Guantánamo" },
];

interface PhoneNumberModalProps {
  open: boolean;
  onClose?: () => void;
}

export function PhoneNumberModal({ open, onClose }: PhoneNumberModalProps) {
  const { toast } = useToast();
  const [selectedProvince, setSelectedProvince] = useState("");

  const form = useForm<UpdatePhone>({
    resolver: zodResolver(updatePhoneSchema),
    defaultValues: {
      phone: "",
      province: "",
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (data: UpdatePhone) => {
      const res = await apiRequest("POST", "/api/user/phone", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Teléfono agregado",
        description: "Tu número de teléfono ha sido guardado exitosamente",
      });
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar el teléfono",
      });
    },
  });

  const onSubmit = (data: UpdatePhone) => {
    updatePhoneMutation.mutate(data);
  };

  // Format phone number
  const formatPhoneNumber = (value: string) => {
    let formatted = value.replace(/[^+\d]/g, "");
    if (formatted.startsWith('+')) {
      return formatted.substring(0, 16);
    }
    return formatted.substring(0, 15);
  };

  return (
    <Dialog open={open} onOpenChange={onClose ? () => {} : undefined}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Número de teléfono requerido</DialogTitle>
          <DialogDescription className="text-center">
            Para publicar anuncios necesitamos tu número de teléfono y provincia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de teléfono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+53 5xxxxxxx"
              maxLength={16}
              {...form.register("phone", {
                onChange: (e) => {
                  e.target.value = formatPhoneNumber(e.target.value);
                }
              })}
              data-testid="input-phone-modal"
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Formato: +53 5xxxxxxx (cubano) o internacional
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Provincia</Label>
            <Select 
              onValueChange={(value) => {
                setSelectedProvince(value);
                form.setValue("province", value);
              }}
              value={selectedProvince}
            >
              <SelectTrigger data-testid="select-province-modal">
                <SelectValue placeholder="Selecciona tu provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province.value} value={province.value}>
                    {province.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.province && (
              <p className="text-sm text-destructive">{form.formState.errors.province.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={updatePhoneMutation.isPending}
            data-testid="button-submit-phone"
          >
            {updatePhoneMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
