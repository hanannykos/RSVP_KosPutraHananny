import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  Calendar, 
  ArrowUpDown, 
  Building2, 
  Check, 
  X,
  FileText,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Download
} from 'lucide-react';
import { Kos, FinancialTransaction, Payment } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface FinancialTabProps {
  kosList: Kos[];
  payments: Payment[];
  financials: FinancialTransaction[];
  onAddTransaction: (data: Omit<FinancialTransaction, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTransaction: (id: string, data: Partial<FinancialTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onImportPaidPayments: () => Promise<number>;
}

export default function FinancialTab({
  kosList,
  payments,
  financials,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onImportPaidPayments
}: FinancialTabProps) {
  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  // Filter States
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterKosId, setFilterKosId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026'); // Matches the default system year

  // Sort States
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form States
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState('Sewa Kamar');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formKosId, setFormKosId] = useState('all');

  // IDR Currency Formatter
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Standard Categories
  const incomeCategories = ['Sewa Kamar', 'Uang Jaminan / Deposit', 'Denda Keterlambatan', 'Penjualan Barang / Jasa', 'Lainnya'];
  const expenseCategories = ['Pekerjaan Listrik / Token', 'Air / PDAM', 'Kebersihan & Sampah', 'WiFi / Internet', 'Gaji Karyawan', 'Perawatan & Perbaikan Kamar', 'Beli Perlengkapan', 'Lainnya'];

  // Handle open modal for adding
  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setFormType('income');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('Sewa Kamar');
    setFormCustomCategory('');
    setFormDescription('');
    setFormKosId('all');
    setShowAddModal(true);
  };

  // Handle open modal for editing
  const handleOpenEdit = (tx: FinancialTransaction) => {
    setEditingTransaction(tx);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormDate(tx.date);
    
    const standardCats = tx.type === 'income' ? incomeCategories : expenseCategories;
    if (standardCats.includes(tx.category)) {
      setFormCategory(tx.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('Lainnya');
      setFormCustomCategory(tx.category);
    }
    
    setFormDescription(tx.description);
    setFormKosId(tx.kosId || 'all');
    setShowAddModal(true);
  };

  // Form type changes category defaults
  const handleFormTypeChange = (type: 'income' | 'expense') => {
    setFormType(type);
    setFormCategory(type === 'income' ? 'Sewa Kamar' : 'Pekerjaan Listrik / Token');
  };

  // Handle submit form (Add/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount.replace(/[^0-9]/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Mohon masukkan jumlah nominal yang valid!');
      return;
    }

    const finalCategory = formCategory === 'Lainnya' && formCustomCategory.trim() !== ''
      ? formCustomCategory.trim()
      : formCategory;

    const selectedKosObj = kosList.find(k => k.id === formKosId);
    const payload = {
      type: formType,
      amount: amountNum,
      date: formDate,
      category: finalCategory,
      description: formDescription.trim(),
      kosId: formKosId === 'all' ? '' : formKosId,
      kosName: formKosId === 'all' ? 'Umum / Semua Kos' : selectedKosObj?.name || ''
    };

    try {
      if (editingTransaction) {
        await onUpdateTransaction(editingTransaction.id, payload);
      } else {
        await onAddTransaction(payload);
      }
      setShowAddModal(false);
      setEditingTransaction(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan transaksi!');
    }
  };

  // Import Rent Payments automatically
  const handleImportRent = async () => {
    setImporting(true);
    setImportSuccessCount(null);
    try {
      const importedCount = await onImportPaidPayments();
      setImportSuccessCount(importedCount);
      setTimeout(() => setImportSuccessCount(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyinkronkan pembayaran sewa!');
    } finally {
      setImporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('LAPORAN TRANSAKSI KEUANGAN KOS', 15, 18);
      
      // Subtitle / Filters Info
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const dateText = `Periode: Tahun ${selectedYear === 'all' ? 'Semua' : selectedYear}${selectedMonth === 'all' ? '' : ', Bulan ' + selectedMonth}`;
      const filterText = `Filter Tipe: ${filterType === 'all' ? 'Semua' : filterType === 'income' ? 'Pemasukan' : 'Pengeluaran'} | Kategori: ${filterCategory === 'all' ? 'Semua' : filterCategory}`;
      doc.text(dateText, 15, 24);
      doc.text(filterText, 15, 28);
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(15, 32, 195, 32);
      
      // Table Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, 36, 180, 8, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text('TANGGAL', 17, 41);
      doc.text('KOS', 40, 41);
      doc.text('TIPE', 75, 41);
      doc.text('KATEGORI', 95, 41);
      doc.text('DESKRIPSI', 130, 41);
      doc.text('JUMLAH (IDR)', 170, 41);
      
      doc.line(15, 44, 195, 44);
      
      // Table Content
      doc.setFont('Helvetica', 'normal');
      let y = 49;
      const pageHeight = doc.internal.pageSize.height;
      
      let totalIncome = 0;
      let totalExpense = 0;
      
      filteredTransactions.forEach((tx) => {
        // Pagination check
        if (y > pageHeight - 20) {
          doc.addPage();
          // Redraw table headers on new page
          doc.setFillColor(241, 245, 249);
          doc.rect(15, 15, 180, 8, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text('TANGGAL', 17, 20);
          doc.text('KOS', 40, 20);
          doc.text('TIPE', 75, 20);
          doc.text('KATEGORI', 95, 20);
          doc.text('DESKRIPSI', 130, 20);
          doc.text('JUMLAH (IDR)', 170, 20);
          doc.line(15, 23, 195, 23);
          doc.setFont('Helvetica', 'normal');
          y = 28;
        }
        
        const txDate = tx.date || '';
        const txKos = tx.kosName || 'Umum';
        const txType = tx.type === 'income' ? 'PEMASUKAN' : 'PENGELUARAN';
        const txCategory = tx.category || '-';
        const txDescription = tx.description || '-';
        const txAmount = formatIDR(tx.amount);
        
        if (tx.type === 'income') {
          totalIncome += tx.amount;
        } else {
          totalExpense += tx.amount;
        }
        
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(txDate, 17, y);
        doc.text(txKos.substring(0, 18), 40, y);
        
        if (tx.type === 'income') {
          doc.setTextColor(5, 150, 105); // green-600
        } else {
          doc.setTextColor(220, 38, 38); // red-600
        }
        doc.text(txType, 75, y);
        
        doc.setTextColor(71, 85, 105);
        doc.text(txCategory.substring(0, 18), 95, y);
        doc.text(txDescription.substring(0, 22), 130, y);
        
        doc.text(txAmount, 170, y);
        
        y += 7;
      });
      
      // Draw totals
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(15, y, 195, y);
      y += 6;
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text('RINGKASAN LAPORAN:', 17, y);
      y += 6;
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Total Pemasukan: ${formatIDR(totalIncome)}`, 17, y);
      y += 5;
      doc.text(`Total Pengeluaran: ${formatIDR(totalExpense)}`, 17, y);
      y += 5;
      
      const netProfit = totalIncome - totalExpense;
      doc.setFont('Helvetica', 'bold');
      if (netProfit >= 0) {
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      doc.text(`Saldo Bersih: ${formatIDR(netProfit)}`, 17, y);
      
      // Footer info
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Dicetak secara otomatis via Cloud Kos System pada: ${new Date().toLocaleString('id-ID')}`, 17, pageHeight - 10);
      
      doc.save(`Laporan_Keuangan_Kos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal mengekspor PDF: ' + err);
    }
  };

  // Export to Excel / CSV
  const exportToExcel = () => {
    try {
      // CSV content with BOM for excel compatibility
      let csvContent = "\uFEFF";
      
      // Headers
      csvContent += "ID Transaksi,Tanggal,Nama Kos,Tipe,Kategori,Deskripsi,Jumlah (IDR)\n";
      
      filteredTransactions.forEach(tx => {
        const txId = tx.id;
        const txDate = tx.date;
        const txKosName = `"${(tx.kosName || 'Umum').replace(/"/g, '""')}"`;
        const txType = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const txCategory = `"${(tx.category || '').replace(/"/g, '""')}"`;
        const txDesc = `"${(tx.description || '').replace(/"/g, '""')}"`;
        const txAmount = tx.amount;
        
        csvContent += `${txId},${txDate},${txKosName},${txType},${txCategory},${txDesc},${txAmount}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laporan_Keuangan_Kos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Gagal mengekspor Excel: ' + err);
    }
  };

  // Months lists
  const monthsInIndonesian = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  // Map month names to digits for filtering
  const mapMonthToDigit = (monthName: string): string => {
    const map: Record<string, string> = {
      'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
      'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
      'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
    };
    return map[monthName] || '01';
  };

  // Filter & Sort Transactions
  const filteredTransactions = useMemo(() => {
    return financials
      .filter((tx) => {
        // Filter Type
        if (filterType !== 'all' && tx.type !== filterType) return false;

        // Filter Kos
        if (filterKosId !== 'all' && tx.kosId !== filterKosId) return false;

        // Filter Month & Year
        if (tx.date) {
          const [year, month] = tx.date.split('-');
          if (selectedYear !== 'all' && year !== selectedYear) return false;
          if (selectedMonth !== 'all' && month !== selectedMonth) return false;
        }

        // Filter Category
        if (filterCategory !== 'all' && tx.category !== filterCategory) return false;

        // Search Query
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const descMatch = tx.description?.toLowerCase().includes(q);
          const catMatch = tx.category?.toLowerCase().includes(q);
          const kosMatch = tx.kosName?.toLowerCase().includes(q);
          return descMatch || catMatch || kosMatch;
        }

        return true;
      })
      .sort((a, b) => {
        let compare = 0;
        if (sortBy === 'date') {
          compare = a.date.localeCompare(b.date);
        } else if (sortBy === 'amount') {
          compare = a.amount - b.amount;
        }

        return sortOrder === 'asc' ? compare : -compare;
      });
  }, [financials, filterType, filterKosId, selectedMonth, selectedYear, filterCategory, searchQuery, sortBy, sortOrder]);

  // Overall statistics
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [filteredTransactions]);

  // Chart Data Preparation (Grouped by Date/Month)
  const chartData = useMemo(() => {
    const dailyMap: Record<string, { date: string, pemasukan: number, pengeluaran: number }> = {};
    
    // Fill active days or standard months
    filteredTransactions.forEach(tx => {
      const dateKey = tx.date; // YYYY-MM-DD
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, pemasukan: 0, pengeluaran: 0 };
      }
      if (tx.type === 'income') {
        dailyMap[dateKey].pemasukan += tx.amount;
      } else {
        dailyMap[dateKey].pengeluaran += tx.amount;
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  // Pie Chart Data for categories
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions.forEach(tx => {
      categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
    return Object.entries(categories).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    }));
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      
      {/* Real-time Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income Card */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest">Total Pemasukan</span>
            <h3 className="text-xl font-bold font-mono text-emerald-900">{formatIDR(stats.income)}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold">Dari {filteredTransactions.filter(t => t.type === 'income').length} transaksi</p>
          </div>
          <div className="bg-emerald-500/10 p-3.5 rounded-full text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-widest">Total Pengeluaran</span>
            <h3 className="text-xl font-bold font-mono text-rose-900">{formatIDR(stats.expense)}</h3>
            <p className="text-[10px] text-rose-600 font-semibold">Dari {filteredTransactions.filter(t => t.type === 'expense').length} transaksi</p>
          </div>
          <div className="bg-rose-500/10 p-3.5 rounded-full text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Net Balance Card */}
        <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-xs ${stats.balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest ${stats.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Saldo Bersih</span>
            <h3 className={`text-xl font-bold font-mono ${stats.balance >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>{formatIDR(stats.balance)}</h3>
            <p className={`text-[10px] font-semibold ${stats.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Arus Kas Bersih</p>
          </div>
          <div className={`p-3.5 rounded-full ${stats.balance >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action Bar (Cloud Import & Add Transactions) */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Integrasi Cloud Real-time
          </h4>
          <p className="text-[10px] text-slate-400 font-medium">Sinkronisasi otomatis tagihan lunas penghuni ke pembukuan keuangan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportRent}
            disabled={importing}
            className="flex-1 sm:flex-initial py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {importing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyinkronkan...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Impor Tagihan Lunas</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Catatan Keuangan</span>
          </button>
        </div>
      </div>

      {/* Import Rent Success Banner Notification */}
      {importSuccessCount !== null && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs"
        >
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Berhasil menyinkronkan {importSuccessCount} tagihan lunas terbaru ke dalam Pemasukan Laporan Keuangan secara real-time!</span>
        </motion.div>
      )}

      {/* Charts & Graphs Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (Income vs Expense) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-blue-600" /> Tren Keuangan Kos
            </h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Harian / Transaksional</span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                    stroke="#cbd5e1"
                    tickFormatter={(str) => {
                      if (!str) return '';
                      const parts = str.split('-');
                      return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : str;
                    }}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} stroke="#cbd5e1" />
                  <Tooltip 
                    formatter={(value: any) => [formatIDR(value), '']}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <Area type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Pemasukan" />
                  <Area type="monotone" dataKey="pengeluaran" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Pengeluaran" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                <FileText className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-bold">Belum ada data untuk grafik tren</p>
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown (Pie chart / Category List) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
              <Building2 className="w-4 h-4 mr-1.5 text-blue-600" /> Alokasi Kategori
            </h4>
            
            {categoryData.length > 0 ? (
              <div className="space-y-4">
                {/* Pie Chart display */}
                <div className="h-32 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatIDR(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Categories List Legend with Percentage */}
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <span className="text-slate-600 font-bold truncate">{cat.name}</span>
                      </div>
                      <span className="font-mono font-extrabold text-slate-800 shrink-0 ml-2">{formatIDR(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 space-y-1">
                <FileText className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-bold">Belum ada data kategori</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Table & Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filters & Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Buku Kas Utama</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cloud Real-time Ledger</p>
              </div>
            </div>

            {/* Quick Filter & Export buttons */}
            <div className="flex flex-wrap gap-2 items-center self-start md:self-auto shrink-0">
              <div className="flex bg-slate-200/60 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${filterType === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('income')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${filterType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('expense')}
                  className={`px-3 py-1 text-[10px] font-black uppercase rounded-md tracking-wider transition-all cursor-pointer ${filterType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Pengeluaran
                </button>
              </div>

              <button
                type="button"
                onClick={exportToPDF}
                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ekspor ke PDF</span>
              </button>

              <button
                type="button"
                onClick={exportToExcel}
                className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor ke Excel</span>
              </button>
            </div>
          </div>

          {/* Form Filter Selector Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {/* Kos Select */}
            <div className="space-y-0.5">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Pilih Kos</label>
              <select
                value={filterKosId}
                onChange={(e) => setFilterKosId(e.target.value)}
                className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-blue-500"
              >
                <option value="all">Semua Properti Kos</option>
                <option value="">Umum / Semua Kos</option>
                {kosList.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>

            {/* Month Select */}
            <div className="space-y-0.5">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-blue-500"
              >
                {monthsInIndonesian.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div className="space-y-0.5">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-blue-500"
              >
                <option value="all">Semua Tahun</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2027">2027</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-0.5">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Kategori</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer focus:outline-blue-500"
              >
                <option value="all">Semua Kategori</option>
                {[...incomeCategories, ...expenseCategories].map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-0.5">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Urutkan</label>
              <div className="flex space-x-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 cursor-pointer focus:outline-blue-500"
                >
                  <option value="date">Tanggal</option>
                  <option value="amount">Nominal</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 border border-slate-200 bg-white rounded text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Cari Deskripsi</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded pl-7 pr-2 py-1 focus:outline-blue-500"
                />
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Table Rendering */}
        <div className="overflow-x-auto">
          {filteredTransactions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-extrabold text-[9px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Kos</th>
                  <th className="p-3">Keterangan / Deskripsi</th>
                  <th className="p-3 text-right">Nominal</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Date */}
                    <td className="p-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Category with Type badge */}
                    <td className="p-3">
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-bold text-slate-800">{tx.category}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded w-max tracking-wider ${
                          tx.type === 'income' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </div>
                    </td>

                    {/* Kos name */}
                    <td className="p-3 text-slate-500 font-semibold whitespace-nowrap">
                      {tx.kosName || 'Umum / Semua Kos'}
                    </td>

                    {/* Description */}
                    <td className="p-3 text-slate-600 font-medium max-w-xs truncate" title={tx.description}>
                      {tx.description || '-'}
                    </td>

                    {/* Amount */}
                    <td className={`p-3 text-right font-mono font-bold text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'} {formatIDR(tx.amount)}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tx)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                          title="Ubah Transaksi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini secara permanen dari cloud?')) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-700">Tidak Ada Data Transaksi</p>
                <p className="text-xs text-slate-400">Silakan tambahkan catatan transaksi baru atau sinkronisasikan tagihan lunas.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Wallet className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold uppercase tracking-wider">
                  {editingTransaction ? 'Ubah Catatan Transaksi' : 'Tambah Catatan Transaksi'}
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Type Switcher (Income / Expense) */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleFormTypeChange('income')}
                    className={`py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      formType === 'income' 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormTypeChange('expense')}
                    className={`py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      formType === 'expense' 
                        ? 'bg-rose-600 text-white shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pengeluaran
                  </button>
                </div>
              </div>

              {/* Amount Inputs */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Nominal Transaksi (Rp)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1.500.000"
                    value={formAmount}
                    onChange={(e) => {
                      // Allow only numbers
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormAmount(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                    }}
                    className="w-full text-sm font-bold font-mono text-slate-800 bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-blue-500 focus:border-blue-500"
                  />
                  <span className="absolute left-3.5 top-3 text-xs font-black text-slate-400">Rp</span>
                </div>
              </div>

              {/* Date & Kos Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Alokasi Properti Kos</label>
                  <select
                    value={formKosId}
                    onChange={(e) => setFormKosId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer focus:outline-blue-500"
                  >
                    <option value="all">Umum / Semua Kos</option>
                    {kosList.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category dropdown */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Kategori</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer focus:outline-blue-500"
                >
                  {formType === 'income' 
                    ? incomeCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)
                    : expenseCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)
                  }
                </select>
              </div>

              {/* Custom Category Input if 'Lainnya' selected */}
              {formCategory === 'Lainnya' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1"
                >
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Tulis Kategori Custom</label>
                  <input
                    type="text"
                    required
                    placeholder="Kategori spesifik lainnya..."
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                  />
                </motion.div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Deskripsi / Keterangan</label>
                <textarea
                  placeholder="Keterangan tambahan transaksi..."
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:outline-blue-500"
                />
              </div>

              {/* Submit panel */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
