import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, Shield, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type User = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isVerified: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "block" | "unblock" }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/${action}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Usuario actualizado",
        description: "El estado del usuario ha sido actualizado",
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

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.includes(searchTerm) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Administra usuarios y permisos
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="input-search"
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  No se encontraron usuarios
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Intenta con otro término de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredUsers.map((user) => (
              <Card key={user.id} data-testid={`user-card-${user.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{user.name}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {user.phone}
                      </p>
                      {user.email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 flex flex-col items-end">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Admin" : "Usuario"}
                      </Badge>
                      {user.isVerified === "true" && (
                        <Badge variant="outline" className="text-xs">
                          Verificado
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Registrado: {new Date(user.createdAt).toLocaleDateString("es-CU")}
                  </div>
                  
                  {user.role !== "admin" && (
                    <Button
                      data-testid={`button-block-${user.id}`}
                      onClick={() => blockMutation.mutate({ userId: user.id, action: "block" })}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={blockMutation.isPending}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Bloquear Usuario
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
