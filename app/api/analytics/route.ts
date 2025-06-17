// app/api/analytics/route.ts

import { type NextRequest, NextResponse } from "next/server";
import {
  downloadLatestFile,
  uploadFileToDiscord,
  deleteMessage,
  readJsonFile,
  writeJsonFile,
  deleteFile,
} from "@/lib/discord-storage";
import path from "path";

// CORS için izin verilecek kaynak URL'ler
// Birden fazla domaine izin vermek için array kullanabilirsiniz.
const allowedOrigins = [
    "https://geogame.keremkk.com.tr", 
    "https://geogame-api.keremkk.com.tr"
    // Gerekirse başka domainler de eklenebilir. localhost testi için: 'http://localhost:3000'
];

const corsHeaders = (origin: string | null) => {
    const headers: Record<string, string> = {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (origin && allowedOrigins.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
};


// Tarayıcıların gönderdiği pre-flight (OPTIONS) isteklerini işlemek için
export async function OPTIONS(request: NextRequest) {
    const requestOrigin = request.headers.get('origin');
    return new NextResponse(null, {
        status: 204, // No Content
        headers: corsHeaders(requestOrigin),
    });
}


export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  try {
    const body = await request.json();
    const { appId, userId } = body;

    if (!appId || !userId) {
      return NextResponse.json({ error: "appId ve userId gerekli" }, { status: 400, headers: corsHeaders(requestOrigin) });
    }

    const { DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID, DISCORD_ARCHIVE_CHANNEL_ID } = process.env;
    if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID || !DISCORD_ARCHIVE_CHANNEL_ID) {
      return NextResponse.json({ error: "Discord yapılandırması eksik" }, { status: 500, headers: corsHeaders(requestOrigin) });
    }

    const date = new Date();
    const currentMonthFilename = `analytics-${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}.json`;

    let analyticsData: any = {};
    
    const latestFilePayload = await downloadLatestFile(DISCORD_CHANNEL_ID);

    if (latestFilePayload.filePath && latestFilePayload.fileName) {
      if (latestFilePayload.fileName === currentMonthFilename) {
        analyticsData = await readJsonFile(latestFilePayload.filePath);
      } else {
        console.log(`Yeni ay başladı. ${latestFilePayload.fileName} dosyası arşivleniyor...`);
        
        await uploadFileToDiscord(latestFilePayload.filePath, DISCORD_ARCHIVE_CHANNEL_ID);
        
        if (latestFilePayload.messageId) {
            await deleteMessage(DISCORD_CHANNEL_ID, latestFilePayload.messageId);
        }
        
        analyticsData = {};
      }
      await deleteFile(latestFilePayload.filePath);
    }

    if (!analyticsData[appId]) {
      analyticsData[appId] = { requests: [] };
    }
    
    analyticsData[appId].requests.push({
      userId,
      timestamp: date.toISOString(),
    });

    const tempFilePath = path.join("/tmp", currentMonthFilename);
    await writeJsonFile(tempFilePath, analyticsData);

    // Ana kanaldaki eski mesajı silip yenisini yüklemek yerine, sadece yenisini yüklüyoruz.
    // `downloadLatestFile` her zaman son mesajı alacağı için bu yöntem çalışır.
    const uploadSuccess = await uploadFileToDiscord(tempFilePath, DISCORD_CHANNEL_ID);
    await deleteFile(tempFilePath);
    
    if (!uploadSuccess) {
      return NextResponse.json({ error: "Discord'a yükleme başarısız" }, { status: 500, headers: corsHeaders(requestOrigin) });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders(requestOrigin) });

  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: corsHeaders(requestOrigin) });
  }
}

export async function GET(request: NextRequest) {
    const requestOrigin = request.headers.get('origin');
    try {
        const { searchParams } = new URL(request.url);
        const appId = searchParams.get("appId");
        
        if (!appId) {
            return NextResponse.json({ error: "appId parametresi gerekli" }, { status: 400, headers: corsHeaders(requestOrigin) });
        }

        const defaultResponse = { uniqueUsers: 0, totalRequests: 0, requests: [] };
        
        const { DISCORD_CHANNEL_ID } = process.env;
        if (!DISCORD_CHANNEL_ID) {
            return NextResponse.json(defaultResponse, { headers: corsHeaders(requestOrigin) });
        }

        const latestFilePayload = await downloadLatestFile(DISCORD_CHANNEL_ID);
        if (!latestFilePayload.filePath || !latestFilePayload.fileName) {
            return NextResponse.json(defaultResponse, { headers: corsHeaders(requestOrigin) });
        }

        const date = new Date();
        const currentMonthFilename = `analytics-${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}.json`;

        // Eğer ana kanaldaki dosya eski bir aydan kalmışsa (henüz yeni istek gelmemişse) boş data dön.
        if (latestFilePayload.fileName !== currentMonthFilename) {
             await deleteFile(latestFilePayload.filePath);
             return NextResponse.json(defaultResponse, { headers: corsHeaders(requestOrigin) });
        }

        const analyticsData = await readJsonFile(latestFilePayload.filePath);
        await deleteFile(latestFilePayload.filePath);

        const appData = analyticsData[appId];
        if (!appData || !Array.isArray(appData.requests)) {
            return NextResponse.json(defaultResponse, { headers: corsHeaders(requestOrigin) });
        }
        
        const totalRequests = appData.requests.length;
        const uniqueUsers = new Set(appData.requests.map((r: any) => r.userId)).size;

        return NextResponse.json({
            uniqueUsers,
            totalRequests,
            requests: appData.requests,
        }, { headers: corsHeaders(requestOrigin) });

    } catch (error) {
        console.error("Analytics GET error:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500, headers: corsHeaders(requestOrigin) });
    }
}