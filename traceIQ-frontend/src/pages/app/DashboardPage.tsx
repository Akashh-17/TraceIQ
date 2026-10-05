import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/dashboard.api';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { EventsPerHourChart } from '../../components/dashboard/EventsPerHourChart';
import { DetectionTrendChart } from '../../components/dashboard/DetectionTrendChart';
import { ActionDistributionChart, TopActorsChart } from '../../components/dashboard/MockCharts';
import { LiveFeed } from '../../components/dashboard/LiveFeed';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: dashboardApi.getTrends,
  });

  const { data: detectionTrend, isLoading: detectionTrendLoading } = useQuery({
    queryKey: ['dashboard', 'detectionTrend'],
    queryFn: dashboardApi.getDetectionTrend,
  });

  const loading = statsLoading || trendsLoading || detectionTrendLoading;

  if (loading) {
    return (
      <div className="flex gap-6 h-full">
        <div className="flex-1 flex flex-col gap-10 min-w-0">
          {/* Header skeleton */}
          <div>
            <div className="h-2 w-28 skeleton mb-3" />
            <div className="h-8 w-52 skeleton" />
          </div>
          {/* KPI skeleton */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="pt-5">
                <div className="rule mb-5" />
                <div className="h-2 w-20 skeleton mb-4" />
                <div className="h-9 w-14 skeleton" />
              </div>
            ))}
          </div>
          {/* Chart skeleton */}
          <div>
            <div className="h-2 w-28 skeleton mb-6" />
            <div className="rule mb-6" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border border-border h-[280px] p-5">
                  <div className="h-2 w-24 skeleton mb-4" />
                  <div className="h-full skeleton opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-72 shrink-0 border border-border skeleton opacity-30" />
      </div>
    );
  }

  const failedLogins: number = stats?.failedLoginsToday ?? 0;

  return (
    <div className="flex gap-6 h-full animate-blur-fade-in">

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-10 min-w-0 overflow-y-auto">

        {/* Page header */}
        <div>
          <p className="kicker mb-3">01 / Security Intelligence</p>
          <h1 className="font-heading text-5xl font-medium leading-tight text-gradient">
            Security Overview
          </h1>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8">
          <KpiCard title="Total Events"        value={(stats?.totalEvents ?? 0).toLocaleString()} />
          <KpiCard title="Events Today"        value={(stats?.eventsToday ?? 0).toLocaleString()} />
          <KpiCard
            title="Failed Logins Today"
            value={failedLogins.toLocaleString()}
            trend={failedLogins > 0 ? `+${failedLogins}` : undefined}
          />
          <KpiCard title="Active Actors"       value={stats?.topActors?.length ?? 0} />
        </div>

        {/* Charts section */}
        <div className="flex flex-col gap-6">
          <div>
            <p className="kicker mb-4">02 / Activity Trends</p>
            <div className="rule" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <EventsPerHourChart data={trends ?? []} />
            <ActionDistributionChart data={stats?.topActions ?? []} />
            <DetectionTrendChart data={detectionTrend ?? []} />
            <TopActorsChart data={stats?.topActors ?? []} />
          </div>
        </div>

      </div>

      {/* Live feed */}
      <div className="w-80 shrink-0 flex flex-col">
        <LiveFeed />
      </div>

    </div>
  );
}

