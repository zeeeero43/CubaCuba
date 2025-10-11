import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Lock } from "lucide-react";

const provinces = [
  "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
  "Cienfuegos", "Villa Clara", "Sancti Spíritus", "Ciego de Ávila",
  "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
  "Guantánamo", "Isla de la Juventud"
];

const profileFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").refine(
    (val) => !/\d/.test(val),
    { message: "El nombre no puede contener números" }
  ),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  province: z.string().min(1, "Debe seleccionar una provincia"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string().min(1, "Debes confirmar la nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Profile edit form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      province: user?.province || "",
    },
    values: {
      name: user?.name || "",
      email: user?.email || "",
      province: user?.province || "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormValues) => 
      apiRequest('PATCH', '/api/user/profile', data),
    onSuccess: () => {
      toast({ title: "Perfil actualizado" });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo actualizar el perfil", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Password change form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormValues) => 
      apiRequest('PATCH', '/api/user/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast({ title: "Contraseña actualizada exitosamente" });
      passwordForm.reset();
      setPasswordDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo cambiar la contraseña", 
        variant: "destructive" 
      });
    },
  });

  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

  if (!user) return <></>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Configuración" backTo="/profile" />

      <div className="max-w-md mx-auto px-6 py-6 space-y-4">
        {/* Edit Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-5 h-5" />
              Editar Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-edit-profile"
                >
                  Editar información personal
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-edit-profile">
                <DialogHeader>
                  <DialogTitle>Editar Perfil</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Tu nombre" 
                              {...field} 
                              data-testid="input-profile-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="tu@email.com" 
                              {...field} 
                              data-testid="input-profile-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-profile-province">
                                <SelectValue placeholder="Selecciona tu provincia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {provinces.map((province) => (
                                <SelectItem 
                                  key={province} 
                                  value={province}
                                  data-testid={`option-province-${province}`}
                                >
                                  {province}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditDialogOpen(false)}
                        className="flex-1"
                        data-testid="button-cancel-edit"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Cambiar Contraseña
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-change-password"
                >
                  Cambiar contraseña
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-change-password">
                <DialogHeader>
                  <DialogTitle>Cambiar Contraseña</DialogTitle>
                </DialogHeader>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña Actual</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Tu contraseña actual" 
                              {...field} 
                              data-testid="input-current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva Contraseña</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Mínimo 8 caracteres" 
                              {...field} 
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Contraseña</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Repite la nueva contraseña" 
                              {...field} 
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPasswordDialogOpen(false)}
                        className="flex-1"
                        data-testid="button-cancel-password"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-save-password"
                      >
                        {changePasswordMutation.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
