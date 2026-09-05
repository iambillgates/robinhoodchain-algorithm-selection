import { NextResponse } from 'next/server';

const FOMO_SCORE_THRESHOLD = 20;

// ==========================================
// IN-MEMORY ATH CACHE (Smart Tracker)
// Server akan mengingat MCAP tertinggi dari setiap token
// selama aplikasi ini menyala (berjalan di terminal)
// ==========================================
const athCache = new Map<string, number>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = searchParams.get('minutes') || '120';

    const TARGET_API_URL = `https://robinhoodtrenches.com/api/radar?minutes=${minutes}&limit=100`;

    // 1. Fetch data koin target dari Robinhood Trenches
    const response = await fetch(TARGET_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://robinhoodtrenches.com/",
      },
      cache: 'no-store', 
    });

    if (!response.ok) throw new Error(`API Error: Status ${response.status}`);
    
    const responseText = await response.text();
    let tokens;
    try { tokens = JSON.parse(responseText); } catch (e) { throw new Error("Terkena blokir Cloudflare target."); }
    if (!Array.isArray(tokens)) throw new Error("Struktur JSON tidak dikenali.");

    const now = Math.floor(Date.now() / 1000);

    // 2. Kalkulasi Skor & Filter Token
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
        mcap: 0,
        athMcap: 0 
      };
    })
    .filter((token: any) => token.score >= FOMO_SCORE_THRESHOLD)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 30); // Batasi 30 koin teratas agar DexScreener tidak menolak

    // 3. BULK FETCH DEXSCREENER (1 Request untuk banyak koin sekaligus)
    if (fomoTokens.length > 0) {
      // Gabungkan semua alamat CA dengan koma
      const addresses = fomoTokens.map(t => t.address).join(',');
      
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addresses}`, {
          cache: 'no-store'
        });
        const dexData = await dexRes.json();
        
        // Buat mapping agar gampang dicocokkan
        const dexMap = new Map();
        if (dexData.pairs) {
          dexData.pairs.forEach((pair: any) => {
            const addr = pair.baseToken.address.toLowerCase();
            // Ambil FDV (Fully Diluted Valuation / MCAP) tertinggi jika ada LP ganda
            if (!dexMap.has(addr) || pair.fdv > dexMap.get(addr)) {
              dexMap.set(addr, pair.fdv || 0);
            }
          });
        }

        // 4. Update data token dengan MCAP dan hitung ATH Real-time
        fomoTokens = fomoTokens.map(token => {
          const currentMcap = dexMap.get(token.address.toLowerCase()) || 0;
          
          // Logika Sistem Perekam ATH
          let recordedAth = athCache.get(token.address) || 0;
          
          // Jika MCAP saat ini lebih tinggi dari rekor ATH sebelumnya, Update!
          if (currentMcap > recordedAth) {
            recordedAth = currentMcap;
            athCache.set(token.address, recordedAth);
          }

          return {
            ...token,
            mcap: currentMcap,
            athMcap: recordedAth
          };
        });
      } catch (e) {
        console.error("Gagal Bulk Fetch DexScreener:", e);
      }
    }

    return NextResponse.json({ success: true, timestamp: Date.now(), data: fomoTokens });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}