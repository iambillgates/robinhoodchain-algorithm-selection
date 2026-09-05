import { NextResponse } from 'next/server';

const FOMO_SCORE_THRESHOLD = 20; 

export async function GET(request: Request) {
  try {
    // 1. Tangkap parameter waktu dari URL (Default: 120 menit)
    const { searchParams } = new URL(request.url);
    const minutes = searchParams.get('minutes') || '120';

    // 2. Teruskan parameter ke API target
    const TARGET_API_URL = `https://robinhoodtrenches.com/api/radar?minutes=${minutes}&limit=100`;

    const response = await fetch(TARGET_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://robinhoodtrenches.com/",
      },
      cache: 'no-store', 
    });

    const responseText = await response.text();
    if (!response.ok) throw new Error(`Target API Error: Status ${response.status}.`);

    let tokens;
    try {
      tokens = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Respons bukan JSON. Terkena blokir Cloudflare.");
    }

    if (!Array.isArray(tokens)) throw new Error("Struktur JSON tidak dikenali.");

    const now = Math.floor(Date.now() / 1000);

    const fomoTokens = tokens.map((token: any) => {
      let score = 0;
      
      const buyers = token.buyers || 0;
      const usdIn = token.usd_in || 0;
      const liquidity = token.liquidity || 0;
      const mcap = token.fdv || token.mcap || token.market_cap || 0;

      const firstTs = token.first_ts || now;
      const ageMinutes = Math.floor((now - firstTs) / 60);

      // Logika Penilaian
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
        mcap: mcap,
        buys: buyers,
        volume: usdIn,
        ageMinutes: Math.max(0, ageMinutes),
        score: Math.round(score)
      };
    })
    .filter((token: any) => token.score >= FOMO_SCORE_THRESHOLD)
    .sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({ success: true, timestamp: Date.now(), data: fomoTokens });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}