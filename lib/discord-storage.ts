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

// Discord bağlantısını test et
export async function testDiscordConnection(): Promise<{ success: boolean; message: string; channelName?: string }> {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
    return {
      success: false,
      message: "DISCORD_BOT_TOKEN veya DISCORD_CHANNEL_ID çevre değişkenleri tanımlanmamış",
    }
  }

  try {
    const response = await axios.get(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    })

    return {
      success: true,
      message: "Discord bağlantısı başarılı",
      channelName: response.data.name,
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Discord bağlantı hatası: ${error.response?.data?.message || error.message}`,
    }
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