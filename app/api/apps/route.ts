import { NextResponse } from "next/server"

const apps = [
  {
    id: "geogame",
    name: "GeoGame",
    description: "Coğrafya tabanlı oyun uygulaması",
    status: "active",
    createdAt: "2024-01-15",
  },
  {
    id: "pikamed",
    name: "PikaMed",
    description: "Tıbbi görüntü analiz uygulaması",
    status: "active",
    createdAt: "2024-02-20",
  },
  {
    id: "discordstorage",
    name: "Discord Storage",
    description: "Discord dosya depolama servisi",
    status: "active",
    createdAt: "2024-03-10",
  },
]

export async function GET() {
  return NextResponse.json({ apps })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: "Uygulama adı gerekli" }, { status: 400 })
    }

    const newApp = {
      id: name.toLowerCase().replace(/\s+/g, ""),
      name,
      description: description || "",
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    }

    apps.push(newApp)

    return NextResponse.json({
      success: true,
      app: newApp,
    })
  } catch (error) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
