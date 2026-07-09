import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  CalendarCheck, 
  FileCheck, 
  Lock, 
  Check, 
  Cpu, 
  Phone, 
  User, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  HeartHandshake,
  Coins,
  Shield,
  PenTool,
  Wrench,
  ShieldAlert,
  Camera,
  X,
  Image
} from 'lucide-react';
import { Kos, Room, Reservation, Tenant, Complaint } from '../types';

interface PublicPortalProps {
  kosList: Kos[];
  rooms: Room[];
  tenants: Tenant[];
  reservations: Reservation[];
  onAddReservation: (resData: Omit<Reservation, 'id'>) => Promise<void>;
  onAddComplaint: (compData: Omit<Complaint, 'id' | 'createdAt'>) => Promise<void>;
  onEnterAdminMode: () => void;
}

export default function PublicPortal({
  kosList,
  rooms,
  tenants,
  reservations,
  onAddReservation,
  onAddComplaint,
  onEnterAdminMode
}: PublicPortalProps) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Booking Form States
  const [bookName, setBookName] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookGender, setBookGender] = useState<'LAKI-LAKI' | 'PEREMPUAN'>('LAKI-LAKI');
  const [bookKosId, setBookKosId] = useState('');
  const [bookKosManualText, setBookKosManualText] = useState('');
  const [showKosSuggestions, setShowKosSuggestions] = useState(false);
  const [bookRoomId, setBookRoomId] = useState('');
  const [bookRoomManualText, setBookRoomManualText] = useState('');
  const [showRoomSuggestions, setShowRoomSuggestions] = useState(false);
  const [bookDate, setBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookNotes, setBookNotes] = useState('');

  // Guarantor / Penanggung Jawab States
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorRelationship, setGuarantorRelationship] = useState('Orang Tua');
  const [guarantorRelationshipDetail, setGuarantorRelationshipDetail] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Payment Proof States
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [paymentProofName, setPaymentProofName] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Signature / Tanda Tangan & Informed Consent States
  const [signatureUrl, setSignatureUrl] = useState('');
  const [informedConsentAccepted, setInformedConsentAccepted] = useState(false);

  // Pekerjaan, Status Perkawinan & ID Card / KTM States
  const [pekerjaan, setPekerjaan] = useState('Mahasiswa');
  const [pekerjaanDetail, setPekerjaanDetail] = useState('');
  const [statusPerkawinan, setStatusPerkawinan] = useState('Single (Belum Berkeluarga)');
  const [statusPerkawinanDetail, setStatusPerkawinanDetail] = useState('');
  const [idCardUrl, setIdCardUrl] = useState('');
  const [idCardName, setIdCardName] = useState('');
  const [ktpPhotoUrl, setKtpPhotoUrl] = useState('');
  const [uploadingIdCard, setUploadingIdCard] = useState(false);

  // States for Complaint Form (Laporan Keluhan Kos)
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compKosName, setCompKosName] = useState('');
  const [compRoomNumber, setCompRoomNumber] = useState('');
  const [compIssue, setCompIssue] = useState('');
  const [compSeverity, setCompSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [compDetails, setCompDetails] = useState('');
  const [compTenantId, setCompTenantId] = useState('');
  const [compKosId, setCompKosId] = useState('');
  const [compRoomId, setCompRoomId] = useState('');
  const [showCompSuggestions, setShowCompSuggestions] = useState(false);
  const [compPhotos, setCompPhotos] = useState<string[]>([]);

  // Suggestions for Tenant / Reporter Name (trigger >= 3 chars)
  const tenantSuggestions = useMemo(() => {
    if (compName.trim().length < 3) return [];
    const query = compName.toLowerCase();
    return tenants.filter(t => t.name.toLowerCase().includes(query));
  }, [tenants, compName]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowCompSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a'; // Slate 900
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureUrl(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureUrl('');
  };

  // Filter available rooms for reservation
  const availableRooms = useMemo(() => {
    if (!bookKosId) return [];
    return rooms.filter(r => r.kosId === bookKosId && r.status === 'available');
  }, [rooms, bookKosId]);

  // Suggestions for manual kos branch input (when typing >= 2 chars)
  const filteredKosSuggestions = useMemo(() => {
    if (bookKosManualText.length < 2) return [];
    const query = bookKosManualText.toLowerCase();
    return kosList.filter(k => k.name.toLowerCase().includes(query));
  }, [kosList, bookKosManualText]);

  // Suggestions for manual room input (when typing >= 2 chars)
  const filteredRoomSuggestions = useMemo(() => {
    if (bookRoomManualText.length < 2) return [];
    const query = bookRoomManualText.toLowerCase();
    // Suggest rooms from the selected kos location that match the text
    return rooms.filter(r => 
      r.kosId === bookKosId && 
      r.roomNumber.toLowerCase().includes(query)
    );
  }, [rooms, bookKosId, bookRoomManualText]);

  // Find selected Kos branch details for booking payment info
  const bookingKos = useMemo(() => {
    return kosList.find(k => k.id === bookKosId);
  }, [kosList, bookKosId]);

  const bankAccountDisplay = useMemo(() => {
    if (bookingKos && bookingKos.bankAccount) {
      if (bookingKos.bankRecipient) {
        return `${bookingKos.bankAccount} a.n ${bookingKos.bankRecipient}`;
      }
      return bookingKos.bankAccount;
    }
    return "MANDIRI 123-456-789-0 a.n Hananny Kos";
  }, [bookingKos]);

  // Format price to IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Handle KTP Upload
  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = reader.result as string;
        setKtpPhotoUrl(base64Str);
        const response = await fetch('/api/verify-ktp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Str, mimeType: file.type })
        });
        const resData = await response.json();
        if (resData.success) {
          setScanResult(resData.data);
          setBookName(resData.data.nama || '');
          if (resData.data.jenisKelamin === 'PEREMPUAN' || resData.data.jenisKelamin === 'LAKI-LAKI') {
            setBookGender(resData.data.jenisKelamin);
          }
        } else {
          alert('Gagal memindai KTP: ' + resData.error);
        }
        setScanning(false);
      };
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
      setScanning(false);
    }
  };

  const handleSimulateKtp = () => {
    setScanning(true);
    setTimeout(() => {
      const sample = {
        nik: '3171051203950002',
        nama: 'GISELLA ANASTASIA',
        alamat: 'Kec. Kebayoran Baru, Jakarta Selatan',
        ttl: 'SURABAYA, 16-11-1990',
        jenisKelamin: 'PEREMPUAN',
        confidenceScore: 0.98,
        isAuthentic: true
      };
      setScanResult(sample);
      setBookName(sample.nama);
      setBookGender('PEREMPUAN');
      setKtpPhotoUrl('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" rx="10" fill="%230284c7"/><text x="150" y="30" fill="white" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">KARTU TANDA PENDUDUK REPUBLIK INDONESIA</text><text x="20" y="70" fill="white" font-family="sans-serif" font-size="10" font-weight="bold">NIK: 3171051203950002</text><text x="20" y="95" fill="white" font-family="sans-serif" font-size="9">Nama: GISELLA ANASTASIA</text><text x="20" y="115" fill="white" font-family="sans-serif" font-size="9">Alamat: Kec. Kebayoran Baru, Jakarta Selatan</text><rect x="220" y="60" width="60" height="80" fill="%23cbd5e1" rx="4"/><text x="250" y="105" fill="%2364748b" font-family="sans-serif" font-size="8" text-anchor="middle">FOTO</text></svg>');
      setScanning(false);
    }, 1200);
  };

  // Handle Payment Proof Upload
  const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setPaymentProofUrl(reader.result as string);
      setPaymentProofName(file.name);
      setUploadingProof(false);
    };
    reader.onerror = () => {
      alert('Gagal membaca file bukti pembayaran.');
      setUploadingProof(false);
    };
  };

  const handleSimulatePaymentProof = () => {
    setUploadingProof(true);
    setTimeout(() => {
      setPaymentProofUrl('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&q=80');
      setPaymentProofName('bukti_transfer_mandiri_lunas.png');
      setUploadingProof(false);
    }, 800);
  };

  // Handle ID Card/KTM Upload
  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdCard(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setIdCardUrl(reader.result as string);
      setIdCardName(file.name);
      setUploadingIdCard(false);
    };
    reader.onerror = () => {
      alert('Gagal membaca file ID Card/KTM.');
      setUploadingIdCard(false);
    };
  };

  const handleSimulateIdCard = () => {
    setUploadingIdCard(true);
    setTimeout(() => {
      setIdCardUrl('https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80');
      setIdCardName('kartu_tanda_mahasiswa_ktm.png');
      setUploadingIdCard(false);
    }, 800);
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compKosName.trim() || !compRoomNumber.trim() || !compIssue.trim() || !compDetails.trim()) {
      alert('Mohon lengkapi semua kolom wajib (Nama Pelapor, Lokasi Kos, No Kamar, Keluhan, dan Detail Masalah).');
      return;
    }

    try {
      await onAddComplaint({
        tenantId: compTenantId || 'manual',
        tenantName: compName,
        kosId: compKosId || 'manual',
        kosName: compKosName,
        roomId: compRoomId || 'manual',
        roomNumber: compRoomNumber,
        issue: compIssue,
        details: compDetails,
        severity: compSeverity,
        status: 'pending',
        documentationPhotos: compPhotos
      });

      alert('Laporan Keluhan berhasil dikirimkan ke Manajemen! Tim kami akan segera menindaklanjuti keluhan Anda. Terima kasih.');
      
      // Reset form
      setCompName('');
      setCompKosName('');
      setCompRoomNumber('');
      setCompIssue('');
      setCompSeverity('medium');
      setCompDetails('');
      setCompTenantId('');
      setCompKosId('');
      setCompRoomId('');
      setCompPhotos([]);
      setShowComplaintModal(false);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirimkan laporan keluhan. Silakan coba kembali.');
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookKosId || !bookRoomId || !bookName || !bookPhone) {
      alert('Mohon lengkapi seluruh kolom wajib yang bertanda (*).');
      return;
    }

    if (bookKosId === 'Lainnya' && !bookKosManualText.trim()) {
      alert('Mohon tuliskan Lokasi Cabang Kos secara manual.');
      return;
    }

    if (bookRoomId === 'Lainnya' && !bookRoomManualText.trim()) {
      alert('Mohon tuliskan Nomor Kamar secara manual.');
      return;
    }

    if (!bookDate) {
      alert('Mohon lengkapi rencana tanggal masuk.');
      return;
    }

    if (!informedConsentAccepted) {
      alert('Anda wajib menyetujui Keterangan Perjanjian Sewa Kamar Kost untuk melakukan pemesanan.');
      return;
    }

    if (!signatureUrl) {
      alert('Mohon bubuhkan tanda tangan digital Anda sebagai bukti kesepakatan sewa.');
      return;
    }

    let finalKosId = bookKosId;
    let finalKosName = '';
    if (bookKosId === 'Lainnya') {
      finalKosName = bookKosManualText;
    } else {
      const selectedKos = kosList.find(k => k.id === bookKosId);
      if (!selectedKos) return;
      finalKosName = selectedKos.name;
    }

    let finalRoomId = bookRoomId;
    let finalRoomNumber = '';

    if (bookRoomId === 'Lainnya') {
      finalRoomNumber = bookRoomManualText;
    } else {
      const selectedRoom = rooms.find(r => r.id === bookRoomId);
      if (!selectedRoom) return;
      finalRoomNumber = selectedRoom.roomNumber;
    }

    try {
      await onAddReservation({
        name: bookName,
        phone: bookPhone,
        email: bookEmail || `${bookName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        jenisKelamin: bookGender,
        kosId: finalKosId,
        kosName: finalKosName,
        roomId: finalRoomId,
        roomNumber: finalRoomNumber,
        status: 'pending',
        checkInDate: bookDate,
        notes: bookNotes,
        ktpVerified: !!scanResult,
        ktpDetails: scanResult ? {
          nik: scanResult.nik,
          nama: scanResult.nama,
          alamat: scanResult.alamat,
          ttl: scanResult.ttl,
          jenisKelamin: scanResult.jenisKelamin,
          confidenceScore: scanResult.confidenceScore
        } : undefined,
        guarantorName,
        guarantorPhone,
        guarantorRelationship,
        guarantorRelationshipDetail: guarantorRelationship === 'Lainnya' ? guarantorRelationshipDetail : '',
        paymentProofUrl,
        signatureUrl,
        informedConsentAccepted,
        pekerjaan,
        pekerjaanDetail: pekerjaan === 'Lainnya' ? pekerjaanDetail : '',
        statusPerkawinan,
        statusPerkawinanDetail: statusPerkawinan === 'Lainnya' ? statusPerkawinanDetail : '',
        idCardUrl,
        idCardName,
        ktpPhotoUrl
      });

      setShowSuccessPopup(true);

      // Reset Form States
      setBookName('');
      setBookPhone('');
      setBookEmail('');
      setBookKosId('');
      setBookKosManualText('');
      setBookRoomId('');
      setBookRoomManualText('');
      setBookDate(new Date().toISOString().split('T')[0]);
      setBookNotes('');
      setScanResult(null);
      setGuarantorName('');
      setGuarantorPhone('');
      setGuarantorRelationship('Orang Tua');
      setGuarantorRelationshipDetail('');
      setPaymentProofUrl('');
      setPaymentProofName('');
      setSignatureUrl('');
      setInformedConsentAccepted(false);
      setPekerjaan('Mahasiswa');
      setPekerjaanDetail('');
      setStatusPerkawinan('Single (Belum Berkeluarga)');
      setStatusPerkawinanDetail('');
      setIdCardUrl('');
      setIdCardName('');
      clearSignature();
    } catch (err) {
      console.error(err);
      alert('Gagal mengirimkan registrasi. Silakan coba kembali.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-850 uppercase tracking-tight">Portal Registrasi Hananny Kos</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Formulir Booking Kamar & Registrasi Penghuni Baru</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowComplaintModal(true)}
            className="px-4 py-2 border border-amber-200 bg-amber-50/30 text-amber-700 hover:bg-amber-100/60 font-bold rounded text-xs transition-colors flex items-center space-x-1.5 uppercase tracking-wider cursor-pointer justify-center"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Laporan Keluhan Kos</span>
          </button>

          <button
            onClick={onEnterAdminMode}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded text-xs transition-colors flex items-center space-x-1.5 uppercase tracking-wider cursor-pointer justify-center"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Masuk Admin</span>
          </button>
        </div>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Card Header & Banner */}
        <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-900 inline-block">
              Registrasi Hunian Modern
            </span>
            <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight">
              Formulir Booking Kamar & Verifikasi Penyewa
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-medium">
              Isi data diri lengkap Anda, data penanggung jawab (orang tua), serta lampirkan bukti transfer booking fee/DP untuk memvalidasi pemesanan unit kamar secara langsung.
            </p>
          </div>
        </div>

        {/* Inline Booking Form */}
        <form onSubmit={handleBookingSubmit} className="p-6 space-y-8">
          
          {/* STEP 1: VERIFIKASI IDENTITAS (OPSIONAL) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">1</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Cpu className="w-4 h-4 mr-1.5 text-blue-600" />
                Verifikasi Identitas KTP Penyewa
              </h3>
            </div>
            
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pindai / Unggah Foto KTP Anda</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed uppercase tracking-wider">
                  Verifikasi otomatis menggunakan Gemini AI untuk pengisian data instan & verifikasi tepercaya.
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] cursor-pointer transition-colors uppercase tracking-wider">
                  Unggah KTP
                  <input type="file" accept="image/*" onChange={handleKtpUpload} className="hidden" disabled={scanning} />
                </label>
              </div>
            </div>

            {scanning && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-bold flex items-center justify-center space-x-2 uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Memindai KTP dengan Gemini AI...</span>
              </div>
            )}

            {scanResult && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-[10px] text-emerald-800 font-bold flex items-center justify-between uppercase tracking-wider">
                <div className="flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>KTP Terverifikasi: {scanResult.nama} ({scanResult.nik})</span>
                </div>
                <span className="text-emerald-600 font-mono">Skor Akurasi: {Math.round(scanResult.confidenceScore * 100)}%</span>
              </div>
            )}
          </div>

          {/* STEP 1.5: VERIFIKASI ID CARD/KTM (OPSIONAL) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-slate-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">1b</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Upload className="w-4 h-4 mr-1.5 text-slate-500" />
                Verifikasi Identitas ID Card / KTM Penyewa <span className="ml-1.5 text-[8px] font-extrabold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Opsional / Bisa Menyusul</span>
              </h3>
            </div>
            
            <p className="text-[10px] text-slate-400 font-semibold uppercase leading-relaxed tracking-wider">
              Pindai / Unggah Foto ID Card Kantor / KTM Mahasiswa Anda.
            </p>

            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pindai / Unggah Foto ID Card/KTM Anda</p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed uppercase tracking-wider">
                  Membantu proses persetujuan admin lebih cepat & tepercaya.
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSimulateIdCard}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] transition-colors uppercase tracking-wider border border-slate-200 cursor-pointer"
                >
                  Simulasi ID Card
                </button>
                <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] cursor-pointer transition-colors uppercase tracking-wider">
                  Unggah ID Card
                  <input type="file" accept="image/*" onChange={handleIdCardUpload} className="hidden" disabled={uploadingIdCard} />
                </label>
              </div>
            </div>

            {uploadingIdCard && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-bold flex items-center justify-center space-x-2 uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Memproses ID Card / KTM...</span>
              </div>
            )}

            {idCardUrl && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-xs">ID Card/KTM Terekam: {idCardName || "id_card_ktm.png"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdCardUrl('');
                    setIdCardName('');
                  }}
                  className="text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: DATA DIRI PENYEWA */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">2</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <User className="w-4 h-4 mr-1.5 text-blue-600" />
                Data Diri Lengkap Calon Penyewa
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nama Lengkap Penyewa *</label>
                <input
                  type="text"
                  required
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                  placeholder="Contoh: Gisella Anastasia"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">No. WhatsApp / HP Aktif *</label>
                <input
                  type="text"
                  required
                  value={bookPhone}
                  onChange={(e) => setBookPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                  placeholder="Contoh: 081298765432"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Alamat Email Aktif</label>
                <input
                  type="email"
                  value={bookEmail}
                  onChange={(e) => setBookEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                  placeholder="gisella@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Jenis Kelamin</label>
                <select
                  value={bookGender}
                  onChange={(e) => setBookGender(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                >
                  <option value="LAKI-LAKI">Laki-Laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pekerjaan *</label>
                <select
                  required
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                >
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Karyawan">Karyawan</option>
                  <option value="Lainnya">Lainnya (Tulis Manual)</option>
                </select>
                {pekerjaan === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={pekerjaanDetail}
                    onChange={(e) => setPekerjaanDetail(e.target.value)}
                    className="w-full mt-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                    placeholder="Tulis pekerjaan Anda..."
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status Perkawinan *</label>
                <select
                  required
                  value={statusPerkawinan}
                  onChange={(e) => setStatusPerkawinan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                >
                  <option value="Single (Belum Berkeluarga)">Single (Belum Berkeluarga)</option>
                  <option value="Single (Sudah Pernah Menikah)">Single (Sudah Pernah Menikah)</option>
                  <option value="Sudah Berkeluarga">Sudah Berkeluarga</option>
                  <option value="Lainnya">Lainnya (Tulis Manual)</option>
                </select>
                {statusPerkawinan === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={statusPerkawinanDetail}
                    onChange={(e) => setStatusPerkawinanDetail(e.target.value)}
                    className="w-full mt-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                    placeholder="Tulis status perkawinan..."
                  />
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: LOKASI & UNIT PILIHAN */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">3</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Building2 className="w-4 h-4 mr-1.5 text-blue-600" />
                Pilihan Unit Kamar Kos & Tanggal Masuk
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pilih Lokasi Cabang Kos *</label>
                <select
                  required
                  value={bookKosId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBookKosId(val);
                    setBookRoomId(val === 'Lainnya' ? 'Lainnya' : '');
                    if (val !== 'Lainnya') {
                      setBookKosManualText('');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                >
                  <option value="">-- Pilih Lokasi Kos --</option>
                  {kosList
                    .filter(k => !(k.hideWhenFull && rooms.filter(r => r.kosId === k.id).length > 0 && !rooms.filter(r => r.kosId === k.id).some(r => r.status === 'available')))
                    .map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  <option value="Lainnya">Lainnya (Tulis Manual)</option>
                </select>

                {bookKosId === 'Lainnya' && (
                  <div className="relative mt-2">
                    <input
                      type="text"
                      required
                      value={bookKosManualText}
                      onChange={(e) => {
                        setBookKosManualText(e.target.value);
                        setShowKosSuggestions(true);
                      }}
                      onFocus={() => setShowKosSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowKosSuggestions(false), 200);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                      placeholder="Ketik nama cabang (min. 2 huruf)..."
                    />
                    {showKosSuggestions && bookKosManualText.length >= 2 && (
                      <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                        {filteredKosSuggestions.length > 0 ? (
                          filteredKosSuggestions.map(kos => (
                            <div
                              key={kos.id}
                              onMouseDown={() => {
                                setBookKosManualText(kos.name);
                                setShowKosSuggestions(false);
                              }}
                              className="px-3 py-2 text-xs font-bold hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none"
                            >
                              {kos.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-400 font-semibold italic">
                            Cabang baru: "{bookKosManualText}" (Bisa dilanjutkan)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1 relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pilih Nomor Kamar *</label>
                <select
                  required
                  disabled={!bookKosId}
                  value={bookRoomId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBookRoomId(val);
                    if (val !== 'Lainnya') {
                      setBookRoomManualText('');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <option value="">-- Pilih Kamar --</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>{r.roomNumber} ({formatIDR(r.price)}/bln)</option>
                  ))}
                  {bookKosId && (
                    <option value="Lainnya">Lainnya (Tulis Manual)</option>
                  )}
                </select>

                {bookRoomId === 'Lainnya' && (
                  <div className="relative mt-2">
                    <input
                      type="text"
                      required
                      value={bookRoomManualText}
                      onChange={(e) => {
                        setBookRoomManualText(e.target.value);
                        setShowRoomSuggestions(true);
                      }}
                      onFocus={() => setShowRoomSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowRoomSuggestions(false), 200);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                      placeholder="Ketik No. Kamar (min. 2 huruf)..."
                    />
                    {showRoomSuggestions && bookRoomManualText.length >= 2 && (
                      <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-lg">
                        {filteredRoomSuggestions.length > 0 ? (
                          filteredRoomSuggestions.map(room => (
                            <div
                              key={room.id}
                              onMouseDown={() => {
                                setBookRoomManualText(room.roomNumber);
                                setShowRoomSuggestions(false);
                              }}
                              className="px-3 py-2 text-xs font-bold hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none flex justify-between"
                            >
                              <span>Kamar {room.roomNumber}</span>
                              <span className="text-slate-400 font-semibold">{formatIDR(room.price)}/bln</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-400 font-semibold italic">
                            Kamar baru: "{bookRoomManualText}" (Bisa dilanjutkan)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1 relative">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Rencana Tanggal Masuk *</label>
                <input
                  type="date"
                  required
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                />
              </div>
            </div>
          </div>

          {/* STEP 4: DATA PENANGGUNG JAWAB / PENJAMIN */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">4</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <HeartHandshake className="w-4 h-4 mr-1.5 text-blue-600" />
                Data Penanggung Jawab Penyewa (Orang Tua / Penjamin)
              </h3>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Wajib diisi sebagai kontak darurat dan penanggung jawab finansial penyewa selama masa tinggal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nama Penanggung Jawab *</label>
                <input
                  type="text"
                  required
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">No. WhatsApp / HP Penanggung Jawab *</label>
                <input
                  type="text"
                  required
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                  placeholder="Contoh: 081211112222"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Hubungan / Status Penjamin *</label>
                <select
                  required
                  value={guarantorRelationship}
                  onChange={(e) => setGuarantorRelationship(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                >
                  <option value="Orang Tua">Orang Tua (Ayah / Ibu)</option>
                  <option value="Wali / Keluarga">Wali / Saudara Kandung</option>
                  <option value="Perusahaan / Instansi">Perusahaan / Kantor</option>
                  <option value="Lainnya">Lainnya (Tulis Manual)</option>
                </select>
                {guarantorRelationship === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={guarantorRelationshipDetail}
                    onChange={(e) => setGuarantorRelationshipDetail(e.target.value)}
                    className="w-full mt-1.5 bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg py-2 px-3 text-xs font-bold transition-all"
                    placeholder="Tulis hubungan / status penjamin..."
                  />
                )}
              </div>
            </div>
          </div>

          {/* STEP 5: BUKTI PEMBAYARAN DP/LUNAS */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">5</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <Coins className="w-4 h-4 mr-1.5 text-blue-600" />
                Bukti Pembayaran DP / Pelunasan Booking Fee
              </h3>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Transfer pembayaran DP / Sewa lunas ke rekening resmi: <span className="font-bold text-slate-700">{bankAccountDisplay}</span>, kemudian lampirkan foto/screenshot buktinya di bawah.
            </p>

            <div className="bg-slate-50/50 border border-dashed border-slate-300 p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
              {paymentProofUrl ? (
                <div className="space-y-2 w-full max-w-xs">
                  <div className="relative aspect-video rounded border border-slate-200 overflow-hidden bg-white">
                    <img src={paymentProofUrl} alt="Bukti Transfer" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 bg-white p-2 rounded border">
                    <span className="truncate max-w-36">{paymentProofName || "bukti_pembayaran.png"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentProofUrl('');
                        setPaymentProofName('');
                      }}
                      className="text-rose-600 uppercase text-[9px] hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-slate-100 rounded-full inline-block text-slate-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pilih atau Drag Bukti Pembayaran Ke Sini</p>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSimulatePaymentProof}
                      disabled={uploadingProof}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      {uploadingProof ? "Menyimpan..." : "Simulasi Bukti Transfer"}
                    </button>
                    <label className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[9px] cursor-pointer transition-colors uppercase tracking-wider">
                      Unggah Berkas
                      <input type="file" accept="image/*" onChange={handlePaymentProofUpload} className="hidden" disabled={uploadingProof} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 6: INFORMED CONSENT & PERJANJIAN SEWA */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">6</span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                Informed Consent & Perjanjian Sewa Kamar Kost
              </h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto text-[11px] text-slate-600 leading-relaxed font-semibold">
              <p className="font-extrabold text-slate-800 text-xs uppercase border-b border-slate-200 pb-1.5">
                SURAT KETERANGAN PERJANJIAN & PERATURAN TATA TERTIB HUNIAN HANANNY KOS
              </p>
              <p>
                Dengan mendaftar dan menyetujui perjanjian sewa kamar ini, Penyewa menyatakan sepakat dan wajib mematuhi seluruh ketentuan tata tertib Hananny Kos berikut:
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 uppercase text-[10px]">
                <li><span className="font-bold text-slate-800">Pembayaran Sewa Kamar Kost:</span> Pembayaran sewa wajib dilunasi paling lambat sesuai tanggal jatuh tempo pada kesepakatan awal sesuai dengan tanggal masuk awal sewa. Keterlambatan pembayaran dikenakan denda keterlambatan sesuai dengan yang telah disepakati diawal</li>
                <li><span className="font-bold text-slate-800">Uang Jaminan (Deposit):</span> Deposit sewa sebesar nominal yang telah disepakati wajib dibayarkan di awal, dan akan dikembalikan secara penuh saat masa kontrak selesai tanpa ada kerusakan barang atau tunggakan tagihan.</li>
                <li><span className="font-bold text-slate-800">Keamanan & Kebersihan:</span> Penyewa wajib menjaga kebersihan kamar, fasilitas bersama, kebersihan lingkungan, serta keamanan barang pribadi masing-masing. Pihak Manajemen Kos tidak bertanggung jawab atas kehilangan barang di dalam area kos.</li>
                <li><span className="font-bold text-slate-800">Larangan Keras:</span> Dilarang keras membawa senjata tajam, obat-obatan terlarang (narkoba), melakukan aktivitas perjudian, asusila, tindak pidana, serta membawa hewan peliharaan tanpa persetujuan tertulis dari pemilik kos.</li>
                <li><span className="font-bold text-slate-800">Kunjungan Tamu:</span> Tamu dilarang menginap tanpa persetujuan tertulis pengelola kos. Tamu lawan jenis dilarang masuk ke dalam kamar tidur demi kenyamanan bersama.</li>
                <li><span className="font-bold text-slate-800">Penghematan Energi:</span> Wajib mematikan kipas angin, lampu, keran air, dan peralatan elektronik lainnya ketika meninggalkan kamar untuk menghindari bahaya kebakaran dan pemborosan energi.</li>
              </ol>
              <p className="border-t border-slate-200 pt-1.5 text-[10px] text-slate-500 font-bold uppercase">
                Pernyataan: Saya dengan sadar telah membaca, memahami seluruh poin tata tertib di atas dan sepakat untuk mengikatkan diri dalam kontrak sewa hunian ini.
              </p>
            </div>

            <label className="flex items-start space-x-2.5 p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={informedConsentAccepted}
                onChange={(e) => setInformedConsentAccepted(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5 shrink-0 cursor-pointer"
              />
              <span className="text-[10px] font-extrabold text-blue-950 uppercase tracking-wider leading-relaxed">
                Saya menyetujui Informed Consent Keterangan Perjanjian Sewa Kamar Kost, bersedia mematuhi kewajiban & tata tertib hunian. *
              </span>
            </label>
          </div>

          {/* STEP 7: CATATAN & SUBMIT */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Catatan Tambahan / Kebutuhan Khusus</label>
              <textarea
                value={bookNotes}
                onChange={(e) => setBookNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded-lg p-3 text-xs font-bold h-20 resize-none transition-all"
                placeholder="Tulis jika ada kebutuhan khusus (misal: parkir mobil, perabot tambahan, dll.)"
              />
            </div>

            {/* TANDA TANGAN DIGITAL */}
            <div className="pt-4 border-t border-slate-200/60 space-y-3">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center">
                <PenTool className="w-4 h-4 mr-1.5 text-blue-600" />
                Bubuhkan Tanda Tangan Digital Penyewa *
              </label>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Gunakan mouse atau layar sentuh (touchscreen) Anda untuk menandatangani langsung di area putih di bawah ini.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-inner relative overflow-hidden w-full max-w-[408px]">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="bg-white rounded cursor-crosshair block w-full touch-none"
                    style={{ height: '150px' }}
                  />
                  {signatureUrl && (
                    <div className="absolute top-1.5 right-1.5 bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Tanda Tangan Terekam
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-slate-200 inline-block"
                  >
                    Bersihkan Tanda Tangan
                  </button>
                  <p className="text-[9px] text-slate-400 font-semibold max-w-xs leading-normal uppercase">
                    Tanda tangan ini akan dilekatkan secara sah pada dokumen Surat Perjanjian Sewa Kamar Kost dan Kuitansi Bukti Pembayaran.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms / Agreement banner */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 font-semibold leading-normal uppercase tracking-wider">
                Dengan menekan tombol kirim registrasi, Anda menjamin seluruh data yang diisi adalah benar, sah, dan dapat dipertanggungjawabkan sesuai hukum yang berlaku di Republik Indonesia.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-xs transition-colors uppercase tracking-wider cursor-pointer shadow-md flex items-center justify-center space-x-2"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Kirim Formulir Registrasi Booking</span>
            </button>
          </div>

        </form>
      </div>



      {showSuccessPopup && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center space-y-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
            
            <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Data Berhasil di Input</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                Registrasi booking kamar Anda telah berhasil dikirimkan ke sistem Hananny Kos.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-[9px] text-left space-y-1.5 font-bold text-slate-600 uppercase tracking-wide leading-normal border border-slate-100">
              <p className="flex items-start"><span className="text-emerald-600 mr-1.5 shrink-0">✓</span> Tim Admin akan memverifikasi dokumen Anda secepatnya.</p>
              <p className="flex items-start"><span className="text-emerald-600 mr-1.5 shrink-0">✓</span> Kunci fisik kamar dapat diambil di kantor pengelola setelah pembayaran disetujui.</p>
              <p className="flex items-start"><span className="text-emerald-600 mr-1.5 shrink-0">✓</span> Anda dapat mengunduh salinan Surat Perjanjian setelah disetujui Admin.</p>
            </div>

            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </motion.div>
        </div>
      )}

      {showComplaintModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden relative"
          >
            {/* Header Banner */}
            <div className="bg-amber-600 text-white p-5 flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-tight">Form Laporan Keluhan Kos</h3>
                <p className="text-[10px] text-amber-100 font-bold uppercase tracking-wider">Sampaikan Kendala Atau Kerusakan Fasilitas Kamar Anda</p>
              </div>
            </div>

            <form onSubmit={handleComplaintSubmit} className="p-5 space-y-4">
              
              {/* Reporter Name (with triggers/suggestions) */}
              <div className="space-y-1.5 relative" ref={suggestionsRef}>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Nama Pelapor <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => {
                      setCompName(e.target.value);
                      setShowCompSuggestions(true);
                      if (compTenantId) {
                        setCompTenantId('');
                        setCompKosId('');
                        setCompRoomId('');
                      }
                    }}
                    onFocus={() => setShowCompSuggestions(true)}
                    placeholder="Ketik minimal 3 huruf nama Anda..."
                    className="w-full text-xs font-bold text-slate-850 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:bg-white transition-all outline-none"
                  />
                  {showCompSuggestions && tenantSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div className="p-1.5 bg-blue-50 text-[9px] text-blue-700 font-bold uppercase tracking-wider border-b border-slate-100">
                        Penghuni Terdaftar (Klik Untuk Auto-Fill):
                      </div>
                      {tenantSuggestions.map((tenant) => (
                        <button
                          key={tenant.id}
                          type="button"
                          onClick={() => {
                            setCompName(tenant.name);
                            setCompKosName(tenant.kosName);
                            setCompRoomNumber(tenant.roomNumber);
                            setCompTenantId(tenant.id);
                            setCompKosId(tenant.kosId);
                            setCompRoomId(tenant.roomId);
                            setShowCompSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col space-y-0.5 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-bold text-slate-850">{tenant.name}</span>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                            {tenant.kosName} — Kamar {tenant.roomNumber}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                  * Ketik nama Anda. Sistem akan mencari data kamar & kos secara otomatis.
                </p>
              </div>

              {/* Kos Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Lokasi Kos <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={compKosName}
                  onChange={(e) => setCompKosName(e.target.value)}
                  placeholder="Cabang Kos (e.g. Hananny Kos Sukabumi)"
                  className="w-full text-xs font-bold text-slate-850 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Room Number */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Nomor Kamar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={compRoomNumber}
                  onChange={(e) => setCompRoomNumber(e.target.value)}
                  placeholder="Contoh: 105 atau B-02"
                  className="w-full text-xs font-bold text-slate-850 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Issue Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Keluhan / Masalah Utama <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={compIssue}
                  onChange={(e) => setCompIssue(e.target.value)}
                  placeholder="Contoh: Lampu Kamar Mati, Kipas Angin Rusak, WiFi Terputus..."
                  className="w-full text-xs font-bold text-slate-850 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Severity Level */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Tingkat Darurat Keluhan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'low', label: 'Rendah' },
                    { value: 'medium', label: 'Sedang' },
                    { value: 'high', label: 'Tinggi (Darurat)' }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCompSeverity(item.value as 'low' | 'medium' | 'high')}
                      className={`py-2 px-1 border text-center rounded text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider ${
                        compSeverity === item.value 
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs' 
                          : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Detail Masalah <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={compDetails}
                  onChange={(e) => setCompDetails(e.target.value)}
                  placeholder="Jelaskan secara rinci kronologi masalah atau kerusakan agar tim teknisi kami dapat mempersiapkan suku cadang..."
                  className="w-full text-xs font-semibold text-slate-700 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded focus:border-amber-500 focus:bg-white transition-all outline-none"
                />
              </div>

              {/* Dokumentasi Kendala (Multi Photos) */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Dokumentasi Kendala (Multi-Foto)
                </label>
                
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100/50 hover:border-amber-400 transition-all flex flex-col items-center justify-center relative cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      Array.from(files).forEach((file: any) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setCompPhotos((prev) => [...prev, reader.result as string]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-amber-500 transition-colors mb-1.5" />
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Pilih atau Seret Foto Disini</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Format JPG/PNG • Bisa pilih multi-foto</p>
                </div>

                {compPhotos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Foto Terpilih ({compPhotos.length}):</p>
                    <div className="grid grid-cols-5 gap-2 bg-white p-2 border border-slate-150 rounded">
                      {compPhotos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-square rounded overflow-hidden border border-slate-200 group">
                          <img
                            src={photo}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCompPhotos((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm text-center"
                >
                  Kirim Laporan
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
