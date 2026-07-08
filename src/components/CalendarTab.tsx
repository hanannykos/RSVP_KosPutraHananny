import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon, 
  Home, 
  User, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  Search, 
  X,
  Bell
} from 'lucide-react';
import { Payment } from '../types';

interface CalendarTabProps {
  payments: Payment[];
  onMarkPaid: (paymentId: string) => void;
  onSendWhatsAppReminder: (pay: Payment, customMsg?: string) => void;
}

const MONTHS_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAYS_INDONESIA = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

export default function CalendarTab({ payments, onMarkPaid, onSendWhatsAppReminder }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Default to July 2026 since the data is seeded around July 2026
    return new Date(2026, 6, 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterKos, setFilterKos] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedPayments, setCollapsedPayments] = useState<Record<string, boolean>>({});
  const [waModalPayment, setWaModalPayment] = useState<Payment | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    // Standard system is July 2026
    setCurrentDate(new Date(2026, 6, 1));
    setSelectedDay(1);
  };

  // List of Kos branches for filter
  const uniqueKosBranches = useMemo(() => {
    const set = new Set<string>();
    const list: { id: string; name: string }[] = [];
    payments.forEach(p => {
      if (p.kosId && p.kosName && !set.has(p.kosId)) {
        set.add(p.kosId);
        list.push({ id: p.kosId, name: p.kosName });
      }
    });
    return list;
  }, [payments]);

  // Compute stats and payments for current month & filters
  const currentMonthPayments = useMemo(() => {
    return payments.filter(p => {
      let isMatch = true;
      
      // Match Kos filter
      if (filterKos !== 'all' && p.kosId !== filterKos) {
        isMatch = false;
      }
      
      // Match search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.tenantName?.toLowerCase().includes(q);
        const roomMatch = p.roomNumber?.toLowerCase().includes(q);
        const kosMatch = p.kosName?.toLowerCase().includes(q);
        if (!nameMatch && !roomMatch && !kosMatch) {
          isMatch = false;
        }
      }

      // Check if billingDate matches the current month and year
      if (p.billingDate) {
        const pDate = new Date(p.billingDate);
        const billingYearMatch = pDate.getFullYear() === currentYear;
        const billingMonthMatch = pDate.getMonth() === currentMonth;
        return isMatch && billingYearMatch && billingMonthMatch;
      } else {
        // Fallback: If no billingDate is specified, we check the month string and year
        // We translate the month string to index (e.g. "Juli" -> index 6)
        const monthStringIndex = MONTHS_INDONESIA.findIndex(
          m => m.toLowerCase().startsWith(p.month.toLowerCase().substring(0, 3))
        );
        const monthMatch = monthStringIndex === currentMonth;
        const yearMatch = p.year === currentYear;
        return isMatch && monthMatch && yearMatch;
      }
    });
  }, [payments, currentYear, currentMonth, filterKos, searchQuery]);

  // Calendar structure calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: { 
      day: number; 
      isCurrentMonth: boolean; 
      dateString: string;
      payments: Payment[];
    }[] = [];

    // Prev month overflow cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = lastDayOfPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const dateString = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      // Filter payments on this day
      const prevDayPayments = payments.filter(p => p.billingDate === dateString);

      cells.push({
        day: dayNum,
        isCurrentMonth: false,
        dateString,
        payments: prevDayPayments
      });
    }

    // Current month cells
    for (let i = 1; i <= lastDayOfMonth; i++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayPayments = payments.filter(p => {
        let isMatch = true;
        if (filterKos !== 'all' && p.kosId !== filterKos) isMatch = false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const nameMatch = p.tenantName?.toLowerCase().includes(q);
          const roomMatch = p.roomNumber?.toLowerCase().includes(q);
          if (!nameMatch && !roomMatch) isMatch = false;
        }

        if (p.billingDate) {
          return isMatch && p.billingDate === dateString;
        } else {
          // If no billing date, assign to 1st of month as placeholder
          const isFirstDay = i === 1;
          const monthStringIndex = MONTHS_INDONESIA.findIndex(
            m => m.toLowerCase().startsWith(p.month.toLowerCase().substring(0, 3))
          );
          return isMatch && isFirstDay && monthStringIndex === currentMonth && p.year === currentYear;
        }
      });

      cells.push({
        day: i,
        isCurrentMonth: true,
        dateString,
        payments: dayPayments
      });
    }

    // Next month overflow cells to fill grid up to 42 cells (6 rows)
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateString = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const nextDayPayments = payments.filter(p => p.billingDate === dateString);

      cells.push({
        day: i,
        isCurrentMonth: false,
        dateString,
        payments: nextDayPayments
      });
    }

    return cells;
  }, [payments, currentYear, currentMonth, filterKos, searchQuery]);

  // Overall statistics for current month and filter selection
  const monthlyStats = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    currentMonthPayments.forEach(p => {
      totalInvoiced += p.amount;
      if (p.status === 'paid') {
        totalPaid += p.amount;
      } else if (p.status === 'overdue') {
        totalOverdue += p.amount;
      } else {
        totalPending += p.amount;
      }
    });

    return { totalInvoiced, totalPaid, totalPending, totalOverdue };
  }, [currentMonthPayments]);

  // Billing list for currently selected day
  const selectedDayPayments = useMemo(() => {
    if (selectedDay === null) return [];
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    // Find matching payments
    return currentMonthPayments.filter(p => {
      if (p.billingDate) {
        return p.billingDate === dateString;
      } else {
        // Fallback to first day
        return selectedDay === 1;
      }
    });
  }, [selectedDay, currentMonthPayments, currentYear, currentMonth]);

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6" id="calendar-module-container">
      {/* Top Filter and Search Action bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Month Navigation Controls */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-prev-month"
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          
          <div className="text-sm font-extrabold text-slate-800 min-w-[140px] text-center uppercase tracking-wider">
            {MONTHS_INDONESIA[currentMonth]} {currentYear}
          </div>

          <button
            id="btn-next-month"
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          <button
            id="btn-today-july"
            onClick={handleToday}
            className="ml-2 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            Reset Bulan Data
          </button>
        </div>

        {/* Right: Filters & Input search */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-xl justify-end">
          {/* Branch Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cabang:</span>
            <select
              id="calendar-kos-filter"
              value={filterKos}
              onChange={(e) => {
                setFilterKos(e.target.value);
                setSelectedDay(null);
              }}
              className="bg-slate-50 border border-slate-200 rounded py-1 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
            >
              <option value="all">Semua Cabang</option>
              {uniqueKosBranches.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="calendar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedDay(null);
              }}
              placeholder="Cari nama atau nomor kamar..."
              className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 pl-9 pr-4 text-xs font-bold outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Monthly Finance Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-lg">
          <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center">
            <CalendarIcon className="w-3 h-3 mr-1" /> Total Tagihan Bulan Ini
          </p>
          <p className="text-base font-extrabold text-slate-800 mt-1">{formatIDR(monthlyStats.totalInvoiced)}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{currentMonthPayments.length} Dokumen Aktif</p>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-lg">
          <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Total Terbayar (Lunas)
          </p>
          <p className="text-base font-extrabold text-emerald-800 mt-1">{formatIDR(monthlyStats.totalPaid)}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
            {monthlyStats.totalInvoiced > 0 ? Math.round((monthlyStats.totalPaid / monthlyStats.totalInvoiced) * 100) : 0}% Tingkat Kelancaran
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-lg">
          <p className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Belum Dibayar (Pending)
          </p>
          <p className="text-base font-extrabold text-amber-800 mt-1">{formatIDR(monthlyStats.totalPending)}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Menunggu Transfer Penyewa</p>
        </div>

        <div className="bg-rose-50/50 border border-rose-100 p-3.5 rounded-lg">
          <p className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" /> Jatuh Tempo / Menunggak
          </p>
          <p className="text-base font-extrabold text-rose-800 mt-1">{formatIDR(monthlyStats.totalOverdue)}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Perlu Tindakan Keras / Hubungi Penyewa</p>
        </div>
      </div>

      {/* Main Layout Grid (Calendar Grid left 2/3, Detailed Day view right 1/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Calendar Grid Container */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs xl:col-span-2 space-y-3">
          <div className="grid grid-cols-7 gap-1 border-b border-slate-100 pb-2">
            {DAYS_INDONESIA.map((day, idx) => (
              <div 
                key={day} 
                className={`text-center text-[10px] font-extrabold uppercase tracking-widest py-1 ${
                  idx === 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 bg-slate-50 p-1 rounded-lg">
            {calendarCells.map((cell, idx) => {
              const isSelected = selectedDay === cell.day && cell.isCurrentMonth;
              const cellPayments = cell.payments;

              // Color indicators based on payment statuses of that day
              const hasPaid = cellPayments.some(p => p.status === 'paid');
              const hasPending = cellPayments.some(p => p.status === 'pending');
              const hasOverdue = cellPayments.some(p => p.status === 'overdue');

              return (
                <div
                  key={`${cell.dateString}_${idx}`}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedDay(cell.day);
                    }
                  }}
                  className={`min-h-[70px] sm:min-h-[85px] p-1 border rounded-md transition-all flex flex-col justify-between cursor-pointer group ${
                    !cell.isCurrentMonth 
                      ? 'bg-slate-50/40 text-slate-300 border-slate-100 cursor-not-allowed select-none' 
                      : isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  {/* Day Number and Dot Indicator */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-extrabold font-mono ${
                      !cell.isCurrentMonth 
                        ? 'text-slate-300' 
                        : isSelected 
                          ? 'text-white' 
                          : 'text-slate-700'
                    }`}>
                      {cell.day}
                    </span>
                    
                    {/* Status Dot Row */}
                    {cell.isCurrentMonth && cellPayments.length > 0 && (
                      <div className="flex space-x-0.5">
                        {hasOverdue && <span className={`w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ${isSelected ? 'ring-white' : 'ring-rose-200'}`} />}
                        {hasPending && <span className={`w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ${isSelected ? 'ring-white' : 'ring-amber-200'}`} />}
                        {hasPaid && <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ${isSelected ? 'ring-white' : 'ring-emerald-200'}`} />}
                      </div>
                    )}
                  </div>

                  {/* Day Contents (Desktop display of tiny events list) */}
                  <div className="flex-1 mt-1 flex flex-col justify-end space-y-0.5 overflow-hidden">
                    {cell.isCurrentMonth && cellPayments.slice(0, 2).map((pay) => (
                      <div 
                        key={pay.id} 
                        className={`text-[8px] px-1 py-0.5 rounded truncate font-bold uppercase tracking-wider ${
                          isSelected
                            ? 'bg-blue-700/60 text-blue-50'
                            : pay.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : pay.status === 'overdue'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {pay.tenantName.split(' ')[0]} ({pay.roomNumber})
                      </div>
                    ))}
                    
                    {cell.isCurrentMonth && cellPayments.length > 2 && (
                      <div className={`text-[7px] text-right font-extrabold pr-0.5 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                        +{cellPayments.length - 2} Lainnya
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Color Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200/40">
            <span className="text-slate-400 font-bold">Keterangan Tagihan:</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-emerald-500 mr-1.5 border border-emerald-600" /> LUNAS</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-amber-500 mr-1.5 border border-amber-600" /> PENDING</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-rose-500 mr-1.5 border border-rose-600" /> JATUH TEMPO</span>
          </div>
        </div>

        {/* Selected Day Details Panel (Right 1/3) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col h-full min-h-[420px] max-h-[600px] xl:sticky xl:top-4 overflow-hidden">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
              Detail Tagihan Tanggal
            </h4>
            {selectedDay && (
              <span className="bg-blue-600 text-white font-mono font-extrabold text-xs px-2.5 py-1 rounded">
                {selectedDay} {MONTHS_INDONESIA[currentMonth]}
              </span>
            )}
          </div>

          {selectedDay === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CalendarIcon className="w-10 h-10 mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-bold uppercase tracking-wider">Pilih Tanggal Kalender</p>
              <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mt-1 leading-normal">
                Klik salah satu sel tanggal pada kalender kiri untuk melihat daftar tagihan jatuh tempo secara rinci.
              </p>
            </div>
          ) : selectedDayPayments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-400 stroke-1 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Bebas Tagihan</p>
              <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mt-1 leading-normal">
                Tidak ada agenda penagihan atau tanggal jatuh tempo untuk tanggal {selectedDay} {MONTHS_INDONESIA[currentMonth]} {currentYear}.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">
                Ditemukan {selectedDayPayments.length} Agenda Penagihan:
              </p>

              {selectedDayPayments.map((pay) => {
                const isCollapsed = collapsedPayments[pay.id] ?? false;

                return (
                  <div 
                    key={pay.id} 
                    className={`p-3.5 rounded-lg border transition-all space-y-2 flex flex-col justify-between ${
                      pay.status === 'paid' 
                        ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-200' 
                        : pay.status === 'overdue'
                          ? 'bg-rose-50/30 border-rose-100 hover:border-rose-200 shadow-xs'
                          : 'bg-amber-50/30 border-amber-100 hover:border-amber-200'
                    }`}
                  >
                    <div className="space-y-1">
                      {/* Header: Name, Status badge, and Collapse button */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <h5 className="text-xs font-bold text-slate-800 truncate">{pay.tenantName}</h5>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest ${
                            pay.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : pay.status === 'overdue'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {pay.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCollapsedPayments(prev => ({
                                ...prev,
                                [pay.id]: !isCollapsed
                              }));
                            }}
                            className="p-1 hover:bg-slate-200/60 rounded text-slate-500 transition-colors cursor-pointer"
                            title={isCollapsed ? "Tampilkan detail" : "Sembunyikan detail"}
                          >
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <>
                          {/* Room and Kos Details */}
                          <div className="text-[10px] text-slate-500 font-medium pl-5 space-y-0.5">
                            <p className="flex items-center">
                              <Home className="w-3 h-3 mr-1 text-slate-400" />
                              {pay.kosName} — Kamar {pay.roomNumber}
                            </p>
                            <p className="flex items-center">
                              <CreditCard className="w-3 h-3 mr-1 text-slate-400" />
                              Periode: <span className="font-bold text-slate-600 ml-1">{pay.month} {pay.year}</span>
                            </p>
                          </div>

                          {/* Cost Amount */}
                          <p className="pl-5 text-xs font-extrabold text-slate-800 font-mono mt-1">
                            {formatIDR(pay.amount)}
                          </p>
                        </>
                      )}
                    </div>

                    {!isCollapsed && (
                      /* Actions inside Detail Panel */
                      <div className="space-y-2 pt-2 border-t border-slate-100/60 mt-1">
                        {pay.status !== 'paid' && (
                          <button
                            onClick={() => onMarkPaid(pay.id)}
                            className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Set Lunas</span>
                          </button>
                        )}

                        {pay.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => setWaModalPayment(pay)}
                            className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Preview Pengingat WA</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* WhatsApp Reminder Modal */}
      {waModalPayment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-blue-400 animate-bounce" />
                <h4 className="text-sm font-bold uppercase tracking-wider">Preview Pengingat WA</h4>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setWaModalPayment(null);
                  setCopiedId(null);
                }} 
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Berikut adalah pesan pengingat tagihan sewa untuk {waModalPayment.tenantName}:
              </p>
              
              <div className="text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed select-all bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                {`Halo Kak ${waModalPayment.tenantName}, kami ingin menginfokan tagihan sewa bulanan ${waModalPayment.kosName} (${waModalPayment.roomNumber}) sebesar Rp ${waModalPayment.amount.toLocaleString('id-ID')} untuk periode ${waModalPayment.month} ${waModalPayment.year} telah jatuh tempo.\n\nPembayaran dapat ditransfer ke:\nRekening Mandiri: 123-456-789-0 a.n Hananny Kos.\n\nMohon konfirmasi jika sudah transfer ya Kak. Terima kasih! 😊`}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Halo Kak ${waModalPayment.tenantName}, kami ingin menginfokan tagihan sewa bulanan ${waModalPayment.kosName} (${waModalPayment.roomNumber}) sebesar Rp ${waModalPayment.amount.toLocaleString('id-ID')} untuk periode ${waModalPayment.month} ${waModalPayment.year} telah jatuh tempo.\n\nPembayaran dapat ditransfer ke:\nRekening Mandiri: 123-456-789-0 a.n Hananny Kos.\n\nMohon konfirmasi jika sudah transfer ya Kak. Terima kasih! 😊`;
                    navigator.clipboard.writeText(text);
                    setCopiedId(waModalPayment.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-sm"
                >
                  <span>{copiedId === waModalPayment.id ? 'Tersalin ke Clipboard!' : 'Salin Pesan WA'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWaModalPayment(null);
                    setCopiedId(null);
                  }}
                  className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
