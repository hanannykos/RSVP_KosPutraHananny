import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Building, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Key,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Kos, Room, Tenant, Payment, DoorLockLog } from '../types';

interface OverviewTabProps {
  kosList: Kos[];
  rooms: Room[];
  tenants: Tenant[];
  payments: Payment[];
  doorLogs: DoorLockLog[];
  onNavigate: (tabId: string) => void;
}

export default function OverviewTab({ 
  kosList, 
  rooms, 
  tenants, 
  payments, 
  doorLogs,
  onNavigate 
}: OverviewTabProps) {

  // Calculate statistics
  const totalKos = kosList.length;
  const totalRooms = rooms.length;
  
  const occupiedRooms = useMemo(() => {
    return rooms.filter(r => r.status === 'occupied').length;
  }, [rooms]);

  const maintenanceRooms = useMemo(() => {
    return rooms.filter(r => r.status === 'maintenance').length;
  }, [rooms]);

  const availableRooms = totalRooms - occupiedRooms - maintenanceRooms;

  const occupancyRate = useMemo(() => {
    return totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  }, [totalRooms, occupiedRooms]);

  const totalRevenueThisMonth = useMemo(() => {
    // Sum of paid payments in July 2026
    return payments
      .filter(p => p.month === 'Juli' && p.year === 2026 && p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const pendingRevenueThisMonth = useMemo(() => {
    return payments
      .filter(p => p.month === 'Juli' && p.year === 2026 && p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const overdueRevenue = useMemo(() => {
    return payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // Format IDR helper
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Occupancy per Kos Location
  const chartDataKos = useMemo(() => {
    return kosList.map(kos => {
      const kosRooms = rooms.filter(r => r.kosId === kos.id);
      const kosOccupied = kosRooms.filter(r => r.status === 'occupied').length;
      const kosMaint = kosRooms.filter(r => r.status === 'maintenance').length;
      const kosAvail = kosRooms.length - kosOccupied - kosMaint;
      
      return {
        name: kos.name,
        Terisi: kosOccupied,
        Tersedia: kosAvail,
        Perbaikan: kosMaint,
      };
    });
  }, [kosList, rooms]);

  // Financial history chart data
  const revenueTrendData = [
    { name: 'Jan', Pendapatan: 75000000, Tunggakan: 5000000 },
    { name: 'Feb', Pendapatan: 82000000, Tunggakan: 4200000 },
    { name: 'Mar', Pendapatan: 88000000, Tunggakan: 3000000 },
    { name: 'Apr', Pendapatan: 94000000, Tunggakan: 6500000 },
    { name: 'Mei', Pendapatan: 101000000, Tunggakan: 4000000 },
    { name: 'Jun', Pendapatan: 105000000, Tunggakan: 2100000 },
    { name: 'Jul (Real-Time)', Pendapatan: totalRevenueThisMonth, Tunggakan: overdueRevenue + pendingRevenueThisMonth },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Occupancy */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tingkat Hunian</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">{occupancyRate}%</span>
              <span className="text-xs font-bold text-slate-500">({occupiedRooms}/{totalRooms} Unit)</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${occupancyRate}%` }} />
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Revenue */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pendapatan Masuk (Jul)</span>
            <div className="p-1.5 bg-green-50 text-green-600 rounded">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-slate-900 font-mono tracking-tight">{formatIDR(totalRevenueThisMonth)}</span>
            </div>
            <p className="text-[10px] text-green-600 font-bold flex items-center">
              ● Real-time berjalan
            </p>
          </div>
        </motion.div>

        {/* Metric 3: Pending/Unpaid */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Belum Bayar (Jul)</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-slate-900 font-mono tracking-tight">{formatIDR(pendingRevenueThisMonth)}</span>
            </div>
            <p className="text-[10px] text-amber-600 font-semibold italic">
              Menunggu jatuh tempo
            </p>
          </div>
        </motion.div>

        {/* Metric 4: Overdue/Arrears */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between space-y-3"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tunggakan (Overdue)</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-rose-600 font-mono tracking-tight">{formatIDR(overdueRevenue)}</span>
            </div>
            <p className="text-[10px] text-rose-500 font-bold underline cursor-pointer" onClick={() => onNavigate('payments')}>
              Kirim pengingat WhatsApp
            </p>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Financial Performance (2/3 width) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1.5 text-blue-600" />
                Tren Pendapatan & Tunggakan Bulanan
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Pemantauan real-time s.d Juli 2026</p>
            </div>
            <button 
              onClick={() => onNavigate('payments')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center hover:underline"
            >
              Kelola Tagihan <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
 
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueTrendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatIDR(value), '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Pendapatan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Tunggakan" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDebt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
 
        {/* Right: Room Occupancy Status per Kos (1/3 width) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <Building className="w-4 h-4 mr-1.5 text-blue-600" />
              Hunian Kamar per Kos
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Perbandingan status 6 lokasi kos</p>
          </div>
 
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataKos}
                layout="vertical"
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={80} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '4px' }} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Terisi" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Tersedia" stackId="a" fill="#e2e8f0" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Perbaikan" stackId="a" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Two Columns: Recent Check-in Activity & Empty/Available Rooms Quick Booking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Occupancy & Key Activity Monitor */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Key className="w-4 h-4 mr-1.5 text-blue-600" />
                Aktivitas Penghuni Terkini (Check-In)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Log masuk & serah terima kunci fisik kamar</p>
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center">
              <Activity className="w-3 h-3 mr-0.5 animate-pulse" /> Live System
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
            {doorLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 rounded px-2 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-[11px]">{log.tenantName}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{log.kosName} — {log.roomNumber}</p>
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="inline-block text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">
                    {log.action === 'unlock' ? 'Kunci Diserahkan' : 'Kunci Dikembalikan'}
                  </span>
                  <p className="text-[9px] text-slate-400 font-semibold">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Mini-Map / Booking Overview */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1.5 text-blue-600" />
              Ketersediaan Unit Terintegrasi
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Status 6 lokasi kos cabang saat ini</p>
          </div>
 
          <div className="grid grid-cols-2 gap-2">
            {kosList.map((kos) => {
              const kosRooms = rooms.filter(r => r.kosId === kos.id);
              const kosAvail = kosRooms.filter(r => r.status === 'available').length;
              return (
                <div 
                  key={kos.id} 
                  className="p-2.5 bg-slate-50 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-100/55 transition-colors flex items-center justify-between cursor-pointer"
                  onClick={() => onNavigate('rooms')}
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 text-[11px]">{kos.name}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{kos.address.split(',')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-blue-600 text-xs">{kosAvail} / 10</p>
                    <p className="text-[9px] text-slate-400 font-semibold">Kosong</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate('reservations')}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Reservasi Calon Penyewa</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
