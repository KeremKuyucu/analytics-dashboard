import { NextResponse } from "next/server"
import { testDiscordConnection } from "@/lib/discord-storage"

export async function GET() {
  try {
    const result = await testDiscordConnection()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      channelName: result.channelName,
      hasEnvVars: {
        botToken: !!process.env.DISCORD_BOT_TOKEN,
        channelId: !!process.env.DISCORD_CHANNEL_ID,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Test sırasında hata oluştu",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    )
  }
}
