"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Activity, Users, Globe, Calendar, TrendingUp } from "lucide-react"

interface AnalyticsData {
  uniqueUsers: number
  totalRequests: number
  dailyData: Array<{ date: string; users: number; requests: number }>
  weeklyData: Array<{ week: string; users: number; requests: number }>
  monthlyData: Array<{ month: string; users: number; requests: number }>
}

const apps = [
  { id: "geogame", name: "GeoGame", color: "bg-blue-500" },
  { id: "pikamed", name: "PikaMed", color: "bg-green-500" },
  { id: "discordstorage", name: "DiscordStorage", color: "bg-purple-500" },
  { id: "kisalink", name: "kısaLink", color: "bg-red-500" },
]

export default function AnalyticsDashboard() {
  const [selectedApp, setSelectedApp] = useState("geogame")
  const [timeRange, setTimeRange] = useState("daily")
  const [data, setData] = useState<AnalyticsData>({
    uniqueUsers: 0,
    totalRequests: 0,
    dailyData: [],
    weeklyData: [],
    monthlyData: [],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/analytics?appId=${selectedApp}&timeRange=${timeRange}`)
        const apiData = await response.json()

        if (response.ok) {
          setData(apiData)
        } else {
          console.error("API error:", apiData.error)
        }
      } catch (error) {
        console.error("Fetch error:", error)
      }
    }

    fetchData()
  }, [selectedApp, timeRange])

  const getChartData = () => {
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
              <div className="text-2xl font-bold">
                {isNaN(data.uniqueUsers) ? 0 : data.uniqueUsers.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Bu ay</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam İstek</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isNaN(data.totalRequests) ? 0 : data.totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Bu ay</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ortalama İstek/Kullanıcı</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(() => {
                  const avg = data.uniqueUsers > 0 ? Math.round(data.totalRequests / data.uniqueUsers) : 0
                  return isNaN(avg) ? 0 : avg
                })()}
              </div>
              <p className="text-xs text-muted-foreground">Bu ay</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktif Günler</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.dailyData ? data.dailyData.length : 0}</div>
              <p className="text-xs text-muted-foreground">Bu ay</p>
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
                {(data.dailyData || []).slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="font-medium">{day.date}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{isNaN(day.users) ? 0 : day.users} kullanıcı</span>
                      <span>{isNaN(day.requests) ? 0 : day.requests} istek</span>
                    </div>
                  </div>
                ))}
                {(!data.dailyData || data.dailyData.length === 0) && (
                  <div className="text-center text-muted-foreground py-4">Henüz veri bulunmuyor</div>
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
                {(data.weeklyData || []).map((week, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="font-medium">{week.week || week.date}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{isNaN(week.users) ? 0 : week.users} kullanıcı</span>
                      <span>{isNaN(week.requests) ? 0 : week.requests} istek</span>
                    </div>
                  </div>
                ))}
                {(!data.weeklyData || data.weeklyData.length === 0) && (
                  <div className="text-center text-muted-foreground py-4">Henüz veri bulunmuyor</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
