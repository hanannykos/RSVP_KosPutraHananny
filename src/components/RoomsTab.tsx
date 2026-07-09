import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  Wrench, 
  Eye, 
  Key, 
  DollarSign, 
  RefreshCw, 
  Info, 
  Lock, 
  Plus, 
  UserCheck,
  Calendar
} from 'lucide-react';
import { Kos, Room, Tenant } from '../types';

interface RoomsTabProps {
  kosList: Kos[];
  rooms: Room[];
  tenants: Tenant[];
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  onUpdateTenant: (tenantId: string, updates: Partial<Tenant>) => Promise<void>;
}

export default function RoomsTab({ 
  kosList, 
  rooms, 
  tenants, 
  onUpdateRoom,
  onUpdateTenant
}: RoomsTabProps) {
  const [selectedKosId, setSelectedKosId] = useState<string>(kosList[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'available' | 'occupied' | 'maintenance'>('available');
  const [payMonthly, setPayMonthly] = useState<boolean>(true);
  const [payThreeMonths, setPayThreeMonths] = useState<boolean>(true);
  const [paySixMonths, setPaySixMonths] = useState<boolean>(true);
  const [payYearly, setPayYearly] = useState<boolean>(true);
  const [passcodeVisible, setPasscodeVisible] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [targetRoomId, setTargetRoomId] = useState<string>('');

  // Selected Kos details
  const selectedKos = useMemo(() => {
    return kosList.find(k => k.id === selectedKosId);
  }, [kosList, selectedKosId]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchKos = r.kosId === selectedKosId;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchKos && matchStatus;
    });
  }, [rooms, selectedKosId, statusFilter]);

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setNewPrice(room.price.toString());
    setNewStatus(room.status);
    setPasscodeVisible(false);
    setPayMonthly(room.payMonthly !== false);
    setPayThreeMonths(room.payThreeMonths !== false);
    setPaySixMonths(room.paySixMonths !== false);
    setPayYearly(room.payYearly !== false);
    setTargetRoomId('');
  };

  const handleSaveRoom = async () => {
    if (!editingRoom) return;
    setUpdating(true);
    try {
      const updates: Partial<Room> = {
        price: Number(newPrice),
        status: newStatus,
        payMonthly,
        payThreeMonths,
        paySixMonths,
        payYearly
      };
      await onUpdateRoom(editingRoom.id, updates);
      setEditingRoom(null);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleMoveRoom = async () => {
    if (!editingRoom || !targetRoomId) return;
    const activeTenant = tenants.find(t => t.id === editingRoom.currentTenantId);
    if (!activeTenant) {
      alert('Kamar asal harus memiliki penyewa aktif!');
      return;
    }

    const targetRoom = rooms.find(r => r.id === targetRoomId);
    if (!targetRoom) {
      alert('Kamar tujuan tidak ditemukan!');
      return;
    }

    if (targetRoom.status !== 'available') {
      alert('Kamar tujuan harus dalam status kosong (available)!');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin memindahkan ${activeTenant.name} dari Kamar ${editingRoom.roomNumber} ke Kamar ${targetRoom.roomNumber}?`)) {
      return;
    }

    setUpdating(true);
    try {
      // 1. Update Tenant doc
      await onUpdateTenant(activeTenant.id, {
        roomId: targetRoom.id,
        roomNumber: targetRoom.roomNumber,
        passcode: targetRoom.passcode || ''
      });

      // 2. Update Old Room (set as available and clear currentTenantId)
      await onUpdateRoom(editingRoom.id, {
        status: 'available',
        currentTenantId: null
      });

      // 3. Update New Room (set as occupied and assign currentTenantId)
      await onUpdateRoom(targetRoom.id, {
        status: 'occupied',
        currentTenantId: activeTenant.id
      });

      alert(`Berhasil memindahkan ${activeTenant.name} ke Kamar ${targetRoom.roomNumber}! Data penyewa telah disinkronkan secara otomatis.`);
      setEditingRoom(null);
    } catch (err) {
      console.error('Failed to move room:', err);
      alert('Gagal memindahkan kamar: ' + err);
    } finally {
      setUpdating(false);
    }
  };

  const handleGeneratePasscode = async () => {
    if (!editingRoom) return;
    setUpdating(true);
    try {
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      await onUpdateRoom(editingRoom.id, { passcode: generated });
      setEditingRoom({ ...editingRoom, passcode: generated });
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '';
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = monthsIndo[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getNextBillingDate = (dateStr: string, months: number) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + months);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="space-y-4">
      {/* House Selector tabs */}
      <div className="flex flex-wrap gap-2">
        {kosList.map((kos) => (
          <button
            key={kos.id}
            onClick={() => setSelectedKosId(kos.id)}
            className={`px-3 py-2 rounded font-bold text-xs transition-all flex items-center space-x-2 border uppercase tracking-wider ${
              selectedKosId === kos.id 
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{kos.name}</span>
          </button>
        ))}
      </div>

      {/* House Details Panel */}
      {selectedKos && (
        <div className="bg-slate-900 text-slate-100 rounded-lg border border-slate-700 p-4 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1.5 z-10">
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
              KOS CABANG RESMI
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">{selectedKos.name}</h2>
            <p className="text-xs text-slate-400 max-w-lg">{selectedKos.address}</p>
            <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center"><CheckCircle className="w-3.5 h-3.5 mr-1 text-blue-400" /> 10 Unit Kamar</span>
              <span className="flex items-center"><DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Mulai {formatIDR(selectedKos.basePrice)}</span>
            </div>
          </div>
          <div className="z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded p-3 self-start md:self-auto flex items-center space-x-3.5">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-400 font-mono">
                {rooms.filter(r => r.kosId === selectedKos.id && r.status === 'occupied').length}
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Terisi</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {rooms.filter(r => r.kosId === selectedKos.id && r.status === 'available').length}
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Kosong</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-400 font-mono">
                {rooms.filter(r => r.kosId === selectedKos.id && r.status === 'maintenance').length}
              </p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Servis</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Rooms List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Status & Detail Kunci Kamar</h3>
        <div className="flex items-center space-x-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filter:</span>
          {['all', 'available', 'occupied', 'maintenance'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                statusFilter === filter 
                  ? 'bg-slate-200 border-slate-300 text-slate-800' 
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'all' ? 'Semua' : filter === 'available' ? 'Kosong' : filter === 'occupied' ? 'Terisi' : 'Servis'}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {filteredRooms.map((room, idx) => {
          const tenant = tenants.find(t => t.id === room.currentTenantId);
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: idx * 0.01 }}
              onClick={() => handleEditRoom(room)}
              className={`bg-white rounded-lg p-3 border transition-all hover:shadow-sm cursor-pointer flex flex-col justify-between h-36 ${
                room.status === 'occupied' 
                  ? 'border-blue-200 bg-blue-50/10 hover:border-blue-400' 
                  : room.status === 'maintenance'
                    ? 'border-slate-200 bg-slate-50 hover:border-slate-400'
                    : 'border-emerald-200 bg-emerald-50/10 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">Unit {room.roomNumber}</p>
                  <p className="text-[10px] text-slate-500 font-bold font-mono">{formatIDR(room.price)}/bln</p>
                </div>
                <span className={`p-1 rounded ${
                  room.status === 'occupied' 
                    ? 'bg-blue-50 text-blue-600' 
                    : room.status === 'maintenance'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {room.status === 'occupied' && <UserCheck className="w-3.5 h-3.5" />}
                  {room.status === 'maintenance' && <Wrench className="w-3.5 h-3.5" />}
                  {room.status === 'available' && <CheckCircle className="w-3.5 h-3.5" />}
                </span>
              </div>

              <div className="space-y-1">
                {room.status === 'occupied' && tenant ? (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-800 truncate">{tenant.name}</p>
                    <p className="text-[9px] text-slate-400 font-medium">Masuk {tenant.checkInDate}</p>
                  </div>
                ) : room.status === 'maintenance' ? (
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wider">Pemeliharaan</p>
                ) : (
                  <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Unit Kosong</p>
                )}
                
                {/* Active Payment Terms Badges */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100/60 mt-1">
                  {room.payMonthly !== false && (
                    <span className="text-[8px] font-extrabold bg-blue-50 text-blue-600 px-1 py-0.5 rounded uppercase tracking-wider">Bln</span>
                  )}
                  {room.payThreeMonths !== false && (
                    <span className="text-[8px] font-extrabold bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded uppercase tracking-wider">3Bln</span>
                  )}
                  {room.paySixMonths !== false && (
                    <span className="text-[8px] font-extrabold bg-purple-50 text-purple-600 px-1 py-0.5 rounded uppercase tracking-wider">6Bln</span>
                  )}
                  {room.payYearly !== false && (
                    <span className="text-[8px] font-extrabold bg-amber-50 text-amber-600 px-1 py-0.5 rounded uppercase tracking-wider">Thn</span>
                  )}
                  {room.payMonthly === false && room.payThreeMonths === false && room.paySixMonths === false && room.payYearly === false && (
                    <span className="text-[8px] font-extrabold bg-rose-50 text-rose-600 px-1 py-0.5 rounded uppercase tracking-wider">Nonaktif</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Edit Room Drawer/Modal */}
      {editingRoom && (() => {
        const activeTenant = tenants.find(t => t.id === editingRoom.currentTenantId);
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
                <div>
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">{editingRoom.kosName}</p>
                  <h4 className="text-sm font-bold">Detail Unit {editingRoom.roomNumber}</h4>
                </div>
                <button 
                  onClick={() => setEditingRoom(null)}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  Tutup
                </button>
              </div>

               {/* Modal Body */}
              <div className="p-4 space-y-4">
                {activeTenant && (
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg space-y-2">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Penghuni Aktif Unit Ini</p>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                          {activeTenant.name.substring(0, 2)}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800">{activeTenant.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium font-mono leading-none">
                            WA: {activeTenant.phone} | NIK: {activeTenant.ktpNik}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium font-mono leading-none">
                            Masuk: {activeTenant.checkInDate}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pindah Kamar Section */}
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg space-y-2">
                      <p className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">Pindah Kamar (Room Transfer)</p>
                      <p className="text-[10px] text-slate-500 font-medium leading-normal">
                        Pindahkan penyewa ini ke kamar lain yang kosong secara otomatis. Semua data penyewa akan disinkronkan.
                      </p>
                      
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Pilih Kamar Kosong</label>
                        <div className="flex gap-2">
                          <select
                            value={targetRoomId}
                            onChange={(e) => setTargetRoomId(e.target.value)}
                            className="flex-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-1.5 cursor-pointer focus:outline-indigo-500"
                          >
                            <option value="">-- Pilih Kamar Kosong --</option>
                            {rooms
                              .filter(r => r.status === 'available' && r.id !== editingRoom.id && r.kosId === editingRoom.kosId)
                              .map(r => (
                                <option key={r.id} value={r.id}>
                                  Kamar {r.roomNumber} - {formatIDR(r.price)} / bln
                                </option>
                              ))
                            }
                          </select>
                          
                          <button
                            type="button"
                            onClick={handleMoveRoom}
                            disabled={!targetRoomId || updating}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Pindahkan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Status Unit Kamar</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'available', lbl: 'Kosong', icon: CheckCircle, cls: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
                      { val: 'occupied', lbl: 'Terisi', icon: UserCheck, cls: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
                      { val: 'maintenance', lbl: 'Servis', icon: Wrench, cls: 'border-amber-200 text-amber-700 hover:bg-amber-50' }
                    ].map((st) => {
                      const IconComp = st.icon;
                      return (
                        <button
                          key={st.val}
                          onClick={() => setNewStatus(st.val as any)}
                          className={`p-2 rounded border text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-all ${
                            newStatus === st.val 
                              ? 'bg-slate-900 border-slate-950 text-white' 
                              : `bg-white border-slate-200 text-slate-600 ${st.cls}`
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span>{st.lbl}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Editor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Harga Sewa Bulanan (IDR)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-2 text-xs text-slate-400 font-bold">Rp</div>
                    <input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded py-1.5 pl-8 pr-4 text-xs font-bold font-mono outline-none"
                      placeholder="Contoh: 1500000"
                    />
                  </div>
                </div>

                {/* Payment Options (Opsi Pembayaran) */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">Opsi Pembayaran Aktif</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { state: payMonthly, setter: setPayMonthly, label: 'Bulanan' },
                      { state: payThreeMonths, setter: setPayThreeMonths, label: 'Per-3 Bulan' },
                      { state: paySixMonths, setter: setPaySixMonths, label: 'Per-6 Bulan' },
                      { state: payYearly, setter: setPayYearly, label: 'Tahunan' }
                    ].map((opt, idx) => (
                      <label key={idx} className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 p-2 rounded cursor-pointer transition-all select-none">
                        <input
                          type="checkbox"
                          checked={opt.state}
                          onChange={(e) => opt.setter(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Kalkulasi Tanggal Penagihan Otomatis Berdasar Tanggal Masuk */}
                {activeTenant && (
                  <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg space-y-2">
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Penagihan Otomatis (Masuk: {formatDateIndo(activeTenant.checkInDate)})</span>
                    </div>
                    
                    <div className="space-y-1 text-[11px] font-medium text-slate-600">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1">
                        Estimasi Tanggal Penagihan Berikutnya:
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {payMonthly && (
                          <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-blue-100/60 font-mono">
                            <span className="font-sans font-bold text-slate-700">Bulanan (1 Bln):</span>
                            <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                              {formatDateIndo(getNextBillingDate(activeTenant.checkInDate, 1))}
                            </span>
                          </div>
                        )}
                        {payThreeMonths && (
                          <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-blue-100/60 font-mono">
                            <span className="font-sans font-bold text-indigo-700">Per-3 Bulan (3 Bln):</span>
                            <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                              {formatDateIndo(getNextBillingDate(activeTenant.checkInDate, 3))}
                            </span>
                          </div>
                        )}
                        {paySixMonths && (
                          <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-blue-100/60 font-mono">
                            <span className="font-sans font-bold text-purple-700">Per-6 Bulan (6 Bln):</span>
                            <span className="font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                              {formatDateIndo(getNextBillingDate(activeTenant.checkInDate, 6))}
                            </span>
                          </div>
                        )}
                        {payYearly && (
                          <div className="flex justify-between items-center bg-white px-2 py-1 rounded border border-blue-100/60 font-mono">
                            <span className="font-sans font-bold text-amber-700">Tahunan (12 Bln):</span>
                            <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                              {formatDateIndo(getNextBillingDate(activeTenant.checkInDate, 12))}
                            </span>
                          </div>
                        )}
                        {!payMonthly && !payThreeMonths && !paySixMonths && !payYearly && (
                          <p className="text-rose-500 font-bold italic text-center text-[10px] uppercase tracking-wider bg-rose-50 p-2 rounded border border-rose-100">
                            Aktifkan minimal satu opsi pembayaran untuk melihat kalkulasi penagihan.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <button
                  onClick={handleSaveRoom}
                  disabled={updating}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded text-xs transition-colors uppercase tracking-wider cursor-pointer"
                >
                  {updating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
