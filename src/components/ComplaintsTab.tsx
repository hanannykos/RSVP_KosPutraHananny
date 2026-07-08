import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Wrench, 
  AlertOctagon, 
  CheckCircle, 
  Clock, 
  Plus, 
  FileText, 
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Send
} from 'lucide-react';
import { Kos, Room, Complaint } from '../types';

interface ComplaintsTabProps {
  kosList: Kos[];
  rooms: Room[];
  complaints: Complaint[];
  onAddComplaint: (compData: Omit<Complaint, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateComplaintStatus: (compId: string, status: 'pending' | 'in_progress' | 'resolved') => Promise<void>;
  whatsappTemplates?: {
    paymentReminder: string;
    complaintNotification: string;
  };
  onSendWhatsAppNotification: (complaint: Complaint, customMsg: string) => Promise<void>;
}

function maskTenantName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    const firstChar = parts[0][0];
    const maskLen = parts[0].length - 1;
    return maskLen > 0 ? firstChar + '*'.repeat(maskLen) : firstChar;
  }
  const firstWord = parts[0];
  const maskedParts = parts.slice(1).map(part => {
    if (part.length <= 1) return '*';
    return part[0] + '*'.repeat(part.length - 1);
  });
  return [firstWord, ...maskedParts].join(' ');
}

export default function ComplaintsTab({ 
  kosList, 
  rooms, 
  complaints, 
  onAddComplaint,
  onUpdateComplaintStatus,
  whatsappTemplates,
  onSendWhatsAppNotification
}: ComplaintsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // WhatsApp composer states
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const handleOpenWhatsAppComposer = (comp: Complaint) => {
    setActiveComplaint(comp);
    
    let msg = whatsappTemplates?.complaintNotification || `Halo Kak {nama}, laporan keluhan Anda mengenai "{isu}" di {kos} ({kamar}) saat ini telah diperbarui menjadi status: *{status}*.\n\nDetail Keluhan:\n"{details}"\n\nTerima kasih atas kesabarannya ya Kak! Kami akan terus berupaya memberikan kenyamanan hunian yang terbaik. 😊`;
    
    const statusLabel = comp.status === 'resolved' ? 'Selesai' : comp.status === 'in_progress' ? 'Diproses' : 'Antrean';
    
    msg = msg
      .replace(/{nama}/g, comp.tenantName)
      .replace(/{kamar}/g, comp.roomNumber)
      .replace(/{kos}/g, comp.kosName)
      .replace(/{isu}/g, comp.issue)
      .replace(/{status}/g, statusLabel)
      .replace(/{details}/g, comp.details);
      
    setCustomMsg(msg);
  };

  const handleSendNotification = async () => {
    if (!activeComplaint) return;
    setSending(true);
    try {
      await onSendWhatsAppNotification(activeComplaint, customMsg);
      setActiveComplaint(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // Add Form States
  const [compName, setCompName] = useState('');
  const [compKosId, setCompKosId] = useState('');
  const [compRoomId, setCompRoomId] = useState('');
  const [compIssue, setCompIssue] = useState('');
  const [compDetails, setCompDetails] = useState('');
  const [compSeverity, setCompSeverity] = useState<'low' | 'medium' | 'high'>('medium');

  // Filtered rooms for selected Kos in form
  const availableRoomsForSelectedKos = useMemo(() => {
    if (!compKosId) return [];
    return rooms.filter(r => r.kosId === compKosId);
  }, [rooms, compKosId]);

  // Filtered complaints list
  const filteredComplaints = useMemo(() => {
    if (filter === 'all') return complaints;
    return complaints.filter(c => c.status === filter);
  }, [complaints, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName || !compKosId || !compRoomId || !compIssue || !compDetails) {
      alert('Mohon lengkapi seluruh kolom wajib.');
      return;
    }

    const selectedKos = kosList.find(k => k.id === compKosId);
    const selectedRoom = rooms.find(r => r.id === compRoomId);
    if (!selectedKos || !selectedRoom) return;

    try {
      await onAddComplaint({
        tenantId: 'tenant-custom', // general
        tenantName: compName,
        kosId: compKosId,
        kosName: selectedKos.name,
        roomId: compRoomId,
        roomNumber: selectedRoom.roomNumber,
        issue: compIssue,
        details: compDetails,
        severity: compSeverity,
        status: 'pending'
      });

      // Clear Form
      setCompName('');
      setCompKosId('');
      setCompRoomId('');
      setCompIssue('');
      setCompDetails('');
      setCompSeverity('medium');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyle = (sev: 'low' | 'medium' | 'high') => {
    switch(sev) {
      case 'high': return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-100';
      case 'low': return 'text-sky-700 bg-sky-50 border-sky-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header filter actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Filter Status Keluhan:</span>
          {[
            { val: 'all', lbl: 'Semua' },
            { val: 'pending', lbl: 'Antrean' },
            { val: 'in_progress', lbl: 'Diproses' },
            { val: 'resolved', lbl: 'Selesai' }
          ].map((st) => (
            <button
              key={st.val}
              onClick={() => setFilter(st.val)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === st.val 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.lbl}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto uppercase tracking-wider cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Laporkan Keluhan Baru</span>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Active complaints list (2/3) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
            Daftar Laporan Keluhan Pemeliharaan
          </h3>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredComplaints.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Tidak ada laporan keluhan saat ini.</p>
            ) : (
              filteredComplaints.map((comp) => (
                <div key={comp.id} className="p-3 border border-slate-200 bg-slate-50/50 rounded space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 bg-slate-100 text-slate-700 rounded">
                        <Wrench className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{comp.issue}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{maskTenantName(comp.tenantName)} — {comp.kosName} ({comp.roomNumber})</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getSeverityStyle(comp.severity)}`}>
                        {comp.severity === 'high' ? 'Darurat' : comp.severity === 'medium' ? 'Sedang' : 'Rendah'}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        comp.status === 'resolved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : comp.status === 'in_progress' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {comp.status === 'resolved' ? 'Selesai' : comp.status === 'in_progress' ? 'Diproses' : 'Antrean'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded border border-slate-200 leading-relaxed font-bold">
                    {comp.details}
                  </p>

                  {comp.documentationPhotos && comp.documentationPhotos.length > 0 && (
                    <div className="space-y-1 bg-white p-2 rounded border border-slate-100">
                      <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Dokumentasi Kendala ({comp.documentationPhotos.length} Foto):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {comp.documentationPhotos.map((photo, idx) => (
                          <div key={idx} className="relative group">
                            <img
                              src={photo}
                              alt={`Dokumentasi ${idx + 1}`}
                              className="w-16 h-16 object-cover rounded border border-slate-200 hover:border-amber-500 transition-colors"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions for managers to transition status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dilaporkan: {new Date(comp.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    
                    <div className="flex items-center space-x-1.5">
                      {comp.status === 'pending' && (
                        <button
                          onClick={() => onUpdateComplaintStatus(comp.id, 'in_progress')}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Tandai Diproses
                        </button>
                      )}
                      {comp.status === 'in_progress' && (
                        <button
                          onClick={() => onUpdateComplaintStatus(comp.id, 'resolved')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Tandai Selesai
                        </button>
                      )}
                      {comp.status === 'resolved' && (
                        <span className="text-[9px] text-emerald-600 font-bold flex items-center bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Selesai Diperbaiki
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenWhatsAppComposer(comp)}
                        className="p-1 border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded transition-colors cursor-pointer ml-1"
                        title="Kirim Notifikasi WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Summary Information */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200 flex items-center">
            <Sparkles className="w-4 h-4 mr-1 text-blue-600" /> SLA Pemeliharaan Kos
          </h3>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs leading-normal font-medium">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
              <span className="text-rose-600">Prioritas Darurat (High):</span>
              <span className="text-slate-500">Maks. 3 Jam SLA</span>
            </div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
              <span className="text-amber-600">Prioritas Sedang (Medium):</span>
              <span className="text-slate-500">Maks. 24 Jam SLA</span>
            </div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold">
              <span className="text-sky-600">Prioritas Rendah (Low):</span>
              <span className="text-slate-500">Maks. 48 Jam SLA</span>
            </div>
            <p className="text-[10px] text-slate-400 border-t border-slate-200 pt-2 leading-relaxed uppercase font-bold tracking-wide">
              Tim lapangan pemeliharaan siap siaga di 6 lokasi kos cabang untuk menjamin kepuasan dan kenyamanan hunian para penghuni kos kami secara real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Add Complaint Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <h4 className="text-sm font-bold">Buat Laporan Keluhan Baru</h4>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Nama */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Pelapor *</label>
                <input
                  type="text"
                  required
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                  placeholder="Masukkan nama Anda"
                />
              </div>

              {/* Kos Select */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pilih Lokasi Kos *</label>
                <select
                  required
                  value={compKosId}
                  onChange={(e) => {
                    setCompKosId(e.target.value);
                    setCompRoomId('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Lokasi Kos --</option>
                  {kosList.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              {/* Room Select */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pilih Kamar *</label>
                <select
                  required
                  disabled={!compKosId}
                  value={compRoomId}
                  onChange={(e) => setCompRoomId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">-- Pilih Kamar --</option>
                  {availableRoomsForSelectedKos.map(r => (
                    <option key={r.id} value={r.id}>{r.roomNumber}</option>
                  ))}
                </select>
              </div>

              {/* Judul Keluhan */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Topik Isu / Masalah *</label>
                <input
                  type="text"
                  required
                  value={compIssue}
                  onChange={(e) => setCompIssue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                  placeholder="Contoh: Lampu Kamar Mandi Mati"
                />
              </div>

              {/* Severity */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tingkat Darurat</label>
                <select
                  value={compSeverity}
                  onChange={(e) => setCompSeverity(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                >
                  <option value="low">Rendah (Low)</option>
                  <option value="medium">Sedang (Medium)</option>
                  <option value="high">Darurat (High)</option>
                </select>
              </div>

              {/* Detail Keluhan */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detail Masalah *</label>
                <textarea
                  required
                  value={compDetails}
                  onChange={(e) => setCompDetails(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500 h-20 resize-none"
                  placeholder="Deskripsikan isu secara lengkap"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors mt-3 uppercase tracking-wider cursor-pointer"
              >
                Kirim Laporan Keluhan
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* WhatsApp Composer Modal */}
      {activeComplaint && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center">
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp Complaint Composer
                </span>
                <h4 className="text-sm font-bold">Kirim Status Keluhan Ke {activeComplaint.tenantName}</h4>
              </div>
              <button onClick={() => setActiveComplaint(null)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Penerima:</p>
                <p className="font-mono font-bold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
                  {activeComplaint.roomNumber} — {activeComplaint.tenantName}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider text-[9px]">Pesan WhatsApp (Template Otomatis)</label>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold outline-none h-44 resize-none leading-relaxed focus:border-blue-500 font-mono"
                />
              </div>

              <button
                onClick={handleSendNotification}
                disabled={sending}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded text-xs transition-colors shadow-xs flex items-center justify-center space-x-1.5 uppercase tracking-wider cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Mengirim...' : 'Kirim Notifikasi WhatsApp'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
