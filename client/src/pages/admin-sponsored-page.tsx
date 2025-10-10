import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { SponsoredListing, InsertSponsoredListing, Listing, Category } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface SponsoredListingWithDetails extends SponsoredListing {
  listing: Listing;
  category?: Category | null;
}

export default function AdminSponsoredPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsoredListingWithDetails | null>(null);
  const [deletingSponsor, setDeletingSponsor] = useState<SponsoredListingWithDetails | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    listingId: "",
    categoryId: "",
    displayOrder: 0,
  });

  // Fetch all sponsored listings
  const { data: sponsoredListings, isLoading: isLoadingSponsored } = useQuery<SponsoredListingWithDetails[]>({
    queryKey: ["/api/admin/sponsored-listings"],
  });

  // Fetch all active listings for dropdown
  const { data: allListings, isLoading: isLoadingListings } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery<{ mainCategories: Category[]; subcategories: Record<string, Category[]> }>({
    queryKey: ["/api/categories/tree"],
  });

  const allCategories = [
    ...(categoriesData?.mainCategories || []),
    ...Object.values(categoriesData?.subcategories || {}).flat()
  ];

  // Create sponsored listing mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertSponsoredListing) => {
      const response = await apiRequest("POST", "/api/admin/sponsored-listings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sponsored-listings"] });
      toast({ title: "Gesponserte Anzeige erfolgreich erstellt" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Erstellen", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update sponsored listing mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSponsoredListing> }) => {
      const response = await apiRequest("PUT", `/api/admin/sponsored-listings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sponsored-listings"] });
      toast({ title: "Gesponserte Anzeige erfolgreich aktualisiert" });
      setEditingSponsor(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Aktualisieren", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete sponsored listing mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/sponsored-listings/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sponsored-listings"] });
      toast({ title: "Gesponserte Anzeige erfolgreich gelöscht" });
      setDeletingSponsor(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Fehler beim Löschen", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      listingId: "",
      categoryId: "",
      displayOrder: 0,
    });
    setExpiryDate(undefined);
  };

  const handleSubmit = () => {
    if (!formData.listingId) {
      toast({
        title: "Listing erforderlich",
        description: "Bitte wählen Sie ein Listing aus",
        variant: "destructive",
      });
      return;
    }

    if (!expiryDate) {
      toast({
        title: "Ablaufdatum erforderlich",
        description: "Bitte wählen Sie ein Ablaufdatum",
        variant: "destructive",
      });
      return;
    }

    const sponsorData: InsertSponsoredListing = {
      listingId: formData.listingId,
      categoryId: formData.categoryId || undefined,
      expiresAt: expiryDate,
      displayOrder: formData.displayOrder,
      isActive: "true",
    };

    if (editingSponsor) {
      updateMutation.mutate({ id: editingSponsor.id, data: sponsorData });
    } else {
      createMutation.mutate(sponsorData);
    }
  };

  const handleEdit = (sponsor: SponsoredListingWithDetails) => {
    setEditingSponsor(sponsor);
    setFormData({
      listingId: sponsor.listingId,
      categoryId: sponsor.categoryId || "",
      displayOrder: sponsor.displayOrder,
    });
    setExpiryDate(new Date(sponsor.expiresAt));
  };

  const getStatusBadge = (sponsor: SponsoredListingWithDetails) => {
    const now = new Date();
    const expiryDate = new Date(sponsor.expiresAt);
    
    if (sponsor.isActive === "false") {
      return <Badge variant="secondary" data-testid={`badge-status-${sponsor.id}`}>Inaktiv</Badge>;
    }
    
    if (expiryDate < now) {
      return <Badge variant="destructive" data-testid={`badge-status-${sponsor.id}`}>Abgelaufen</Badge>;
    }
    
    return <Badge variant="default" className="bg-green-500" data-testid={`badge-status-${sponsor.id}`}>Aktiv</Badge>;
  };

  if (isLoadingSponsored || isLoadingListings) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Lade gesponserte Anzeigen...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Star className="w-8 h-8 text-yellow-500" />
              Gesponserte Anzeigen
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Verwalten Sie gesponserte Listings für erhöhte Sichtbarkeit
            </p>
          </div>
          <Dialog 
            open={isCreateOpen} 
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-create-sponsored">
                <Plus className="w-4 h-4 mr-2" />
                Neues Sponsoring
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Neue gesponserte Anzeige erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Listing auswählen *</Label>
                  <Select 
                    value={formData.listingId} 
                    onValueChange={(value) => setFormData({ ...formData, listingId: value })}
                  >
                    <SelectTrigger data-testid="select-listing">
                      <SelectValue placeholder="Wählen Sie ein Listing" />
                    </SelectTrigger>
                    <SelectContent>
                      {allListings
                        ?.filter(listing => listing.status === "active" && listing.isPublished === "true")
                        .map((listing) => (
                          <SelectItem key={listing.id} value={listing.id}>
                            {listing.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Kategorie (optional)</Label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Keine Kategorie (Global)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Keine Kategorie (Global)</SelectItem>
                      {allCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Wenn leer, wird das Listing global gesponsert
                  </p>
                </div>

                <div>
                  <Label>Ablaufdatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="button-select-expiry-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expiryDate ? format(expiryDate, "PPP", { locale: de }) : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expiryDate}
                        onSelect={setExpiryDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Anzeigereihenfolge</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    data-testid="input-display-order"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Niedrigere Zahlen werden zuerst angezeigt
                  </p>
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit-sponsored"
                >
                  {createMutation.isPending ? "Erstelle..." : "Gesponserte Anzeige erstellen"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle gesponserten Anzeigen</CardTitle>
          </CardHeader>
          <CardContent>
            {!sponsoredListings || sponsoredListings.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Keine gesponserten Anzeigen
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Erstellen Sie Ihre erste gesponserte Anzeige
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing-Titel</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Ablaufdatum</TableHead>
                      <TableHead>Reihenfolge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sponsoredListings.map((sponsor) => (
                      <TableRow key={sponsor.id} data-testid={`row-sponsored-${sponsor.id}`}>
                        <TableCell className="font-medium" data-testid={`text-listing-title-${sponsor.id}`}>
                          {sponsor.listing?.title || "N/A"}
                        </TableCell>
                        <TableCell data-testid={`text-category-${sponsor.id}`}>
                          {sponsor.category ? (
                            <span>
                              {sponsor.category.icon} {sponsor.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">Global</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-expiry-date-${sponsor.id}`}>
                          {format(new Date(sponsor.expiresAt), "PPP", { locale: de })}
                        </TableCell>
                        <TableCell data-testid={`text-display-order-${sponsor.id}`}>
                          {sponsor.displayOrder}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sponsor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(sponsor)}
                              data-testid={`button-edit-sponsored-${sponsor.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingSponsor(sponsor)}
                              data-testid={`button-delete-sponsored-${sponsor.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {editingSponsor && (
        <Dialog open={!!editingSponsor} onOpenChange={() => {
          setEditingSponsor(null);
          resetForm();
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gesponserte Anzeige bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Listing</Label>
                <Input
                  value={editingSponsor.listing?.title || ""}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>

              <div>
                <Label>Kategorie (optional)</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue placeholder="Keine Kategorie (Global)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine Kategorie (Global)</SelectItem>
                    {allCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ablaufdatum *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-edit-expiry-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP", { locale: de }) : "Datum auswählen"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={setExpiryDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Anzeigereihenfolge</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-edit-display-order"
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full" 
                disabled={updateMutation.isPending}
                data-testid="button-update-sponsored"
              >
                {updateMutation.isPending ? "Aktualisiere..." : "Änderungen speichern"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSponsor} onOpenChange={() => setDeletingSponsor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gesponserte Anzeige löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie die gesponserte Anzeige "{deletingSponsor?.listing?.title}" wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSponsor && deleteMutation.mutate(deletingSponsor.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
