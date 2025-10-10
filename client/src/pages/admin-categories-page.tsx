import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical, Pencil, Trash2, Package } from "lucide-react";
import type { Category } from "@shared/schema";

interface SortableItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

function SortableItem({ category, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <span className="font-medium">{category.name}</span>
          {category.parentId && <span className="text-xs text-gray-500">(Unterkategorie)</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(category)}
          data-testid={`button-edit-category-${category.id}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(category.id)}
          data-testid={`button-delete-category-${category.id}`}
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    icon: "📦",
    parentId: "",
    color: "#10b981"
  });

  const { data: categoriesData } = useQuery<{ mainCategories: Category[]; subcategories: Record<string, Category[]> }>({
    queryKey: ["/api/categories/tree"],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allCategories = [
    ...(categoriesData?.mainCategories || []),
    ...Object.values(categoriesData?.subcategories || {}).flat()
  ];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/admin/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories/tree"] });
      toast({ title: "Kategorie erstellt" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await apiRequest("PUT", `/api/admin/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories/tree"] });
      toast({ title: "Kategorie aktualisiert" });
      setEditingCategory(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Fehler beim Aktualisieren", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/categories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories/tree"] });
      toast({ title: "Kategorie gelöscht" });
    },
    onError: () => {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    }
  });

  const reorderMutation = useMutation({
    mutationFn: async (categoryOrders: { id: string; order: number }[]) => {
      const response = await apiRequest("POST", "/api/admin/categories/reorder", { categoryOrders });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories/tree"] });
      toast({ title: "Reihenfolge gespeichert" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = allCategories.findIndex((c) => c.id === active.id);
      const newIndex = allCategories.findIndex((c) => c.id === over.id);
      
      const newOrder = arrayMove(allCategories, oldIndex, newIndex);
      const categoryOrders = newOrder.map((cat, index) => ({ id: cat.id, order: index }));
      
      reorderMutation.mutate(categoryOrders);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", icon: "📦", parentId: "", color: "#10b981" });
  };

  const handleSubmit = () => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
            Kategorien-Verwaltung
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Kategorien per Drag & Drop sortieren
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-category">
              <Plus className="w-4 h-4 mr-2" />
              Neue Kategorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neue Kategorie erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Kategorie-Name"
                  data-testid="input-category-name"
                />
              </div>
              <div>
                <Label>Icon (Emoji)</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📦"
                  data-testid="input-category-icon"
                />
              </div>
              <div>
                <Label>Farbe</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  data-testid="input-category-color"
                />
              </div>
              <div>
                <Label>Übergeordnete Kategorie (optional)</Label>
                <Select value={formData.parentId} onValueChange={(value) => setFormData({ ...formData, parentId: value })}>
                  <SelectTrigger data-testid="select-parent-category">
                    <SelectValue placeholder="Keine (Hauptkategorie)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Keine (Hauptkategorie)</SelectItem>
                    {categoriesData?.mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full" data-testid="button-submit-category">
                {createMutation.isPending ? "Erstelle..." : "Kategorie erstellen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Kategorien</CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allCategories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {allCategories.map((category) => (
                  <SortableItem
                    key={category.id}
                    category={category}
                    onEdit={(cat) => {
                      setEditingCategory(cat);
                      setFormData({
                        name: cat.name,
                        icon: cat.icon,
                        parentId: cat.parentId || "",
                        color: cat.color
                      });
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kategorie bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-edit-category-name"
                />
              </div>
              <div>
                <Label>Icon (Emoji)</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  data-testid="input-edit-category-icon"
                />
              </div>
              <div>
                <Label>Farbe</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  data-testid="input-edit-category-color"
                />
              </div>
              <Button onClick={handleSubmit} className="w-full" data-testid="button-update-category">
                {updateMutation.isPending ? "Aktualisiere..." : "Änderungen speichern"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
