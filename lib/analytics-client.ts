// Uygulamalarınızdan kullanacağınız client kütüphanesi

interface AnalyticsConfig {
  apiUrl: string
  appId: string
}

class AnalyticsClient {
  private config: AnalyticsConfig

  constructor(config: AnalyticsConfig) {
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
      console.error("Analytics error:", error)
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
      console.error("Analytics fetch error:", error)
      throw error
    }
  }
}

export default AnalyticsClient

// Kullanım örneği:
/*
import AnalyticsClient from './lib/analytics-client'

const analytics = new AnalyticsClient({
  apiUrl: 'https://your-analytics-site.com',
  appId: 'geogame'
})

// Kullanıcı aktivitesini takip et
await analytics.track('user123', '/game/start')

// İstatistikleri al
const stats = await analytics.getStats('weekly')
*/
