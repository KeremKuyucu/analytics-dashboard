"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Activity, Users, Globe, Calendar, TrendingUp, X, CalendarDays, ArrowRight } from "lucide-react"

interface AnalyticsData {
  uniqueUsers: number
  totalRequests: number
  dailyData: Array<{ date: string; users: number; requests: number }>
  weeklyData: Array<{ date: string; users: number; requests: number }>
  monthlyData: Array<{ date: string; users: number; requests: number }>
}

const apps = [
  { id: "geogame", name: "GeoGame", color: "bg-blue-500" },
  { id: "pikamed", name: "PikaMed", color: "bg-green-500" },
  { id: "discordstorage", name: "DiscordStorage", color: "bg-purple-500" },
  { id: "kisalink", name: "kısaLink", color: "bg-red-500" },
  // Yeni eklenen:
  { id: "keremkk", name: "KeremKK", color: "bg-orange-500" }, 
]


export default function AnalyticsDashboard() {
  const [selectedApp, setSelectedApp] = useState("geogame")
  const [timeRange, setTimeRange] = useState("daily")
  const [startDate, setStartDate] = useState("")
  // Yeni state: Bitiş Tarihi
  const [endDate, setEndDate] = useState("")

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
        // Parametreleri URL'e ekle
        const startParam = startDate ? `&startDate=${startDate}` : ''
        const endParam = endDate ? `&endDate=${endDate}` : ''

        const response = await fetch(`/api/analytics?appId=${selectedApp}&timeRange=${timeRange}${startParam}${endParam}`)
        const apiData = await response.json()

        if (response.ok) {
          setData({
            uniqueUsers: apiData.uniqueUsers || 0,
            totalRequests: apiData.totalRequests || 0,
            dailyData: apiData.dailyData || [],
            weeklyData: apiData.weeklyData || [],
            monthlyData: apiData.monthlyData || []
          })
        } else {
          console.error("API error:", apiData.error)
        }
      } catch (error) {
        console.error("Fetch error:", error)
      }
    }

    fetchData()
  }, [selectedApp, timeRange, startDate, endDate])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: timeRange === 'monthly' ? '2-digit' : undefined
      }).format(date)
    } catch (e) {
      return dateStr
    }
  }

  const getChartData = () => {
    let sourceData = []
    switch (timeRange) {
      case "weekly":
        sourceData = data.weeklyData || []
        break
      case "monthly":
        sourceData = data.monthlyData || []
        break
      default:
        sourceData = data.dailyData || []
    }

    return sourceData.map(item => ({
      ...item,
      displayDate: formatDate(item.date)
    }))
  }

  const selectedAppData = apps.find((app) => app.id === selectedApp)

  // Filtre durumunu temizleme fonksiyonu
  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  }

  // Tarih badge metni oluşturucu
  const getDateBadgeText = () => {
    if (startDate && endDate) return `${new Date(startDate).toLocaleDateString('tr-TR')} - ${new Date(endDate).toLocaleDateString('tr-TR')}`;
    if (startDate) return `${new Date(startDate).toLocaleDateString('tr-TR')} tarihinden itibaren`;
    if (endDate) return `${new Date(endDate).toLocaleDateString('tr-TR')} tarihine kadar`;
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Uygulama Analitikleri</h1>
              <p className="text-muted-foreground">Uygulamalarınızın kullanım istatistiklerini takip edin</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">

              {/* Tarih Aralığı Seçici */}
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background w-full sm:w-auto overflow-x-auto">
                <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                {/* Başlangıç Tarihi */}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none w-full sm:w-auto"
                  placeholder="Başlangıç"
                />

                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                {/* Bitiş Tarihi */}
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none w-full sm:w-auto"
                  placeholder="Bitiş"
                />

                {(startDate || endDate) && (
                  <button
                    onClick={clearFilters}
                    className="hover:bg-slate-100 p-1 rounded-full transition-colors flex-shrink-0"
                    title="Filtreleri Temizle"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="w-full sm:w-48">
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
          <div className="ml-auto flex items-center gap-2">

            {getDateBadgeText() && (
              <Badge variant="outline" className="hidden sm:flex">
                {getDateBadgeText()}
              </Badge>
            )}

            <Badge variant="secondary">
              <Activity className="w-3 h-3 mr-1" />
              Aktif
            </Badge>
          </div>
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
              <p className="text-xs text-muted-foreground">{(startDate || endDate) ? 'Seçili aralık' : 'Tüm zamanlar'}</p>
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
              <p className="text-xs text-muted-foreground">{(startDate || endDate) ? 'Seçili aralık' : 'Tüm zamanlar'}</p>
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
              <p className="text-xs text-muted-foreground">{(startDate || endDate) ? 'Seçili aralık' : 'Tüm zamanlar'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veri Noktası Sayısı</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getChartData().length}</div>
              <p className="text-xs text-muted-foreground">{timeRange === 'daily' ? 'Gün' : timeRange === 'weekly' ? 'Hafta' : 'Ay'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Grafikler */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Kullanım Trendleri</CardTitle>
                <CardDescription>
                  {(startDate || endDate)
                    ? "Belirtilen tarih aralığındaki veriler"
                    : "Tüm zamanların kullanım verileri"}
                </CardDescription>
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
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <Tooltip labelStyle={{ color: 'black' }} />
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
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <Tooltip labelStyle={{ color: 'black' }} />
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
              <CardTitle>{(startDate || endDate) ? 'Filtreli Günlük Veriler' : 'Son 7 Gün'}</CardTitle>
              <CardDescription>Günlük kullanım detayları</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data.dailyData || []).length > 0 ? (
                  // Filtre varsa hepsini göster, yoksa son 7
                  ((startDate || endDate) ? (data.dailyData || []) : (data.dailyData || []).slice(-7)).map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="font-medium">{formatDate(day.date)}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{isNaN(day.users) ? 0 : day.users} kullanıcı</span>
                        <span>{isNaN(day.requests) ? 0 : day.requests} istek</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    {timeRange !== 'daily'
                      ? "Günlük verileri görmek için yukarıdan 'Günlük' seçin."
                      : "Veri bulunamadı."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Haftalık Özet</CardTitle>
              <CardDescription>Haftalık performans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data.weeklyData || []).length > 0 ? (
                  data.weeklyData.map((week, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="font-medium">{formatDate(week.date)} haftası</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{isNaN(week.users) ? 0 : week.users} kullanıcı</span>
                        <span>{isNaN(week.requests) ? 0 : week.requests} istek</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    {timeRange !== 'weekly'
                      ? "Haftalık verileri görmek için yukarıdan 'Haftalık' seçin."
                      : "Henüz veri bulunmuyor."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}