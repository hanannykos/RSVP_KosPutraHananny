import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Cloud, 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  RefreshCw, 
  Play, 
  ExternalLink, 
  Key, 
  Database, 
  Server 
} from 'lucide-react';

export default function CloudSyncTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const [responseJson, setResponseJson] = useState<any>(null);
  const [fetching, setFetching] = useState<boolean>(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/sync/rooms');

  const apiKey = 'Bearer hananny-secret-token-123';
  const curlExample = `curl -X GET "https://ais-dev-jqxexkee4unfqnax7ue3kj-690566472848.asia-southeast1.run.app${selectedEndpoint}" \\
  -H "Authorization: ${apiKey}" \\
  -H "Accept: application/json"`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestApi = async () => {
    setFetching(true);
    setResponseJson(null);
    try {
      const response = await fetch(selectedEndpoint, {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      setResponseJson({
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers.get('content-type'),
          'server': 'Cloud Run Sandbox'
        },
        data
      });
    } catch (err: any) {
      setResponseJson({
        error: 'Fetch Failed',
        message: err.message
      });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded p-4 relative overflow-hidden">
        <div className="space-y-1.5 z-10 relative">
          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
            INTEGRASI & MULTI-DEVICE
          </span>
          <h2 className="text-base font-bold uppercase tracking-wider">Dokumentasi API Sinkronisasi Cloud</h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed font-medium">
            Gunakan API endpoint kami untuk menyinkronkan data hunian secara real-time antar perangkat (Smartphone, Tablet, Desktop) atau mengintegrasikannya dengan sistem akuntansi luar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: API Docs */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center">
            <Key className="w-4 h-4 mr-1.5 text-blue-600" /> API Credentials & Endpoint
          </h3>

          <div className="space-y-3 text-xs font-semibold">
            {/* API Key */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">Bearer Token Otorisasi:</span>
                <button
                  onClick={() => handleCopy(apiKey, 'token')}
                  className="text-[10px] text-blue-600 font-bold flex items-center space-x-1 cursor-pointer uppercase tracking-wider"
                >
                  {copied === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'token' ? 'Tersalin' : 'Salin Token'}</span>
                </button>
              </div>
              <p className="font-mono text-slate-800 bg-white border border-slate-200 p-2 rounded text-[11px] font-bold">
                {apiKey}
              </p>
            </div>

            {/* Endpoints Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pilih Endpoint API:</label>
              <select
                value={selectedEndpoint}
                onChange={(e) => {
                  setSelectedEndpoint(e.target.value);
                  setResponseJson(null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold outline-none focus:border-blue-500 font-mono"
              >
                <option value="/api/sync/rooms">GET /api/sync/rooms — Sinkronisasi Data Kamar & Hunian</option>
                <option value="/api/whatsapp-logs">GET /api/whatsapp-logs — Log Pengiriman Notifikasi WhatsApp</option>
              </select>
            </div>

            {/* cURL Block */}
            <div className="bg-slate-900 text-slate-300 p-3 rounded space-y-2 relative font-mono text-[10px] leading-relaxed border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-slate-800 uppercase font-bold tracking-wider text-[9px]">
                <span className="flex items-center"><Terminal className="w-3.5 h-3.5 mr-1 text-slate-400" /> Contoh Request cURL</span>
                <button
                  onClick={() => handleCopy(curlExample, 'curl')}
                  className="text-[9px] text-blue-400 font-bold flex items-center space-x-1 hover:text-blue-300 cursor-pointer uppercase tracking-wider"
                >
                  {copied === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
            </div>
          </div>
        </div>

        {/* Right: Sandbox Tester */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center">
              <Server className="w-4 h-4 mr-1.5 text-blue-600" /> API Interactive Sandbox Tester
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uji coba pemanggilan API langsung ke server dan lihat data JSON respon.</p>
          </div>

          {/* Terminal Console Response */}
          <div className="bg-slate-950 rounded p-3 flex-1 font-mono text-[10px] text-emerald-400 flex flex-col justify-between min-h-[16rem] max-h-80 overflow-y-auto border border-slate-800">
            {fetching ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <p className="uppercase tracking-wider font-bold">Mengirim GET request...</p>
              </div>
            ) : responseJson ? (
              <div className="space-y-2 text-left">
                <p className="text-blue-400">HTTP/1.1 {responseJson.status} {responseJson.statusText}</p>
                <p className="text-slate-500">Date: {new Date().toUTCString()}</p>
                <p className="text-slate-500">Content-Type: {responseJson.headers?.['content-type']}</p>
                <p className="text-slate-500">Server: {responseJson.headers?.['server']}</p>
                <p className="text-slate-400">{"{"}</p>
                <pre className="text-emerald-300 pl-4 whitespace-pre-wrap">
                  {JSON.stringify(responseJson.data, null, 2)}
                </pre>
                <p className="text-slate-400">{"}"}</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
                <Code className="w-5 h-5 mb-2" />
                <p className="uppercase tracking-wider font-bold">Klik 'Kirim Request' di bawah untuk menguji API.</p>
              </div>
            )}
          </div>

          <button
            onClick={handleTestApi}
            disabled={fetching}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded text-xs transition-colors flex items-center justify-center space-x-1.5 uppercase tracking-wider cursor-pointer mt-2"
          >
            <Play className="w-4 h-4" />
            <span>{fetching ? 'Menjalankan...' : 'Kirim Request / Uji API'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
