import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export const MetricCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  variant = 'default',
  className = ""
}: MetricCardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-r from-success to-success/80 text-white';
      case 'warning':
        return 'bg-gradient-to-r from-warning to-warning/80 text-white';
      case 'destructive':
        return 'bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground';
      default:
        return 'bg-gradient-to-r from-primary to-primary-glow text-primary-foreground';
    }
  };

  return (
    <Card className={`${variant !== 'default' ? getVariantStyles() : ''} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${variant === 'default' ? 'text-foreground' : ''}`}>
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${variant === 'default' ? 'text-muted-foreground' : ''}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === 'default' ? 'text-foreground' : ''}`}>
          {value}
        </div>
        {description && (
          <p className={`text-xs ${variant === 'default' ? 'text-muted-foreground' : 'opacity-90'}`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};