"use client";

import { useEffect, useState, useCallback } from 'react';

interface FomoToken {
  symbol: string;
  address: string;
  liquidity: number;
  mcap: number;
  buys: number;
  volume: number;
  ageMinutes: number;
  score: number;
}

export default function FomoDashboard() {
  const [tokens, setTokens] = useState<FomoToken[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("WAITING...");
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // States untuk Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(30);
  const [timeWindow, setTimeWindow] = useState<number>(120);
  const [displayLimit, setDisplayLimit] = useState<number>(15); // Default render 15 data

  const fetchFomoData = useCallback(async () => {
    try {
      const res = await fetch(`/api/fomo?minutes=${timeWindow}`);
      const json = await res.json();
      
      if (json.success) {
        setTokens(json.data);
        setLastUpdate(new Date(json.timestamp).toLocaleTimeString('en-US', { hour12: false }));
        setErrorMsg("");
      } else {
        setErrorMsg(json.message);
      }
    } catch (error) {
      setErrorMsg("Network error fetching API");
    }
  }, [timeWindow]);

  // SMART POLLING EFFECT
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      fetchFomoData(); // Fetch pertama
      interval = setInterval(fetchFomoData, 3000);
    };

    const stopPolling = () => {
      if (interval) clearInterval(interval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        setLastUpdate((prev) => prev + " (PAUSED: TAB INACTIVE)");
      } else if (isScanning) {
        startPolling();
      }
    };

    if (isScanning) {
      startPolling();
    }

    // Listener untuk mendeteksi saat tab browser pindah/aktif kembali
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isScanning, fetchFomoData]);

  // FUNGSI COPY CA
  const handleCopyCA = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000); // Reset visual setelah 2 detik
    } catch (err) {
      console.error("Gagal menyalin CA", err);
    }
  };

  const formatUSD = (val: number) => {
    if (!val || val === 0) return "-";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Logika Filter & Limit Render
  const filteredTokens = tokens.filter((token) => {
    const matchesSearch = token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || token.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && token.score >= minScore;
  });

  const tokensToRender = filteredTokens.slice(0, displayLimit);

  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans p-4 sm:p-8 selection:bg-white selection:text-black">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 border-b border-neutral-800 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase text-white">NEW_LAUNCH_RADAR</h1>
            <p className="text-neutral-500 font-mono text-sm mt-1">
              STATUS: {isScanning ? <span className="text-white animate-pulse">HUNTING_EARLY_COINS</span> : "PAUSED"}
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

        {/* --- AREA FILTER CONTROLS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 font-mono text-xs">
          
          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">SEARCH:</span>
            <input 
              type="text" placeholder="Symbol/CA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-white w-full placeholder-neutral-700"
            />
          </div>

          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">MAX_AGE:</span>
            <select value={timeWindow} onChange={(e) => setTimeWindow(Number(e.target.value))} className="bg-transparent text-white outline-none w-full cursor-pointer">
              <option value={5}>5 Min</option>
              <option value={15}>15 Min</option>
              <option value={30}>30 Min</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
            </select>
          </div>

          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">MIN_SCORE:</span>
            <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="bg-transparent text-white outline-none w-full cursor-pointer">
              <option value={20}>&gt; 20 (All)</option>
              <option value={50}>&gt; 50 (Hot)</option>
              <option value={80}>&gt; 80 (Extreme)</option>
            </select>
          </div>

          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">SHOW:</span>
            <select value={displayLimit} onChange={(e) => setDisplayLimit(Number(e.target.value))} className="bg-transparent text-white outline-none w-full cursor-pointer">
              <option value={15}>15 Items</option>
              <option value={50}>50 Items</option>
              <option value={100}>100 Items</option>
            </select>
          </div>

        </div>

        {errorMsg && <div className="border border-neutral-700 bg-neutral-900 p-4 mb-6 font-mono text-sm text-white">SYS_ERROR: {errorMsg}</div>}

        <div className="border border-neutral-800 bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-800 font-mono text-xs uppercase tracking-wider text-neutral-500">
                <th className="p-4 font-normal">Token</th>
                <th className="p-4 font-normal text-center">Age</th>
                <th className="p-4 font-normal text-right">FOMO</th>
                <th className="p-4 font-normal text-right">MCAP</th>
                <th className="p-4 font-normal text-right">Liquidity</th>
                <th className="p-4 font-normal text-right">Buyers</th>
                <th className="p-4 font-normal text-center">Action</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {tokensToRender.length === 0 && !errorMsg ? (
                <tr><td colSpan={7} className="p-8 text-center text-neutral-600">No coins matching filters...</td></tr>
              ) : (
                tokensToRender.map((token, index) => (
                  <tr key={index} className="border-b border-neutral-900 hover:bg-neutral-900/50">
                    <td className="p-4">
                      <div className="font-bold text-white uppercase flex items-center gap-2">
                        ${token.symbol}
                      </div>
                      <div 
                        onClick={() => handleCopyCA(token.address)}
                        className="text-xs text-neutral-500 mt-1 cursor-pointer hover:text-white flex items-center gap-2 group transition-colors"
                        title="Click to copy Contract Address"
                      >
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        <span className={`text-[10px] border px-1 ${copiedAddress === token.address ? 'border-white text-black bg-white' : 'border-neutral-700 text-neutral-600 group-hover:border-neutral-400 group-hover:text-neutral-400'}`}>
                          {copiedAddress === token.address ? 'COPIED' : 'COPY'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 text-xs font-bold ${token.ageMinutes < 15 ? 'bg-white text-black' : 'text-neutral-400'}`}>
                        {token.ageMinutes}m
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-white border-b border-neutral-500 pb-0.5 font-bold">{token.score}</span>
                    </td>
                    <td className="p-4 text-right text-white font-bold">{formatUSD(token.mcap)}</td>
                    <td className="p-4 text-right text-neutral-400">{formatUSD(token.liquidity)}</td>
                    <td className="p-4 text-right text-neutral-300">{token.buys}</td>
                    <td className="p-4 text-center">
                      <a href={`https://dexscreener.com/robinhood/${token.address}`} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-white">
                        DEX ↗
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Indikator Load More jika data tersembunyi */}
        {filteredTokens.length > displayLimit && (
          <div className="mt-4 text-center">
            <button 
              onClick={() => setDisplayLimit(prev => prev + 25)}
              className="text-xs font-mono text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 px-4 py-2 transition-all"
            >
              SHOW MORE (+25)
            </button>
          </div>
        )}

      </div>
    </main>
  );
}