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
  Send,
  Trash2,
  Eye,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { Kos, Room, Complaint } from '../types';

interface ComplaintsTabProps {
  kosList: Kos[];
  rooms: Room[];
  complaints: Complaint[];
  onAddComplaint: (compData: Omit<Complaint, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateComplaintStatus: (compId: string, status: 'pending' | 'in_progress' | 'resolved') => Promise<void>;
  onDeleteComplaint?: (compId: string) => Promise<void>;
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
  onDeleteComplaint,
  whatsappTemplates,
  onSendWhatsAppNotification
}: ComplaintsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // WhatsApp composer states
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Preview & Dialog states
  const [previewComplaint, setPreviewComplaint] = useState<Complaint | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'confirm' | 'alert';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm
    });
  };

  const showCustomAlert = (title: string, message: string) => {
    setDialogConfig({
      isOpen: true,
      type: 'alert',
      title,
      message
    });
  };

  const handleDeleteComplaintClick = (compId: string) => {
    showCustomConfirm(
      'Hapus Laporan Keluhan',
      'Apakah Anda yakin ingin menghapus laporan keluhan ini secara permanen dari database?',
      async () => {
        if (onDeleteComplaint) {
          try {
            await onDeleteComplaint(compId);
            showCustomAlert('Berhasil', 'Laporan keluhan berhasil dihapus!');
          } catch (e) {
            console.error(e);
            showCustomAlert('Gagal', 'Gagal menghapus laporan keluhan.');
          }
        } else {
          showCustomAlert('Fitur Tidak Tersedia', 'Aksi hapus tidak didukung saat ini.');
        }
      }
    );
  };

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
                        type="button"
                        onClick={() => setPreviewComplaint(comp)}
                        className="p-1 border border-slate-200 text-slate-600 bg-slate-100/50 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title="Preview Detail Keluhan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppComposer(comp)}
                        className="p-1 border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                        title="Kirim Notifikasi WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteComplaintClick(comp.id)}
                        className="p-1 border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Hapus Laporan Keluhan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {/* Complaint Preview Modal */}
      {previewComplaint && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold">Detail Laporan Keluhan</h4>
              </div>
              <button 
                onClick={() => setPreviewComplaint(null)} 
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Header Details */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Pelapor</p>
                  <p className="text-xs font-bold text-slate-800">{previewComplaint.tenantName}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Lokasi Kos / Kamar</p>
                  <p className="text-xs font-bold text-slate-800">{previewComplaint.kosName} — {previewComplaint.roomNumber}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Prioritas</p>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border inline-block uppercase tracking-wider mt-0.5 ${getSeverityStyle(previewComplaint.severity)}`}>
                    {previewComplaint.severity === 'high' ? 'Darurat (High)' : previewComplaint.severity === 'medium' ? 'Sedang (Medium)' : 'Rendah (Low)'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Status</p>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded inline-block uppercase tracking-wider mt-0.5 ${
                    previewComplaint.status === 'resolved' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : previewComplaint.status === 'in_progress' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {previewComplaint.status === 'resolved' ? 'Selesai' : previewComplaint.status === 'in_progress' ? 'Diproses' : 'Antrean'}
                  </span>
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Topik Isu / Masalah</p>
                <p className="text-xs font-extrabold text-slate-900 bg-blue-50/40 p-2.5 rounded border border-blue-100/50">
                  {previewComplaint.issue}
                </p>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Detail / Deskripsi Kendala</p>
                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed font-bold whitespace-pre-wrap">
                  {previewComplaint.details}
                </div>
              </div>

              {/* Dokumentasi foto */}
              {previewComplaint.documentationPhotos && previewComplaint.documentationPhotos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Foto Dokumentasi Kendala ({previewComplaint.documentationPhotos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {previewComplaint.documentationPhotos.map((photo, idx) => (
                      <div key={idx} className="relative rounded overflow-hidden border border-slate-200">
                        <img
                          src={photo}
                          alt={`Dokumentasi ${idx + 1}`}
                          className="w-full h-32 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between border-t border-slate-100 pt-3">
                <span>ID Laporan: {previewComplaint.id}</span>
                <span>Waktu Masuk: {new Date(previewComplaint.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleOpenWhatsAppComposer(previewComplaint);
                  setPreviewComplaint(null);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-blue-200 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </button>

              <div className="flex items-center space-x-2">
                {previewComplaint.status === 'pending' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateComplaintStatus(previewComplaint.id, 'in_progress');
                      setPreviewComplaint(prev => prev ? { ...prev, status: 'in_progress' } : null);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Proses Keluhan
                  </button>
                )}
                {previewComplaint.status === 'in_progress' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateComplaintStatus(previewComplaint.id, 'resolved');
                      setPreviewComplaint(prev => prev ? { ...prev, status: 'resolved' } : null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Tandai Selesai
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewComplaint(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Elegant Custom Dialog Modal (Alert & Confirm) */}
      {dialogConfig && dialogConfig.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-lg border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="p-5 text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 border border-amber-100">
                {dialogConfig.type === 'confirm' ? (
                  <HelpCircle className="h-6 w-6 text-amber-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-900">{dialogConfig.title}</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {dialogConfig.message}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
              {dialogConfig.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDialogConfig(null)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                      setDialogConfig(null);
                    }}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Hapus
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialogConfig(null)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  OK
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
