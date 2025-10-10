import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  action?: React.ReactNode;
  hideBack?: boolean;
}

export function PageHeader({ title, backTo = "/", action, hideBack = false }: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
        {!hideBack && (
          <Link href={backTo} asChild>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {action || <div className="w-10"></div>}
      </div>
    </div>
  );
}
