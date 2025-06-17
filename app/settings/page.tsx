"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Settings, Database, CheckCircle, AlertCircle, ExternalLink, Info } from "lucide-react"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const handleSetup = async () => {
    setIsLoading(true)
    setStatus({ type: null, message: "" })

    try {
      const response = await fetch("/api/discord/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setStatus({
          type: "success",
          message: `Discord storage başarıyla kuruldu! Kanal: ${data.channelName}`,
        })
      } else {
        setStatus({
          type: "error",
          message: data.error || "Kurulum başarısız",
        })
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: "Bağlantı hatası",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Ayarlar</h1>
          </div>
          <p className="text-muted-foreground">Discord storage ve sistem ayarları</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Discord Storage Kurulumu */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>Discord Storage Kurulumu</CardTitle>
              </div>
              <CardDescription>
                Analitik verilerinizi Discord kanalında depolamak için bot token ve kanal ID'si gerekli
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Discord bot token ve channel ID'si environment variables olarak ayarlanmalıdır:
                  <br />
                  <br />
                  <strong>Vercel'de:</strong>
                  <br />
                  Project Settings → Environment Variables → Add
                  <br />
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">DISCORD_BOT_TOKEN</code>
                  <br />
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">DISCORD_CHANNEL_ID</code>
                  <br />
                  <br />
                  <strong>Local development (.env.local):</strong>
                  <br />
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">DISCORD_BOT_TOKEN=your_bot_token</code>
                  <br />
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">DISCORD_CHANNEL_ID=your_channel_id</code>
                </AlertDescription>
              </Alert>

              {status.type && (
                <Alert variant={status.type === "error" ? "destructive" : "default"}>
                  {status.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleSetup} disabled={isLoading} className="w-full">
                {isLoading ? "Test ediliyor..." : "Discord Bağlantısını Test Et"}
              </Button>
            </CardContent>
          </Card>

          {/* Kurulum Rehberi */}
          <Card>
            <CardHeader>
              <CardTitle>Discord Bot Kurulum Rehberi</CardTitle>
              <CardDescription>
                Discord bot oluşturmak ve gerekli bilgileri almak için adımları takip edin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    1
                  </Badge>
                  <div>
                    <p className="font-medium">Discord Developer Portal'a gidin</p>
                    <a
                      href="https://discord.com/developers/applications"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                    >
                      discord.com/developers/applications
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    2
                  </Badge>
                  <div>
                    <p className="font-medium">Yeni Application oluşturun</p>
                    <p className="text-sm text-muted-foreground">
                      "New Application" butonuna tıklayın ve bir isim verin
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    3
                  </Badge>
                  <div>
                    <p className="font-medium">Bot oluşturun</p>
                    <p className="text-sm text-muted-foreground">
                      Sol menüden "Bot" sekmesine gidin ve "Add Bot" butonuna tıklayın
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    4
                  </Badge>
                  <div>
                    <p className="font-medium">Bot Token'ı kopyalayın</p>
                    <p className="text-sm text-muted-foreground">"Token" bölümünden "Copy" butonuna tıklayın</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    5
                  </Badge>
                  <div>
                    <p className="font-medium">Bot'u sunucunuza ekleyin</p>
                    <p className="text-sm text-muted-foreground">
                      "OAuth2" &gt; "URL Generator" &gt; "bot" seçin ve "Send Messages", "Attach Files" yetkilerini
                      verin
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    6
                  </Badge>
                  <div>
                    <p className="font-medium">Channel ID'yi alın</p>
                    <p className="text-sm text-muted-foreground">
                      Discord'da Developer Mode'u açın, kanala sağ tıklayın ve "Copy ID" seçin
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sistem Durumu */}
          <Card>
            <CardHeader>
              <CardTitle>Sistem Durumu</CardTitle>
              <CardDescription>Mevcut sistem ayarları ve durum bilgileri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Discord Storage</span>
                  <Badge variant={status.type === "success" ? "default" : "secondary"}>
                    {status.type === "success" ? "Aktif" : "Kurulmadı"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>API Durumu</span>
                  <Badge variant="default">Aktif</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Desteklenen Uygulamalar</span>
                  <Badge variant="outline">3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
