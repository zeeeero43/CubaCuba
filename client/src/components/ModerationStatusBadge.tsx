import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";

type ModerationStatusBadgeProps = {
  status: string;
  reason?: string | null;
  showIcon?: boolean;
  className?: string;
};

export function ModerationStatusBadge({ 
  status, 
  reason, 
  showIcon = true,
  className = "" 
}: ModerationStatusBadgeProps) {
  const configs = {
    approved: {
      label: "Aprobado",
      variant: "default" as const,
      className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      icon: CheckCircle,
    },
    pending: {
      label: "Pendiente",
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      icon: Clock,
    },
    rejected: {
      label: "Rechazado",
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      icon: XCircle,
    },
    flagged: {
      label: "Señalado",
      variant: "outline" as const,
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      icon: AlertTriangle,
    },
  };

  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;

  return (
    <div className={className} data-testid={`badge-status-${status}`}>
      <Badge className={config.className}>
        {showIcon && <Icon className="h-3 w-3 mr-1" />}
        {config.label}
      </Badge>
      {reason && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {reason}
        </p>
      )}
    </div>
  );
}
