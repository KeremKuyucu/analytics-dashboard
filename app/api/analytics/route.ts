import { type NextRequest, NextResponse } from "next/server"
import {
  downloadFileFromDiscord,
  uploadFileToDiscord,
  readJsonFile,
  writeJsonFile,
  deleteFile,
} from "@/lib/discord-storage"
import path from "path"

// CORS için izin verilecek kaynak URL
const allowedOrigin = "https://geogame-api.keremkk.com.tr";

// Yanıtlarda kullanılacak ortak CORS başlıkları
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};


// Tarayıcıların gönderdiği pre-flight (OPTIONS) isteklerini işlemek için
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204, // No Content
    headers: corsHeaders,
  });
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appId, userId, endpoint } = body

    if (!appId || !userId) {
      return NextResponse.json({ error: "appId ve userId gerekli" }, { status: 400, headers: corsHeaders })
    }

    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
      return NextResponse.json({ error: "Discord yapılandırması eksik" }, { status: 500, headers: corsHeaders })
    }

    // Discord'dan mevcut veriyi indir
    const downloadedFilePath = await downloadFileFromDiscord(process.env.DISCORD_CHANNEL_ID)

    let analyticsData: any = {}

    if (downloadedFilePath) {
      // İndirilen dosyayı oku
      analyticsData = await readJsonFile(downloadedFilePath)
      // Geçici dosyayı sil
      await deleteFile(downloadedFilePath)
    }

    // Uygulama verisi yoksa oluştur
    if (!analyticsData[appId]) {
      analyticsData[appId] = {
        uniqueUsers: [],
        totalRequests: 0,
        requests: [],
      }
    }

    // Yeni veriyi ekle
    const newRequest = {
      userId,
      timestamp: new Date().toISOString(),
      endpoint: endpoint || "/",
      userAgent: request.headers.get("user-agent") || "",
      ip: request.ip || request.headers.get("x-forwarded-for") || "",
    }

    // Tekil kullanıcı kontrolü
    if (!analyticsData[appId].uniqueUsers.includes(userId)) {
      analyticsData[appId].uniqueUsers.push(userId)
    }

    analyticsData[appId].totalRequests++
    analyticsData[appId].requests.push(newRequest)

    // Güncellenmiş veriyi geçici dosyaya yaz
    const tempFilePath = path.join("/tmp", `analytics-${Date.now()}.json`)
    await writeJsonFile(tempFilePath, analyticsData)

    // Discord'a yükle
    const uploadSuccess = await uploadFileToDiscord(tempFilePath, process.env.DISCORD_CHANNEL_ID)

    // Geçici dosyayı sil
    await deleteFile(tempFilePath)

    if (!uploadSuccess) {
      return NextResponse.json({ error: "Discord'a yükleme başarısız" }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({
      success: true,
      message: "Analitik verisi Discord'a kaydedildi",
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("Analytics POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: corsHeaders })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get("appId")
    const timeRange = searchParams.get("timeRange") || "daily"

    if (!appId) {
      return NextResponse.json({ error: "appId parametresi gerekli" }, { status: 400, headers: corsHeaders })
    }

    const defaultResponse = {
        uniqueUsers: 0,
        totalRequests: 0,
        dailyData: [],
        weeklyData: [],
        monthlyData: [],
    };

    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
      return NextResponse.json(defaultResponse, { headers: corsHeaders });
    }

    // Discord'dan veriyi indir
    const downloadedFilePath = await downloadFileFromDiscord(process.env.DISCORD_CHANNEL_ID)

    if (!downloadedFilePath) {
      return NextResponse.json(defaultResponse, { headers: corsHeaders });
    }

    const analyticsData = await readJsonFile(downloadedFilePath)
    await deleteFile(downloadedFilePath)

    if (!analyticsData[appId]) {
      return NextResponse.json(defaultResponse, { headers: corsHeaders });
    }

    const appData = analyticsData[appId]

    // Güvenli veri kontrolü
    const uniqueUsers = Array.isArray(appData.uniqueUsers) ? appData.uniqueUsers.length : 0
    const totalRequests = typeof appData.totalRequests === "number" ? appData.totalRequests : 0
    const requests = Array.isArray(appData.requests) ? appData.requests : []

    // Zaman aralığına göre grupla
    const groupedData = groupDataByTimeRange(requests, timeRange)

    return NextResponse.json({
      uniqueUsers,
      totalRequests,
      dailyData: timeRange === "daily" ? groupedData : [],
      weeklyData: timeRange === "weekly" ? groupedData : [],
      monthlyData: timeRange === "monthly" ? groupedData : [],
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("Analytics GET error:", error)
    return NextResponse.json({
      uniqueUsers: 0,
      totalRequests: 0,
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
    }, { headers: corsHeaders })
  }
}

function groupDataByTimeRange(requests: any[], timeRange: string) {
  const grouped: Record<string, { users: Set<string>; requests: number }> = {}

  requests.forEach((request) => {
    const date = new Date(request.timestamp)
    let key: string

    switch (timeRange) {
      case "weekly":
        const weekStart = new Date(date)
        weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay())
        key = weekStart.toISOString().split("T")[0]
        break
      case "monthly":
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
        break
      default:
        key = date.toISOString().split("T")[0]
    }

    if (!grouped[key]) {
      grouped[key] = { users: new Set(), requests: 0 }
    }

    grouped[key].users.add(request.userId)
    grouped[key].requests++
  })

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      date: key,
      users: value.users.size,
      requests: value.requests,
    }))
}