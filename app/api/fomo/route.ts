import { NextResponse } from 'next/server';

// Konfigurasi Algoritma
const FOMO_SCORE_THRESHOLD = 30; // Turunkan sedikit threshold untuk testing

// Endpoint ASLI dari source code Robinhood Trenches
const TARGET_API_URL = "https://robinhoodtrenches.com/api/tokens?window=24h&stocks=false&limit=100";

export async function GET() {
  try {
    // 1. Fetch data ke API asli Robinhood Trenches
    const response = await fetch(TARGET_API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://robinhoodtrenches.com/",
      },
      cache: 'no-store', 
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Target API Error: Status ${response.status}.`);
    }

    // 2. Parse JSON
    let tokens;
    try {
      tokens = JSON.parse(responseText);
    } catch (e) {
      throw new Error("Respons bukan JSON. Terkena blokir Cloudflare.");
    }

    // Berdasarkan source code, response langsung berupa Array.
    if (!Array.isArray(tokens)) {
      throw new Error("Struktur JSON berubah, bukan lagi array.");
    }

    // 3. Eksekusi Algoritma Seleksi dengan Variabel ASLI dari API mereka
    const fomoTokens = tokens.map((token: any) => {
      let score = 0;
      
      // Menggunakan field asli dari API Robinhood Trenches
      const buyers = token.buyers || 0;                 // Total Dompet unik
      const usdIn = token.usd_in || 0;                  // Total Uang masuk
      const pricePumpPct = token.since_first_buy_pct || 0; // % Kenaikan
      const liquidity = token.liquidity || 0;           // Likuiditas

      // LOGIKA SCORING FOMO
      // 1. Banyaknya partisipan (Makin banyak wallet = makin FOMO)
      if (buyers > 10) score += (buyers * 1.5);
      
      // 2. Volume uang segar yang masuk (Bobot besar jika di atas $5.000)
      if (usdIn > 5000) score += 20;
      
      // 3. Momentum harga (Jika naik di atas 50% sejak buy pertama)
      if (pricePumpPct > 50) score += 15;

      return {
        symbol: token.symbol || "UNKNOWN",
        address: token.token || "0x0",  // Di source code mereka, address ada di r.token
        price: liquidity,               // Kita gunakan Liquidity sebagai ganti harga (karena harga tidak ada di endpoint ini)
        buys: buyers,
        volume: usdIn,
        score: Math.round(score)
      };
    })
    .filter((token: any) => token.score >= FOMO_SCORE_THRESHOLD)
    .sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({ success: true, timestamp: Date.now(), data: fomoTokens });

  } catch (error: any) {
    console.error("🔥 ERROR:", error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}