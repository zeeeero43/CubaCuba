import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Category } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowLeft,
  ShoppingBag,
  Wrench,
  Car,
  Building2,
  GraduationCap,
  Briefcase,
  Building,
  Package2,
  ChevronRight
} from "lucide-react";

export default function CategoriesPage() {
  const [, navigate] = useLocation();

  // Fetch hierarchical categories from API
  const { data: categoriesTree, isLoading: categoriesLoading } = useQuery<{
    mainCategories: Category[];
    subcategories: Record<string, Category[]>;
  }>({
    queryKey: ['/api/categories/tree'],
  });

  const mainCategories = categoriesTree?.mainCategories || [];
  const subcategories = categoriesTree?.subcategories || {};

  // Icon mapping
  const iconMap: Record<string, any> = {
    'ShoppingBag': ShoppingBag,
    'Wrench': Wrench,
    'Car': Car,
    'Building2': Building2,
    'GraduationCap': GraduationCap,
    'Briefcase': Briefcase,
    'Building': Building,
    'Package2': Package2,
  };

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'cyan': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    'black': { bg: 'bg-gray-100', text: 'text-gray-900', border: 'border-gray-300' },
    'yellow': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
    'green': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'white': { bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Todas las Categorías
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-md lg:max-w-6xl mx-auto px-4 py-6">
        {categoriesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-3">
            {mainCategories.map((category) => {
              const IconComponent = iconMap[category.icon] || ShoppingBag;
              const colors = colorMap[category.color] || colorMap['cyan'];
              const subs = subcategories[category.id] || [];

              return (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  className={`border ${colors.border} rounded-lg overflow-hidden ${colors.bg}`}
                  data-testid={`accordion-category-${category.id}`}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${colors.bg} border ${colors.border} rounded-lg flex items-center justify-center`}>
                        <IconComponent className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className={`font-semibold ${colors.text}`}>
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {subs.length} subcategorías
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="space-y-2 mt-2">
                      {subs.map((sub) => (
                        <Button
                          key={sub.id}
                          variant="ghost"
                          className="w-full justify-between hover:bg-white dark:hover:bg-gray-700"
                          onClick={() => navigate(`/category/${sub.id}`)}
                          data-testid={`button-subcategory-${sub.id}`}
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {sub.name}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
