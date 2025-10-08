import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListChecks,
  Flag,
  Ban,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<{
    stats: {
      totalReviews: number;
      pending: number;
      approved: number;
      rejected: number;
      appealed: number;
    };
    pendingReviews: any[];
    appealedReviews: any[];
    pendingReports: any[];
    recentLogs: Array<{
      id: string;
      action: string;
      details: string;
      performedAt: string;
    }>;
  }>({
    queryKey: ["/api/admin/dashboard"],
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statsCards = [
    {
      title: "Ausstehende Reviews",
      value: data?.stats.pending || 0,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Einsprüche",
      value: data?.stats.appealed || 0,
      icon: Flag,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      title: "Genehmigt",
      value: data?.stats.approved || 0,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Abgelehnt",
      value: data?.stats.rejected || 0,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
  ];

  const totalReviews = data?.stats.totalReviews || 0;
  const approvalRate = totalReviews > 0 
    ? Math.round(((data?.stats.approved || 0) / totalReviews) * 100)
    : 0;

  const todayStats = [
    {
      title: "Gesamt Reviews",
      value: totalReviews,
      icon: ListChecks,
    },
    {
      title: "Genehmigungsrate",
      value: `${approvalRate}%`,
      icon: CheckCircle,
    },
    {
      title: "Ausstehende Meldungen",
      value: data?.pendingReports?.length || 0,
      icon: Flag,
    },
  ];

  const getActionIcon = (action: string) => {
    if (action.includes("genehmigt") || action.includes("Genehmigt")) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (action.includes("abgelehnt") || action.includes("Abgelehnt")) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else if (action.includes("Einspruch")) {
      return <Flag className="h-5 w-5 text-orange-600" />;
    } else if (action.includes("Meldung")) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    } else if (action.includes("gelöscht") || action.includes("Gelöscht")) {
      return <Ban className="h-5 w-5 text-red-600" />;
    } else {
      return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Übersicht des Moderationssystems
          </p>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} data-testid={`card-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white" data-testid={`text-${stat.title.toLowerCase().replace(/\s+/g, "-")}-value`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Today Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {todayStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} data-testid={`card-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white" data-testid={`text-${stat.title.toLowerCase().replace(/\s+/g, "-")}-value`}>
                      {stat.value}
                    </span>
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.recentLogs || data.recentLogs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Keine aktuellen Aktivitäten
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    data-testid={`activity-${log.id}`}
                    className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {log.action}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {log.details}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap block">
                        {new Date(log.performedAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap block mt-0.5">
                        {new Date(log.performedAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
