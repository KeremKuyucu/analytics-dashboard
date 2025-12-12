"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Activity, Users, Globe, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { useAnalytics } from "@/hooks/use-analytics"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const apps = [
  { id: "geogame", name: "GeoGame", color: "bg-blue-500" },
  { id: "pikamed", name: "PikaMed", color: "bg-green-500" },
  { id: "discordstorage", name: "DiscordStorage", color: "bg-purple-500" },
  { id: "kisalink", name: "kısaLink", color: "bg-red-500" },
]

export default function AnalyticsDashboard() {
  const [selectedApp, setSelectedApp] = useState("geogame")
  const [timeRange, setTimeRange] = useState("daily")

  const { data, error, isLoading } = useAnalytics(selectedApp, timeRange);

  const getChartData = () => {
    if (!data) return [];
    switch (timeRange) {
      case "weekly":
        return data.weeklyData || []
      case "monthly":
        return data.monthlyData || []
      default:
        return data.dailyData || []
    }
  }

  const getTimeLabel = () => {
    switch (timeRange) {
      case "weekly":
        return "week"
      case "monthly":
        return "month"
      default:
        return "date"
    }
  }

  const selectedAppData = apps.find((app) => app.id === selectedApp)

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Hata</AlertTitle>
          <AlertDescription>
            Veriler yüklenirken bir hata oluştu: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Uygulama Analitikleri</h1>
              <p className="text-muted-foreground">Uygulamalarınızın kullanım istatistiklerini takip edin</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${app.color}`} />
                        {app.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-4 h-4 rounded-full ${selectedAppData?.color}`} />
          <h2 className="text-xl font-semibold">{selectedAppData?.name}</h2>
          <Badge variant="secondary" className="ml-auto">
            <Activity className="w-3 h-3 mr-1" />
            Aktif
          </Badge>
        </div>

        {/* Ana İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tekil Kullanıcı</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.uniqueUsers ? data.uniqueUsers.toLocaleString() : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Bu ay</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam İstek</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {data?.totalRequests ? data.totalRequests.toLocaleString() : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Bu ay</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama İstek/Kullanıcı</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {(() => {
                      const avg = (data?.uniqueUsers || 0) > 0 ? Math.round((data?.totalRequests || 0) / (data?.uniqueUsers || 1)) : 0
                      return isNaN(avg) ? 0 : avg
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">Bu ay</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Günler</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{data?.dailyData ? data.dailyData.length : 0}</div>
                  <p className="text-xs text-muted-foreground">Bu ay</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grafikler */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Kullanım Trendleri</CardTitle>
                <CardDescription>Tekil kullanıcı ve toplam istek sayıları</CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                  <SelectItem value="monthly">Aylık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <Tabs defaultValue="area" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="area">Alan Grafiği</TabsTrigger>
                  <TabsTrigger value="bar">Çubuk Grafiği</TabsTrigger>
                </TabsList>

                <TabsContent value="area" className="mt-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={getTimeLabel()} />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                        name="Tekil Kullanıcı"
                      />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                        name="Toplam İstek"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="bar" className="mt-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={getTimeLabel()} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="users" fill="#8884d8" name="Tekil Kullanıcı" />
                      <Bar dataKey="requests" fill="#82ca9d" name="Toplam İstek" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Detaylı İstatistikler */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Son 7 Gün</CardTitle>
              <CardDescription>Günlük kullanım detayları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                ) : (
                  <>
                    {(data?.dailyData || []).slice(-7).map((day, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="font-medium">{day.date}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{isNaN(day.users) ? 0 : day.users} kullanıcı</span>
                          <span>{isNaN(day.requests) ? 0 : day.requests} istek</span>
                        </div>
                      </div>
                    ))}
                    {(!data?.dailyData || data.dailyData.length === 0) && (
                      <div className="text-center text-muted-foreground py-4">Henüz veri bulunmuyor</div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Haftalık Özet</CardTitle>
              <CardDescription>Bu ayki haftalık performans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                ) : (
                  <>
                    {(data?.weeklyData || []).map((week, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="font-medium">{week.week || week.date}</div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{isNaN(week.users) ? 0 : week.users} kullanıcı</span>
                          <span>{isNaN(week.requests) ? 0 : week.requests} istek</span>
                        </div>
                      </div>
                    ))}
                    {(!data?.weeklyData || data.weeklyData.length === 0) && (
                      <div className="text-center text-muted-foreground py-4">Henüz veri bulunmuyor</div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
