// lib/discord-storage.ts

import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import FormData from "form-data";
import { Readable } from "stream";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// İndirilecek dosya hakkında daha fazla bilgi döndüren tip
export interface DiscordFilePayload {
  filePath: string | null;
  messageId: string | null;
  fileName: string | null;
}

/**
 * Bir kanaldaki en son mesajı ve ekindeki dosyayı indirir.
 * Dosyanın adını ve mesaj ID'sini de döndürür.
 */
export async function downloadLatestFile(channelId: string): Promise<DiscordFilePayload> {
  try {
    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages?limit=1`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });

    if (!response.ok) {
      console.error("Discord'dan mesajlar alınamadı:", await response.text());
      return { filePath: null, messageId: null, fileName: null };
    }

    const messages = await response.json();
    if (!messages || messages.length === 0 || !messages[0].attachments || messages[0].attachments.length === 0) {
      return { filePath: null, messageId: null, fileName: null }; // Kanal boş veya son mesajda ek yok
    }

    const attachment = messages[0].attachments[0];
    const fileUrl = attachment.url;
    const fileName = attachment.filename;
    const messageId = messages[0].id;

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok || !fileResponse.body) {
      return { filePath: null, messageId: null, fileName: null };
    }

    const tempDir = "/tmp";
    await fs.mkdir(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    const fileStream = createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      Readable.fromWeb(fileResponse.body as any).pipe(fileStream);
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    return { filePath, messageId, fileName };
  } catch (error) {
    console.error("Discord'dan dosya indirme hatası:", error);
    return { filePath: null, messageId: null, fileName: null };
  }
}

/**
 * Belirtilen dosyayı Discord kanalına yükler.
 */
export async function uploadFileToDiscord(filePath: string, channelId: string): Promise<boolean> {
  try {
    const form = new FormData();
    const fileContent = await fs.readFile(filePath);
    form.append("file", fileContent, path.basename(filePath));

    const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        ...form.getHeaders(),
      },
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

/**
 * Bir Discord kanalından belirli bir mesajı siler.
 */
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

/**
 * JSON dosyasını okur.
 */
export async function readJsonFile(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Veriyi JSON dosyasına yazar.
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Geçici dosyayı siler.
 */
export async function deleteFile(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            console.error(`Geçici dosya silinemedi: ${filePath}`, error);
        }
    }
}