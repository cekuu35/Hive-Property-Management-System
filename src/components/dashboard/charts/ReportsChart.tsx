import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ReportsChartProps {
  data: any;
  type: 'financial' | 'occupancy' | 'maintenance';
  title: string;
  description?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const ReportsChart = ({ data, type, title, description }: ReportsChartProps) => {
  const renderFinancialChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.monthlyTrend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Revenue"
        />
        <Line 
          type="monotone" 
          dataKey="expenses" 
          stroke="hsl(var(--destructive))" 
          strokeWidth={2}
          name="Expenses"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderOccupancyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.propertyBreakdown}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="property" />
        <YAxis />
        <Tooltip formatter={(value: number) => [`${value}%`, 'Occupancy Rate']} />
        <Bar dataKey="rate" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderMaintenanceChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data.categoryBreakdown}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ category, cost }) => `${category}: KES ${cost.toLocaleString()}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="cost"
        >
          {data.categoryBreakdown.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Cost']} />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    switch (type) {
      case 'financial':
        return renderFinancialChart();
      case 'occupancy':
        return renderOccupancyChart();
      case 'maintenance':
        return renderMaintenanceChart();
      default:
        return <div>Chart type not supported</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};