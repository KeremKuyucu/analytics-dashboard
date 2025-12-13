import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase İstemcisi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const allowedOrigins = [
  'https://geogame-api.keremkk.com.tr',
  'https://kisalink.icu'
];

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = { ...corsHeaders };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return new NextResponse(null, {
    status: 204,
    headers: headers,
  });
}

// POST: Yeni veri ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appId, userId, endpoint, timestamp, isMigration } = body

    if (!appId || !userId) {
      return NextResponse.json({ error: "appId ve userId gerekli" }, { status: 400, headers: corsHeaders })
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        app_id: appId,
        user_id: userId,
        endpoint: endpoint || null,
      })

    if (error) {
      console.error("Supabase Insert Error:", error)
      return NextResponse.json({ error: "Veritabanı hatası" }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({
      success: true,
      message: "Kaydedildi",
    }, { headers: corsHeaders })

  } catch (error) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: corsHeaders })
  }
}

// GET: Verileri çek ve raporla
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get("appId")
    const timeRange = searchParams.get("timeRange") || "daily"
    // Yeni parametre: Başlangıç Tarihi
    const startDate = searchParams.get("startDate")

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

    // Sorguyu dinamik olarak oluşturuyoruz
    let query = supabase
      .from('analytics_events')
      .select('user_id, created_at')
      .eq('app_id', appId)
      .order('created_at', { ascending: true })

    // Eğer başlangıç tarihi varsa filtrele
    if (startDate && startDate !== 'all') {
      // startDate'in başından (00:00) başlatmak için
      const dateFilter = new Date(startDate)
      if (!isNaN(dateFilter.getTime())) {
        query = query.gte('created_at', dateFilter.toISOString())
      }
    }

    const { data: requests, error } = await query

    if (error || !requests) {
      console.error("Supabase Select Error:", error)
      return NextResponse.json(defaultResponse, { headers: corsHeaders });
    }

    // 2. Verileri işle
    const formattedRequests = requests.map(r => ({
      userId: r.user_id,
      timestamp: r.created_at
    }))

    const totalRequests = formattedRequests.length
    const uniqueUsersSet = new Set(formattedRequests.map(r => r.userId))
    const uniqueUsers = uniqueUsersSet.size

    // 3. Zaman aralığına göre grupla
    const groupedData = groupDataByTimeRange(formattedRequests, timeRange)

    return NextResponse.json({
      uniqueUsers,
      totalRequests,
      dailyData: timeRange === "daily" ? groupedData : [],
      weeklyData: timeRange === "weekly" ? groupedData : [],
      monthlyData: timeRange === "monthly" ? groupedData : [],
    }, { headers: corsHeaders })

  } catch (error) {
    console.error("Analytics GET error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: corsHeaders })
  }
}

/**
 * Yardımcı Fonksiyon: Verileri zamana göre gruplar
 */
function groupDataByTimeRange(requests: any[], timeRange: string) {
  const grouped: Record<string, { users: Set<string>; requests: number }> = {}

  requests.forEach((request) => {
    const date = new Date(request.timestamp)
    let key: string

    switch (timeRange) {
      case "weekly":
        const weekStart = new Date(date)
        const dayOfWeek = date.getUTCDay()
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        weekStart.setUTCDate(date.getUTCDate() - daysToSubtract)
        weekStart.setUTCHours(0, 0, 0, 0)
        key = weekStart.toISOString().split("T")[0]
        break
      case "monthly":
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
        break
      default: // daily
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