import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  title: string;
  description?: string;
  value?: string | number;
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  badge?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  };
  className?: string;
  children?: React.ReactNode;
}

const statusColors = {
  success: 'bg-green-500/10 text-green-700 border-green-200',
  warning: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  error: 'bg-red-500/10 text-red-700 border-red-200',
  info: 'bg-blue-500/10 text-blue-700 border-blue-200',
  default: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

export function MobileCard({
  title,
  description,
  value,
  status = 'default',
  badge,
  icon,
  action,
  className,
  children
}: MobileCardProps) {
  return (
    <Card className={cn("w-full max-w-full overflow-hidden", className)}>
      <CardHeader className="pb-3 px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg font-semibold truncate leading-tight">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-sm mt-1.5 line-clamp-2 leading-snug">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {icon && (
              <div className="flex-shrink-0 w-5 h-5">
                {icon}
              </div>
            )}
            {badge && (
              <Badge 
                variant="outline" 
                className={cn("text-xs whitespace-nowrap", statusColors[status])}
              >
                {badge}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      {(value || children) && (
        <CardContent className="pt-0 px-4 pb-4">
          {value && (
            <div className="text-2xl md:text-3xl font-bold mb-3 truncate">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          )}
          {children}
          {action && (
            <Button
              variant={action.variant || 'outline'}
              size="sm"
              className="w-full mt-3 min-h-[48px] text-base font-medium rounded-xl"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface MobileGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function MobileGrid({ children, columns = 1, className }: MobileGridProps) {
  return (
    <div className={cn(
      "grid gap-3 w-full",
      columns === 1 ? "grid-cols-1" : "grid-cols-2",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileListProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileList({ children, className }: MobileListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}

interface MobileListItemProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  status?: 'success' | 'warning' | 'error' | 'info' | 'default';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListItem({
  title,
  subtitle,
  value,
  status = 'default',
  icon,
  onClick,
  className
}: MobileListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-card rounded-xl border min-h-[56px] w-full max-w-full overflow-hidden",
        onClick && "cursor-pointer hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-6 h-6">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-base leading-tight">{title}</div>
          {subtitle && (
            <div className="text-sm text-muted-foreground truncate mt-0.5 leading-snug">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {value && (
        <div className="flex-shrink-0 ml-3">
          <span className={cn(
            "text-sm font-semibold whitespace-nowrap",
            status === 'success' && "text-green-600 dark:text-green-400",
            status === 'warning' && "text-yellow-600 dark:text-yellow-400",
            status === 'error' && "text-red-600 dark:text-red-400",
            status === 'info' && "text-blue-600 dark:text-blue-400"
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>
      )}
    </div>
  );
}
