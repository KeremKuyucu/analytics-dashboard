// app/api/log/route.ts

import { type NextRequest, NextResponse } from "next/server";

// --- Discord Embed Yardımcı Fonksiyonu ---

/**
 * Gelen analitik verisini formatlayıp Discord'a bir embed mesajı olarak gönderir.
 * @param logData - Gelen isteğin gövdesindeki veriler.
 */
async function sendEmbedToDiscord(logData: {
  appId: string;
  userId: string;
  endpoint: string;
  metadata?: Record<string, any>;
}) {
  const { appId, userId, endpoint, metadata } = logData;

  const discordWebhookUrl = `https://discord.com/api/v10/channels/1388524868877815888/messages`;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken) {
    console.error("HATA: BOT_TOKEN ortam değişkeni ayarlanmamış!");
    // Bu hatayı fırlatarak ana fonksiyonda yakalanmasını sağlıyoruz.
    throw new Error("Sunucu tarafında bot token yapılandırması eksik.");
  }
  
  const embed = {
    title: `Yeni Analitik Logu: ${endpoint}`,
    description: `**Uygulama:** \`${appId}\`\n**Kullanıcı ID:** \`${userId}\``,
    color: 0x5865F2, // Discord mavisi
    timestamp: new Date().toISOString(),
    fields: [] as { name: string; value: string; inline: boolean }[], // Alanlar için tip belirleme
    footer: {
      text: "kısaLink Analitik Servisi",
    },
  };

  // Metadata'yı embed alanlarına ekle
  if (metadata && typeof metadata === 'object') {
    for (const key in metadata) {
      if (Object.prototype.hasOwnProperty.call(metadata, key)) {
        // Değerin çok uzun olmasını engelle (Discord limitlerine takılmamak için)
        const value = String(metadata[key]).substring(0, 1020) || "Veri Yok";
        embed.fields.push({
          name: key,
          value: `\`\`\`${value}\`\`\``, // Kod bloğu içinde göstermek daha okunaklı yapar
          inline: true,
        });
      }
    }
  }

  // Gönderilecek payload (Discord API formatı)
  const payload = {
    embeds: [embed],
  };

  // Discord API'sine POST isteği gönder
  const response = await fetch(discordWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bot ${botToken}`, // Bot token'ı ile yetkilendirme
    },
    body: JSON.stringify(payload),
  });

  // Eğer istek başarısız olursa, hatayı logla ve fırlat
  if (!response.ok) {
    const errorData = await response.json();
    console.error("Discord API hatası:", response.status, errorData);
    throw new Error(`Discord API isteği başarısız oldu: ${response.status}`);
  }
}


// --- API Route Ana Mantığı ---
const ALLOWED_ORIGINS="https://kisalink.icu,https://geogame-api.keremkk.com.tr,https://pikamed-api.keremkk.com.tr,http://localhost:3000";
const allowedOrigins = (ALLOWED_ORIGINS || "").split(",");

const getCorsHeaders = (origin: string | null) => {
    const headers = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (origin && allowedOrigins.includes(origin)) {
        return { ...headers, 'Access-Control-Allow-Origin': origin };
    }
    return { ...headers, 'Access-Control-Allow-Origin': allowedOrigins[0] || '*' };
};

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { appId, userId, endpoint, metadata } = body;

    if (!appId || !userId || !endpoint) {
      return NextResponse.json({ error: 'Bad Request: appId, userId ve endpoint alanları zorunludur.' }, { status: 400, headers: corsHeaders });
    }

    // 3. Veriyi İşle: Discord'a Gönder
    await sendEmbedToDiscord({ appId, userId, endpoint, metadata });

    // 4. Başarılı Yanıt Gönder
    return NextResponse.json({ success: true, message: 'Log başarıyla Discord\'a gönderildi.' }, { status: 202, headers: corsHeaders });

  } catch (error: any) {
    console.error("Analitik API Hatası:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500, headers: corsHeaders });
  }
}
