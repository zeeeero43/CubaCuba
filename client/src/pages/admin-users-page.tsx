import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, Shield, Search, ShieldCheck, AlertTriangle, UserCheck, Edit } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type User = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isVerified: string;
  moderationStrikes: number;
  isBanned: string;
  bannedAt: string | null;
  banReason: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStrikes, setEditingStrikes] = useState<{ userId: string; currentStrikes: number } | null>(null);
  const [strikesValue, setStrikesValue] = useState(0);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "block" | "unblock" }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/${action}`, { reason: "Vom Administrator gesperrt" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Benutzer aktualisiert",
        description: "Der Benutzerstatus wurde aktualisiert",
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

  const strikesMutation = useMutation({
    mutationFn: async ({ userId, strikes }: { userId: string; strikes: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/strikes`, { strikes });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Strikes aktualisiert",
        description: "Die Strikes wurden erfolgreich aktualisiert",
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
            Benutzerverwaltung
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Verwalte Benutzer und Berechtigungen
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="input-search"
              placeholder="Suche nach Name, Telefon oder E-Mail..."
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
                  Keine Benutzer gefunden
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Versuche es mit einem anderen Suchbegriff
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
                        {user.role === "admin" ? "Admin" : "Benutzer"}
                      </Badge>
                      {user.isVerified === "true" && (
                        <Badge variant="outline" className="text-xs">
                          Verifiziert
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Registriert: {new Date(user.createdAt).toLocaleDateString("de-DE")}
                    </div>
                    
                    {/* Strikes Display */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${user.moderationStrikes > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium">
                          Strikes: {user.moderationStrikes}
                        </span>
                      </div>
                      {user.role !== "admin" && (
                        <Button
                          data-testid={`button-edit-strikes-${user.id}`}
                          onClick={() => {
                            setEditingStrikes({ userId: user.id, currentStrikes: user.moderationStrikes });
                            setStrikesValue(user.moderationStrikes);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Banned Status */}
                    {user.isBanned === "true" && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <Ban className="h-4 w-4" />
                          <span className="font-medium">Gesperrt</span>
                        </div>
                        {user.banReason && (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{user.banReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {user.role !== "admin" && (
                    <div className="flex gap-2">
                      {user.isBanned === "true" ? (
                        <Button
                          data-testid={`button-unblock-${user.id}`}
                          onClick={() => blockMutation.mutate({ userId: user.id, action: "unblock" })}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={blockMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Entsperren
                        </Button>
                      ) : (
                        <Button
                          data-testid={`button-block-${user.id}`}
                          onClick={() => blockMutation.mutate({ userId: user.id, action: "block" })}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          disabled={blockMutation.isPending}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Sperren
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Strikes Edit Dialog */}
        <Dialog open={!!editingStrikes} onOpenChange={(open) => !open && setEditingStrikes(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Strikes bearbeiten</DialogTitle>
              <DialogDescription>
                Ändere die Anzahl der Moderation Strikes für diesen Benutzer.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <label htmlFor="strikes" className="text-sm font-medium">
                  Strikes
                </label>
                <Input
                  id="strikes"
                  type="number"
                  min="0"
                  value={strikesValue}
                  onChange={(e) => setStrikesValue(parseInt(e.target.value) || 0)}
                  data-testid="input-strikes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingStrikes(null)}
                data-testid="button-cancel-strikes"
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => {
                  if (editingStrikes) {
                    strikesMutation.mutate({ userId: editingStrikes.userId, strikes: strikesValue });
                    setEditingStrikes(null);
                  }
                }}
                disabled={strikesMutation.isPending}
                data-testid="button-save-strikes"
              >
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
