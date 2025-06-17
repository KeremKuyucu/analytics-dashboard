// lib/discord-storage.ts

import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import FormData from "form-data";
import { Readable } from "stream";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// --- Ortak Tipler ---
export interface DiscordFilePayload {
  filePath: string | null;
  messageId: string | null;
  fileName: string | null;
}

// === ANA ANALİTİK FONKSİYONLARI ===

export async function downloadLatestFile(channelId: string): Promise<DiscordFilePayload> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages?limit=1`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    if (!response.ok) return { filePath: null, messageId: null, fileName: null };
    const messages = await response.json();
    if (!messages?.[0]?.attachments?.[0]) return { filePath: null, messageId: null, fileName: null };

    const attachment = messages[0].attachments[0];
    const { url: fileUrl, filename: fileName } = attachment;
    const messageId = messages[0].id;

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok || !fileResponse.body) return { filePath: null, messageId: null, fileName: null };

    const tempDir = "/tmp";
    await fs.mkdir(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    const fileStream = createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      Readable.fromWeb(fileResponse.body as any).pipe(fileStream);
      fileStream.on("finish", resolve).on("error", reject);
    });

    return { filePath, messageId, fileName };
  } catch (error) {
    console.error("Discord'dan dosya indirme hatası:", error);
    return { filePath: null, messageId: null, fileName: null };
  }
}

export async function uploadFileToDiscord(filePath: string, channelId: string): Promise<boolean> {
  try {
    const form = new FormData();
    const fileContent = await fs.readFile(filePath);
    form.append("file", fileContent, path.basename(filePath));

    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, ...form.getHeaders() },
      body: form,
    });
    
    if(!response.ok) {
        console.error("Discord'a yükleme başarısız:", await response.text());
        return false;
    }
    return true;
  } catch (error) {
    console.error("Discord'a dosya yükleme hatası:", error);
    return false;
  }
}

export async function deleteMessage(channelId: string, messageId: string): Promise<boolean> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    return response.ok;
  } catch (error) {
    console.error('Discord mesajı silme hatası:', error);
    return false;
  }
}

// === YARDIMCI DOSYA İŞLEM FONKSİYONLARI ===

export async function readJsonFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Geçici dosya silinemedi: ${filePath}`, error);
    }
  }
}


// === SETUP VE TEST FONKSİYONLARI (YENİDEN EKLENDİ) ===

export async function testDiscordConnection(): Promise<{ success: boolean; message: string; channelName?: string }> {
  const { DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID } = process.env;
  if (!DISCORD_BOT_TOKEN || !DISCORD_CHANNEL_ID) {
    return { success: false, message: "Gerekli environment değişkenleri (TOKEN veya CHANNEL_ID) ayarlanmamış." };
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${DISCORD_CHANNEL_ID}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: `Discord API Hatası: ${errorData.message}` };
    }

    const channelData = await response.json();
    return { success: true, message: "Discord bağlantısı başarılı", channelName: channelData.name };

  } catch (error: any) {
    return { success: false, message: `Beklenmedik hata: ${error.message}` };
  }
}


export async function initializeAnalyticsFile(): Promise<boolean> {
  const { DISCORD_CHANNEL_ID } = process.env;
  if (!DISCORD_CHANNEL_ID) {
    console.error("Discord channel ID ayarlanmamış.");
    return false;
  }

  try {
    // Aylık sisteme uygun boş veri yapısı
    const initialData = {
      geogame: { requests: [] },
      pikamed: { requests: [] },
      discordstorage: { requests: [] },
    };
    
    // Aylık sisteme uygun dosya adı
    const date = new Date();
    const filename = `analytics-${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}.json`;
    const tempFilePath = path.join("/tmp", filename);
    
    await writeJsonFile(tempFilePath, initialData);
    const uploadSuccess = await uploadFileToDiscord(tempFilePath, DISCORD_CHANNEL_ID);
    await deleteFile(tempFilePath);

    return uploadSuccess;
  } catch (error) {
    console.error("Analitik dosyası başlatma hatası:", error);
    return false;
  }
}