"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface AnalyticsWidgetProps {
  title: string
  value: number
  change?: number
  changeType?: "increase" | "decrease"
  icon?: React.ReactNode
  description?: string
}

export function AnalyticsWidget({
  title,
  value,
  change,
  changeType = "increase",
  icon,
  description,
}: AnalyticsWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon || <Activity className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {change !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={changeType === "increase" ? "default" : "destructive"} className="text-xs">
              {changeType === "increase" ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(change)}%
            </Badge>
            <p className="text-xs text-muted-foreground">{description || "Geçen aya göre"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
