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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
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
              <div className="space-y-4">
                {data.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    data-testid={`activity-${log.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="mt-1">
                      <AlertTriangle className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.action}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {log.details}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(log.performedAt).toLocaleTimeString("es-CU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
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
