import { NextResponse } from "next/server"
import { testDiscordConnection, initializeAnalyticsFile } from "@/lib/discord-storage"

export async function POST(request: Request) {
  try {
    // Environment variables'ları kontrol et
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
      return NextResponse.json(
        {
          error:
            "DISCORD_BOT_TOKEN ve DISCORD_CHANNEL_ID environment variables gerekli. Lütfen .env dosyanızı kontrol edin.",
        },
        { status: 400 },
      )
    }

    // Discord bağlantısını test et
    const connectionTest = await testDiscordConnection()

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: connectionTest.message,
        },
        { status: 400 },
      )
    }

    // İlk analytics dosyasını oluştur
    const initSuccess = await initializeAnalyticsFile()

    if (!initSuccess) {
      return NextResponse.json(
        {
          error: "Analytics dosyası oluşturulamadı",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Discord storage başarıyla kuruldu",
      channelName: connectionTest.channelName,
    })
  } catch (error) {
    console.error("Discord setup error:", error)
    return NextResponse.json(
      {
        error: "Discord kurulum hatası",
      },
      { status: 500 },
    )
  }
}
