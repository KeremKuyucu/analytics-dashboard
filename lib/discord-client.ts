// Uygulamalarınızdan kullanacağınız Discord Analytics client

interface DiscordAnalyticsConfig {
  apiUrl: string
  appId: string
}

class DiscordAnalyticsClient {
  private config: DiscordAnalyticsConfig

  constructor(config: DiscordAnalyticsConfig) {
    this.config = config
  }

  async track(userId: string, endpoint?: string, metadata?: Record<string, any>) {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/analytics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId: this.config.appId,
          userId,
          endpoint,
          metadata,
        }),
      })

      if (!response.ok) {
        throw new Error("Analytics tracking failed")
      }

      return await response.json()
    } catch (error) {
      console.error("Discord Analytics error:", error)
      // Sessizce başarısız ol - analytics uygulamanızı bozmasın
    }
  }

  async getStats(timeRange: "daily" | "weekly" | "monthly" = "daily") {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/analytics?appId=${this.config.appId}&timeRange=${timeRange}`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }

      return await response.json()
    } catch (error) {
      console.error("Discord Analytics fetch error:", error)
      throw error
    }
  }

  // Batch tracking - birden fazla eventi bir seferde gönder
  async trackBatch(events: Array<{ userId: string; endpoint?: string; metadata?: Record<string, any> }>) {
    const promises = events.map((event) => this.track(event.userId, event.endpoint, event.metadata))
    await Promise.allSettled(promises)
  }
}

export default DiscordAnalyticsClient

// Kullanım örneği:
/*
import DiscordAnalyticsClient from './lib/discord-client'

const analytics = new DiscordAnalyticsClient({
  apiUrl: 'https://analytics.keremkk.com.tr/',
  appId: 'geogame'
})

// Tek event tracking
await analytics.track('user123', '/game/start', { level: 1 })

// Batch tracking
await analytics.trackBatch([
  { userId: 'user123', endpoint: '/game/start' },
  { userId: 'user456', endpoint: '/game/level-complete' },
])

// İstatistikleri al
const stats = await analytics.getStats('weekly')
*/