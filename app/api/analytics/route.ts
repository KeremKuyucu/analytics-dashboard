import { type NextRequest, NextResponse } from "next/server"
import {
  downloadFileFromDiscord,
  uploadFileToDiscord,
  readJsonFile,
  writeJsonFile,
  deleteFile,
  sendAnalyticsEmbedToDiscord
} from "@/lib/discord-storage"
import path from "path"

const ARCHIVE_CHANNEL_ID = "1384527208336588820";


const allowedOrigins = [
  'https://geogame-api.keremkk.com.tr',
  'https://kisalink.icu'
];

// Temel CORS başlıkları
const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  // Gelen isteğin Origin başlığını alın
  const origin = request.headers.get('origin');

  // Yanıt başlıklarını kopyalayın
  const headers = { ...corsHeaders };
  
  // Eğer origin izin verilenler listesindeyse, Access-Control-Allow-Origin başlığını ekleyin
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin; // ✅ DOĞRU
  }

  return new NextResponse(null, {
    status: 204, // No Content
    headers: headers,
  });
}
/**
 * Aylık verileri kontrol eder ve gerekiyorsa arşivler.
 * @param {Object} analyticsData - Analitik verileri.
 * @returns {Object} Güncellenmiş analitik verileri.
 */
async function checkAndArchiveMonthlyData(analyticsData: any) {
  const now = new Date();
  const currentMonth = now.getUTCMonth();
  const currentYear = now.getUTCFullYear();
  
  // Eğer ay başıysak (ilk 3 gün) önceki ayı arşivle
  if (now.getUTCDate() <= 3) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthKey = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, "0")}`;
    
    // Önceki aya ait verileri filtrele
    const monthlyData: any = {};
    let hasDataToArchive = false;
    
    Object.keys(analyticsData).forEach(appId => {
      const appData = analyticsData[appId];
      if (!appData.requests || !Array.isArray(appData.requests)) return;
      
      // Önceki aya ait istekleri filtrele
      const monthlyRequests = appData.requests.filter((request: any) => {
        const requestDate = new Date(request.timestamp);
        const requestMonth = requestDate.getUTCMonth();
        const requestYear = requestDate.getUTCFullYear();
        return requestMonth === lastMonth && requestYear === lastMonthYear;
      });
      
      if (monthlyRequests.length > 0) {
        hasDataToArchive = true;
        
        // Aylık benzersiz kullanıcıları hesapla
        const monthlyUniqueUsers = [...new Set(monthlyRequests.map((r: any) => r.userId))];
        
        monthlyData[appId] = {
          month: lastMonthKey,
          uniqueUsers: monthlyUniqueUsers,
          totalRequests: monthlyRequests.length,
          requests: monthlyRequests,
          archivedAt: new Date().toISOString()
        };
        
        // Arşivlenen verileri ana veriden çıkar
        analyticsData[appId].requests = appData.requests.filter((request: any) => {
          const requestDate = new Date(request.timestamp);
          const requestMonth = requestDate.getUTCMonth();
          const requestYear = requestDate.getUTCFullYear();
          return !(requestMonth === lastMonth && requestYear === lastMonthYear);
        });
        
        // Benzersiz kullanıcıları güncelle (sadece kalan isteklere göre)
        const remainingUsers = [...new Set(analyticsData[appId].requests.map((r: any) => r.userId))];
        analyticsData[appId].uniqueUsers = remainingUsers;
        analyticsData[appId].totalRequests = analyticsData[appId].requests.length;
      }
    });
    
    // Eğer arşivlenecek veri varsa, arşiv kanalına gönder
    if (hasDataToArchive) {
      try {
        const archiveFileName = `analytics-archive-${lastMonthKey}.json`;
        const tempArchiveFilePath = path.join("/tmp", archiveFileName);
        
        await writeJsonFile(tempArchiveFilePath, {
          archivedMonth: lastMonthKey,
          archivedAt: new Date().toISOString(),
          data: monthlyData
        });
        
        // Arşiv kanalına yükle
        await uploadFileToDiscord(tempArchiveFilePath, ARCHIVE_CHANNEL_ID);
        await deleteFile(tempArchiveFilePath);
        
        console.log(`${lastMonthKey} ayı verileri arşivlendi`);
      } catch (error) {
        console.error("Arşivleme hatası:", error);
      }
    }
  }
  
  return analyticsData;
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

    // Aylık arşivleme kontrolü yap
    analyticsData = await checkAndArchiveMonthlyData(analyticsData);

    // Uygulama verisi yoksa oluştur
    if (!analyticsData[appId]) {
      analyticsData[appId] = {
        uniqueUsers: [],
        totalRequests: 0,
        requests: [],
      }
    }

     await sendAnalyticsEmbedToDiscord(
       "1388586990810959913",
       appId,
       userId,
     );

    // Tekil kullanıcı kontrolü
    if (!analyticsData[appId].uniqueUsers.includes(userId)) {
      analyticsData[appId].uniqueUsers.push(userId)
    }

    analyticsData[appId].requests.push({
      userId,
      //endpoint: endpoint || 'unknown',
      timestamp: new Date().toISOString(),
    });

    analyticsData[appId].totalRequests++

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