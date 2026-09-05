import { NextResponse } from 'next/server';

const FOMO_SCORE_THRESHOLD = 20;

// Fungsi helper untuk mengambil data dari Based Bot / API eksternal
async function fetchBasedBotData(address: string) {
  try {
    // GANTI URL INI dengan endpoint API Based Bot yang Anda miliki
    // Contoh: https://api.basedbot.com/v1/token/${address} atau API DexScreener
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      cache: 'no-store',
      // headers: { "Authorization": "Bearer YOUR_API_KEY" } // Jika bot butuh API Key
    });
    const data = await res.json();
    
    // Sesuaikan path JSON di bawah ini dengan format asli dari Based Bot
    const pair = data.pairs?.[0]; 
    const currentMcap = pair?.fdv || 0;
    
    // Jika API tidak menyediakan ATH langsung, kita bisa estimasi dari harga tertinggi (jika ada)
    // Asumsi API mengembalikan field `ath_mcap`, jika tidak ada fallback ke mcap saat ini
    const athMcap = data.ath_mcap || pair?.athFdv || (currentMcap * 1.5); // Fallback simulasi
    
    return { currentMcap, athMcap };
  } catch (error) {
    return { currentMcap: 0, athMcap: 0 };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = searchParams.get('minutes') || '120';

    const TARGET_API_URL = `https://robinhoodtrenches.com/api/radar?minutes=${minutes}&limit=100`;

    const response = await fetch(TARGET_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "application/json",
        "Referer": "https://robinhoodtrenches.com/",
      },
      cache: 'no-store', 
    });

    if (!response.ok) throw new Error(`API Error: Status ${response.status}`);
    const tokens = await response.json();
    if (!Array.isArray(tokens)) throw new Error("Struktur JSON tidak dikenali.");

    const now = Math.floor(Date.now() / 1000);

    // 1. Hitung skor dasar
    let fomoTokens = tokens.map((token: any) => {
      let score = 0;
      const buyers = token.buyers || 0;
      const usdIn = token.usd_in || 0;
      const liquidity = token.liquidity || 0;
      const ageMinutes = Math.floor((now - (token.first_ts || now)) / 60);

      if (ageMinutes < 15) score += 30;       
      else if (ageMinutes < 60) score += 15;  
      else if (ageMinutes > 120) score -= 10; 

      if (buyers > 5) score += (buyers * 3);  
      if (usdIn > 2000) score += 15;
      if (liquidity > 1500) score += 10;

      return {
        symbol: token.symbol || "UNKNOWN",
        address: token.token || "0x0", 
        liquidity: liquidity,
        buys: buyers,
        volume: usdIn,
        ageMinutes: Math.max(0, ageMinutes),
        score: Math.round(score),
        mcap: token.fdv || 0, // Mcap bawaan
        athMcap: 0 // Placeholder
      };
    })
    .filter((token: any) => token.score >= FOMO_SCORE_THRESHOLD)
    .sort((a: any, b: any) => b.score - a.score);

    // 2. Fetch data sekunder (Based Bot) HANYA untuk Top 30 token agar cepat
    const topTokens = fomoTokens.slice(0, 30);
    
    const enrichedTokens = await Promise.all(topTokens.map(async (token) => {
      const botData = await fetchBasedBotData(token.address);
      return {
        ...token,
        mcap: botData.currentMcap > 0 ? botData.currentMcap : token.mcap,
        athMcap: botData.athMcap > 0 ? botData.athMcap : token.mcap, // Fallback
      };
    }));

    return NextResponse.json({ success: true, timestamp: Date.now(), data: enrichedTokens });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}