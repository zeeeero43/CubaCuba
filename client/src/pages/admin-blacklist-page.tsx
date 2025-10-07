import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type BlacklistItem = {
  id: string;
  type: string;
  value: string;
  reason: string;
  isActive: string;
  createdAt: string;
  addedBy: string | null;
};

export default function AdminBlacklistPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({ type: "word", value: "", reason: "" });
  const [activeTab, setActiveTab] = useState("word");

  const { data: items, isLoading } = useQuery<BlacklistItem[]>({
    queryKey: [`/api/admin/blacklist?type=${activeTab}`],
  });

  const addMutation = useMutation({
    mutationFn: async (item: { type: string; value: string; reason: string }) => {
      const res = await apiRequest("POST", "/api/admin/blacklist", item);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      toast({
        title: "Item agregado",
        description: "El item ha sido agregado a la lista negra",
      });
      setShowAddDialog(false);
      setNewItem({ type: "word", value: "", reason: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/blacklist/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      toast({
        title: "Item eliminado",
        description: "El item ha sido eliminado de la lista negra",
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      word: "Palabra",
      phone: "Teléfono",
      user: "Usuario",
      email: "Email",
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Lista Negra
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gestiona contenido y usuarios prohibidos
            </p>
          </div>
          <Button
            data-testid="button-add-blacklist"
            onClick={() => {
              setNewItem({ ...newItem, type: activeTab });
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Item
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-blacklist">
            <TabsTrigger value="word" data-testid="tab-word">
              Palabras ({items?.filter(i => i.type === "word").length || 0})
            </TabsTrigger>
            <TabsTrigger value="phone" data-testid="tab-phone">
              Teléfonos ({items?.filter(i => i.type === "phone").length || 0})
            </TabsTrigger>
            <TabsTrigger value="user" data-testid="tab-user">
              Usuarios ({items?.filter(i => i.type === "user").length || 0})
            </TabsTrigger>
            <TabsTrigger value="email" data-testid="tab-email">
              Emails ({items?.filter(i => i.type === "email").length || 0})
            </TabsTrigger>
          </TabsList>

          {["word", "phone", "user", "email"].map((type) => (
            <TabsContent key={type} value={type} className="mt-6">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
              ) : !items || items.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        No hay {getTypeLabel(type).toLowerCase()}s bloqueados
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Agrega items para bloquear contenido no deseado
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {items.map((item) => (
                    <Card key={item.id} data-testid={`blacklist-item-${item.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-mono">
                              {item.value}
                            </CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(item.createdAt).toLocaleDateString("es-CU")}
                            </p>
                          </div>
                          <Badge variant={item.isActive === "true" ? "default" : "secondary"}>
                            {item.isActive === "true" ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Razón:</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.reason}
                          </p>
                        </div>
                        <Button
                          data-testid={`button-delete-${item.id}`}
                          onClick={() => deleteMutation.mutate(item.id)}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent data-testid="dialog-add-blacklist">
          <DialogHeader>
            <DialogTitle>Agregar a Lista Negra</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo <span className="text-red-500">*</span>
              </label>
              <Select value={newItem.type} onValueChange={(v) => setNewItem({ ...newItem, type: v })}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="word">Palabra</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                  <SelectItem value="user">Usuario ID</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Valor <span className="text-red-500">*</span>
              </label>
              <Input
                data-testid="input-value"
                placeholder={
                  newItem.type === "word" ? "golpe de estado" :
                  newItem.type === "phone" ? "+5354123456" :
                  newItem.type === "email" ? "user@example.com" :
                  "user-id"
                }
                value={newItem.value}
                onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Razón <span className="text-red-500">*</span>
              </label>
              <Textarea
                data-testid="textarea-reason"
                placeholder="Describe por qué este item debe estar bloqueado..."
                value={newItem.reason}
                onChange={(e) => setNewItem({ ...newItem, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => addMutation.mutate(newItem)}
              disabled={addMutation.isPending || !newItem.value.trim() || !newItem.reason.trim()}
              data-testid="button-confirm-add"
            >
              {addMutation.isPending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
