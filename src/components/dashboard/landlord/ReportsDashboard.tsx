import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Home, Wrench, Calendar } from 'lucide-react';
import { ReportsChart } from '../charts/ReportsChart';
import { useReports } from '@/hooks/useReports';

export const ReportsDashboard = () => {
  const { reportData, loading } = useReports();

  if (loading || !reportData) return null;

  const kpis = [
    {
      title: 'Total Revenue',
      value: `KES ${reportData.financial.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      description: 'vs last month'
    },
    {
      title: 'Occupancy Rate',
      value: `${reportData.financial.occupancyRate}%`,
      change: '+2.1%',
      trend: 'up',
      icon: Home,
      description: 'vs last month'
    },
    {
      title: 'Maintenance Cost',
      value: `KES ${reportData.maintenance.totalMaintenanceCost.toLocaleString()}`,
      change: '-8.3%',
      trend: 'down',
      icon: Wrench,
      description: 'vs last month'
    },
    {
      title: 'Net Profit Margin',
      value: `${((reportData.financial.netProfit / reportData.financial.totalRevenue) * 100).toFixed(1)}%`,
      change: '+3.2%',
      trend: 'up',
      icon: TrendingUp,
      description: 'vs last month'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className="flex items-center mt-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${kpi.trend === 'up' ? 'text-success' : 'text-destructive'}`}
                    >
                      {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {kpi.change}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">{kpi.description}</span>
                  </div>
                </div>
                <kpi.icon className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportsChart
          data={reportData.financial}
          type="financial"
          title="Revenue vs Expenses Trend"
          description="Monthly financial performance over the last 6 months"
        />
        <ReportsChart
          data={reportData.occupancy}
          type="occupancy"
          title="Property Occupancy Rates"
          description="Occupancy rates across all properties"
        />
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Collection Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Rent Collection Rate</span>
                <span className="font-semibold">94.2%</span>
              </div>
              <Progress value={94.2} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Above industry average of 89%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Maintenance Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Average Response Time</span>
                <span className="font-semibold">{reportData.maintenance.averageResponseTime} days</span>
              </div>
              <Progress value={Math.max(0, 100 - (reportData.maintenance.averageResponseTime * 20))} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Target: under 2 days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenant Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Satisfaction Score</span>
                <span className="font-semibold">4.3/5.0</span>
              </div>
              <Progress value={86} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Based on maintenance ratings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportsChart
              data={reportData.maintenance}
              type="maintenance"
              title="Cost by Category"
              description="Breakdown of maintenance costs by category"
            />
            <div className="space-y-4">
              <h4 className="font-semibold">Top Maintenance Issues</h4>
              {reportData.maintenance.categoryBreakdown.slice(0, 5).map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{category.category}</span>
                    <p className="text-sm text-muted-foreground">{category.count} requests</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">KES {category.cost.toLocaleString()}</span>
                    <p className="text-sm text-muted-foreground">
                      Avg: KES {Math.round(category.cost / category.count).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};