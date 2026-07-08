import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Send, 
  BookOpen, 
  Clock3, 
  Bell, 
  Smartphone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  ListFilter,
  Eye,
  Edit,
  FileText,
  Upload,
  Printer,
  Calendar
} from 'lucide-react';
import { Payment } from '../types';

interface PaymentsTabProps {
  payments: Payment[];
  onMarkPaid: (paymentId: string) => Promise<void>;
  onSendWhatsAppReminder: (payment: Payment, customMsg?: string) => Promise<void>;
  whatsappLogs: any[];
  onRefreshLogs: () => void;
  whatsappTemplates?: {
    paymentReminder: string;
    complaintNotification: string;
  };
  onUpdatePayment?: (paymentId: string, updatedData: Partial<Payment>) => Promise<void>;
}

export default function PaymentsTab({ 
  payments, 
  onMarkPaid, 
  onSendWhatsAppReminder,
  whatsappLogs,
  onRefreshLogs,
  whatsappTemplates,
  onUpdatePayment
}: PaymentsTabProps) {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [reminderPayment, setReminderPayment] = useState<Payment | null>(null);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Modal states
  const [selectedPaymentForView, setSelectedPaymentForView] = useState<Payment | null>(null);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<Payment | null>(null);
  const [selectedPaymentForTransfer, setSelectedPaymentForTransfer] = useState<Payment | null>(null);
  const [invoicePayment, setInvoicePayment] = useState<Payment | null>(null);

  // Edit form states
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMonth, setEditMonth] = useState<string>('');
  const [editYear, setEditYear] = useState<number>(2026);
  const [editStatus, setEditStatus] = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [editDeadlineDate, setEditDeadlineDate] = useState<string>('');
  const [editPaymentOption, setEditPaymentOption] = useState<string>('Bulanan');
  const [editBillingDate, setEditBillingDate] = useState<string>('');

  // Input Proof of Transfer states
  const [proofUrl, setProofUrl] = useState<string>('');
  const [inputtingTransfer, setInputtingTransfer] = useState<boolean>(false);

  // Handlers
  const handleOpenEdit = (p: Payment) => {
    setSelectedPaymentForEdit(p);
    setEditAmount(p.amount);
    setEditMonth(p.month);
    setEditYear(p.year);
    setEditStatus(p.status);
    setEditDeadlineDate(p.deadlineDate || '');
    setEditPaymentOption(p.paymentOption || 'Bulanan');
    setEditBillingDate(p.billingDate || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForEdit || !onUpdatePayment) return;

    try {
      await onUpdatePayment(selectedPaymentForEdit.id, {
        amount: Number(editAmount),
        month: editMonth,
        year: Number(editYear),
        status: editStatus,
        deadlineDate: editDeadlineDate || undefined,
        paymentOption: editPaymentOption || undefined,
        billingDate: editBillingDate || undefined,
        paidAt: editStatus === 'paid' ? (selectedPaymentForEdit.paidAt || new Date().toISOString()) : undefined
      });
      setSelectedPaymentForEdit(null);
      alert('Perubahan data tagihan berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan.');
    }
  };

  const handleOpenTransfer = (p: Payment) => {
    setSelectedPaymentForTransfer(p);
    setProofUrl(p.proofOfTransferUrl || '');
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForTransfer || !onUpdatePayment) return;

    setInputtingTransfer(true);
    try {
      await onUpdatePayment(selectedPaymentForTransfer.id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        proofOfTransferUrl: proofUrl.trim() || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600', // default mock proof image if empty
        proofOfTransferUploadedAt: new Date().toISOString()
      });
      setSelectedPaymentForTransfer(null);
      setProofUrl('');
      alert('Bukti transfer berhasil dimasukkan, status diubah menjadi Lunas!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan bukti transfer.');
    } finally {
      setInputtingTransfer(false);
    }
  };

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = p.tenantName.toLowerCase().includes(search.toLowerCase()) || p.roomNumber.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || p.status === filter;
      return matchSearch && matchFilter;
    });
  }, [payments, search, filter]);

  const handleOpenReminder = (pay: Payment) => {
    setReminderPayment(pay);
    
    let msg = whatsappTemplates?.paymentReminder || `Halo Kak {nama}, kami ingin menginfokan tagihan sewa bulanan {kos} ({kamar}) sebesar {jumlah} untuk periode {bulan} {tahun} telah jatuh tempo. \n\nPembayaran dapat ditransfer ke:\nRekening Mandiri: 123-456-789-0 a.n Hananny Kos.\n\nMohon konfirmasi jika sudah transfer ya Kak. Terima kasih! 😊`;
    
    msg = msg
      .replace(/{nama}/g, pay.tenantName)
      .replace(/{kamar}/g, pay.roomNumber)
      .replace(/{kos}/g, pay.kosName)
      .replace(/{jumlah}/g, formatIDR(pay.amount))
      .replace(/{bulan}/g, pay.month)
      .replace(/{tahun}/g, String(pay.year));

    setCustomMsg(msg);
  };

  const handleSendReminder = async () => {
    if (!reminderPayment) return;
    setSending(true);
    try {
      await onSendWhatsAppReminder(reminderPayment, customMsg);
      setReminderPayment(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-2">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded py-1.5 pl-9 pr-4 text-xs font-bold outline-none focus:border-blue-500"
              placeholder="Cari penyewa atau kamar..."
            />
          </div>
          <div className="flex gap-1 bg-white p-1 rounded border border-slate-200 self-start sm:self-auto">
            {[
              { val: 'all', lbl: 'Semua' },
              { val: 'paid', lbl: 'Lunas' },
              { val: 'pending', lbl: 'Menunggu' },
              { val: 'overdue', lbl: 'Menunggak' }
            ].map(btn => (
              <button
                key={btn.val}
                onClick={() => setFilter(btn.val)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  filter === btn.val 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {btn.lbl}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onRefreshLogs}
          className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded text-xs flex items-center space-x-1.5 self-start md:self-auto transition-colors uppercase tracking-wider cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Log WhatsApp</span>
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Unpaid / All Payments table (Left 2/3) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histori & Status Tagihan Bulanan</h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Periode Juli 2026
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
            {filteredPayments.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Tidak ada data tagihan.</p>
            ) : (
              filteredPayments.map((p) => (
                <div key={p.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 px-2.5 rounded transition-all">
                  <div className="flex items-start space-x-2.5">
                    <div className={`p-2 rounded shrink-0 ${
                      p.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : p.status === 'overdue' 
                          ? 'bg-rose-50 text-rose-600 animate-pulse'
                          : 'bg-amber-50 text-amber-600'
                    }`}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-xs text-slate-800">{p.tenantName}</p>
                        <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                          p.status === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : p.status === 'overdue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {p.status === 'paid' ? 'Lunas' : p.status === 'overdue' ? 'Menunggak' : 'Menunggu'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">
                        {p.kosName} — {p.roomNumber}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.invoiceNumber}</p>
                      
                      {/* Deadline Date Display */}
                      <div className="flex items-center space-x-1.5 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${
                          p.status === 'paid'
                            ? 'text-slate-400'
                            : p.status === 'overdue'
                              ? 'text-rose-600 font-extrabold animate-pulse'
                              : 'text-amber-600'
                        }`}>
                          Tenggat: {p.deadlineDate ? p.deadlineDate : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-end md:self-auto shrink-0">
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-bold text-xs text-slate-800 font-mono">{formatIDR(p.amount)}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Bulan: {p.month} {p.year}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* View Button */}
                      <button
                        onClick={() => setSelectedPaymentForView(p)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                        title="Lihat Detail Tagihan"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Generate Invoice Button */}
                      <button
                        onClick={() => setInvoicePayment(p)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded transition-colors cursor-pointer"
                        title="Generate Invoice / Kwitansi"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded transition-colors cursor-pointer"
                        title="Edit Data Tagihan"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Input Proof of Transfer Button */}
                      <button
                        onClick={() => handleOpenTransfer(p)}
                        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-100 rounded transition-colors cursor-pointer"
                        title="Input Bukti Transfer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>

                      {p.status !== 'paid' ? (
                        <>
                          <button
                            onClick={() => onMarkPaid(p.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold shadow-xs transition-colors uppercase tracking-wider cursor-pointer"
                            title="Tandai Sudah Lunas"
                          >
                            Set Lunas
                          </button>
                          <button
                            onClick={() => handleOpenReminder(p)}
                            className="p-1 border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Kirim Notifikasi Pengingat WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center space-x-1 text-[9px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lunas</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WhatsApp Notification Simulator (Right 1/3) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <Smartphone className="w-4 h-4 mr-1.5 text-blue-600 animate-bounce" />
              Notifikasi WhatsApp Live Log
            </h3>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Simulasi Server
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {whatsappLogs.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Belum ada riwayat notifikasi dikirim.</p>
            ) : (
              whatsappLogs.map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-800">Ke: {log.tenantName} ({log.roomNumber})</span>
                    <span className="text-[8px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold uppercase">Sent</span>
                  </div>
                  <p className="text-[10px] text-slate-600 bg-white border border-slate-200 p-2 rounded font-mono whitespace-pre-wrap leading-tight">
                    {log.message}
                  </p>
                  <p className="text-[9px] text-slate-400 text-right font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Custom Reminder Message Modal */}
      {reminderPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center">
                  <Bell className="w-3.5 h-3.5 mr-1" /> WhatsApp Reminder Composer
                </span>
                <h4 className="text-sm font-bold">Kirim Tagihan Ke {reminderPayment.tenantName}</h4>
              </div>
              <button onClick={() => setReminderPayment(null)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-600 uppercase tracking-wider text-[9px]">Nomor Penerima:</p>
                <p className="font-mono font-bold text-slate-800 bg-slate-50 p-2 rounded border border-slate-200">
                  {reminderPayment.roomNumber} — {reminderPayment.tenantName} (0812345XXXX)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider text-[9px]">Pesan WhatsApp (Template Otomatis)</label>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold outline-none h-44 resize-none leading-relaxed focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleSendReminder}
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

      {/* VIEW PAYMENT MODAL */}
      {selectedPaymentForView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Rincian Tagihan Bulanan
                </span>
                <h4 className="text-sm font-bold">{selectedPaymentForView.invoiceNumber}</h4>
              </div>
              <button onClick={() => setSelectedPaymentForView(null)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Tutup
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Penyewa</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedPaymentForView.tenantName}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Unit Kamar</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedPaymentForView.kosName} — {selectedPaymentForView.roomNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Bulan & Tahun</p>
                  <p className="font-bold text-slate-800">{selectedPaymentForView.month} {selectedPaymentForView.year}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Jumlah Tagihan</p>
                  <p className="font-bold text-blue-600 font-mono text-sm">{formatIDR(selectedPaymentForView.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Opsi Pembayaran</p>
                  <p className="font-bold text-slate-800">{selectedPaymentForView.paymentOption || 'Bulanan'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Batas Tenggat</p>
                  <p className="font-bold text-amber-600">{selectedPaymentForView.deadlineDate || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedPaymentForView.status === 'paid' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedPaymentForView.status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}
                  </span>
                </div>
                {selectedPaymentForView.paidAt && (
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-400 uppercase text-[9px]">Tanggal Bayar</p>
                    <p className="font-bold text-slate-800 font-mono">{new Date(selectedPaymentForView.paidAt).toLocaleDateString('id-ID')} {new Date(selectedPaymentForView.paidAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                  </div>
                )}
              </div>

              {/* Display Proof of Transfer if any */}
              <div className="space-y-2">
                <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Dokumentasi Bukti Transfer:</p>
                {selectedPaymentForView.proofOfTransferUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2 text-center space-y-1.5">
                    <img
                      src={selectedPaymentForView.proofOfTransferUrl}
                      alt="Bukti Transfer"
                      className="max-h-48 mx-auto rounded border border-slate-300 object-contain shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-[10px] text-slate-400 font-mono">Diunggah pada: {selectedPaymentForView.proofOfTransferUploadedAt ? new Date(selectedPaymentForView.proofOfTransferUploadedAt).toLocaleString('id-ID') : '-'}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Bukti transfer belum diunggah oleh penyewa atau admin.</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* EDIT PAYMENT MODAL */}
      {selectedPaymentForEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center">
                  <Edit className="w-3.5 h-3.5 mr-1" /> Edit Data Tagihan
                </span>
                <h4 className="text-sm font-bold">Tagihan: {selectedPaymentForEdit.invoiceNumber}</h4>
              </div>
              <button onClick={() => setSelectedPaymentForEdit(null)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Jumlah Tagihan (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-3 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Opsi Pembayaran *</label>
                  <select
                    value={editPaymentOption}
                    onChange={(e) => setEditPaymentOption(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="3 Bulanan">3 Bulanan</option>
                    <option value="6 Bulanan">6 Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Bulan Tagihan *</label>
                  <select
                    value={editMonth}
                    onChange={(e) => setEditMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                  >
                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Tahun Tagihan *</label>
                  <input
                    type="number"
                    required
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-3 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Tanggal Penagihan</label>
                  <input
                    type="date"
                    value={editBillingDate}
                    onChange={(e) => setEditBillingDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-3 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Batas Tenggat (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={editDeadlineDate}
                    onChange={(e) => setEditDeadlineDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-3 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Status Tagihan *</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="pending">Menunggu Pembayaran</option>
                  <option value="paid">Lunas</option>
                  <option value="overdue">Menunggak (Overdue)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForEdit(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* INPUT PROOF OF TRANSFER MODAL */}
      {selectedPaymentForTransfer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider flex items-center">
                  <Upload className="w-3.5 h-3.5 mr-1" /> Input Bukti Pembayaran (Transfer)
                </span>
                <h4 className="text-sm font-bold">Penyewa: {selectedPaymentForTransfer.tenantName}</h4>
              </div>
              <button onClick={() => setSelectedPaymentForTransfer(null)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="p-5 space-y-4 text-left">
              <div className="p-3 bg-purple-50 border border-purple-100 text-purple-800 rounded text-[11px] leading-relaxed">
                Penyewa telah melakukan transfer? Masukkan URL bukti transfer dari WhatsApp atau pilih dari salah satu contoh template bukti struk transfer di bawah ini untuk simulasi cepat.
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">URL Gambar Bukti Transfer *</label>
                <input
                  type="text"
                  required
                  placeholder="https://contoh.com/struk.jpg"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-3 text-xs font-bold font-mono transition-all"
                />
              </div>

              {/* Preset Buttons for easy selection */}
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pilih Cepat Bukti Transfer Simulasi:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProofUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600')}
                    className="p-2 border border-slate-200 hover:border-purple-500 hover:bg-purple-50 rounded text-left transition-all cursor-pointer"
                  >
                    <p className="font-bold text-[10px] text-slate-800">Mandiri Transfer</p>
                    <p className="text-[9px] text-slate-400 font-mono">Preset Struk Mandiri</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProofUrl('https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=600')}
                    className="p-2 border border-slate-200 hover:border-purple-500 hover:bg-purple-50 rounded text-left transition-all cursor-pointer"
                  >
                    <p className="font-bold text-[10px] text-slate-800">BCA KlikPay</p>
                    <p className="text-[9px] text-slate-400 font-mono">Preset Struk BCA</p>
                  </button>
                </div>
              </div>

              {proofUrl && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pratinjau Bukti:</p>
                  <img src={proofUrl} alt="Preview" className="max-h-24 mx-auto object-contain rounded border" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForTransfer(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inputtingTransfer}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  {inputtingTransfer ? 'Menyimpan...' : 'Simpan Bukti Transfer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* GENERATE INVOICE MODAL (BEAUTIFUL PRINTABLE RECEIPT) */}
      {invoicePayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-lg border border-slate-300 shadow-2xl overflow-hidden my-8"
          >
            {/* Header controls */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800 print:hidden">
              <div className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Preview Invoice & Kwitansi Resmi</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center space-x-1.5 uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Save PDF</span>
                </button>
                <button onClick={() => setInvoicePayment(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer">
                  Tutup
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 space-y-6 text-slate-800 bg-white" id="printable-invoice">
              {/* Invoice Logo and Title */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div className="space-y-1">
                  <h1 className="text-xl font-black uppercase tracking-widest text-slate-900">HANANNY KOS</h1>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Hunian Nyaman, Aman & Terpercaya<br />
                    Email: hanannykos@gmail.com | WA: +62 812-3456-7890
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-xs font-black bg-blue-100 text-blue-800 px-3 py-1 rounded uppercase tracking-wider">INVOICE</span>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1">{invoicePayment.invoiceNumber}</p>
                </div>
              </div>

              {/* Bill To and Bill Details */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">DITAGIHKAN KEPADA:</p>
                  <p className="font-extrabold text-slate-900 text-sm uppercase">{invoicePayment.tenantName}</p>
                  <p className="text-slate-500 font-semibold leading-normal">
                    Kamar No: <span className="font-bold text-slate-800">{invoicePayment.roomNumber}</span><br />
                    Cabang: <span className="font-bold text-slate-800">{invoicePayment.kosName}</span>
                  </p>
                </div>
                <div className="space-y-1.5 text-right">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Rincian Pembayaran:</p>
                  <p className="text-slate-500 font-semibold">
                    Tanggal Terbit: <span className="font-mono font-bold text-slate-800">{new Date().toLocaleDateString('id-ID')}</span><br />
                    Batas Tenggat: <span className="font-mono font-bold text-amber-600">{invoicePayment.deadlineDate || '-'}</span><br />
                    Periode Sewa: <span className="font-bold text-slate-800">{invoicePayment.month} {invoicePayment.year}</span><br />
                    Opsi Pembayaran Aktif: <span className="font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">{invoicePayment.paymentOption || 'Bulanan'}</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-extrabold text-slate-700 uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3">Deskripsi Layanan</th>
                      <th className="p-3 text-center">Durasi</th>
                      <th className="p-3 text-right">Harga Unit</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">Sewa Kamar Kos ({invoicePayment.roomNumber})</p>
                        <p className="text-[10px] text-slate-400">Hunian kamar sewa cabang {invoicePayment.kosName} untuk Periode {invoicePayment.month} {invoicePayment.year}</p>
                      </td>
                      <td className="p-3 text-center">1 Bulan</td>
                      <td className="p-3 text-right font-mono">{formatIDR(invoicePayment.amount)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIDR(invoicePayment.amount)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={2} className="p-3"></td>
                      <td className="p-3 text-right font-extrabold text-slate-500 uppercase text-[10px]">TOTAL TAGIHAN:</td>
                      <td className="p-3 text-right font-mono font-black text-sm text-blue-600">{formatIDR(invoicePayment.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Status Label */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 p-4 rounded-lg">
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-slate-500">Metode Pembayaran:</p>
                  <p className="font-medium text-slate-400">Transfer Bank Mandiri / BCA resmi Hananny Kos</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest border shadow-xs ${
                    invoicePayment.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  }`}>
                    {invoicePayment.status === 'paid' ? 'LUNAS / PAID' : 'BELUM BAYAR / UNPAID'}
                  </span>
                </div>
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-2 gap-12 pt-8 text-xs">
                <div className="space-y-16">
                  <p className="font-extrabold text-slate-500 uppercase tracking-widest">TANDA TANGAN PENYEWA:</p>
                  <div className="border-b border-slate-300 pb-1 w-48 text-center">
                    <p className="font-cursive text-slate-800 text-base italic font-bold">
                      {invoicePayment.tenantName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Digital Authorized Signature</p>
                  </div>
                </div>
                <div className="space-y-16 text-right flex flex-col items-end">
                  <p className="font-extrabold text-slate-500 uppercase tracking-widest text-right">MANAJEMEN HANANNY KOS:</p>
                  <div className="border-b border-slate-300 pb-1 w-48 text-center flex flex-col items-center">
                    <p className="font-semibold text-slate-800 text-xs uppercase font-bold tracking-widest">ADMIN KOS</p>
                    <p className="text-[10px] text-slate-400 mt-1">Authorized Management</p>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center border-t border-slate-200 pt-5 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Terima kasih atas kepercayaan Anda telah memilih Hananny Kos!
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
