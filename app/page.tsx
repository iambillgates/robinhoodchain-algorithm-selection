"use client";

import { useEffect, useState, useCallback } from 'react';

interface FomoToken {
  symbol: string;
  address: string;
  liquidity: number;
  mcap: number;
  athMcap: number; // Tambahan properti ATH
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

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(30);
  const [timeWindow, setTimeWindow] = useState<number>(120);
  const [displayLimit, setDisplayLimit] = useState<number>(15);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      fetchFomoData(); 
      interval = setInterval(fetchFomoData, 4000); // Diperlambat ke 4 detik karena ada double fetch
    };

    const stopPolling = () => {
      if (interval) clearInterval(interval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        setLastUpdate((prev) => prev + " (PAUSED)");
      } else if (isScanning) {
        startPolling();
      }
    };

    if (isScanning) startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isScanning, fetchFomoData]);

  const handleCopyCA = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000); 
  };

  const formatUSD = (val: number) => {
    if (!val || val === 0) return "-";
    if (val > 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val > 1000) return `$${(val / 1000).toFixed(1)}K`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const filteredTokens = tokens.filter((token) => {
    const matchesSearch = token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || token.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && token.score >= minScore;
  });

  const tokensToRender = filteredTokens.slice(0, displayLimit);

  return (
    <main className="min-h-screen bg-black text-neutral-200 font-sans p-4 sm:p-8 selection:bg-white selection:text-black">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Controls (Sama seperti sebelumnya) */}
        <header className="flex justify-between items-end mb-6 border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase text-white">NEW_LAUNCH_RADAR</h1>
            <p className="text-neutral-500 font-mono text-sm mt-1">STATUS: {isScanning ? <span className="text-white animate-pulse">HUNTING</span> : "PAUSED"}</p>
          </div>
          <div className="text-right font-mono text-xs text-neutral-500">
            <p>LAST_SYNC: <span className="text-white">{lastUpdate}</span></p>
            <button onClick={() => setIsScanning(!isScanning)} className="mt-2 border border-neutral-700 hover:bg-white hover:text-black px-4 py-2 uppercase">
              {isScanning ? "[ STOP ]" : "[ START ]"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 font-mono text-xs">
          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">SEARCH:</span>
            <input type="text" placeholder="Symbol/CA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-white w-full outline-none" />
          </div>
          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">MAX_AGE:</span>
            <select value={timeWindow} onChange={(e) => setTimeWindow(Number(e.target.value))} className="bg-transparent text-white w-full outline-none">
              <option value={15}>15 Min</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
            </select>
          </div>
          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">MIN_SCORE:</span>
            <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="bg-transparent text-white w-full outline-none">
              <option value={20}>&gt; 20 (All)</option>
              <option value={50}>&gt; 50 (Hot)</option>
            </select>
          </div>
          <div className="flex items-center border border-neutral-800 bg-neutral-950 px-3 py-2">
            <span className="text-neutral-500 mr-2">SHOW:</span>
            <select value={displayLimit} onChange={(e) => setDisplayLimit(Number(e.target.value))} className="bg-transparent text-white w-full outline-none">
              <option value={15}>15 Items</option>
              <option value={50}>50 Items</option>
            </select>
          </div>
        </div>

        <div className="border border-neutral-800 bg-black overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-800 font-mono text-xs uppercase text-neutral-500">
                <th className="p-4">Token</th>
                <th className="p-4 text-center">Age</th>
                <th className="p-4 text-right">FOMO</th>
                <th className="p-4 text-right">MCAP</th>
                <th className="p-4 text-right">Liquidity</th>
                <th className="p-4 text-right">Buyers</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {tokensToRender.map((token, index) => {
                // Kalkulasi jarak MCAP saat ini ke ATH
                const isPushingAth = token.mcap > 0 && token.athMcap > 0 && (token.mcap >= token.athMcap * 0.9);
                
                return (
                  <tr key={index} className="border-b border-neutral-900 hover:bg-neutral-900/50">
                    <td className="p-4">
                      <div className="font-bold text-white uppercase">${token.symbol}</div>
                      <div onClick={() => handleCopyCA(token.address)} className="text-xs text-neutral-500 mt-1 cursor-pointer hover:text-white flex items-center gap-2 group">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        <span className={`text-[10px] border px-1 ${copiedAddress === token.address ? 'border-white text-black bg-white' : 'border-neutral-700'}`}>
                          {copiedAddress === token.address ? 'COPIED' : 'COPY'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 text-xs font-bold ${token.ageMinutes < 15 ? 'bg-white text-black' : 'text-neutral-400'}`}>{token.ageMinutes}m</span>
                    </td>
                    <td className="p-4 text-right text-white font-bold">{token.score}</td>
                    <td className="p-4 text-right flex flex-col items-end">
                      <span className="text-white font-bold">{formatUSD(token.mcap)}</span>
                      {/* Tag ATH MCAP */}
                      <span className={`text-[10px] px-1 mt-1 border ${isPushingAth ? 'border-white bg-white text-black font-bold animate-pulse' : 'border-neutral-700 text-neutral-500'}`}>
                        ATH: {formatUSD(token.athMcap)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-neutral-400">{formatUSD(token.liquidity)}</td>
                    <td className="p-4 text-right text-neutral-300">{token.buys}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}