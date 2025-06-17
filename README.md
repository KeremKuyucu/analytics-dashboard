# Discord Analytics Dashboard

Vercel'de host edilen, Discord'u storage olarak kullanan analytics dashboard.

## 🚀 Vercel'de Deploy

### 1. Environment Variables Ayarlama

Vercel Dashboard'da Project Settings → Environment Variables:

\`\`\`
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here
\`\`\`

### 2. Discord Bot Kurulumu

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. Bot sekmesi → Add Bot
3. Token'ı kopyala → Vercel'e ekle
4. OAuth2 → URL Generator → bot + Send Messages + Attach Files
5. Bot'u sunucuna ekle
6. Channel ID'yi kopyala → Vercel'e ekle

### 3. Deploy

\`\`\`bash
git push origin main
\`\`\`

Vercel otomatik deploy edecek.

## 📊 API Kullanımı

### Veri Gönderme

\`\`\`javascript
const response = await fetch('https://your-app.vercel.app/api/analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appId: 'geogame',
    userId: 'user123',
    endpoint: '/game/start'
  })
})
\`\`\`

### Client Library

\`\`\`javascript
import DiscordAnalyticsClient from './lib/discord-client'

const analytics = new DiscordAnalyticsClient({
  apiUrl: 'https://your-app.vercel.app',
  appId: 'geogame'
})

await analytics.track('user123', '/game/start')
\`\`\`

## 🔧 Özellikler

- ✅ Discord storage (dosya tabanlı)
- ✅ Çoklu uygulama desteği
- ✅ Gerçek zamanlı istatistikler
- ✅ Responsive dashboard
- ✅ Vercel optimized

## 📁 Veri Yapısı

Discord'da saklanan JSON:

\`\`\`json
{
  "geogame": {
    "uniqueUsers": ["user1", "user2"],
    "totalRequests": 150,
    "requests": [
      {
        "userId": "user1",
        "timestamp": "2024-01-15T10:30:00Z",
        "endpoint": "/game/start",
        "userAgent": "...",
        "ip": "..."
      }
    ]
  }
}
