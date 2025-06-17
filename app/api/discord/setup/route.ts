// app/api/discord/setup/route.ts

import { NextResponse } from "next/server";
import { 
    testDiscordConnection, 
    initializeAnalyticsFile 
} from "@/lib/discord-storage";

// Bu GET fonksiyonu, URL'yi tarayıcıda açtığınızda çalışır.
export async function GET() {
    try {
        // 1. Adım: Discord bağlantısını test et
        console.log("Discord bağlantısı test ediliyor...");
        const connectionTest = await testDiscordConnection();

        if (!connectionTest.success) {
            console.error("Discord bağlantı testi başarısız:", connectionTest.message);
            // Bağlantı başarısızsa, detaylı hata mesajı döndür
            return NextResponse.json(
                { 
                    success: false, 
                    step: 'connection_test', 
                    message: `Bağlantı testi başarısız: ${connectionTest.message}` 
                }, 
                { status: 500 }
            );
        }

        console.log("Discord bağlantısı başarılı. Kanal Adı:", connectionTest.channelName);

        // 2. Adım: İlk analiz dosyasını oluştur ve Discord'a yükle
        console.log("İlk analiz dosyası oluşturuluyor...");
        const initSuccess = await initializeAnalyticsFile();

        if (!initSuccess) {
            console.error("Analiz dosyası başlatılamadı.");
            // Dosya yükleme başarısızsa, hata mesajı döndür
            return NextResponse.json(
                { 
                    success: false, 
                    step: 'file_initialization', 
                    message: "Analiz dosyası başlatılamadı. Bot izinlerini (Dosya Ekle) kontrol edin."
                }, 
                { status: 500 }
            );
        }

        console.log("Kurulum başarıyla tamamlandı.");

        // Her şey yolundaysa, başarı mesajı döndür
        return NextResponse.json({
            success: true,
            message: "Sistem başarıyla kuruldu! Ana Discord kanalınıza ilk analiz dosyası yüklendi.",
            channelName: connectionTest.channelName,
        });

    } catch (error: any) {
        console.error("Setup sırasında beklenmedik bir hata oluştu:", error);
        return NextResponse.json(
            { success: false, message: `Beklenmedik sunucu hatası: ${error.message}` }, 
            { status: 500 }
        );
    }
}