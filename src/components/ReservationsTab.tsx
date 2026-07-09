import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Check, 
  X, 
  Smartphone, 
  Building, 
  Cpu, 
  Upload, 
  User, 
  Plus, 
  Clock, 
  Tag, 
  FileCheck,
  Building2,
  Lock,
  FileText,
  FileDown,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Kos, Room, Reservation } from '../types';

interface ReservationsTabProps {
  kosList: Kos[];
  rooms: Room[];
  reservations: Reservation[];
  onAddReservation: (resData: Omit<Reservation, 'id'>) => Promise<void>;
  onApproveReservation: (resId: string) => Promise<void>;
  onRejectReservation: (resId: string) => Promise<void>;
  onDeleteReservation: (resId: string) => Promise<void>;
  onMoveToTenants: (resId: string) => Promise<void>;
}

export default function ReservationsTab({ 
  kosList, 
  rooms, 
  reservations, 
  onAddReservation,
  onApproveReservation,
  onRejectReservation,
  onDeleteReservation,
  onMoveToTenants
}: ReservationsTabProps) {
  const [showBookForm, setShowBookForm] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // HELPER: Generate & Download Surat Perjanjian Sewa Kamar Kost
  const handleDownloadAgreementPDF = (res: Reservation) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 58, 138); 
      doc.text('SURAT PERJANJIAN SEWA KAMAR KOST', 105, 20, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('HANANNY KOS RESIDENCE', 105, 26, { align: 'center' });

      // Horizontal line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.line(15, 30, 195, 30);

      // Section 1: Parties
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('I. DATA PIHAK-PIHAK YANG BERSEPAKAT', 15, 38);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      // Party 1 info
      doc.text('Pihak Pertama (Pengelola):', 15, 45);
      doc.setFont('Helvetica', 'bold');
      doc.text('Manajemen Hananny Kos', 65, 45);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('Alamat Kantor:', 15, 50);
      doc.text('Jl. Raya Kos No. 10, Jakarta, Indonesia', 65, 50);

      // Party 2 info
      doc.setFont('Helvetica', 'normal');
      doc.text('Pihak Kedua (Penyewa):', 15, 57);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.name.toUpperCase(), 65, 57);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('No. WhatsApp / HP:', 15, 62);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.phone, 65, 62);

      doc.setFont('Helvetica', 'normal');
      doc.text('NIK / Nomor KTP:', 15, 67);
      doc.text(res.ktpDetails?.nik || '317105xxxxxxxxxx', 65, 67);

      doc.text('Jenis Kelamin:', 15, 72);
      doc.text(res.jenisKelamin || 'LAKI-LAKI', 65, 72);

      doc.text('Pekerjaan:', 15, 77);
      const jbStr = res.pekerjaan === 'Lainnya' ? (res.pekerjaanDetail || 'Lainnya') : (res.pekerjaan || 'Mahasiswa');
      doc.text(jbStr, 65, 77);

      doc.text('Status Perkawinan:', 15, 82);
      const msStr = res.statusPerkawinan === 'Lainnya' ? (res.statusPerkawinanDetail || 'Lainnya') : (res.statusPerkawinan || 'Single (Belum Berkeluarga)');
      doc.text(msStr, 65, 82);

      // Penanggung jawab
      if (res.guarantorName) {
        doc.text('Penanggung Jawab / Wali:', 15, 87);
        doc.setFont('Helvetica', 'bold');
        const relStr = res.guarantorRelationship === 'Lainnya' ? (res.guarantorRelationshipDetail || 'Lainnya') : (res.guarantorRelationship || 'Orang Tua');
        doc.text(`${res.guarantorName} (${relStr})`, 65, 87);
        doc.setFont('Helvetica', 'normal');
        doc.text('Kontak Wali:', 15, 92);
        doc.text(res.guarantorPhone || '-', 65, 92);
      }

      // Section 2: Objektif
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('II. SPESIFIKASI DAN KETENTUAN HUNIAN', 15, 101);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text('Nama Cabang Kos:', 15, 108);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.kosName, 65, 108);

      doc.setFont('Helvetica', 'normal');
      doc.text('Nomor Kamar Sewa:', 15, 113);
      doc.setFont('Helvetica', 'bold');
      doc.text(res.roomNumber, 65, 113);

      doc.setFont('Helvetica', 'normal');
      doc.text('Rencana Tanggal Masuk:', 15, 118);
      doc.text(res.checkInDate, 65, 118);

      doc.text('Biaya Sewa Bulanan:', 15, 123);
      const roomObj = rooms.find(r => r.kosId === res.kosId && r.roomNumber === res.roomNumber);
      const priceStr = roomObj ? `Rp ${roomObj.price.toLocaleString('id-ID')}` : 'Rp 1.500.000';
      doc.setFont('Helvetica', 'bold');
      doc.text(`${priceStr} per bulan`, 65, 123);

      // Section 3: Tata Tertib & Informed Consent
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('III. KETENTUAN KEWAJIBAN & TATA TERTIB HUNIAN', 15, 132);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      const bulletPoints = [
        '1. Pembayaran Sewa Kamar Kost: Pembayaran sewa wajib dilunasi paling lambat sesuai tanggal jatuh tempo pada kesepakatan awal sesuai dengan tanggal masuk awal sewa. Keterlambatan pembayaran dikenakan denda denda keterlambatan sesuai dengan kesepakatan awal.',
        '2. Penyewa dilarang keras membawa narkoba, senjata tajam, asusila, dan aktivitas melanggar hukum lainnya.',
        '3. Tamu lawan jenis dilarang masuk ke dalam kamar sewa demi ketertiban bersama di Hananny Kos.',
        '4. Penyewa wajib menghemat energi listrik & air, serta mematikan kipas angin dan lampu ketika meninggalkan kamar tidur.',
        '5. Uang jaminan (deposit) akan dikembalikan penuh setelah masa kontrak selesai dan kondisi kamar bersih/baik.',
        '6. Pelanggaran serius tata tertib di atas dapat berakibat pada pemutusan kontrak sewa sepihak tanpa pengembalian dana.'
      ];

      let yPos = 138;
      bulletPoints.forEach(point => {
        doc.text(point, 15, yPos);
        yPos += 5.5;
      });

      // Section 4: Agreement Declarations
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text('IV. PERNYATAAN DAN PERSETUJUAN KEDUA BELAH PIHAK', 15, yPos + 4);

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Dengan ini, Kedua Belah Pihak secara sadar menyetujui seluruh ketentuan dan tata tertib sewa kamar di atas.', 15, yPos + 10);
      doc.text('Surat perjanjian sewa ini sah dan mengikat sejak ditandatangani secara digital.', 15, yPos + 14);

      // Signatures
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);

      const sigY = yPos + 24;
      doc.text('Pihak Pertama (Pengelola),', 25, sigY);
      doc.text('Pihak Kedua (Penyewa),', 135, sigY);

      // Underlines for signatures
      doc.setFont('Helvetica', 'normal');
      doc.text('Hananny Kos Management', 25, sigY + 28);
      doc.text(res.name.toUpperCase(), 135, sigY + 28);

      // Render Tenant Signature if available
      if (res.signatureUrl) {
        try {
          doc.addImage(res.signatureUrl, 'PNG', 135, sigY + 4, 32, 18);
        } catch (err) {
          console.error('Error rendering signature to PDF:', err);
        }
      } else {
        // Draw a simulated signature outline
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(135, sigY + 15, 165, sigY + 15);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text('(Tanda tangan digital)', 135, sigY + 14);
      }

      // Draw simulated admin signature or stamp
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138);
      doc.text('[ TANDATANGAN RESMI ]', 25, sigY + 14);

      // Save PDF file
      doc.save(`Surat_Perjanjian_Sewa_${res.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating Agreement PDF:', error);
      alert('Gagal membuat Surat Perjanjian Sewa PDF.');
    }
  };

  // HELPER: Generate & Download Invoice Keterangan Pembayaran Bulanan
  const handleDownloadInvoicePDF = (res: Reservation) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Title & Logo
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 58, 138); // Deep Blue
      doc.text('INVOICE PEMBAYARAN', 15, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('No. Tagihan:', 15, 31);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`INV-${res.id.substring(0, 8).toUpperCase()}`, 38, 31);

      // Logo right side
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text('HANANNY KOS', 195, 25, { align: 'right' });
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Email: billing@hanannykos.com', 195, 30, { align: 'right' });
      doc.text('WA: 0812-3456-7890', 195, 34, { align: 'right' });

      // Horizontal separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(1.5);
      doc.line(15, 40, 195, 40);

      // Bill To details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text('DITUJUKAN KEPADA:', 15, 50);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(res.name.toUpperCase(), 15, 56);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`No. Handphone: ${res.phone}`, 15, 61);
      doc.text(`Tanggal Tagihan: ${new Date().toLocaleDateString('id-ID')}`, 15, 66);
      doc.text(`Status: LUNAS (PAID)`, 15, 71);

      // Unit Details Box
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 78, 180, 22, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('UNIT SEWA:', 20, 84);
      doc.setTextColor(15, 23, 42);
      doc.text(`${res.kosName} — Kamar ${res.roomNumber}`, 20, 92);

      // Table Header
      const tableY = 112;
      doc.setFillColor(30, 58, 138); // Header Blue
      doc.rect(15, tableY, 180, 8, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('DESKRIPSI ITEM', 20, tableY + 5.5);
      doc.text('KUANTITAS', 115, tableY + 5.5);
      doc.text('NOMINAL', 155, tableY + 5.5);

      // Table Row
      const rowY = tableY + 8;
      doc.setDrawColor(241, 245, 249);
      doc.rect(15, rowY, 180, 12, 'S');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('DP / Pembayaran Booking Awal Kamar Kost', 20, rowY + 7.5);
      doc.setFont('Helvetica', 'normal');
      doc.text('1 Bulan', 115, rowY + 7.5);
      
      const roomObj = rooms.find(r => r.kosId === res.kosId && r.roomNumber === res.roomNumber);
      const priceVal = roomObj ? roomObj.price : 1500000;
      doc.setFont('Helvetica', 'bold');
      doc.text(`Rp ${priceVal.toLocaleString('id-ID')}`, 155, rowY + 7.5);

      // Total Box
      const totalY = rowY + 12;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, totalY, 180, 15, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text('TOTAL PEMBAYARAN (LUNAS):', 20, totalY + 9.5);
      doc.setFontSize(12);
      doc.text(`Rp ${priceVal.toLocaleString('id-ID')}`, 155, totalY + 9.5);

      // Footer disclaimer & Signature
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('* Pembayaran ini sah sebagai kuitansi pelunasan biaya masuk kos perdana.', 15, totalY + 24);
      doc.text('* Simpan kuitansi digital ini sebagai bukti sah transaksi Anda.', 15, totalY + 28);

      // Draw official stamp
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129); // Success green
      doc.text('[ PAID / LUNAS ]', 140, totalY + 38);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Hananny Kos Finance', 140, totalY + 44);

      // Save PDF file
      doc.save(`Kuitansi_Invoice_${res.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating Invoice PDF:', error);
      alert('Gagal membuat Invoice Pembayaran PDF.');
    }
  };

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

  // Payment Proof States
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [paymentProofName, setPaymentProofName] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  
  // Lightbox State for Image Popups
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string } | null>(null);
  // KTP Photo State for newly created reservation
  const [bookKtpPhotoUrl, setBookKtpPhotoUrl] = useState('');

  // Pekerjaan, Status Perkawinan & ID Card / KTM States
  const [pekerjaan, setPekerjaan] = useState('Mahasiswa');
  const [pekerjaanDetail, setPekerjaanDetail] = useState('');
  const [statusPerkawinan, setStatusPerkawinan] = useState('Single (Belum Berkeluarga)');
  const [statusPerkawinanDetail, setStatusPerkawinanDetail] = useState('');
  const [idCardUrl, setIdCardUrl] = useState('');
  const [idCardName, setIdCardName] = useState('');
  const [uploadingIdCard, setUploadingIdCard] = useState(false);

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

  // Handle KTP Upload for prospective tenant
  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = reader.result as string;
        setBookKtpPhotoUrl(base64Str);
        const response = await fetch('/api/verify-ktp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Str, mimeType: file.type })
        });
        const resData = await response.json();
        if (resData.success) {
          setScanResult(resData.data);
          setBookName(resData.data.nama || '');
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
      setBookKtpPhotoUrl('https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=600&q=80');
      setScanning(false);
    }, 1500);
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookKosId || !bookRoomId || !bookName || !bookPhone) {
      alert('Mohon lengkapi seluruh kolom wajib.');
      return;
    }

    // Phone validation (min 10 digits)
    const cleanPhone = bookPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Nomor HP/WhatsApp minimal harus terdiri dari 10 digit angka!');
      return;
    }

    // Email validation (if filled)
    if (bookEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(bookEmail)) {
        alert('Format alamat email tidak valid!');
        return;
      }
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
        pekerjaan,
        pekerjaanDetail: pekerjaan === 'Lainnya' ? pekerjaanDetail : '',
        statusPerkawinan,
        statusPerkawinanDetail: statusPerkawinan === 'Lainnya' ? statusPerkawinanDetail : '',
        idCardUrl,
        idCardName,
        ktpPhotoUrl: bookKtpPhotoUrl
      });

      // Clear Form
      setBookName('');
      setBookPhone('');
      setBookEmail('');
      setBookKosId('');
      setBookKosManualText('');
      setBookRoomId('');
      setBookRoomManualText('');
      setBookDate(new Date().toISOString().split('T')[0]);
      setScanResult(null);
      setGuarantorName('');
      setGuarantorPhone('');
      setGuarantorRelationship('Orang Tua');
      setGuarantorRelationshipDetail('');
      setPaymentProofUrl('');
      setPaymentProofName('');
      setPekerjaan('Mahasiswa');
      setPekerjaanDetail('');
      setStatusPerkawinan('Single (Belum Berkeluarga)');
      setStatusPerkawinanDetail('');
      setIdCardUrl('');
      setIdCardName('');
      setBookKtpPhotoUrl('');
      setShowBookForm(false);
    } catch (err) {
      console.error(err);
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
      {/* Header action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-2">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reservasi Kamar Calon Penyewa</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pengelolaan reservasi dan ketersediaan unit</p>
        </div>
        <button
          onClick={() => setShowBookForm(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto uppercase tracking-wider cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Reservasi Baru</span>
        </button>
      </div>

      {/* Grid: Pending Reservations & Form / Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3: Reservation requests */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 lg:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
            Daftar Antrean Reservasi
          </h4>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {reservations.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Tidak ada antrean reservasi masuk.</p>
            ) : (
              reservations.map((res) => (
                <div key={res.id} className="p-3 border border-slate-200 bg-slate-50/50 rounded flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-xs text-slate-800">{res.name}</p>
                      {res.status === 'pending' && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center uppercase">
                          <Clock className="w-3 h-3 mr-0.5 animate-spin" /> Pending
                        </span>
                      )}
                      {res.status === 'approved' && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                          Disetujui
                        </span>
                      )}
                      {res.status === 'rejected' && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                          Ditolak
                        </span>
                      )}
                      {res.status === 'moved' && (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                          Sudah Check-In
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-500 font-medium">
                      <p className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block uppercase tracking-wider">
                        {res.kosName} — {res.roomNumber}
                      </p>
                      <p>Rencana Masuk: <span className="font-bold text-slate-700">{res.checkInDate}</span></p>
                      <p>Telepon: <span className="font-bold text-slate-700">{res.phone}</span></p>
                      <div className="flex flex-wrap gap-1.5 items-center py-0.5">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase tracking-wider">
                          Pekerjaan: <span className="font-extrabold text-slate-800">{res.pekerjaan === 'Lainnya' ? (res.pekerjaanDetail || 'Lainnya') : (res.pekerjaan || 'Mahasiswa')}</span>
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase tracking-wider">
                          Perkawinan: <span className="font-extrabold text-slate-800">{res.statusPerkawinan === 'Lainnya' ? (res.statusPerkawinanDetail || 'Lainnya') : (res.statusPerkawinan || 'Single')}</span>
                        </span>
                      </div>
                      {res.guarantorName && (
                        <p className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded inline-block font-semibold">
                          Penjamin: <span className="font-bold">{res.guarantorName}</span> ({res.guarantorRelationship === 'Lainnya' ? (res.guarantorRelationshipDetail || 'Lainnya') : (res.guarantorRelationship || 'Orang Tua')}) — {res.guarantorPhone}
                        </p>
                      )}
                      {res.paymentProofUrl && (
                        <div className="pt-1 flex items-center space-x-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Bukti Bayar:</span>
                          <button 
                            type="button"
                            onClick={() => setLightboxPhoto({ url: res.paymentProofUrl!, title: 'Bukti Transfer - ' + res.name })}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[9px] font-extrabold uppercase tracking-wider border border-blue-200 inline-flex items-center cursor-pointer"
                          >
                            Lihat Bukti Transfer
                          </button>
                        </div>
                      )}
                      {res.idCardUrl && (
                        <div className="pt-1 flex items-center space-x-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">ID Card / KTM:</span>
                          <button 
                            type="button"
                            onClick={() => setLightboxPhoto({ url: res.idCardUrl!, title: 'ID Card / KTM - ' + res.name })}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[9px] font-extrabold uppercase tracking-wider border border-emerald-200 inline-flex items-center cursor-pointer"
                          >
                            Lihat ID Card / KTM
                          </button>
                        </div>
                      )}
                      {res.ktpPhotoUrl && (
                        <div className="pt-1 flex items-center space-x-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Bukti KTP:</span>
                          <button 
                            type="button"
                            onClick={() => setLightboxPhoto({ url: res.ktpPhotoUrl!, title: 'Bukti KTP - ' + res.name })}
                            className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[9px] font-extrabold uppercase tracking-wider border border-rose-200 inline-flex items-center cursor-pointer"
                          >
                            Lihat Bukti KTP
                          </button>
                        </div>
                      )}
                      {res.notes && <p className="italic text-slate-400 font-bold">"{res.notes}"</p>}
                    </div>

                    {res.ktpVerified && res.ktpDetails && (
                      <div className="flex items-center space-x-1 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block font-bold uppercase tracking-wider">
                        <FileCheck className="w-3.5 h-3.5 inline mr-0.5" />
                        <span>KTP Terverifikasi AI ({res.ktpDetails.nik})</span>
                      </div>
                    )}
                  </div>

                  {res.status === 'pending' && (
                    <div className="flex items-center space-x-1.5 self-end md:self-auto">
                      <button
                        onClick={() => onApproveReservation(res.id)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Setujui</span>
                      </button>
                      <button
                        onClick={() => onRejectReservation(res.id)}
                        className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Tolak
                      </button>
                    </div>
                  )}

                  {res.status === 'approved' && (
                    <div className="flex flex-col sm:flex-row items-center gap-1.5 self-end md:self-auto">
                      <button
                        onClick={() => onMoveToTenants(res.id)}
                        className="w-full sm:w-auto px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded text-[10px] flex items-center justify-center space-x-1.5 uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Pindah ke Penghuni</span>
                      </button>
                      <button
                        onClick={() => handleDownloadAgreementPDF(res)}
                        className="w-full sm:w-auto px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] flex items-center justify-center space-x-1 uppercase tracking-wider cursor-pointer shadow-sm"
                        title="Unduh Surat Perjanjian Sewa"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Save PDF Surat</span>
                      </button>
                      <button
                        onClick={() => handleDownloadInvoicePDF(res)}
                        className="w-full sm:w-auto px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] flex items-center justify-center space-x-1 uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Save PDF Invoice</span>
                      </button>
                    </div>
                  )}

                  {res.status === 'rejected' && (
                    <div className="flex items-center space-x-1.5 self-end md:self-auto">
                      <button
                        onClick={() => onDeleteReservation(res.id)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}

                  {res.status === 'moved' && (
                    <div className="flex items-center space-x-1.5 self-end md:self-auto">
                      <button
                        onClick={() => onDeleteReservation(res.id)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1/3: Availability Map Info Card */}
        <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-lg flex flex-col justify-between h-80">
          <div className="space-y-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
              SISTEM RESERVASI CERDAS
            </span>
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300">Ketersediaan Unit Terkini</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium font-bold">
              Modul reservasi ini terhubung langsung dengan status ketersediaan unit. Saat Anda menyetujui reservasi, sistem otomatis:
            </p>
            <ul className="text-[10px] text-slate-400 space-y-1 list-disc pl-4 font-bold uppercase tracking-wider">
              <li>Ubah status kamar → <span className="text-blue-300">"Terisi"</span></li>
              <li>Daftarkan data penghuni baru</li>
              <li>Buat tagihan sewa perdana</li>
              <li>Kirim Notifikasi Serah Terima</li>
            </ul>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded p-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Kamar Kosong Saat Ini:</span>
            <span className="text-emerald-400 text-xs font-bold font-mono bg-emerald-950 px-2 py-0.5 rounded">
              {rooms.filter(r => r.status === 'available').length} Kamar
            </span>
          </div>
        </div>
      </div>

      {/* Create Reservation Modal Form */}
      {showBookForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center">
                  <Cpu className="w-3.5 h-3.5 mr-1" /> Didukung Gemini AI
                </span>
                <h4 className="text-sm font-bold">Formulir Booking / Reservasi Kamar</h4>
              </div>
              <button onClick={() => setShowBookForm(false)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Tutup
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Optional Identity Verification */}
              <div className="border border-blue-100 bg-blue-50/10 p-3 rounded flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Verifikasi KTP Calon Penghuni (Opsional)</p>
                  <p className="text-[10px] text-slate-400 font-medium font-bold">Verifikasi otomatis mempercepat persetujuan admin.</p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleSimulateKtp}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Simulasi Scan KTP
                  </button>
                  <label className="px-2.5 py-1.5 border border-blue-200 bg-white text-blue-700 font-bold rounded text-[10px] cursor-pointer hover:bg-blue-50/50 uppercase tracking-wider">
                    Unggah KTP
                    <input type="file" accept="image/*" onChange={handleKtpUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {scanResult && (
                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded text-[10px] text-emerald-800 font-bold flex justify-between uppercase">
                  <span>KTP Terbaca: {scanResult.nama} ({scanResult.nik})</span>
                  <span className="text-emerald-600">Skor: {Math.round(scanResult.confidenceScore * 100)}%</span>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nama */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap Calon Penghuni *</label>
                    <input
                      type="text"
                      required
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Contoh: Gisella Anastasia"
                    />
                  </div>

                  {/* Telepon */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. WhatsApp / HP *</label>
                    <input
                      type="text"
                      required
                      value={bookPhone}
                      onChange={(e) => setBookPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Contoh: 081398765432"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={bookEmail}
                      onChange={(e) => setBookEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="gisella@example.com"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Jenis Kelamin</label>
                    <select
                      value={bookGender}
                      onChange={(e) => setBookGender(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    >
                      <option value="LAKI-LAKI">Laki-Laki</option>
                      <option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>

                  {/* Kos Select */}
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pilih Lokasi Kos *</label>
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
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    >
                      <option value="">-- Pilih Lokasi Kos --</option>
                      {kosList.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                      <option value="Lainnya">Lainnya (Tulis Manual)</option>
                    </select>

                    {bookKosId === 'Lainnya' && (
                      <div className="relative mt-1.5">
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
                          className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                          placeholder="Ketik nama cabang (min. 2 huruf)..."
                        />
                        {showKosSuggestions && bookKosManualText.length >= 2 && (
                          <div className="absolute z-50 w-full bg-white border border-slate-200 rounded mt-1 max-h-40 overflow-y-auto shadow-lg">
                            {filteredKosSuggestions.length > 0 ? (
                              filteredKosSuggestions.map(kos => (
                                <div
                                  key={kos.id}
                                  onMouseDown={() => {
                                    setBookKosManualText(kos.name);
                                    setShowKosSuggestions(false);
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none"
                                >
                                  {kos.name}
                                </div>
                              ))
                            ) : (
                              <div className="px-2.5 py-1.5 text-xs text-slate-400 font-semibold italic">
                                Cabang baru: "{bookKosManualText}" (Bisa dilanjutkan)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Room Select */}
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pilih Kamar *</label>
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
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
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
                      <div className="relative mt-1.5">
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
                          className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                          placeholder="Ketik No. Kamar (min. 2 huruf)..."
                        />
                        {showRoomSuggestions && bookRoomManualText.length >= 2 && (
                          <div className="absolute z-50 w-full bg-white border border-slate-200 rounded mt-1 max-h-40 overflow-y-auto shadow-lg">
                            {filteredRoomSuggestions.length > 0 ? (
                              filteredRoomSuggestions.map(room => (
                                <div
                                  key={room.id}
                                  onMouseDown={() => {
                                    setBookRoomManualText(room.roomNumber);
                                    setShowRoomSuggestions(false);
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-none flex justify-between"
                                >
                                  <span>Kamar {room.roomNumber}</span>
                                  <span className="text-slate-400 font-semibold">{formatIDR(room.price)}/bln</span>
                                </div>
                              ))
                            ) : (
                              <div className="px-2.5 py-1.5 text-xs text-slate-400 font-semibold italic">
                                Kamar baru: "{bookRoomManualText}" (Bisa dilanjutkan)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-1 relative sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Rencana Tanggal Masuk *</label>
                    <input
                      type="date"
                      required
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Pekerjaan */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pekerjaan *</label>
                    <select
                      required
                      value={pekerjaan}
                      onChange={(e) => setPekerjaan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
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
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded py-1 px-2 text-xs font-bold outline-none focus:border-blue-500"
                        placeholder="Tulis pekerjaan..."
                      />
                    )}
                  </div>

                  {/* Status Perkawinan */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status Perkawinan *</label>
                    <select
                      required
                      value={statusPerkawinan}
                      onChange={(e) => setStatusPerkawinan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
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
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded py-1 px-2 text-xs font-bold outline-none focus:border-blue-500"
                        placeholder="Tulis status..."
                      />
                    )}
                  </div>

                  {/* ID Card / KTM Upload (Optional) */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">ID Card Kantor / KTM Mahasiswa (Opsional)</label>
                    {idCardUrl ? (
                      <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-100 rounded text-xs text-emerald-800">
                        <span className="truncate max-w-xs font-semibold">{idCardName || "ID Card / KTM"}</span>
                        <button type="button" onClick={() => { setIdCardUrl(''); setIdCardName(''); }} className="text-red-500 font-bold hover:underline uppercase text-[9px]">Hapus</button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleSimulateIdCard}
                          disabled={uploadingIdCard}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-bold uppercase tracking-wide border"
                        >
                          Simulasi ID Card
                        </button>
                        <label className="px-2 py-1 bg-emerald-600 text-white rounded text-[9px] font-bold uppercase tracking-wide cursor-pointer hover:bg-emerald-700">
                          Unggah ID Card / KTM
                          <input type="file" accept="image/*" onChange={handleIdCardUpload} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Catatan / Kebutuhan Khusus</label>
                    <textarea
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none h-14 resize-none focus:border-blue-500"
                      placeholder="Kebutuhan parkir, perabot tambahan, dll."
                    />
                  </div>

                  {/* Guarantor Info */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Penanggung Jawab *</label>
                    <input
                      type="text"
                      required
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Contoh: Budi Santoso"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. WhatsApp Penanggung Jawab *</label>
                    <input
                      type="text"
                      required
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Contoh: 081211112222"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hubungan Penjamin *</label>
                    <select
                      required
                      value={guarantorRelationship}
                      onChange={(e) => setGuarantorRelationship(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    >
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="Wali / Keluarga">Wali / Keluarga</option>
                      <option value="Perusahaan / Instansi">Perusahaan / Instansi</option>
                      <option value="Lainnya">Lainnya (Tulis Manual)</option>
                    </select>
                    {guarantorRelationship === 'Lainnya' && (
                      <input
                        type="text"
                        required
                        value={guarantorRelationshipDetail}
                        onChange={(e) => setGuarantorRelationshipDetail(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded py-1 px-2 text-xs font-bold outline-none focus:border-blue-500"
                        placeholder="Tulis hubungan/status penjamin..."
                      />
                    )}
                  </div>

                  {/* Payment Proof */}
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Bukti Pembayaran DP/Lunas</label>
                    {paymentProofUrl ? (
                      <div className="flex items-center justify-between p-2 bg-slate-50 border rounded text-xs">
                        <span className="truncate max-w-xs font-semibold">{paymentProofName || "Uploaded Receipt"}</span>
                        <button type="button" onClick={() => { setPaymentProofUrl(''); setPaymentProofName(''); }} className="text-red-500 font-bold hover:underline uppercase text-[9px]">Hapus</button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleSimulatePaymentProof}
                          disabled={uploadingProof}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-bold uppercase tracking-wide border"
                        >
                          Simulasi Bukti Transfer
                        </button>
                        <label className="px-2 py-1 bg-blue-600 text-white rounded text-[9px] font-bold uppercase tracking-wide cursor-pointer hover:bg-blue-700">
                          Unggah Berkas
                          <input type="file" accept="image/*" onChange={handlePaymentProofUpload} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors mt-3 uppercase tracking-wider cursor-pointer"
                >
                  Konfirmasi Booking Reservasi
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox Modal for Image Previews */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <h4 className="text-sm font-bold uppercase tracking-wider">{lightboxPhoto.title}</h4>
              <button 
                type="button" 
                onClick={() => setLightboxPhoto(null)} 
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-50 min-h-[300px] max-h-[70vh] overflow-auto">
              <img 
                src={lightboxPhoto.url} 
                alt={lightboxPhoto.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-200"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs uppercase tracking-wider cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
