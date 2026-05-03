import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  subtitleClassName?: string
  icon?: React.ReactNode
  className?: string
  valueClassName?: string
  onClick?: () => void
  children?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function KpiCard({ title, value, subtitle, subtitleClassName, icon, className, valueClassName, onClick, children, trend }: KpiCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all duration-200", 
        onClick && "cursor-pointer hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98]",
        className
      )}
      onClick={(e) => {
        // Prevent click if clicking on children (checkboxes)
        if (onClick && (e.target as HTMLElement).closest('.kpi-card-actions')) return;
        onClick?.();
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-primary">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={cn("text-xl sm:text-2xl font-bold", valueClassName)}>{value}</div>
        {subtitle && <p className={cn("text-xs text-muted-foreground", subtitleClassName)}>{subtitle}</p>}
        {trend && (
          <p className={cn(
            "mt-1 text-xs",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value.toFixed(2)}% em relação ao mês anterior
          </p>
        )}
        {children && (
          <div className="kpi-card-actions mt-3 pt-3 border-t">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
