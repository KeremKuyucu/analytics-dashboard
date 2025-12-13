import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendAnalyticsEmbedToDiscord } from "@/lib/discord-storage" // Sadece bildirim için bunu tuttuk

// Supabase İstemcisi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin yetkisi için Service Role Key kullanın
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
    const { appId, userId, endpoint } = body

    if (!appId || !userId) {
      return NextResponse.json({ error: "appId ve userId gerekli" }, { status: 400, headers: corsHeaders })
    }

    // 1. Veriyi Supabase'e ekle
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        app_id: appId,
        user_id: userId,
        endpoint: endpoint || null,
        // created_at otomatik eklenir
      })

    if (error) {
      console.error("Supabase Insert Error:", error)
      return NextResponse.json({ error: "Veritabanı hatası" }, { status: 500, headers: corsHeaders })
    }

    // 2. (Opsiyonel) Discord'a bildirim gönder
    // Dosya yükleme kalktı ama embed bildirimi kalabilir.
    try {
      await sendAnalyticsEmbedToDiscord(
        "1388586990810959913", // Kanal ID
        appId,
        userId,
      );
    } catch (discordError) {
      console.error("Discord bildirim hatası (kritik değil):", discordError)
    }

    return NextResponse.json({
      success: true,
      message: "Analitik verisi Supabase'e kaydedildi",
    }, { headers: corsHeaders })

  } catch (error) {
    console.error("Analytics POST error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: corsHeaders })
  }
}

// GET: Verileri çek ve raporla
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get("appId")
    const timeRange = searchParams.get("timeRange") || "daily"

    if (!appId) {
      return NextResponse.json({ error: "appId parametresi gerekli" }, { status: 400, headers: corsHeaders })
    }

    // Frontend yapısını bozmamak için boş veri şablonu
    const defaultResponse = {
      uniqueUsers: 0,
      totalRequests: 0,
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
    };

    // 1. İlgili AppID'ye ait verileri çek
    // Not: Çok büyük verilerde buraya tarih filtresi (.gte) eklemek performans için iyi olur.
    // Şimdilik tüm geçmişi çekiyoruz ki eski mantıkla aynı çalışsın.
    const { data: requests, error } = await supabase
      .from('analytics_events')
      .select('user_id, created_at')
      .eq('app_id', appId)
      .order('created_at', { ascending: true })

    if (error || !requests) {
      console.error("Supabase Select Error:", error)
      return NextResponse.json(defaultResponse, { headers: corsHeaders });
    }

    // 2. Verileri işle
    // Veritabanından gelen sütun isimleri snake_case olabilir, onları JS formatına çeviriyoruz.
    const formattedRequests = requests.map(r => ({
      userId: r.user_id,
      timestamp: r.created_at
    }))

    const totalRequests = formattedRequests.length
    // Tekil kullanıcı sayısı
    const uniqueUsersSet = new Set(formattedRequests.map(r => r.userId))
    const uniqueUsers = uniqueUsersSet.size

    // 3. Zaman aralığına göre grupla (Eski yardımcı fonksiyonu kullanıyoruz)
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
 * Bu fonksiyon frontend'in beklediği veri formatını üretir.
 */
function groupDataByTimeRange(requests: any[], timeRange: string) {
  const grouped: Record<string, { users: Set<string>; requests: number }> = {}

  requests.forEach((request) => {
    const date = new Date(request.timestamp)
    let key: string

    switch (timeRange) {
      case "weekly":
        // Pazartesi'yi hafta başı olarak al (ISO 8601 standardı)
        const weekStart = new Date(date)
        const dayOfWeek = date.getUTCDay() // 0=Pazar, 1=Pazartesi
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
      date: key, // Frontend'de 'date', 'week' veya 'month' olarak kullanılıyor olabilir, burası 'date' key'i ile dönüyor.
      users: value.users.size,
      requests: value.requests,
    }))
}