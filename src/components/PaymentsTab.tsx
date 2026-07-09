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
  Calendar,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Payment, Tenant, Room } from '../types';

interface InvoiceData extends Payment {
  description?: string;
  extraChargeName?: string;
  extraChargeAmount?: number;
  discountAmount?: number;
  customNotes?: string;
}

interface PaymentsTabProps {
  payments: Payment[];
  tenants: Tenant[];
  rooms?: Room[];
  onMarkPaid: (paymentId: string) => Promise<void>;
  onSendWhatsAppReminder: (payment: Payment, customMsg?: string) => Promise<void>;
  whatsappLogs: any[];
  onRefreshLogs: () => void;
  whatsappTemplates?: {
    paymentReminder: string;
    complaintNotification: string;
  };
  onUpdatePayment?: (paymentId: string, updatedData: Partial<Payment>) => Promise<void>;
  onDeletePayment?: (paymentId: string) => Promise<void>;
}

export default function PaymentsTab({ 
  payments, 
  tenants,
  rooms,
  onMarkPaid, 
  onSendWhatsAppReminder,
  whatsappLogs,
  onRefreshLogs,
  whatsappTemplates,
  onUpdatePayment,
  onDeletePayment
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
  const [invoicePayment, setInvoicePayment] = useState<InvoiceData | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  // Invoice Generator custom states
  const [genPayment, setGenPayment] = useState<Payment | null>(null);
  const [billingDate, setBillingDate] = useState<string>('');
  const [genMonth, setGenMonth] = useState<string>('');
  const [genYear, setGenYear] = useState<number>(2026);
  const [genAmount, setGenAmount] = useState<number>(0);
  const [genPaymentOption, setGenPaymentOption] = useState<string>('Bulanan');
  const [customPaymentOptionText, setCustomPaymentOptionText] = useState<string>('');
  const [genDescription, setGenDescription] = useState<string>('');
  const [genCustomNotes, setGenCustomNotes] = useState<string>('');
  const [genExtraChargeName, setGenExtraChargeName] = useState<string>('');
  const [genExtraChargeAmount, setGenExtraChargeAmount] = useState<number>(0);
  const [genDiscountAmount, setGenDiscountAmount] = useState<number>(0);
  const [genDeadlineDate, setGenDeadlineDate] = useState<string>('');
  const [genProofOfTransferUrl, setGenProofOfTransferUrl] = useState<string>('');
  const [genPaidAt, setGenPaidAt] = useState<string>('');
  const [genPaymentMethod, setGenPaymentMethod] = useState<string>('Transfer Bank');

  // Grouping expanded states
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Payment proof time custom states
  const [payDay, setPayDay] = useState<string>('09');
  const [payMonth, setPayMonth] = useState<string>('07');
  const [payYear, setPayYear] = useState<string>('2026');
  const [payHour, setPayHour] = useState<string>('12');
  const [payMinute, setPayMinute] = useState<string>('00');

  const convertToDateInputString = (str: string): string => {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    
    // Check if it has a T character (ISO timestamp)
    if (str.includes('T')) {
      return str.split('T')[0];
    }
    
    // Try native Date parsing
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    
    // Custom Indonesian written date like "15 Juli 2026"
    const MONTHS_ID = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const parts = str.split(' ');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const mName = parts[1];
      const year = parts[2];
      const mIdx = MONTHS_ID.findIndex(m => m.toLowerCase() === mName.toLowerCase());
      if (mIdx !== -1) {
        const month = (mIdx + 1).toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  };

  const handleSelectForGenerator = (p: Payment) => {
    setGenPayment(p);
    setGenMonth(p.month);
    setGenYear(p.year);
    setGenAmount(p.amount);
    
    const standardOptions = ['Bulanan', 'Sewa Lunas', 'DP Booking', 'Pelunasan', 'Cicilan'];
    if (p.paymentOption && !standardOptions.includes(p.paymentOption)) {
      setGenPaymentOption('Lainnya');
      setCustomPaymentOptionText(p.paymentOption);
    } else {
      setGenPaymentOption(p.paymentOption || 'Bulanan');
      setCustomPaymentOptionText('');
    }

    // Convert Indonesian month to Month Number
    const MONTHS_ID = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIdx = MONTHS_ID.findIndex(m => m.toLowerCase() === p.month.toLowerCase());
    const initialMonth = monthIdx !== -1 ? (monthIdx + 1).toString().padStart(2, '0') : '07';
    setBillingDate(`${p.year}-${initialMonth}-01`);

    const dlStr = convertToDateInputString(p.deadlineDate || '');
    setGenDeadlineDate(dlStr);

    setGenDescription(`Sewa Kamar Kos (${p.roomNumber})`);
    setGenCustomNotes('Terima kasih atas pembayaran Anda. Harap simpan kwitansi resmi ini sebagai bukti pembayaran yang sah.');
    setGenExtraChargeName('');
    setGenExtraChargeAmount(0);
    setGenDiscountAmount(0);
    setGenProofOfTransferUrl(p.proofOfTransferUrl || '');
    setGenPaidAt(p.paidAt ? convertToDateInputString(p.paidAt) : '');
    setGenPaymentMethod(p.paymentMethod || 'Transfer Bank');
  };

  const handleBillingDateChange = (dateStr: string) => {
    setBillingDate(dateStr);
    if (!dateStr) return;
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const MONTHS_ID = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const mIdx = d.getMonth();
      setGenMonth(MONTHS_ID[mIdx]);
      setGenYear(d.getFullYear());
      
      // Auto-connect deadline based on selected tenant's check-in date
      if (genPayment && tenants) {
        const tenant = tenants.find(t => t.id === genPayment.tenantId);
        if (tenant && tenant.checkInDate) {
          const checkInObj = new Date(tenant.checkInDate);
          if (!isNaN(checkInObj.getTime())) {
            const day = checkInObj.getDate();
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const dayStr = day.toString().padStart(2, '0');
            setGenDeadlineDate(`${year}-${month}-${dayStr}`);
            return;
          }
        }
      }
      
      // Default fallback: 3 days after billing date
      const deadline = new Date(d);
      deadline.setDate(deadline.getDate() + 3);
      const y = deadline.getFullYear();
      const m = (deadline.getMonth() + 1).toString().padStart(2, '0');
      const day = deadline.getDate().toString().padStart(2, '0');
      setGenDeadlineDate(`${y}-${m}-${day}`);
    }
  };

  const handleOpenInvoicePreview = () => {
    if (!genPayment) return;
    const finalPaymentOption = genPaymentOption === 'Lainnya' ? customPaymentOptionText : genPaymentOption;
    setInvoicePayment({
      ...genPayment,
      amount: Number(genAmount),
      month: genMonth,
      year: Number(genYear),
      paymentOption: finalPaymentOption,
      deadlineDate: genDeadlineDate,
      description: genDescription,
      extraChargeName: genExtraChargeName,
      extraChargeAmount: Number(genExtraChargeAmount),
      discountAmount: Number(genDiscountAmount),
      customNotes: genCustomNotes,
      proofOfTransferUrl: genProofOfTransferUrl || undefined,
      paidAt: genPaidAt ? `${genPaidAt}T00:00:00Z` : undefined,
      paymentMethod: genPaymentMethod,
    });
  };

  const handleSaveGeneratorChanges = async () => {
    if (!genPayment || !onUpdatePayment) return;
    try {
      const finalPaymentOption = genPaymentOption === 'Lainnya' ? customPaymentOptionText : genPaymentOption;
      
      const updatePayload: Partial<Payment> = {
        amount: Number(genAmount),
        month: genMonth,
        year: Number(genYear),
        paymentOption: finalPaymentOption,
        deadlineDate: genDeadlineDate || undefined,
        proofOfTransferUrl: genProofOfTransferUrl || undefined,
        paidAt: genPaidAt ? `${genPaidAt}T00:00:00Z` : undefined,
        paymentMethod: genPaymentMethod,
      };

      if (genPaidAt || genProofOfTransferUrl) {
        updatePayload.status = 'paid';
      }

      await onUpdatePayment(genPayment.id, updatePayload);
      alert('Perubahan tagihan berhasil disimpan ke database!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan ke database.');
    }
  };

  const handleOpenReminderForGenerator = () => {
    if (!genPayment) return;
    
    const totalAmount = Number(genAmount) + Number(genExtraChargeAmount) - Number(genDiscountAmount);
    let msg = `Halo Kak ${genPayment.tenantName}, kami ingin menginfokan rincian tagihan sewa bulanan ${genPayment.kosName} (${genPayment.roomNumber}) untuk periode ${genMonth} ${genYear}:\n`;
    msg += `• Sewa Kamar: ${formatIDR(Number(genAmount))}\n`;
    if (Number(genExtraChargeAmount) > 0) {
      msg += `• ${genExtraChargeName || 'Biaya Tambahan'}: ${formatIDR(Number(genExtraChargeAmount))}\n`;
    }
    if (Number(genDiscountAmount) > 0) {
      msg += `• Potongan Harga: -${formatIDR(Number(genDiscountAmount))}\n`;
    }
    msg += `\n*TOTAL TAGIHAN: ${formatIDR(totalAmount)}*\n`;
    if (genCustomNotes) {
      msg += `\nCatatan:\n${genCustomNotes}\n`;
    }
    msg += `\nMohon konfirmasi jika sudah melakukan transfer. Terima kasih! 😊`;
    
    setReminderPayment(genPayment);
    setCustomMsg(msg);
  };

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
    
    // Initialize date time options
    const now = p.paidAt ? new Date(p.paidAt) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setPayDay(pad(now.getDate()));
    setPayMonth(pad(now.getMonth() + 1));
    setPayYear(String(now.getFullYear()));
    setPayHour(pad(now.getHours()));
    setPayMinute(pad(now.getMinutes()));
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForTransfer || !onUpdatePayment) return;

    setInputtingTransfer(true);
    try {
      // Construct date string
      const constructedPaidAt = `${payYear}-${String(payMonth).padStart(2, '0')}-${String(payDay).padStart(2, '0')}T${String(payHour).padStart(2, '0')}:${String(payMinute).padStart(2, '0')}:00.000Z`;

      await onUpdatePayment(selectedPaymentForTransfer.id, {
        status: 'paid',
        paidAt: constructedPaidAt,
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

  // Group filteredPayments by kosName
  const paymentsByKos = useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    filteredPayments.forEach((p) => {
      const kos = p.kosName || 'Umum';
      if (!groups[kos]) {
        groups[kos] = [];
      }
      groups[kos].push(p);
    });
    return groups;
  }, [filteredPayments]);

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

          <div className="max-h-[550px] overflow-y-auto pr-1 space-y-6">
            {filteredPayments.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Tidak ada data tagihan.</p>
            ) : (
              Object.keys(paymentsByKos).sort().map((kosName) => {
                const kosPayments = paymentsByKos[kosName];
                
                // Group by tenantName inside this Kos
                const paymentsByTenant: Record<string, Payment[]> = {};
                kosPayments.forEach(p => {
                  const tenant = p.tenantName;
                  if (!paymentsByTenant[tenant]) {
                    paymentsByTenant[tenant] = [];
                  }
                  paymentsByTenant[tenant].push(p);
                });

                const sortedTenants = Object.keys(paymentsByTenant).sort();

                return (
                  <div key={kosName} className="space-y-3">
                    {/* Kos Title Header */}
                    <div className="bg-slate-100/80 px-3 py-1.5 rounded flex items-center justify-between text-slate-700">
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center">
                        <DollarSign className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        Rumah Kos: {kosName}
                      </span>
                      <span className="text-[9px] font-bold bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                        {kosPayments.length} Tagihan
                      </span>
                    </div>

                    <div className="space-y-3 pl-1">
                      {sortedTenants.map((tenantName) => {
                        const tenantPayments = paymentsByTenant[tenantName];
                        
                        // Scenario A: Tenant has 2 or more bills -> Collective with Pipeline Timeline
                        if (tenantPayments.length >= 2) {
                          const groupKey = `${kosName}-${tenantName}`;
                          const isExpanded = expandedGroups[groupKey];
                          const totalAmount = tenantPayments.reduce((sum, p) => sum + p.amount, 0);
                          
                          // Determine collective status
                          const hasOverdue = tenantPayments.some(p => p.status === 'overdue');
                          const allPaid = tenantPayments.every(p => p.status === 'paid');
                          const groupStatus = allPaid ? 'paid' : hasOverdue ? 'overdue' : 'pending';

                          return (
                            <div key={groupKey} className="border border-slate-200/80 rounded-lg p-3 bg-slate-50/40 hover:bg-slate-50 transition-all space-y-3">
                              {/* Header Row */}
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-start space-x-2.5">
                                  <div className={`p-2 rounded shrink-0 ${
                                    groupStatus === 'paid' 
                                      ? 'bg-emerald-50 text-emerald-600' 
                                      : groupStatus === 'overdue' 
                                        ? 'bg-rose-50 text-rose-600 animate-pulse'
                                        : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    <DollarSign className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <p className="font-extrabold text-xs text-slate-800">{tenantName}</p>
                                      <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                        {tenantPayments.length} Tagihan Kolektif
                                      </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider">
                                      {kosName} — Kamar {tenantPayments[0].roomNumber}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="font-extrabold text-xs text-slate-900 font-mono">{formatIDR(totalAmount)}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Total Akumulasi</p>
                                  </div>
                                  <button
                                    onClick={() => toggleGroup(groupKey)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded transition-colors cursor-pointer"
                                    title={isExpanded ? "Tutup Rincian" : "Buka Rincian Tagihan"}
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {/* Collective Pipeline Timeline */}
                              {isExpanded && (
                                <div className="relative pl-6 border-l-2 border-slate-200 ml-4 space-y-4 my-2 pt-1 pb-1">
                                  {tenantPayments.map((p) => (
                                    <div key={p.id} className="relative">
                                      {/* Timeline Circle Indicator */}
                                      <div className={`absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                                        p.status === 'paid' 
                                          ? 'border-emerald-500 ring-4 ring-emerald-50' 
                                          : p.status === 'overdue'
                                            ? 'border-rose-500 ring-4 ring-rose-50 animate-pulse'
                                            : 'border-amber-500 ring-4 ring-amber-50'
                                      }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                          p.status === 'paid' 
                                            ? 'bg-emerald-500' 
                                            : p.status === 'overdue'
                                              ? 'bg-rose-500'
                                              : 'bg-amber-500'
                                        }`} />
                                      </div>

                                      {/* Timeline Row Content */}
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded border border-slate-100 shadow-2xs hover:shadow-xs transition-shadow">
                                        <div>
                                          <div className="flex items-center space-x-1.5">
                                            <p className="font-bold text-[11px] text-slate-800">Periode: {p.month} {p.year}</p>
                                            <span className={`text-[7px] uppercase tracking-wider font-extrabold px-1 py-0.2 rounded ${
                                              p.status === 'paid' 
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                : p.status === 'overdue'
                                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                                            }`}>
                                              {p.status === 'paid' ? 'Lunas' : p.status === 'overdue' ? 'Menunggak' : 'Menunggu'}
                                            </span>
                                          </div>
                                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{p.invoiceNumber}</p>
                                          
                                          {/* Deadline Date */}
                                          <div className="flex items-center space-x-1 mt-1 text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            <span className={`text-[8px] font-bold uppercase tracking-wider ${
                                              p.status === 'paid' ? 'text-slate-400' : p.status === 'overdue' ? 'text-rose-600 animate-pulse' : 'text-amber-600'
                                            }`}>
                                              Tenggat: {p.deadlineDate ? p.deadlineDate : '-'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 self-end md:self-auto shrink-0">
                                          <p className="font-extrabold text-xs text-slate-800 font-mono sm:text-right">{formatIDR(p.amount)}</p>
                                          
                                          <div className="flex items-center gap-1">
                                            {/* View Button */}
                                            <button
                                              onClick={() => setSelectedPaymentForView(p)}
                                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                                              title="Lihat Detail"
                                            >
                                              <Eye className="w-3 h-3" />
                                            </button>

                                            {/* Generate Invoice Button */}
                                            <button
                                              onClick={() => handleSelectForGenerator(p)}
                                              className={`p-1 rounded border transition-all cursor-pointer ${
                                                genPayment?.id === p.id 
                                                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                                                  : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100'
                                              }`}
                                              title="Load into Invoice Generator"
                                            >
                                              <FileText className="w-3 h-3" />
                                            </button>

                                            {/* Edit Button */}
                                            <button
                                              onClick={() => handleOpenEdit(p)}
                                              className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded transition-colors cursor-pointer"
                                              title="Edit Tagihan"
                                            >
                                              <Edit className="w-3 h-3" />
                                            </button>

                                            {/* Input Proof Button */}
                                            <button
                                              onClick={() => handleOpenTransfer(p)}
                                              className="p-1 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-100 rounded transition-colors cursor-pointer"
                                              title="Input Bukti"
                                            >
                                              <Upload className="w-3 h-3" />
                                            </button>

                                            {/* Delete Button */}
                                            {onDeletePayment && (
                                              <button
                                                onClick={() => setPaymentToDelete(p)}
                                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded transition-colors cursor-pointer"
                                                title="Hapus"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            )}

                                            {p.status !== 'paid' ? (
                                              <>
                                                <button
                                                  onClick={() => onMarkPaid(p.id)}
                                                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-bold shadow-xs transition-colors uppercase tracking-wider cursor-pointer"
                                                  title="Tandai Sudah Lunas"
                                                >
                                                  Lunas
                                                </button>
                                                <button
                                                  onClick={() => handleOpenReminder(p)}
                                                  className="p-1 border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                  title="Kirim WhatsApp"
                                                >
                                                  <MessageSquare className="w-2.5 h-2.5" />
                                                </button>
                                              </>
                                            ) : (
                                              <div className="flex items-center space-x-0.5 text-[8px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Scenario B: Tenant has exactly 1 bill -> Render single row (similar to original design)
                        const p = tenantPayments[0];
                        return (
                          <div key={p.id} className="py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 border border-slate-100 rounded px-2.5 transition-all">
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
                                  Kamar No: {p.roomNumber}
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
                                  onClick={() => handleSelectForGenerator(p)}
                                  className={`p-1.5 rounded border transition-all cursor-pointer ${
                                    genPayment?.id === p.id 
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-100'
                                  }`}
                                  title="Load into Invoice Generator"
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

                                {/* Delete Button */}
                                {onDeletePayment && (
                                  <button
                                    onClick={() => setPaymentToDelete(p)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded transition-colors cursor-pointer"
                                    title="Hapus Data Tagihan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

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
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Invoice Generator Panel (Right 1/3) */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center">
              <FileText className="w-4.5 h-4.5 mr-2 text-blue-600" />
              Invoice Generator
            </h3>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
              Kustomisasi
            </span>
          </div>

          {!genPayment ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Belum Ada Tagihan Terpilih</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-relaxed">
                  Silakan klik tombol <span className="text-blue-600 font-bold">Generate Invoice</span> (ikon dokumen kertas biru) pada baris tagihan penyewa di samping untuk mulai memodifikasi detail kwitansi.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Selected Tenant Summary Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Penyewa Terpilih:</span>
                <p className="font-bold text-slate-800 text-sm uppercase">{genPayment.tenantName}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Kamar: <span className="font-bold text-slate-700">{genPayment.roomNumber}</span> | Cabang: <span className="font-bold text-slate-700">{genPayment.kosName}</span>
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {/* Billing Calendar Period (Automatic Calendar Sync) */}
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600 animate-pulse" />
                      Koneksi Kalender Penagihan
                    </span>
                    {(() => {
                      const tenant = tenants?.find(t => t.id === genPayment.tenantId);
                      if (tenant && tenant.checkInDate) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              const checkIn = tenant.checkInDate;
                              const dInput = convertToDateInputString(checkIn);
                              if (dInput) {
                                handleBillingDateChange(dInput);
                              }
                            }}
                            className="text-[9px] bg-blue-100 hover:bg-blue-200 text-blue-700 font-extrabold px-2 py-0.5 rounded transition-all flex items-center space-x-1"
                            title={`Mulai Sewa: ${tenant.checkInDate}`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>Sesuai Mulai Sewa</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Tagihan</label>
                      <input
                        type="date"
                        value={billingDate}
                        onChange={(e) => handleBillingDateChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1 px-2.5 text-xs font-bold font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Periode Hasil</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-black text-slate-700 uppercase tracking-wider text-center">
                        {genMonth} {genYear}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const tenant = tenants?.find(t => t.id === genPayment.tenantId);
                    if (tenant && tenant.checkInDate) {
                      return (
                        <p className="text-[8px] text-blue-600/80 font-bold uppercase tracking-wide">
                          * Terkoneksi otomatis dengan data penyewa. Batas deadline dihitung dari tanggal check-in ({tenant.checkInDate}).
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Amount & Option Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Biaya Kamar Dasar (Rp)</label>
                    <input
                      type="number"
                      value={genAmount}
                      onChange={(e) => setGenAmount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Opsi Pembayaran</label>
                    <select
                      value={genPaymentOption}
                      onChange={(e) => setGenPaymentOption(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                    >
                      {(() => {
                        const r = rooms?.find(rm => rm.id === genPayment.roomId);
                        if (r) {
                          const options = [];
                          if (r.payMonthly) options.push(<option key="Bulanan" value="Bulanan">Bulanan</option>);
                          if (r.payThreeMonths) options.push(<option key="3 Bulanan" value="3 Bulanan">3 Bulanan</option>);
                          if (r.paySixMonths) options.push(<option key="6 Bulanan" value="6 Bulanan">6 Bulanan</option>);
                          if (r.payYearly) options.push(<option key="Tahunan" value="Tahunan">Tahunan</option>);
                          
                          // Fallback if no active options
                          if (options.length === 0) {
                            options.push(<option key="Bulanan" value="Bulanan">Bulanan</option>);
                          }
                          return (
                            <>
                              <optgroup label="Opsi Aktif Kamar">
                                {options}
                              </optgroup>
                              <optgroup label="Opsi Lainnya">
                                <option value="Sewa Lunas">Sewa Lunas</option>
                                <option value="DP Booking">DP Booking</option>
                                <option value="Pelunasan">Pelunasan</option>
                                <option value="Cicilan">Cicilan</option>
                                <option value="Lainnya">Lainnya (Isi Manual)</option>
                              </optgroup>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <option value="Bulanan">Bulanan</option>
                              <option value="3 Bulanan">3 Bulanan</option>
                              <option value="6 Bulanan">6 Bulanan</option>
                              <option value="Tahunan">Tahunan</option>
                              <option value="Sewa Lunas">Sewa Lunas</option>
                              <option value="DP Booking">DP Booking</option>
                              <option value="Pelunasan">Pelunasan</option>
                              <option value="Cicilan">Cicilan</option>
                              <option value="Lainnya">Lainnya (Isi Manual)</option>
                            </>
                          );
                        }
                      })()}
                    </select>

                    {genPaymentOption === 'Lainnya' && (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={customPaymentOptionText}
                          onChange={(e) => setCustomPaymentOptionText(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1 px-2 text-[11px] font-bold"
                          placeholder="Masukkan opsi kustom..."
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Deadline Date (Smart Calendar Picker) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tenggat Pembayaran (Deadline)</label>
                  <input
                    type="date"
                    value={genDeadlineDate}
                    onChange={(e) => setGenDeadlineDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                  />
                </div>

                {/* PAYMENT STATUS & PROOF SECTION */}
                <div className="p-3 bg-purple-50/40 border border-purple-100 rounded-lg space-y-2.5">
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-purple-600" />
                    Status & Bukti Pembayaran
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Pembayaran</label>
                      <input
                        type="date"
                        value={genPaidAt}
                        onChange={(e) => setGenPaidAt(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1 px-2.5 text-xs font-bold font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran</label>
                      <select
                        value={genPaymentMethod}
                        onChange={(e) => setGenPaymentMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2 text-xs font-bold"
                      >
                        <option value="Transfer Bank">Transfer Bank</option>
                        <option value="Tunai">Tunai (Cash)</option>
                        <option value="QRIS / E-Wallet">QRIS / E-Wallet</option>
                        <option value="BCA Transfer">BCA Transfer</option>
                        <option value="Mandiri Transfer">Mandiri Transfer</option>
                        <option value="Gopay">Gopay</option>
                        <option value="OVO">OVO</option>
                        <option value="ShopeePay">ShopeePay</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Metode Bukti</label>
                    <button
                      type="button"
                      onClick={() => setGenProofOfTransferUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600')}
                      className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-extrabold py-1.5 px-2 rounded text-[9px] uppercase tracking-wider transition-all"
                    >
                      Gunakan Contoh Struk
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Input File / Foto Bukti Transfer</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-200 hover:border-purple-400 bg-white hover:bg-purple-50/30 rounded-lg p-3 cursor-pointer transition-all text-center">
                      <span className="text-[10px] font-extrabold text-purple-700 flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Unggah Foto Struk / Bukti
                      </span>
                      <span className="text-[8px] text-slate-400 font-semibold mt-0.5">Klik untuk memilih gambar (Maks 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setGenProofOfTransferUrl(event.target.result as string);
                                if (!genPaidAt) {
                                  setGenPaidAt(new Date().toISOString().split('T')[0]);
                                }
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bukti Transfer (URL Gambar / Base64)</label>
                    <div className="flex space-x-1">
                      <input
                        type="text"
                        value={genProofOfTransferUrl}
                        onChange={(e) => setGenProofOfTransferUrl(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1 px-2.5 text-xs font-bold font-mono"
                        placeholder="URL Bukti atau Base64"
                      />
                      {genProofOfTransferUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Hapus bukti transfer ini?')) {
                              setGenProofOfTransferUrl('');
                            }
                          }}
                          className="px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded text-[9px] font-black uppercase transition-all"
                          title="Hapus Bukti"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {genProofOfTransferUrl && (
                    <div className="mt-2 p-2 bg-white border border-purple-100 rounded-lg text-center space-y-1.5 relative">
                      <p className="text-[8px] text-purple-700 font-extrabold uppercase tracking-widest">Pratinjau Bukti Transfer:</p>
                      <div className="relative inline-block border rounded overflow-hidden shadow-xs max-w-full">
                        <img 
                          src={genProofOfTransferUrl} 
                          alt="Preview Bukti" 
                          className="max-h-36 mx-auto object-contain rounded" 
                          referrerPolicy="no-referrer" 
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setGenProofOfTransferUrl('');
                          }}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md transition-colors"
                          title="Hapus Bukti"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex justify-center space-x-2">
                        <a 
                          href={genProofOfTransferUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[9px] text-purple-600 hover:underline font-extrabold uppercase"
                        >
                          Lihat Ukuran Penuh ↗
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Description */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Keterangan Layanan Utama</label>
                  <input
                    type="text"
                    value={genDescription}
                    onChange={(e) => setGenDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                    placeholder="Sewa Kamar Kos (Room Number)"
                  />
                </div>

                {/* Extra Charges Section */}
                <div className="p-2.5 border border-slate-100 bg-slate-50/50 rounded-lg space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Biaya Tambahan Lainnya (Optional)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-extrabold text-slate-400 uppercase">Nama Biaya</label>
                      <input
                        type="text"
                        value={genExtraChargeName}
                        onChange={(e) => setGenExtraChargeName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1 px-2 text-[11px] font-bold"
                        placeholder="Contoh: Biaya Listrik AC"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-extrabold text-slate-400 uppercase">Nominal Tambahan (Rp)</label>
                      <input
                        type="number"
                        value={genExtraChargeAmount || ''}
                        onChange={(e) => setGenExtraChargeAmount(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1 px-2 text-[11px] font-bold font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Discount Section */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Potongan Harga / Diskon (Rp)</label>
                  <input
                    type="number"
                    value={genDiscountAmount || ''}
                    onChange={(e) => setGenDiscountAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    placeholder="Contoh: 50000"
                  />
                </div>

                {/* Custom Notes / Keterangan */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Keterangan / Catatan Khusus Invoice</label>
                  <textarea
                    value={genCustomNotes}
                    onChange={(e) => setGenCustomNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded p-2 text-xs font-semibold h-16 resize-none leading-relaxed"
                    placeholder="Masukkan pesan atau ketentuan khusus kwitansi..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleOpenInvoicePreview}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Preview & Cetak Kwitansi Resmi</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGeneratorChanges}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 transition-all cursor-pointer"
                    title="Simpan nominal & periode sewa yang telah diubah ke database"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Simpan Perubahan</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenReminderForGenerator}
                    className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 transition-all shadow-xs cursor-pointer"
                    title="Kirim pemberitahuan tagihan ini beserta rincian tambahan ke WhatsApp"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Kirim WA</span>
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    {(() => {
                      const r = rooms?.find(rm => rm.id === selectedPaymentForEdit.roomId);
                      if (r) {
                        const options = [];
                        if (r.payMonthly) options.push(<option key="Bulanan" value="Bulanan">Bulanan</option>);
                        if (r.payThreeMonths) options.push(<option key="3 Bulanan" value="3 Bulanan">3 Bulanan</option>);
                        if (r.paySixMonths) options.push(<option key="6 Bulanan" value="6 Bulanan">6 Bulanan</option>);
                        if (r.payYearly) options.push(<option key="Tahunan" value="Tahunan">Tahunan</option>);
                        
                        if (options.length === 0) {
                          options.push(<option key="Bulanan" value="Bulanan">Bulanan</option>);
                        }
                        return (
                          <>
                            <optgroup label="Opsi Aktif Kamar">
                              {options}
                            </optgroup>
                            <optgroup label="Opsi Lainnya">
                              <option value="Sewa Lunas">Sewa Lunas</option>
                              <option value="DP Booking">DP Booking</option>
                              <option value="Pelunasan">Pelunasan</option>
                              <option value="Cicilan">Cicilan</option>
                              <option value="Lainnya">Lainnya</option>
                            </optgroup>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <option value="Bulanan">Bulanan</option>
                            <option value="3 Bulanan">3 Bulanan</option>
                            <option value="6 Bulanan">6 Bulanan</option>
                            <option value="Tahunan">Tahunan</option>
                            <option value="Sewa Lunas">Sewa Lunas</option>
                            <option value="DP Booking">DP Booking</option>
                            <option value="Pelunasan">Pelunasan</option>
                            <option value="Cicilan">Cicilan</option>
                            <option value="Lainnya">Lainnya</option>
                          </>
                        );
                      }
                    })()}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="https://contoh.com/struk.jpg"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-3 text-xs font-bold font-mono transition-all"
                  />
                  <label className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1 whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setProofUrl(event.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Opsi Pembayaran inputs */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <p className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Opsi Pembayaran (Waktu Transfer):</p>
                <div className="grid grid-cols-5 gap-1.5">
                  <div className="space-y-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Tanggal</label>
                    <select
                      value={payDay}
                      onChange={(e) => setPayDay(e.target.value)}
                      className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1 py-1 focus:outline-blue-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Bulan</label>
                    <select
                      value={payMonth}
                      onChange={(e) => setPayMonth(e.target.value)}
                      className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1 py-1 focus:outline-blue-500"
                    >
                      {[
                        { val: '01', lbl: 'Januari' },
                        { val: '02', lbl: 'Februari' },
                        { val: '03', lbl: 'Maret' },
                        { val: '04', lbl: 'April' },
                        { val: '05', lbl: 'Mei' },
                        { val: '06', lbl: 'Juni' },
                        { val: '07', lbl: 'Juli' },
                        { val: '08', lbl: 'Agustus' },
                        { val: '09', lbl: 'September' },
                        { val: '10', lbl: 'Oktober' },
                        { val: '11', lbl: 'November' },
                        { val: '12', lbl: 'Desember' }
                      ].map(m => (
                        <option key={m.val} value={m.val}>{m.lbl}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Tahun</label>
                    <select
                      value={payYear}
                      onChange={(e) => setPayYear(e.target.value)}
                      className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1 py-1 focus:outline-blue-500"
                    >
                      {['2025', '2026', '2027', '2028'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">Waktu</label>
                    <div className="flex items-center space-x-0.5">
                      <select
                        value={payHour}
                        onChange={(e) => setPayHour(e.target.value)}
                        className="w-full text-[9px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-0.5 py-1 focus:outline-blue-500 text-center"
                      >
                        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 font-bold text-[9px]">:</span>
                      <select
                        value={payMinute}
                        onChange={(e) => setPayMinute(e.target.value)}
                        className="w-full text-[9px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-0.5 py-1 focus:outline-blue-500 text-center"
                      >
                        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-lg border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] sm:max-h-[92vh] print:max-h-none print:my-0 print:border-none print:shadow-none print:rounded-none"
          >
            {/* Header controls */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800 print:hidden shrink-0">
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
            <div className="p-4 sm:p-8 space-y-6 text-slate-800 bg-white overflow-y-auto flex-1 print:overflow-visible print:p-0" id="printable-invoice">
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
                      <th className="p-3 text-center">Durasi / Qty</th>
                      <th className="p-3 text-right">Harga Unit</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {/* Main Rent Row */}
                    <tr>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{invoicePayment.description || `Sewa Kamar Kos (${invoicePayment.roomNumber})`}</p>
                        <p className="text-[10px] text-slate-400">Hunian kamar sewa cabang {invoicePayment.kosName} untuk Periode {invoicePayment.month} {invoicePayment.year}</p>
                      </td>
                      <td className="p-3 text-center">1 Bulan</td>
                      <td className="p-3 text-right font-mono">{formatIDR(invoicePayment.amount)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIDR(invoicePayment.amount)}</td>
                    </tr>

                    {/* Extra Charge Row */}
                    {invoicePayment.extraChargeAmount && invoicePayment.extraChargeAmount > 0 ? (
                      <tr>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{invoicePayment.extraChargeName || 'Biaya Tambahan'}</p>
                          <p className="text-[10px] text-slate-400">Biaya tambahan atau penyesuaian khusus tagihan sewa</p>
                        </td>
                        <td className="p-3 text-center">1 Unit</td>
                        <td className="p-3 text-right font-mono">{formatIDR(invoicePayment.extraChargeAmount)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatIDR(invoicePayment.extraChargeAmount)}</td>
                      </tr>
                    ) : null}

                    {/* Discount Row */}
                    {invoicePayment.discountAmount && invoicePayment.discountAmount > 0 ? (
                      <tr>
                        <td className="p-3">
                          <p className="font-bold text-rose-600">Potongan Harga / Diskon</p>
                          <p className="text-[10px] text-slate-400">Diskon khusus pembayaran periode ini</p>
                        </td>
                        <td className="p-3 text-center">1 Unit</td>
                        <td className="p-3 text-right font-mono text-rose-600">-{formatIDR(invoicePayment.discountAmount)}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">-{formatIDR(invoicePayment.discountAmount)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={2} className="p-3"></td>
                      <td className="p-3 text-right font-extrabold text-slate-500 uppercase text-[10px]">TOTAL TAGIHAN:</td>
                      <td className="p-3 text-right font-mono font-black text-sm text-blue-600">
                        {formatIDR(
                          invoicePayment.amount + 
                          (invoicePayment.extraChargeAmount || 0) - 
                          (invoicePayment.discountAmount || 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Status Label & Notes */}
              <div className="space-y-4">
                {invoicePayment.customNotes && (
                  <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-lg text-xs">
                    <p className="font-extrabold text-amber-800 uppercase tracking-widest text-[9px] mb-1.5">Catatan Khusus Invoice:</p>
                    <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{invoicePayment.customNotes}</p>
                  </div>
                )}

                {/* Proof of Transfer and Payment Date inside Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Payment Details */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-lg space-y-1.5">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Detail Status:</p>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-400 font-semibold">Status:</span>
                      <span className="col-span-2 font-black uppercase tracking-wider text-xs">
                        {invoicePayment.status === 'paid' || invoicePayment.paidAt ? (
                          <span className="text-emerald-700">LUNAS / PAID</span>
                        ) : (
                          <span className="text-amber-700">BELUM BAYAR / UNPAID</span>
                        )}
                      </span>
                      
                      <span className="text-slate-400 font-semibold">Tgl Bayar:</span>
                      <span className="col-span-2 font-mono font-bold text-slate-800">
                        {invoicePayment.paidAt ? (
                          new Date(invoicePayment.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        ) : (
                          '-'
                        )}
                      </span>

                      <span className="text-slate-400 font-semibold">Opsi Bayar:</span>
                      <span className="col-span-2 font-bold text-slate-800 uppercase">{invoicePayment.paymentOption || 'Bulanan'}</span>

                      <span className="text-slate-400 font-semibold">Metode Bayar:</span>
                      <span className="col-span-2 font-bold text-blue-800 uppercase">{invoicePayment.paymentMethod || 'Transfer Bank'}</span>
                    </div>
                  </div>

                  {/* Proof of Transfer Image */}
                  <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-lg flex flex-col justify-between">
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Bukti Pembayaran / Transfer:</p>
                    {invoicePayment.proofOfTransferUrl ? (
                      <div className="flex items-center space-x-2 mt-1 bg-white p-1.5 border border-slate-100 rounded">
                        <img 
                          src={invoicePayment.proofOfTransferUrl} 
                          alt="Bukti Transfer" 
                          className="w-12 h-12 object-cover rounded border" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="text-[10px]">
                          <p className="font-bold text-slate-700">Terlampir</p>
                          <a 
                            href={invoicePayment.proofOfTransferUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline font-semibold print:hidden"
                          >
                            Buka Gambar ↗
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic font-medium mt-2">Belum ada bukti transfer terunggah.</p>
                    )}
                  </div>
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

      {/* DELETE CONFIRMATION MODAL */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-sm rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-rose-900 text-white p-4 flex justify-between items-center border-b border-rose-800">
              <span className="text-[10px] text-rose-300 font-extrabold uppercase tracking-wider flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-300 animate-pulse" />
                Konfirmasi Hapus Tagihan
              </span>
              <button onClick={() => setPaymentToDelete(null)} className="text-rose-200 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-600 leading-relaxed text-center">
                Apakah Anda yakin ingin menghapus data tagihan bulanan untuk:
              </p>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded text-center">
                <p className="font-black text-slate-800 text-sm uppercase">{paymentToDelete.tenantName}</p>
                <p className="font-mono text-slate-500 font-bold mt-1">Periode: {paymentToDelete.month} {paymentToDelete.year}</p>
                <p className="font-mono text-rose-600 font-bold mt-0.5">Jumlah: {formatIDR(paymentToDelete.amount)}</p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-normal text-center">
                Tindakan ini permanen dan akan menghapus data tagihan ini secara langsung dari database Firestore.
              </p>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentToDelete(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onDeletePayment) {
                      try {
                        await onDeletePayment(paymentToDelete.id);
                        if (genPayment?.id === paymentToDelete.id) {
                          setGenPayment(null);
                        }
                        if (invoicePayment?.id === paymentToDelete.id) {
                          setInvoicePayment(null);
                        }
                        setPaymentToDelete(null);
                      } catch (err) {
                        alert('Gagal menghapus tagihan.');
                      }
                    }
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Ya, Hapus Tagihan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
