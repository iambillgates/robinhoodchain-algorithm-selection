"use client";

import { useEffect, useState } from 'react';

// Tipe data sesuai dengan API terbaru
interface FomoToken {
  symbol: string;
  address: string;
  price: number;   // Sekarang berisi data Liquidity
  buys: number;    // Unique buyers
  volume: number;  // USD In
  score: number;
}

export default function FomoDashboard() {
  const [tokens, setTokens] = useState<FomoToken[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("WAITING...");
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchFomoData = async () => {
      if (!isScanning) return;
      
      try {
        const res = await fetch('/api/fomo');
        const json = await res.json();
        
        if (json.success) {
          setTokens(json.data);
          setLastUpdate(new Date(json.timestamp).toLocaleTimeString('en-US', { hour12: false }));
          setErrorMsg("");
        } else {
          setErrorMsg(json.message || "Failed to fetch data");
        }
      } catch (error) {
        setErrorMsg("Network error fetching API");
      }
    };

    fetchFomoData();

    if (isScanning) {
      interval = setInterval(fetchFomoData, 3000); // Polling setiap 3 detik
    }

    return () => clearInterval(interval);
  }, [isScanning]);

  // Fungsi untuk memformat angka USD
  const formatUSD = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans p-4 sm:p-8 selection:bg-white selection:text-black">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-neutral-800 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase text-white">FOMO_SCANNER</h1>
            <p className="text-neutral-500 font-mono text-sm mt-1">
              STATUS: {isScanning ? <span className="text-white animate-pulse">LIVE_TRACKING</span> : "PAUSED"}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right font-mono text-xs text-neutral-500">
              <p>LAST_SYNC</p>
              <p className="text-white">{lastUpdate}</p>
            </div>
            <button 
              onClick={() => setIsScanning(!isScanning)}
              className="border border-neutral-700 hover:bg-white hover:text-black transition-colors px-4 py-2 font-mono text-xs uppercase"
            >
              {isScanning ? "[ STOP ]" : "[ START ]"}
            </button>
          </div>
        </header>

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="border border-neutral-700 bg-neutral-900 p-4 mb-6 font-mono text-sm">
            <span className="font-bold text-white">SYS_ERROR:</span> {errorMsg}
          </div>
        )}

        {/* DATA TABLE */}
        <div className="border border-neutral-800 bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 font-mono text-xs uppercase tracking-wider text-neutral-500">
                <th className="p-4 font-normal">Token</th>
                <th className="p-4 font-normal text-right">FOMO_Score</th>
                <th className="p-4 font-normal text-right">Buyers (24H)</th>
                <th className="p-4 font-normal text-right">USD_In (24H)</th>
                <th className="p-4 font-normal text-right">Liquidity</th>
                <th className="p-4 font-normal text-center">Action</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {tokens.length === 0 && !errorMsg ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-600 animate-pulse">
                    Awaiting momentum signals...
                  </td>
                </tr>
              ) : (
                tokens.map((token, index) => (
                  <tr key={index} className="border-b border-neutral-900 hover:bg-neutral-900/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white uppercase">${token.symbol}</div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {/* Tampilan skor dibalik warnanya agar mencolok namun tetap B&W */}
                      <span className="bg-white text-black px-2 py-0.5 text-xs font-bold">
                        {token.score}
                      </span>
                    </td>
                    <td className="p-4 text-right text-neutral-300">
                      {token.buys}
                    </td>
                    <td className="p-4 text-right text-neutral-300">
                      {formatUSD(token.volume)}
                    </td>
                    <td className="p-4 text-right text-neutral-300">
                      {formatUSD(token.price)}
                    </td>
                    <td className="p-4 text-center">
                      <a 
                        href={`https://robinhoodchain.blockscout.com/token/${token.address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs border-b border-neutral-600 hover:text-white hover:border-white transition-all pb-0.5 text-neutral-400"
                      >
                        EXPLORE ↗
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <footer className="mt-8 text-center font-mono text-xs text-neutral-600">
          <p>DATA SOURCED VIA REVERSE API</p>
        </footer>

      </div>
    </main>
  );
}