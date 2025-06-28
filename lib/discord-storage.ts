import axios from "axios"
import fs from "fs"
import path from "path"
import FormData from "form-data"

// Vercel'de /tmp dizini mevcut, doğrudan kullan
function getTempDir(): string {
  return "/tmp"
}

// Dizinin var olduğundan emin ol
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.access(dirPath)
  } catch {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true })
    } catch (error) {
      // /tmp zaten mevcut olduğu için hata görmezden gel
      console.log("Directory already exists or creation failed:", error)
    }
  }
}

// Discord'dan son mesajdaki dosyayı indiren fonksiyon
export async function downloadFileFromDiscord(channelId: string): Promise<string | null> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn("DISCORD_BOT_TOKEN çevre değişkeni tanımlanmamış")
    return null
  }

  try {
    // Discord kanalından son mesajları al
    const response = await axios.get(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      params: {
        limit: 50, // Son 50 mesajı kontrol et
      },
    })

    if (response.data && response.data.length > 0) {
      // analytics-data.json dosyası olan son mesajı bul
      const dataMessage = response.data.find((msg: any) =>
        msg.attachments?.some((att: any) => att.filename === "analytics-data.json"),
      )

      if (dataMessage) {
        const attachment = dataMessage.attachments.find((att: any) => att.filename === "analytics-data.json")
        const fileUrl = attachment.url
        console.log("Discord'dan dosya URL'si alındı:", fileUrl)

        // Dosyayı /tmp dizinine indir
        const fileName = `analytics-data-${Date.now()}.json`
        const filePath = path.join(getTempDir(), fileName)

        const fileResponse = await axios.get(fileUrl, { responseType: "stream" })
        const writer = fs.createWriteStream(filePath)

        fileResponse.data.pipe(writer)

        return new Promise((resolve, reject) => {
          writer.on("finish", () => {
            console.log("Dosya başarıyla indirildi:", filePath)
            resolve(filePath)
          })
          writer.on("error", reject)
        })
      } else {
        console.warn("analytics-data.json dosyası bulunamadı")
        return null
      }
    } else {
      console.warn("Kanalda mesaj bulunamadı")
      return null
    }
  } catch (error: any) {
    console.error("Discord'dan dosya indirme hatası:", error.response?.data || error.message)
    return null
  }
}

// Discord'a dosya yükleyen fonksiyon
export async function uploadFileToDiscord(filePath: string, channelId: string): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    console.warn("DISCORD_BOT_TOKEN çevre değişkeni tanımlanmamış")
    return false
  }

  try {
    const form = new FormData()
    form.append("file", fs.createReadStream(filePath), "analytics-data.json")
    form.append("content", `📊 Analytics data updated: ${new Date().toISOString()}`)

    await axios.post(`https://discord.com/api/v10/channels/${channelId}/messages`, form, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        ...form.getHeaders(),
      },
    })

    console.log("Dosya başarıyla Discord'a yüklendi!")
    return true
  } catch (error: any) {
    console.error("Discord'a dosya yükleme hatası:", error.response?.data || error.message)
    return false
  }
}

// JSON dosyasını oku ve parse et
export async function readJsonFile(filePath: string): Promise<any> {
  try {
    const data = await fs.promises.readFile(filePath, "utf8")
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.warn(`${filePath} dosyası bulunamadı, boş veritabanı döndürülüyor.`)
      return {}
    }
    throw error
  }
}

// JSON dosyasını yaz
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
    console.log("JSON dosyası başarıyla yazıldı:", filePath)
  } catch (error) {
    console.error("JSON dosyası yazma hatası:", error)
    throw error
  }
}

// Dosyayı sil
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath)
    console.log("Dosya başarıyla silindi:", filePath)
  } catch (error) {
    console.warn("Dosya silme hatası:", error)
  }
}

// İlk kurulum için boş analytics dosyası oluştur
export async function initializeAnalyticsFile(): Promise<boolean> {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    console.error("Discord environment variables not set")
    return false
  }

  try {
    const initialData = {
      geogame: { uniqueUsers: [], totalRequests: 0, requests: [] },
      pikamed: { uniqueUsers: [], totalRequests: 0, requests: [] },
      discordstorage: { uniqueUsers: [], totalRequests: 0, requests: [] },
    }

    const tempFilePath = path.join(getTempDir(), `analytics-init-${Date.now()}.json`)
    await writeJsonFile(tempFilePath, initialData)

    const uploadSuccess = await uploadFileToDiscord(tempFilePath, process.env.DISCORD_CHANNEL_ID)
    await deleteFile(tempFilePath)

    return uploadSuccess
  } catch (error) {
    console.error("Initialize analytics file error:", error)
    return false
  }
}

async function sendAnalyticsEmbedToDiscord(
  channelId,
  appId,
  userId,
  metadata
) {
  try {
    // Mesajın içeriğini oluşturalım
    const embed = {
      title: `Yeni Analitik Logu - Uygulama: ${appId}`, // Embed başlığı
      description: `Uygulama: **${appId}**\nKullanıcı ID: \`${userId}\``, // Açıklama
      color: 0x3498db, // Mavi renk (onaltılık)
      timestamp: new Date().toISOString(), // Mesajın gönderildiği zaman damgası
      fields: [], // Ek alanlar için boş dizi
      footer: {
        text: `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
      },
    };

    // Metadata'yı embed alanlarına ekleyelim
    if (metadata && Object.keys(metadata).length > 0) {
      embed.fields.push({
        name: "Metadata",
        value: "---",
        inline: false, // Genişlik boyunca uzansın
      });
      for (const key in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, key)) {
          embed.fields.push({
            name: key,
            value: String(metadata[key]), // Tüm değerleri string'e çevir
            inline: true, // Yan yana dizilebilir
          });
        }
      }
    }

    // Gönderilecek payload (Discord API formatı)
    const payload = {
      embeds: [embed], // Bir veya daha fazla embed içerebilir
    };

    // Discord API'sine POST isteği gönder
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`, // Bot token'ı ile yetkilendirme
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Discord API hatası:", response.status, errorData);
      throw new Error(`Discord API isteği başarısız oldu: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
    }

    console.log("Embed mesaj başarıyla gönderildi!");
    return await response.json(); // API yanıtını döndür
  } catch (error) {
    console.error("Mesaj gönderme fonksiyonunda hata oluştu:", error);
    throw error; // Hatayı yeniden fırlat
  }
}

// --- Kullanım Örneği (Next.js API Rotası veya Sunucu Ortamı) ---
// const myBotToken = ; // Ortam değişkeninden token alın
// const myChannelId = "YOUR_DISCORD_CHANNEL_ID"; // Mesajı göndermek istediğiniz kanalın ID'si

// async function exampleUsage() {
//   try {
//     await sendAnalyticsEmbedToDiscord(
//       myChannelId,
//       "geogame",
//       "user_abc_123",
//       {
//         event: "level_completed",
//         level: 5,
//         score: 1250,
//         platform: "web",
//       }
//     );

//     await sendAnalyticsEmbedToDiscord(
//       myChannelId,
//       "my_dashboard_app",
//       "admin_xyz",
//       {
//         action: "report_generated",
//         report_type: "monthly_summary",
//       }
//     );
//   } catch (error) {
//     console.error("Örnek kullanım hatası:", error);
//   }
// }

// exampleUsage();