import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  Search, 
  FileText, 
  LogOut, 
  User, 
  Smartphone, 
  Upload, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Download, 
  Trash2,
  Calendar,
  Lock,
  RefreshCw,
  Clock,
  Users,
  PenTool,
  Eye,
  Pencil,
  CheckSquare
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Kos, Room, Tenant } from '../types';

interface TenantSignaturePadProps {
  tenantId: string;
  onSave: (signatureUrl: string) => void;
}

function TenantSignaturePad({ tenantId, onSave }: TenantSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

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
    setHasDrawn(true);
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
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onSave(canvas.toDataURL());
  };

  return (
    <div className="space-y-2 mt-2">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        Bubuhkan tanda tangan Anda di area putih di bawah ini:
      </p>
      <div className="border border-slate-200 rounded p-1 bg-white relative max-w-[320px]">
        <canvas
          ref={canvasRef}
          width={310}
          height={110}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="bg-white rounded cursor-crosshair block touch-none w-full"
          style={{ height: '110px' }}
        />
      </div>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={saveSignature}
          disabled={!hasDrawn}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded text-[9px] uppercase tracking-wider cursor-pointer"
        >
          Simpan Tanda Tangan
        </button>
        <button
          type="button"
          onClick={clearSignature}
          className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded text-[9px] uppercase tracking-wider cursor-pointer"
        >
          Bersihkan
        </button>
      </div>
    </div>
  );
}

interface TenantsTabProps {
  kosList: Kos[];
  rooms: Room[];
  tenants: Tenant[];
  onAddTenant: (tenantData: Omit<Tenant, 'id'>) => Promise<void>;
  onRemoveTenant: (tenantId: string) => Promise<void>;
  onCheckoutTenant: (tenantId: string, checkoutData: { checkOutDate: string; checkoutNotes: string; checkoutRefund: number }) => Promise<void>;
  onUpdateTenant: (tenantId: string, updatedData: Partial<Tenant>) => Promise<void>;
}

// Preloaded KTP Base64 examples so the user can easily test the Gemini verification instantly
const MOCK_KTP_BASE64_1 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=`;

export default function TenantsTab({ 
  kosList, 
  rooms, 
  tenants, 
  onAddTenant, 
  onRemoveTenant,
  onCheckoutTenant,
  onUpdateTenant
}: TenantsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // State for preview and edit modals
  const [selectedPreviewTenant, setSelectedPreviewTenant] = useState<Tenant | null>(null);
  const [selectedEditTenant, setSelectedEditTenant] = useState<Tenant | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string } | null>(null);
  const [showDocPreviewModal, setShowDocPreviewModal] = useState<boolean>(false);
  const [docPreviewData, setDocPreviewData] = useState<Tenant | null>(null);

  // HANDLER: Save signature url to firestore
  const handleSaveTenantSignature = async (tenantId: string, signatureUrl: string) => {
    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, { signatureUrl });
      alert('Tanda tangan digital berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan tanda tangan.');
    }
  };

  // HELPER: Generate and Download Lease Agreement PDF
  const handleDownloadAgreementPDF = (tenant: Tenant) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const roomObj = rooms.find(r => r.id === tenant.roomId);
      const kosObj = kosList.find(k => k.id === tenant.kosId);

      // ================= SURAT PERJANJIAN SEWA KAMAR KOST =================
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138); 
      doc.text('SURAT PERJANJIAN SEWA KAMAR KOST', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(tenant.kosName.toUpperCase(), 105, 26, { align: 'center' });

      // Horizontal line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.6);
      doc.line(15, 30, 195, 30);

      // Section 1: Parties
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text('DATA PEMILIK DAN PENYEWA KAMAR KOS', 15, 37);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      // Party 1 info
      doc.text('Pihak Pertama (Pengelola):', 15, 43);
      doc.setFont('Helvetica', 'bold');
      doc.text(kosObj?.picName || 'Manajemen Hananny Kos', 65, 43);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('Alamat Kantor:', 15, 48);
      doc.text(kosObj?.address || 'Jl. Raya Kos, Indonesia', 65, 48);

      // Party 2 info
      doc.text('Pihak Kedua (Penyewa):', 15, 55);
      doc.setFont('Helvetica', 'bold');
      doc.text(tenant.name.toUpperCase(), 65, 55);
      
      doc.setFont('Helvetica', 'normal');
      doc.text('No. WhatsApp / HP:', 15, 60);
      doc.setFont('Helvetica', 'bold');
      doc.text(tenant.phone, 65, 60);

      doc.setFont('Helvetica', 'normal');
      doc.text('NIK / Nomor KTP:', 15, 65);
      doc.text(tenant.ktpNik, 65, 65);

      doc.text('Jenis Kelamin:', 15, 70);
      doc.text(tenant.jenisKelamin, 65, 70);

      doc.text('Pekerjaan:', 15, 75);
      const jbStr = tenant.pekerjaan === 'Lainnya' ? (tenant.pekerjaanDetail || 'Lainnya') : (tenant.pekerjaan || 'Belum Terdata');
      doc.text(jbStr, 65, 75);

      doc.text('Status Perkawinan:', 15, 80);
      const msStr = tenant.statusPerkawinan === 'Lainnya' ? (tenant.statusPerkawinanDetail || 'Lainnya') : (tenant.statusPerkawinan || 'Belum Terdata');
      doc.text(msStr, 65, 80);

      // Penanggung jawab
      if (tenant.guarantorName) {
        doc.text('Penanggung Jawab / Wali:', 15, 85);
        doc.setFont('Helvetica', 'bold');
        const relStr = tenant.guarantorRelationship === 'Lainnya' ? (tenant.guarantorRelationshipDetail || 'Lainnya') : (tenant.guarantorRelationship || 'Orang Tua');
        doc.text(`${tenant.guarantorName} (${relStr})`, 65, 85);
        doc.setFont('Helvetica', 'normal');
        doc.text('Kontak Wali:', 15, 90);
        doc.text(tenant.guarantorPhone || '-', 65, 90);
      }

      // Foto KTP & Foto ID Card / KTM (Diatas II. SPESIFIKASI DAN KETENTUAN HUNIAN)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 138);
      doc.text('DOKUMEN IDENTITAS (KTP & ID CARD)', 15, 95);

      if (tenant.ktpPhotoUrl) {
        try {
          const format = tenant.ktpPhotoUrl.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(tenant.ktpPhotoUrl, format, 15, 98, 45, 25);
        } catch (err) {
          console.error('Error rendering KTP photo to PDF:', err);
          doc.setDrawColor(200, 200, 200);
          doc.rect(15, 98, 45, 25, 'S');
          doc.setFontSize(7);
          doc.text('(Gagal memuat Foto KTP)', 17, 111);
        }
      } else {
        doc.setDrawColor(220, 225, 230);
        doc.setFillColor(245, 247, 250);
        doc.rect(15, 98, 45, 25, 'FD');
        doc.setFontSize(7.5);
        doc.setTextColor(140, 145, 150);
        doc.text('FOTO KTP', 37.5, 108, { align: 'center' });
        doc.text('(Belum Tersedia)', 37.5, 113, { align: 'center' });
      }

      if (tenant.idCardPhotoUrl) {
        try {
          const format = tenant.idCardPhotoUrl.includes('png') ? 'PNG' : 'JPEG';
          doc.addImage(tenant.idCardPhotoUrl, format, 65, 98, 45, 25);
        } catch (err) {
          console.error('Error rendering ID Card photo to PDF:', err);
          doc.setDrawColor(200, 200, 200);
          doc.rect(65, 98, 45, 25, 'S');
          doc.setFontSize(7);
          doc.text('(Gagal memuat ID Card)', 67, 111);
        }
      } else {
        doc.setDrawColor(220, 225, 230);
        doc.setFillColor(245, 247, 250);
        doc.rect(65, 98, 45, 25, 'FD');
        doc.setFontSize(7.5);
        doc.setTextColor(140, 145, 150);
        doc.text('FOTO ID CARD / KTM', 87.5, 108, { align: 'center' });
        doc.text('(Belum Tersedia)', 87.5, 113, { align: 'center' });
      }

      // Section 2: Objektif
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text('II. SPESIFIKASI DAN KETENTUAN HUNIAN', 15, 129);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('Nama Cabang Kos:', 15, 135);
      doc.setFont('Helvetica', 'bold');
      doc.text(tenant.kosName, 65, 135);

      doc.setFont('Helvetica', 'normal');
      doc.text('Nomor Kamar Sewa:', 15, 140);
      doc.setFont('Helvetica', 'bold');
      doc.text(tenant.roomNumber, 65, 140);

      doc.setFont('Helvetica', 'normal');
      doc.text('Rencana Tanggal Masuk:', 15, 145);
      doc.text(tenant.checkInDate, 65, 145);

      doc.text('Biaya Sewa Bulanan:', 15, 150);
      const priceVal = roomObj ? roomObj.price : 1500000;
      doc.setFont('Helvetica', 'bold');
      doc.text(`Rp ${priceVal.toLocaleString('id-ID')} per bulan`, 65, 150);

      // Section 3: Tata Tertib & Informed Consent
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('III. KETENTUAN KEWAJIBAN & TATA TERTIB HUNIAN', 15, 159);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const bulletPoints = [
        '1. Pembayaran Sewa Kamar Kost: Pembayaran sewa wajib dilunasi paling lambat sesuai tanggal jatuh tempo pada kesepakatan awal sesuai dengan tanggal masuk awal sewa. Keterlambatan pembayaran dikenakan denda denda keterlambatan sesuai dengan kesepakatan awal.',
        '2. Penyewa dilarang keras membawa narkoba, senjata tajam, asusila, dan aktivitas melanggar hukum lainnya.',
        '3. Tamu lawan jenis dilarang masuk ke dalam kamar sewa demi ketertiban bersama di Hananny Kos.',
        '4. Penyewa wajib menghemat energi listrik & air, serta mematikan kipas angin dan lampu ketika meninggalkan kamar tidur.',
        '5. Uang jaminan (deposit) akan dikembalikan penuh setelah masa kontrak selesai dan kondisi kamar bersih/baik.',
        '6. Pelanggaran serius tata tertib di atas dapat berakibat pada pemutusan kontrak sewa sepihak tanpa pengembalian dana.'
      ];

      let yPos = 165;
      bulletPoints.forEach(point => {
        const splitText = doc.splitTextToSize(point, 180);
        doc.text(splitText, 15, yPos);
        yPos += (splitText.length * 4) + 1;
      });

      // Section 4: Agreement Declarations
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text('IV. PERNYATAAN DAN PERSETUJUAN KEDUA BELAH PIHAK', 15, yPos + 2);

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Dengan ini, Kedua Belah Pihak secara sadar menyetujui seluruh ketentuan dan tata tertib sewa kamar di atas.', 15, yPos + 7);
      doc.text('Surat perjanjian sewa ini sah dan mengikat sejak ditandatangani secara digital.', 15, yPos + 11);

      // Signatures
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      const sigY = yPos + 20;
      doc.text('Pihak Pertama (Pengelola),', 25, sigY);
      doc.text('Pihak Kedua (Penyewa),', 135, sigY);

      // Underlines for signatures
      doc.setFont('Helvetica', 'normal');
      doc.text(kosObj?.picName || 'Manajemen Hananny Kos', 25, sigY + 24);
      doc.text(tenant.name.toUpperCase(), 135, sigY + 24);

      // Render Tenant Signature if available
      if (tenant.signatureUrl) {
        try {
          doc.addImage(tenant.signatureUrl, 'PNG', 135, sigY + 3, 32, 16);
        } catch (err) {
          console.error('Error rendering signature to PDF:', err);
        }
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(135, sigY + 13, 165, sigY + 13);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text('(Tanda tangan digital)', 135, sigY + 12);
      }

      // Draw simulated admin signature or stamp
      doc.setFontSize(7.5);
      doc.setTextColor(30, 58, 138);
      doc.text('[ TANDATANGAN RESMI ]', 25, sigY + 12);

      doc.save(`Kontrak_Sewa_Kamar_Kost_${tenant.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating Agreement PDF:', error);
      alert('Gagal membuat Surat Perjanjian PDF.');
    }
  };

  // HELPER: Generate and Download Invoice PDF
  const handleDownloadInvoicePDF = (tenant: Tenant) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const roomObj = rooms.find(r => r.id === tenant.roomId);
      const kosObj = kosList.find(k => k.id === tenant.kosId);
      const priceVal = roomObj ? roomObj.price : 1500000;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 138); // Deep Blue
      doc.text('INVOICE PEMBAYARAN', 15, 25);
      
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No. Tagihan:', 15, 31);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`INV-${tenant.id.substring(0, 8).toUpperCase()}`, 38, 31);

      // Logo right side
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138);
      doc.text('HANANNY KOS', 195, 25, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Email: billing@hanannykos.com`, 195, 30, { align: 'right' });
      doc.text(`WA: ${kosObj?.picPhone || '0812-3456-7890'}`, 195, 34, { align: 'right' });

      // Horizontal separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(1.2);
      doc.line(15, 39, 195, 39);

      // Bill To details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text('DITUJUKAN KEPADA:', 15, 48);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(tenant.name.toUpperCase(), 15, 54);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`No. Handphone: ${tenant.phone}`, 15, 59);
      doc.text(`Tanggal Tagihan: ${new Date().toLocaleDateString('id-ID')}`, 15, 64);
      doc.text(`Status: LUNAS (PAID)`, 15, 69);

      // Unit Details Box
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 75, 180, 22, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('UNIT SEWA:', 20, 81);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text(`${tenant.kosName} — Kamar ${tenant.roomNumber}`, 20, 89);

      // Table Header
      const tableY = 108;
      doc.setFillColor(30, 58, 138); // Header Blue
      doc.rect(15, tableY, 180, 8, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('DESKRIPSI TAGIHAN SEWA KOST', 20, tableY + 5.5);
      doc.text('DURASI', 120, tableY + 5.5);
      doc.text('NOMINAL', 155, tableY + 5.5);

      // Determine active payment option
      let activeOpt = tenant.paymentOption || 'Bulanan';
      if (!tenant.paymentOption && roomObj) {
        if (roomObj.payMonthly) activeOpt = 'Bulanan';
        else if (roomObj.payThreeMonths) activeOpt = '3 Bulanan';
        else if (roomObj.paySixMonths) activeOpt = '6 Bulanan';
        else if (roomObj.payYearly) activeOpt = 'Tahunan';
      }

      // Determine payment rows
      let hasAnyOption = false;
      let currentY = tableY + 8;
      let calculatedTotal = 0;

      const addInvoiceRow = (desc: string, duration: string, amt: number) => {
        doc.setDrawColor(241, 245, 249);
        doc.rect(15, currentY, 180, 10, 'S');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(desc, 20, currentY + 6.5);
        doc.setFont('Helvetica', 'normal');
        doc.text(duration, 120, currentY + 6.5);
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rp ${amt.toLocaleString('id-ID')}`, 155, currentY + 6.5);

        currentY += 10;
        calculatedTotal += amt;
        hasAnyOption = true;
      };

      if (roomObj) {
        if (activeOpt === 'Bulanan' && roomObj.payMonthly) {
          addInvoiceRow('Sewa Kamar Kost - Opsi Bulanan', '1 Bulan', priceVal);
        } else if (activeOpt === '3 Bulanan' && roomObj.payThreeMonths) {
          addInvoiceRow('Sewa Kamar Kost - Opsi Per-3 Bulan', '3 Bulan', priceVal * 3);
        } else if (activeOpt === '6 Bulanan' && roomObj.paySixMonths) {
          addInvoiceRow('Sewa Kamar Kost - Opsi Per-6 Bulan', '6 Bulan', priceVal * 6);
        } else if (activeOpt === 'Tahunan' && roomObj.payYearly) {
          addInvoiceRow('Sewa Kamar Kost - Opsi Tahunan', '12 Bulan', priceVal * 12);
        } else {
          const optLabel = roomObj.payMonthly ? 'Bulanan' : roomObj.payThreeMonths ? '3 Bulanan' : roomObj.paySixMonths ? '6 Bulanan' : 'Tahunan';
          const multiplier = roomObj.payMonthly ? 1 : roomObj.payThreeMonths ? 3 : roomObj.paySixMonths ? 6 : 12;
          addInvoiceRow(`Sewa Kamar Kost - Opsi ${optLabel}`, `${multiplier} Bulan`, priceVal * multiplier);
        }
      } else {
        addInvoiceRow('Sewa Kamar Kost - Opsi Bulanan (Default)', '1 Bulan', priceVal);
      }

      // Total Box
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY, 180, 15, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text('TOTAL TAGIHAN AKTIF:', 20, currentY + 9.5);
      doc.setFontSize(11);
      doc.text(`Rp ${calculatedTotal.toLocaleString('id-ID')}`, 155, currentY + 9.5);

      // Payment Method Info
      const payInfoY = currentY + 22;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('METODE PEMBAYARAN:', 15, payInfoY);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Bank Transfer: ${kosObj?.bankAccount || 'Mandiri 123456789'}`, 15, payInfoY + 5);
      doc.text(`Atas Nama: ${kosObj?.bankRecipient || 'Manajemen Hananny Kos'}`, 15, payInfoY + 9);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('* Pembayaran ini sah sebagai bukti sewa kamar di Hananny Kos.', 15, payInfoY + 18);
      doc.text('* Harap simpan dokumen ini sebagai bukti transaksi resmi.', 15, payInfoY + 22);

      // Draw official stamp
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129); // Success green
      doc.text('[ LUNAS / PAID ]', 145, payInfoY + 9);

      doc.save(`Invoice_Sewa_Kamar_Kost_${tenant.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating Invoice PDF:', error);
      alert('Gagal membuat Invoice PDF.');
    }
  };

  // HELPER: Upload KTP / ID Card photos directly to Firestore
  const handlePhotoUpload = (tenantId: string, type: 'ktpPhotoUrl' | 'idCardPhotoUrl', file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Str = reader.result as string;
        await onUpdateTenant(tenantId, { [type]: base64Str });
        alert(`Foto ${type === 'ktpPhotoUrl' ? 'KTP' : 'ID Card'} berhasil diperbarui!`);
        
        // Update local modal states if currently open
        setSelectedPreviewTenant(prev => prev && prev.id === tenantId ? { ...prev, [type]: base64Str } : prev);
        setSelectedEditTenant(prev => prev && prev.id === tenantId ? { ...prev, [type]: base64Str } : prev);
      } catch (err) {
        console.error('Error uploading photo:', err);
        alert('Gagal memperbarui foto.');
      }
    };
  };

  // HELPER: Delete KTP / ID Card photos directly from Firestore
  const handlePhotoDelete = async (tenantId: string, type: 'ktpPhotoUrl' | 'idCardPhotoUrl') => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus foto ${type === 'ktpPhotoUrl' ? 'KTP' : 'ID Card'} ini?`)) {
      try {
        await onUpdateTenant(tenantId, { [type]: '' });
        alert(`Foto ${type === 'ktpPhotoUrl' ? 'KTP' : 'ID Card'} berhasil dihapus.`);
        
        // Update local modal states if currently open
        setSelectedPreviewTenant(prev => prev && prev.id === tenantId ? { ...prev, [type]: '' } : prev);
        setSelectedEditTenant(prev => prev && prev.id === tenantId ? { ...prev, [type]: '' } : prev);
      } catch (err) {
        console.error('Error deleting photo:', err);
        alert('Gagal menghapus foto.');
      }
    }
  };

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNik, setRegNik] = useState('');
  const [regAlamat, setRegAlamat] = useState('');
  const [regTtl, setRegTtl] = useState('');
  const [regGender, setRegGender] = useState<'LAKI-LAKI' | 'PEREMPUAN'>('LAKI-LAKI');
  const [regKosId, setRegKosId] = useState('');
  const [regRoomId, setRegRoomId] = useState('');
  const [regCheckIn, setRegCheckIn] = useState(new Date().toISOString().split('T')[0]);

  // Checkout Form States
  const [checkoutTenant, setCheckoutTenant] = useState<Tenant | null>(null);
  const [coDate, setCoDate] = useState(new Date().toISOString().split('T')[0]);
  const [coNotes, setCoNotes] = useState('');
  const [coRefund, setCoRefund] = useState('500000'); // default Rp 500.000 deposit refund
  
  // Facility checking states (for offboarding)
  const [coFacilityKasur, setCoFacilityKasur] = useState<'Aman' | 'Rusak/Kotor'>('Aman');
  const [coFacilityAc, setCoFacilityAc] = useState<'Aman' | 'Bermasalah'>('Aman');
  const [coFacilityPlumbing, setCoFacilityPlumbing] = useState<'Aman' | 'Bermasalah'>('Aman');
  const [coFacilityFurnitur, setCoFacilityFurnitur] = useState<'Aman' | 'Bermasalah/Rusak'>('Aman');
  const [coFacilityKunci, setCoFacilityKunci] = useState<'Aman' | 'Hilang/Rusak'>('Aman');
  const [coFacilityKebersihan, setCoFacilityKebersihan] = useState<'Bersih' | 'Sangat Kotor'>('Bersih');
  
  // View Checkout Document state
  const [selectedArchivedTenant, setSelectedArchivedTenant] = useState<Tenant | null>(null);

  // Filter available rooms for the selected Kos in registration
  const availableRoomsForSelectedKos = useMemo(() => {
    if (!regKosId) return [];
    return rooms.filter(r => r.kosId === regKosId && r.status === 'available');
  }, [rooms, regKosId]);

  // Filters State for Active Tenants
  const [filterKosId, setFilterKosId] = useState<string>('all');
  const [filterRoomId, setFilterRoomId] = useState<string>('all');

  // Search filtered occupants
  const activeTenants = useMemo(() => {
    return tenants.filter(t => !t.isCheckedOut && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tenants, searchQuery]);

  // Filtered active tenants based on Kos and Room selection
  const filteredActiveTenants = useMemo(() => {
    return tenants.filter(t => {
      if (t.isCheckedOut) return false;
      
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.phone.includes(searchQuery) ||
                            (t.roomNumber && t.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()));
                            
      const matchesKos = filterKosId === 'all' || t.kosId === filterKosId;
      const matchesRoom = filterRoomId === 'all' || t.roomId === filterRoomId;
      
      return matchesSearch && matchesKos && matchesRoom;
    });
  }, [tenants, searchQuery, filterKosId, filterRoomId]);

  // Group active tenants by Kos branch and room number
  const groupedActiveTenants = useMemo(() => {
    const groups: { [key: string]: { kosName: string; roomNumber: string; tenants: Tenant[] } } = {};
    
    filteredActiveTenants.forEach(tenant => {
      const key = `${tenant.kosId || 'other'}_${tenant.roomId || 'other'}`;
      if (!groups[key]) {
        groups[key] = {
          kosName: tenant.kosName || 'Lainnya',
          roomNumber: tenant.roomNumber || 'Belum Ditentukan',
          tenants: []
        };
      }
      groups[key].tenants.push(tenant);
    });
    
    // Convert to array and sort by kosName and roomNumber
    return Object.values(groups).sort((a, b) => {
      const kosCompare = a.kosName.localeCompare(b.kosName);
      if (kosCompare !== 0) return kosCompare;
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });
  }, [filteredActiveTenants]);

  const archivedTenants = useMemo(() => {
    return tenants.filter(t => t.isCheckedOut && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tenants, searchQuery]);

  // Handle KTP Upload / AI Scanning
  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanResult(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = reader.result as string;

        // POST to backend API
        const response = await fetch('/api/verify-ktp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Str, mimeType: file.type })
        });

        const resData = await response.json();
        if (resData.success) {
          const ktp = resData.data;
          setScanResult(ktp);
          // Autofill form fields
          setRegName(ktp.nama || '');
          setRegNik(ktp.nik || '');
          setRegAlamat(ktp.alamat || '');
          setRegTtl(ktp.ttl || '');
          if (ktp.jenisKelamin === 'PEREMPUAN') {
            setRegGender('PEREMPUAN');
          } else {
            setRegGender('LAKI-LAKI');
          }
        } else {
          alert('Gagal mendeteksi KTP: ' + resData.error);
        }
        setScanning(false);
      };
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
      setScanning(false);
    }
  };

  // Simulate AI Scan for Demo
  const handleSimulateKtpScan = async () => {
    setScanning(true);
    setScanResult(null);

    // Let's call the real API with the mock base64 to let Gemini run!
    try {
      const response = await fetch('/api/verify-ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: MOCK_KTP_BASE64_1, 
          mimeType: 'image/png' 
        })
      });

      const resData = await response.json();
      if (resData.success) {
        const ktp = resData.data;
        // Set sample data if API returned fallback mock, or use Gemini's actual extracted output
        const finalKtp = ktp.nik === '3171XXXXXXXXXXXX' ? {
          nik: '3273012904940003',
          nama: 'HANANNY RADITYA',
          alamat: 'Kec. Lowokwaru, Kota Malang, Jawa Timur',
          ttl: 'MALANG, 29-04-1994',
          jenisKelamin: 'LAKI-LAKI',
          isAuthentic: true,
          confidenceScore: 0.95,
          notes: 'KTP Asli terbaca sangat jelas melalui Gemini AI.'
        } : ktp;

        setScanResult(finalKtp);
        setRegName(finalKtp.nama);
        setRegNik(finalKtp.nik);
        setRegAlamat(finalKtp.alamat);
        setRegTtl(finalKtp.ttl);
        setRegGender(finalKtp.jenisKelamin === 'PEREMPUAN' ? 'PEREMPUAN' : 'LAKI-LAKI');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  const handleTriggerDocPreview = () => {
    if (!regKosId || !regRoomId || !regName || !regPhone) {
      alert('Mohon lengkapi data wajib terlebih dahulu (Nama, Telepon, Lokasi Kos & Kamar) untuk melakukan pratinjau dokumen.');
      return;
    }

    const selectedKos = kosList.find(k => k.id === regKosId);
    const selectedRoom = rooms.find(r => r.id === regRoomId);

    if (!selectedKos || !selectedRoom) {
      alert('Lokasi Kos atau Kamar tidak valid.');
      return;
    }

    const tempTenant: Tenant = {
      id: 'preview_temp_id',
      name: regName,
      phone: regPhone,
      email: regEmail || `${regName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      ktpNik: regNik || 'Belum Terdata',
      ktpAlamat: regAlamat || 'Belum Terdata',
      ktpTtl: regTtl || 'Belum Terdata',
      jenisKelamin: regGender,
      kosId: regKosId,
      kosName: selectedKos.name,
      roomId: regRoomId,
      roomNumber: selectedRoom.roomNumber,
      checkInDate: regCheckIn,
      isCheckedOut: false,
      passcode: selectedRoom.passcode
    };

    setDocPreviewData(tempTenant);
    setShowDocPreviewModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regKosId || !regRoomId || !regName || !regPhone) {
      alert('Mohon lengkapi data wajib (Nama, Telepon, Lokasi Kos & Kamar)');
      return;
    }

    const selectedKos = kosList.find(k => k.id === regKosId);
    const selectedRoom = rooms.find(r => r.id === regRoomId);

    if (!selectedKos || !selectedRoom) return;

    try {
      await onAddTenant({
        name: regName,
        phone: regPhone,
        email: regEmail || `${regName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        ktpNik: regNik || 'Belum Terdata',
        ktpAlamat: regAlamat || 'Belum Terdata',
        ktpTtl: regTtl || 'Belum Terdata',
        jenisKelamin: regGender,
        kosId: regKosId,
        kosName: selectedKos.name,
        roomId: regRoomId,
        roomNumber: selectedRoom.roomNumber,
        checkInDate: regCheckIn,
        isCheckedOut: false,
        passcode: selectedRoom.passcode
      });

      // Reset
      setRegName('');
      setRegPhone('');
      setRegEmail('');
      setRegNik('');
      setRegAlamat('');
      setRegTtl('');
      setRegKosId('');
      setRegRoomId('');
      setScanResult(null);
      setShowAddModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!checkoutTenant) return;
    try {
      const facilitySummary = [
        `Kasur: ${coFacilityKasur}`,
        `AC/Kipas: ${coFacilityAc}`,
        `Toilet: ${coFacilityPlumbing}`,
        `Furnitur: ${coFacilityFurnitur}`,
        `Kunci: ${coFacilityKunci}`,
        `Kebersihan: ${coFacilityKebersihan}`
      ].join(' | ');

      const formattedNotes = `[Fasilitas: ${facilitySummary}] ${coNotes || 'Sewa selesai dengan baik.'}`;

      await onCheckoutTenant(checkoutTenant.id, {
        checkOutDate: coDate,
        checkoutNotes: formattedNotes,
        checkoutRefund: Number(coRefund)
      });
      setCheckoutTenant(null);
      setCoNotes('');
    } catch (e) {
      console.error(e);
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
      {/* Header and Add Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded py-1.5 pl-10 pr-4 text-xs font-bold outline-none"
            placeholder="Cari nama penghuni..."
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center space-x-1.5 self-start sm:self-auto uppercase tracking-wider cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Penghuni Baru</span>
        </button>
      </div>

      {/* Tenants Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Occupants List (Left 2/3) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 lg:col-span-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
              <Users className="w-4 h-4 mr-1.5 text-blue-600" />
              Penghuni Aktif Sekarang
            </h3>
            
            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Cabang:</span>
                <select
                  value={filterKosId}
                  onChange={(e) => {
                    setFilterKosId(e.target.value);
                    setFilterRoomId('all'); // reset room selection
                  }}
                  className="bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Cabang</option>
                  {kosList.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Kamar:</span>
                <select
                  value={filterRoomId}
                  onChange={(e) => setFilterRoomId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-[10px] font-bold outline-none focus:border-blue-500"
                  disabled={filterKosId === 'all'}
                >
                  <option value="all">Semua Kamar</option>
                  {rooms.filter(r => r.kosId === filterKosId).map(r => (
                    <option key={r.id} value={r.id}>{r.roomNumber}</option>
                  ))}
                </select>
              </div>

              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {filteredActiveTenants.length} Orang
              </span>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-1 space-y-4 pt-1">
            {groupedActiveTenants.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Tidak ada data penghuni aktif.</p>
            ) : (
              groupedActiveTenants.map((group) => (
                <div key={`${group.kosName}_${group.roomNumber}`} className="bg-slate-50/20 border border-slate-200/60 rounded-lg p-3 space-y-2">
                  {/* Group Header */}
                  <div className="bg-slate-100/80 px-2.5 py-1.5 rounded border border-slate-200/40 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                      {group.kosName} — {group.roomNumber}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-200/60 px-1.5 py-0.5 rounded">
                      {group.tenants.length} Penghuni
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 pl-1">
                    {group.tenants.map((tenant) => {
                      const isExpanded = expandedTenantId === tenant.id;
                      return (
                        <div key={tenant.id} className="py-2.5 last:pb-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-1.5 rounded transition-colors">
                            <div className="flex items-start space-x-2.5 cursor-pointer flex-1" onClick={() => setExpandedTenantId(isExpanded ? null : tenant.id)}>
                              <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5 flex-1">
                                <div className="flex items-center space-x-2">
                                  <p className="font-bold text-xs text-slate-800">{tenant.name}</p>
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase hover:bg-blue-100">
                                    {isExpanded ? 'Sembunyikan' : 'Lihat Detail'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-bold">
                                  <span>Telp: {tenant.phone}</span>
                                  <span>•</span>
                                  <span>Masuk: {tenant.checkInDate}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                              <button
                                onClick={() => setSelectedPreviewTenant(tenant)}
                                className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[10px] font-bold transition-all flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                                title="Preview Data Penghuni"
                              >
                                <Eye className="w-3 h-3 text-slate-500" />
                                <span>Preview</span>
                              </button>
                              <button
                                onClick={() => setSelectedEditTenant(tenant)}
                                className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[10px] font-bold transition-all flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                                title="Edit Data Penghuni"
                              >
                                <Pencil className="w-3 h-3 text-slate-500" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  setCheckoutTenant(tenant);
                                  setCoDate(new Date().toISOString().split('T')[0]);
                                  setCoFacilityKasur('Aman');
                                  setCoFacilityAc('Aman');
                                  setCoFacilityPlumbing('Aman');
                                  setCoFacilityFurnitur('Aman');
                                  setCoFacilityKunci('Aman');
                                  setCoFacilityKebersihan('Bersih');
                                }}
                                className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded text-[10px] font-bold transition-all flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                              >
                                <LogOut className="w-3 h-3" />
                                <span>Proses Checkout</span>
                              </button>
                              <button
                                onClick={() => onRemoveTenant(tenant.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-white p-3 rounded border border-slate-200 text-xs text-slate-600 space-y-3 font-semibold ml-2 shadow-2xs"
                            >
                              {/* KTP & Personal Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2.5 border-b border-slate-100">
                                <div className="space-y-1">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Data Identitas KTP</p>
                                  <p className="text-slate-800 font-bold font-mono">NIK: {tenant.ktpNik}</p>
                                  <p className="text-[11px] text-slate-500">TTL: {tenant.ktpTtl}</p>
                                  <p className="text-[11px] text-slate-500 leading-normal">Alamat: {tenant.ktpAlamat}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Profil Tambahan</p>
                                  <p className="text-slate-800 font-bold">Email: <span className="font-medium font-mono text-[11px]">{tenant.email}</span></p>
                                  <p className="text-slate-800 font-bold">Gender: <span className="font-medium">{tenant.jenisKelamin}</span></p>
                                  {tenant.pekerjaan && (
                                    <p className="text-slate-800 font-bold">Pekerjaan: <span className="font-medium">{tenant.pekerjaan} {tenant.pekerjaanDetail ? `(${tenant.pekerjaanDetail})` : ''}</span></p>
                                  )}
                                  {tenant.statusPerkawinan && (
                                    <p className="text-slate-800 font-bold">Status: <span className="font-medium">{tenant.statusPerkawinan} {tenant.statusPerkawinanDetail ? `(${tenant.statusPerkawinanDetail})` : ''}</span></p>
                                  )}
                                </div>
                              </div>

                              {/* Guarantor Details */}
                              {tenant.guarantorName && (
                                <div className="space-y-1.5 border-b border-slate-100 pb-2.5">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Kontak Penjamin (Darurat)</p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
                                    <p className="font-bold text-slate-800">Nama: <span className="font-medium">{tenant.guarantorName}</span></p>
                                    <p className="font-bold text-slate-800">Telepon: <span className="font-medium font-mono">{tenant.guarantorPhone || '—'}</span></p>
                                    <p className="font-bold text-slate-800">Hubungan: <span className="font-medium">{tenant.guarantorRelationship} {tenant.guarantorRelationshipDetail ? `(${tenant.guarantorRelationshipDetail})` : ''}</span></p>
                                  </div>
                                </div>
                              )}

                              {/* Signature & Documents Section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5 border-b border-slate-100 pb-3">
                                <div className="space-y-1.5">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center">
                                    <PenTool className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                    Tanda Tangan Digital Penyewa
                                  </p>
                                  {tenant.signatureUrl ? (
                                    <div className="space-y-2">
                                      <div className="bg-slate-50 border border-slate-200/60 p-2.5 rounded max-w-[240px] flex flex-col items-center justify-center shadow-xs">
                                        <img src={tenant.signatureUrl} alt="Tanda Tangan" className="max-h-20 object-contain" referrerPolicy="no-referrer" />
                                      </div>
                                      <button
                                        onClick={() => handleSaveTenantSignature(tenant.id, '')}
                                        className="text-[9px] font-bold text-rose-600 hover:text-rose-700 hover:underline uppercase tracking-wider cursor-pointer"
                                      >
                                        Ganti Tanda Tangan
                                      </button>
                                    </div>
                                  ) : (
                                    <TenantSignaturePad
                                      tenantId={tenant.id}
                                      onSave={(sigUrl) => handleSaveTenantSignature(tenant.id, sigUrl)}
                                    />
                                  )}
                                </div>

                                <div className="bg-blue-50/15 border border-blue-100/60 p-3 rounded flex flex-col justify-between space-y-3">
                                  <div className="space-y-1">
                                    <h5 className="text-xs font-bold text-slate-800">Dokumen Digital Terintegrasi</h5>
                                    <p className="text-[10px] text-slate-500 font-medium leading-normal">
                                      Sistem akan secara otomatis menyusun Surat Perjanjian Sewa (Kontrak) lengkap dengan tanda tangan penyewa, beserta Invoice Pembayaran aktif sesuai dengan status opsi bayar kamar.
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <button
                                      onClick={() => handleDownloadAgreementPDF(tenant)}
                                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider cursor-pointer shadow-xs"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Save as PDF (Kontrak)</span>
                                    </button>
                                    <button
                                      onClick={() => handleDownloadInvoicePDF(tenant)}
                                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-bold transition-all flex items-center justify-center space-x-1.5 uppercase tracking-wider cursor-pointer shadow-xs"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                                      <span>Save as PDF (Invoice)</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checked Out / Offboarded Tenants (Right 1/3) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histori Sign Out & Arsip</h3>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {archivedTenants.length} Arsip
            </span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {archivedTenants.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10 font-bold uppercase tracking-wider">Belum ada histori checkout.</p>
            ) : (
              archivedTenants.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedArchivedTenant(t)}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50/20 border border-slate-200 rounded cursor-pointer transition-all space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-[11px] text-slate-800">{t.name}</p>
                    <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded uppercase">
                      Archived
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {t.kosName} — {t.roomNumber}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-1">
                    <span>Selesai: {t.checkOutDate}</span>
                    <span className="text-blue-600 font-bold uppercase flex items-center">
                      <FileText className="w-3 h-3 mr-0.5" /> Sertifikat
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Tenant Modal (including AI KTP Scan) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-lg border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider flex items-center">
                  <Cpu className="w-3.5 h-3.5 mr-1" /> Didukung Gemini 2.5 Flash
                </span>
                <h4 className="text-sm font-bold">Verifikasi Identitas & Pendaftaran Penghuni</h4>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* AI Verification Section */}
              <div className="border border-blue-100 bg-blue-50/10 p-4 rounded space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 flex items-center uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 mr-1 text-blue-600" />
                      Sistem Verifikasi Dokumen KTP Otomatis
                    </p>
                    <p className="text-[10px] text-slate-500 max-w-md font-medium leading-normal">
                      Unggah foto KTP calon penghuni. Kecerdasan Buatan akan memindai, mengekstrak data identitas secara instan, dan memverifikasi keasliannya.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulateKtpScan}
                    disabled={scanning}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded text-[10px] flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
                  >
                    {scanning ? 'Menganalisis...' : 'Simulasi Scan AI'}
                  </button>
                </div>

                {/* Upload Action */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="border border-dashed border-blue-200 bg-white hover:bg-blue-50/30 p-4 rounded flex flex-col items-center justify-center cursor-pointer transition-all h-28">
                    <Upload className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pilih Foto KTP</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Mendukung JPEG, PNG s.d 10MB</span>
                    <input type="file" accept="image/*" onChange={handleKtpUpload} className="hidden" />
                  </label>

                  {/* Scan Result */}
                  <div className="bg-white border border-slate-200 p-3 rounded flex flex-col justify-between h-28 text-xs font-bold">
                    {scanning ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-1.5">
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">Menganalisis KTP via Gemini API...</p>
                      </div>
                    ) : scanResult ? (
                      <div className="space-y-0.5 overflow-y-auto font-medium">
                        <p className="text-[9px] text-slate-400 flex items-center font-bold">
                          Status Keaslian:{' '}
                          {scanResult.isAuthentic ? (
                            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold flex items-center ml-1">
                              TERVERIFIKASI ({Math.round(scanResult.confidenceScore * 100)}%)
                            </span>
                          ) : (
                            <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-bold flex items-center ml-1">
                              MENCURIGAKAN
                            </span>
                          )}
                        </p>
                        <p className="font-bold text-slate-800 text-xs">Nama: {scanResult.nama}</p>
                        <p className="font-mono text-[10px] text-slate-600">NIK: {scanResult.nik}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">TTL: {scanResult.ttl}</p>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <AlertCircle className="w-4 h-4 mb-1" />
                        <p className="text-[9px] uppercase tracking-wider font-bold">Data belum dipindai</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1">Formulir Pendaftaran</h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Nama */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>

                  {/* Telepon */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. WhatsApp / HP *</label>
                    <input
                      type="text"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Contoh: 08123456789"
                    />
                  </div>

                  {/* NIK */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. NIK KTP</label>
                    <input
                      type="text"
                      value={regNik}
                      onChange={(e) => setRegNik(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold font-mono outline-none focus:border-blue-500"
                      placeholder="16 Digit nomor KTP"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="alamat@email.com"
                    />
                  </div>

                  {/* TTL */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tempat, Tanggal Lahir</label>
                    <input
                      type="text"
                      value={regTtl}
                      onChange={(e) => setRegTtl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                      placeholder="Contoh: JAKARTA, 01-01-1990"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Jenis Kelamin</label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    >
                      <option value="LAKI-LAKI">Laki-Laki</option>
                      <option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>

                  {/* Kos Select */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pilih Lokasi Kos *</label>
                    <select
                      required
                      value={regKosId}
                      onChange={(e) => {
                        setRegKosId(e.target.value);
                        setRegRoomId('');
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
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pilih Kamar Kosong *</label>
                    <select
                      required
                      disabled={!regKosId}
                      value={regRoomId}
                      onChange={(e) => setRegRoomId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">-- Pilih Kamar --</option>
                      {availableRoomsForSelectedKos.map(r => (
                        <option key={r.id} value={r.id}>{r.roomNumber} ({formatIDR(r.price)}/bln)</option>
                      ))}
                    </select>
                  </div>

                  {/* Check-In Date */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai Sewa *</label>
                    <input
                      type="date"
                      required
                      value={regCheckIn}
                      onChange={(e) => setRegCheckIn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Alamat Lengkap */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Alamat Lengkap KTP</label>
                    <textarea
                      value={regAlamat}
                      onChange={(e) => setRegAlamat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-blue-500 h-14 resize-none"
                      placeholder="Masukkan alamat domisili asal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <button
                    type="button"
                    id="btn-trigger-doc-preview"
                    onClick={handleTriggerDocPreview}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs transition-colors uppercase tracking-wider cursor-pointer border border-slate-200 flex items-center justify-center space-x-1"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Pratinjau Dokumen</span>
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-registration"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors uppercase tracking-wider cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi Pendaftaran</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Checkout Processing Modal */}
      {checkoutTenant && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-lg border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="bg-rose-950 text-white p-4 flex justify-between items-center border-b border-rose-900">
              <div>
                <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">OFFBOARDING</span>
                <h4 className="text-sm font-bold">Checkout {checkoutTenant.name}</h4>
              </div>
              <button onClick={() => setCheckoutTenant(null)} className="text-rose-300 hover:text-white text-xs font-bold uppercase tracking-wider">
                Batal
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1 font-medium">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Detail Unit:</p>
                <p className="text-slate-600">{checkoutTenant.kosName} — {checkoutTenant.roomNumber}</p>
                <p className="text-slate-500">Mulai Sewa: {checkoutTenant.checkInDate}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Keluar *</label>
                <input
                  type="date"
                  value={coDate}
                  onChange={(e) => setCoDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pengembalian Uang Jaminan / Deposit (IDR)</label>
                <input
                  type="number"
                  value={coRefund}
                  onChange={(e) => setCoRefund(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold font-mono outline-none focus:border-rose-500"
                />
              </div>

              {/* Checklist Pemeriksaan Kamar */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center">
                  <CheckSquare className="w-3.5 h-3.5 mr-1" /> Pemeriksaan Fasilitas & Kamar
                </p>
                <p className="text-[9px] text-slate-400 font-medium">Periksa kondisi fasilitas kamar sebelum penyewa keluar:</p>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {/* Kasur */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-between">
                    <span className="font-bold text-slate-600 block mb-1">Kasur & Ranjang</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCoFacilityKasur('Aman')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityKasur === 'Aman' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Aman
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoFacilityKasur('Rusak/Kotor')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityKasur === 'Rusak/Kotor' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Rusak
                      </button>
                    </div>
                  </div>

                  {/* AC / Kipas */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-between">
                    <span className="font-bold text-slate-600 block mb-1">AC & Kipas Angin</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCoFacilityAc('Aman')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityAc === 'Aman' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Aman
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoFacilityAc('Bermasalah')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityAc === 'Bermasalah' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Rusak
                      </button>
                    </div>
                  </div>

                  {/* Kamar Mandi */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-between">
                    <span className="font-bold text-slate-600 block mb-1">Kamar Mandi / Kran</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCoFacilityPlumbing('Aman')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityPlumbing === 'Aman' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Aman
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoFacilityPlumbing('Bermasalah')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityPlumbing === 'Bermasalah' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Rusak
                      </button>
                    </div>
                  </div>

                  {/* Furnitur */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-between">
                    <span className="font-bold text-slate-600 block mb-1">Furnitur Meja/Lemari</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCoFacilityFurnitur('Aman')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityFurnitur === 'Aman' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Aman
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoFacilityFurnitur('Bermasalah/Rusak')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityFurnitur === 'Bermasalah/Rusak' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Rusak
                      </button>
                    </div>
                  </div>

                  {/* Kunci */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-between">
                    <span className="font-bold text-slate-600 block mb-1">Akses Kunci & Pintu</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCoFacilityKunci('Aman')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityKunci === 'Aman' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Aman
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoFacilityKunci('Hilang/Rusak')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityKunci === 'Hilang/Rusak' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Rusak
                      </button>
                    </div>
                  </div>

                  {/* Kebersihan */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-between">
                    <span className="font-bold text-slate-600 block mb-1">Kebersihan Kamar</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCoFacilityKebersihan('Bersih')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityKebersihan === 'Bersih' ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Bersih
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoFacilityKebersihan('Sangat Kotor')}
                        className={`flex-1 py-1 text-center font-bold rounded text-[9px] ${coFacilityKebersihan === 'Sangat Kotor' ? 'bg-rose-500 text-white' : 'bg-white hover:bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        Kotor
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Catatan Tambahan Checkout</label>
                <textarea
                  value={coNotes}
                  onChange={(e) => setCoNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-bold outline-none h-16 resize-none focus:border-rose-500"
                  placeholder="Kondisi kamar bersih, kunci diserahkan kembali, kipas angin aman."
                />
              </div>

              <button
                onClick={handleCheckoutSubmit}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs transition-colors uppercase tracking-wider cursor-pointer"
              >
                Konfirmasi Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Checkout/Archived Certificate Modal */}
      {selectedArchivedTenant && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-lg border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b border-slate-800">
              <h4 className="text-sm font-bold tracking-tight uppercase tracking-wider text-[11px]">Dokumentasi & Sertifikat Keluar</h4>
              <button onClick={() => setSelectedArchivedTenant(null)} className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider">
                Tutup
              </button>
            </div>

            {/* Print Certificate Layout */}
            <div className="p-6 space-y-4 bg-amber-50/10 border-b border-slate-200">
              <div className="text-center space-y-1 border-b border-double border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">BERITA ACARA SERAH TERIMA KAMAR</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Sistem Manajemen Sewa Terpadu — Hananny Kos</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Nama Penyewa</p>
                  <p className="font-bold text-slate-800">{selectedArchivedTenant.name}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">No. NIK KTP</p>
                  <p className="font-mono font-bold text-slate-800">{selectedArchivedTenant.ktpNik}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Unit Kamar</p>
                  <p className="font-bold text-slate-800">{selectedArchivedTenant.kosName} — {selectedArchivedTenant.roomNumber}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Uang Deposit Dikembalikan</p>
                  <p className="font-bold text-emerald-600 font-mono">{formatIDR(selectedArchivedTenant.checkoutRefund || 0)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Tanggal Masuk</p>
                  <p className="font-bold text-slate-700">{selectedArchivedTenant.checkInDate}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Tanggal Keluar (Sign Out)</p>
                  <p className="font-bold text-slate-700">{selectedArchivedTenant.checkOutDate}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded space-y-1">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Catatan Akhir Serah Terima:</p>
                <p className="text-xs text-slate-600 font-semibold italic">"{selectedArchivedTenant.checkoutNotes || 'Sewa selesai dengan baik.'}"</p>
              </div>

              <p className="text-[9px] text-center text-slate-400 italic font-medium leading-relaxed">
                Dokumen ini merupakan bukti resmi pengembalian kunci fisik kamar, pengembalian jaminan sewa, dan penyelesaian kewajiban sewa kos secara transparan dan aman.
              </p>
            </div>

            <div className="p-3 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center space-x-1 uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PREVIEW TENANT MODAL */}
      {selectedPreviewTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-lg border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">PREVIEW PENGHUNI</span>
                <h4 className="text-sm font-bold">{selectedPreviewTenant.name}</h4>
              </div>
              <button 
                onClick={() => setSelectedPreviewTenant(null)} 
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Profile Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Informasi Kontak & Sewa</h5>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2 text-xs font-medium">
                    <p className="text-slate-500">Cabang Kos: <span className="text-slate-800 font-bold">{selectedPreviewTenant.kosName}</span></p>
                    <p className="text-slate-500">Nomor Kamar: <span className="text-slate-800 font-bold">{selectedPreviewTenant.roomNumber}</span></p>
                    <p className="text-slate-500">Tanggal Masuk: <span className="text-slate-800 font-bold">{selectedPreviewTenant.checkInDate}</span></p>
                    <p className="text-slate-500">No. WhatsApp: <span className="text-slate-800 font-bold">{selectedPreviewTenant.phone}</span></p>
                    <p className="text-slate-500">Email: <span className="text-slate-800 font-bold">{selectedPreviewTenant.email || '-'}</span></p>
                    <p className="text-slate-500">Opsi Pembayaran: <span className="text-slate-800 font-bold">{selectedPreviewTenant.paymentOption || 'Bulanan'}</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Detail Demografi</h5>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-2 text-xs font-medium">
                    <p className="text-slate-500">NIK KTP: <span className="text-slate-800 font-mono font-bold">{selectedPreviewTenant.ktpNik}</span></p>
                    <p className="text-slate-500">Jenis Kelamin: <span className="text-slate-800 font-bold">{selectedPreviewTenant.jenisKelamin}</span></p>
                    <p className="text-slate-500">Pekerjaan: <span className="text-slate-800 font-bold">{selectedPreviewTenant.pekerjaan === 'Lainnya' ? selectedPreviewTenant.pekerjaanDetail : selectedPreviewTenant.pekerjaan || 'Belum Terdata'}</span></p>
                    <p className="text-slate-500">Status Nikah: <span className="text-slate-800 font-bold">{selectedPreviewTenant.statusPerkawinan === 'Lainnya' ? selectedPreviewTenant.statusPerkawinanDetail : selectedPreviewTenant.statusPerkawinan || 'Belum Terdata'}</span></p>
                    {selectedPreviewTenant.guarantorName && (
                      <>
                        <p className="text-slate-500">Wali: <span className="text-slate-800 font-bold">{selectedPreviewTenant.guarantorName}</span></p>
                        <p className="text-slate-500">Kontak Wali: <span className="text-slate-800 font-bold">{selectedPreviewTenant.guarantorPhone || '-'}</span></p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity Documents Section */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Berkas Identitas KTP & ID Card</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* KTP Photo Box */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Foto KTP Resmi</p>
                      {selectedPreviewTenant.ktpPhotoUrl ? (
                        <div className="relative group rounded-md overflow-hidden border border-slate-200 bg-white aspect-video flex items-center justify-center">
                          <img 
                            src={selectedPreviewTenant.ktpPhotoUrl} 
                            alt="Foto KTP" 
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="rounded-md border-2 border-dashed border-slate-200 aspect-video flex flex-col items-center justify-center text-slate-400 bg-white text-center p-3">
                          <p className="text-[10px] font-bold">Foto KTP Belum Tersedia</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 pt-1.5 border-t border-slate-200/50 justify-end">
                      {selectedPreviewTenant.ktpPhotoUrl && (
                        <button
                          onClick={() => setLightboxPhoto({ url: selectedPreviewTenant.ktpPhotoUrl!, title: 'Foto KTP - ' + selectedPreviewTenant.name })}
                          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Preview
                        </button>
                      )}
                      <label className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer">
                        Edit
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handlePhotoUpload(selectedPreviewTenant.id, 'ktpPhotoUrl', e.target.files[0]);
                          }}
                        />
                      </label>
                      {selectedPreviewTenant.ktpPhotoUrl && (
                        <button
                          onClick={() => handlePhotoDelete(selectedPreviewTenant.id, 'ktpPhotoUrl')}
                          className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ID Card Photo Box */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2.5 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Foto ID Card / KTM / ID Karyawan</p>
                      {selectedPreviewTenant.idCardPhotoUrl ? (
                        <div className="relative group rounded-md overflow-hidden border border-slate-200 bg-white aspect-video flex items-center justify-center">
                          <img 
                            src={selectedPreviewTenant.idCardPhotoUrl} 
                            alt="Foto ID Card" 
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="rounded-md border-2 border-dashed border-slate-200 aspect-video flex flex-col items-center justify-center text-slate-400 bg-white text-center p-3">
                          <p className="text-[10px] font-bold">Foto ID Card Belum Tersedia</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 pt-1.5 border-t border-slate-200/50 justify-end">
                      {selectedPreviewTenant.idCardPhotoUrl && (
                        <button
                          onClick={() => setLightboxPhoto({ url: selectedPreviewTenant.idCardPhotoUrl!, title: 'Foto ID Card - ' + selectedPreviewTenant.name })}
                          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Preview
                        </button>
                      )}
                      <label className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer">
                        Edit
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handlePhotoUpload(selectedPreviewTenant.id, 'idCardPhotoUrl', e.target.files[0]);
                          }}
                        />
                      </label>
                      {selectedPreviewTenant.idCardPhotoUrl && (
                        <button
                          onClick={() => handlePhotoDelete(selectedPreviewTenant.id, 'idCardPhotoUrl')}
                          className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* EDIT TENANT MODAL */}
      {selectedEditTenant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-lg border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">EDIT DATA PENGHUNI</span>
                <h4 className="text-sm font-bold">Ubah Informasi Kamar & Identitas</h4>
              </div>
              <button 
                onClick={() => setSelectedEditTenant(null)} 
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Batal
              </button>
            </div>

            {/* Modal Body */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { id, ...updateData } = selectedEditTenant;
                  await onUpdateTenant(id, updateData);
                  alert('Data Penghuni berhasil disimpan!');
                  setSelectedEditTenant(null);
                } catch (err) {
                  console.error('Error saving edited tenant:', err);
                  alert('Gagal menyimpan perubahan.');
                }
              }}
              className="p-5 overflow-y-auto space-y-4 text-xs font-bold text-slate-700"
            >
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap *</label>
                  <input 
                    type="text" 
                    value={selectedEditTenant.name}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. WhatsApp / HP *</label>
                  <input 
                    type="text" 
                    value={selectedEditTenant.phone}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">NIK KTP *</label>
                  <input 
                    type="text" 
                    value={selectedEditTenant.ktpNik}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, ktpNik: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs font-mono outline-none focus:border-blue-500 font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    value={selectedEditTenant.email || ''}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Rencana Masuk *</label>
                  <input 
                    type="date" 
                    value={selectedEditTenant.checkInDate}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, checkInDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Jenis Kelamin *</label>
                  <select
                    value={selectedEditTenant.jenisKelamin}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, jenisKelamin: e.target.value as 'LAKI-LAKI' | 'PEREMPUAN' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="LAKI-LAKI">LAKI-LAKI</option>
                    <option value="PEREMPUAN">PEREMPUAN</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Opsi Pembayaran *</label>
                  <select
                    value={selectedEditTenant.paymentOption || 'Bulanan'}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, paymentOption: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Bulanan">Bulanan</option>
                    <option value="3 Bulanan">3 Bulanan</option>
                    <option value="6 Bulanan">6 Bulanan</option>
                    <option value="Tahunan">Tahunan</option>
                  </select>
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pekerjaan</label>
                  <select
                    value={selectedEditTenant.pekerjaan || 'Mahasiswa'}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, pekerjaan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Mahasiswa">Mahasiswa</option>
                    <option value="Karyawan">Karyawan</option>
                    <option value="Wiraswasta">Wiraswasta</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                {selectedEditTenant.pekerjaan === 'Lainnya' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detail Pekerjaan</label>
                    <input 
                      type="text" 
                      value={selectedEditTenant.pekerjaanDetail || ''}
                      onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, pekerjaanDetail: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status Perkawinan</label>
                  <select
                    value={selectedEditTenant.statusPerkawinan || 'Belum Kawin'}
                    onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, statusPerkawinan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                {selectedEditTenant.statusPerkawinan === 'Lainnya' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detail Status Perkawinan</label>
                    <input 
                      type="text" 
                      value={selectedEditTenant.statusPerkawinanDetail || ''}
                      onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, statusPerkawinanDetail: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Row 6: Wali */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-bold">Informasi Wali / Penanggung Jawab</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Wali</label>
                    <input 
                      type="text" 
                      value={selectedEditTenant.guarantorName || ''}
                      onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, guarantorName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Kontak Wali</label>
                    <input 
                      type="text" 
                      value={selectedEditTenant.guarantorPhone || ''}
                      onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, guarantorPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hubungan Wali</label>
                    <select
                      value={selectedEditTenant.guarantorRelationship || 'Orang Tua'}
                      onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, guarantorRelationship: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 font-bold"
                    >
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="Saudara">Saudara</option>
                      <option value="Kerabat">Kerabat</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 7: Alamat KTP */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Alamat Sesuai KTP *</label>
                <textarea 
                  value={selectedEditTenant.ktpAlamat}
                  onChange={(e) => setSelectedEditTenant({ ...selectedEditTenant, ktpAlamat: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded py-1.5 px-2.5 text-xs outline-none focus:border-blue-500 h-14 resize-none font-medium"
                  required
                />
              </div>

              {/* Document Photo Upload Form */}
              <div className="border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Foto KTP Resmi</p>
                  <div className="flex items-center space-x-3">
                    {selectedEditTenant.ktpPhotoUrl ? (
                      <img src={selectedEditTenant.ktpPhotoUrl} className="w-12 h-8 object-cover rounded border border-slate-300" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Belum Ada</span>
                    )}
                    <label className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer">
                      Pilih Foto KTP
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoUpload(selectedEditTenant.id, 'ktpPhotoUrl', e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Foto ID Card / KTM</p>
                  <div className="flex items-center space-x-3">
                    {selectedEditTenant.idCardPhotoUrl ? (
                      <img src={selectedEditTenant.idCardPhotoUrl} className="w-12 h-8 object-cover rounded border border-slate-300" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Belum Ada</span>
                    )}
                    <label className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer font-bold">
                      Pilih Foto ID Card
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handlePhotoUpload(selectedEditTenant.id, 'idCardPhotoUrl', e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setSelectedEditTenant(null)} 
                  className="px-4 py-2 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg overflow-hidden max-w-3xl w-full flex flex-col shadow-2xl relative text-slate-800"
          >
            <div className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0 border-b border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{lightboxPhoto.title}</span>
              <button 
                onClick={() => setLightboxPhoto(null)} 
                className="text-white hover:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Tutup [X]
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center aspect-video max-h-[70vh]">
              <img 
                src={lightboxPhoto.url} 
                alt="Document Full Preview" 
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* DYNAMIC INTEGRATED DIGITAL DOCUMENT PREVIEW MODAL */}
      {showDocPreviewModal && docPreviewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-3xl rounded-xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-slate-800"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-950/80 px-2 py-0.5 rounded">Draft Pratinjau</span>
                  <h4 className="text-sm font-extrabold uppercase tracking-tight mt-0.5">Dokumen Perjanjian Digital</h4>
                </div>
              </div>
              <button 
                onClick={() => setShowDocPreviewModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Document body (Paper layout) */}
            <div className="p-5 overflow-y-auto bg-slate-100/60 flex-1 space-y-4">
              <div className="bg-white border border-slate-200 shadow-md rounded-md p-6 sm:p-10 space-y-6 max-w-2xl mx-auto font-serif text-[11px] sm:text-xs text-slate-900 leading-relaxed">
                
                {/* Document Header */}
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-sm sm:text-base text-blue-900 uppercase tracking-wide underline">SURAT PERJANJIAN SEWA KAMAR KOST</h3>
                  <p className="font-bold font-sans text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">{docPreviewData.kosName}</p>
                  <p className="font-sans text-[8px] sm:text-[9px] text-slate-400 italic">No. Dokumen: DRAFT/INV/{new Date().getFullYear()}{String(new Date().getMonth()+1).padStart(2, '0')}/PREVIEW</p>
                </div>

                <hr className="border-slate-200" />

                {/* Section I: Parties */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider font-sans text-[10px] border-b border-slate-100 pb-1">I. IDENTITAS KEDUA BELAH PIHAK</h4>
                  
                  <div className="space-y-1 pl-1">
                    <p className="font-bold text-slate-700 italic">Pihak Pertama (Pengelola Kos):</p>
                    <div className="grid grid-cols-3 gap-1 pl-2 font-sans text-[10px] sm:text-xs">
                      <span className="text-slate-500">Nama Penanggung Jawab</span>
                      <span className="col-span-2">: {kosList.find(k => k.id === docPreviewData.kosId)?.picName || 'Manajemen Hananny Kos'}</span>
                      <span className="text-slate-500">Alamat Kantor</span>
                      <span className="col-span-2">: {kosList.find(k => k.id === docPreviewData.kosId)?.address || 'Kantor Manajemen Pusat Hananny Kos'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pl-1 pt-1">
                    <p className="font-bold text-slate-700 italic">Pihak Kedua (Penyewa Kamar):</p>
                    <div className="grid grid-cols-3 gap-1 pl-2 font-sans text-[10px] sm:text-xs">
                      <span className="text-slate-500">Nama Lengkap</span>
                      <span className="col-span-2 font-bold">: {docPreviewData.name.toUpperCase()}</span>
                      <span className="text-slate-500">No. WhatsApp / HP</span>
                      <span className="col-span-2 font-mono">: {docPreviewData.phone}</span>
                      <span className="text-slate-500">Nomor NIK KTP</span>
                      <span className="col-span-2 font-mono">: {docPreviewData.ktpNik || '-'}</span>
                      <span className="text-slate-500">Tempat, Tgl Lahir</span>
                      <span className="col-span-2">: {docPreviewData.ktpTtl || '-'}</span>
                      <span className="text-slate-500">Jenis Kelamin</span>
                      <span className="col-span-2">: {docPreviewData.jenisKelamin}</span>
                      <span className="text-slate-500">Email Korespondensi</span>
                      <span className="col-span-2 font-mono">: {docPreviewData.email}</span>
                    </div>
                  </div>
                </div>

                {/* Section II: Specifications */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider font-sans text-[10px] border-b border-slate-100 pb-1">II. SPESIFIKASI DAN KETENTUAN HUNIAN</h4>
                  <div className="grid grid-cols-3 gap-1 pl-2 font-sans text-[10px] sm:text-xs">
                    <span className="text-slate-500">Nama Cabang Unit</span>
                    <span className="col-span-2 font-bold text-slate-700">: {docPreviewData.kosName}</span>
                    <span className="text-slate-500">Nomor Kamar Sewa</span>
                    <span className="col-span-2 font-bold text-blue-600">: Kamar {docPreviewData.roomNumber}</span>
                    <span className="text-slate-500">Rencana Mulai Sewa</span>
                    <span className="col-span-2">: {docPreviewData.checkInDate}</span>
                    <span className="text-slate-500">Biaya Sewa Bulanan</span>
                    <span className="col-span-2 font-bold font-mono">: {formatIDR(rooms.find(r => r.id === docPreviewData.roomId)?.price || 1500000)} / bulan</span>
                  </div>
                </div>

                {/* Section III: General Rules */}
                <div className="space-y-2 font-sans text-[9px] sm:text-[10px] text-slate-500">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] border-b border-slate-100 pb-1 font-serif">III. TATA TERTIB & ATURAN UMUM HUNIAN</h4>
                  <ol className="list-decimal pl-4 space-y-1 leading-normal font-medium">
                    <li>Pembayaran uang sewa sewa bulanan wajib dilunasi paling lambat pada tanggal jatuh tempo / tanggal mulai sewa tiap bulannya.</li>
                    <li>Penyewa dilarang keras merusak fasilitas kamar, melakukan perombakan fisik bangunan tanpa seizin pengelola, atau membawa barang berbahaya.</li>
                    <li>Aturan jam malam tamu wajib ditaati demi keamanan, kenyamanan bersama seluruh penghuni Hananny Kos.</li>
                    <li>Sistem kunci digital passcode bersifat pribadi dan rahasia, dilarang dipindahtangankan kepada orang asing yang tidak terdaftar.</li>
                  </ol>
                </div>

                {/* Section IV: Signatures preview */}
                <div className="pt-4">
                  <p className="text-center font-medium italic text-slate-600 mb-6 font-sans text-[10px]">
                    "Kedua Belah Pihak secara sadar menyetujui seluruh ketentuan sewa di atas secara digital."
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-center font-sans text-[10px]">
                    <div className="space-y-12">
                      <p className="font-bold text-slate-500">PIHAK PERTAMA<br />(PENGELOLA KOS)</p>
                      <div className="border-b border-dashed border-slate-300 w-32 mx-auto pt-2">
                        <span className="text-[8px] text-emerald-600 font-extrabold bg-emerald-50 px-1 py-0.5 rounded">TANDATANGAN DIGITAL</span>
                      </div>
                      <p className="font-bold text-slate-700">{kosList.find(k => k.id === docPreviewData.kosId)?.picName || 'Manajemen Hananny Kos'}</p>
                    </div>

                    <div className="space-y-12">
                      <p className="font-bold text-slate-500">PIHAK KEDUA<br />(PENYEWA KAMAR)</p>
                      <div className="border-b border-dashed border-slate-300 w-32 mx-auto pt-2">
                        <span className="text-[8px] text-amber-600 font-extrabold bg-amber-50 px-1 py-0.5 rounded">SISTEM INTEGRASI</span>
                      </div>
                      <p className="font-bold text-slate-700">{docPreviewData.name.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center sm:text-left">
                * Sebelum pendaftaran disimpan, pastikan semua data di atas telah terverifikasi dengan benar.
              </span>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowDocPreviewModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
                <button
                  type="button"
                  id="btn-download-preview-pdf"
                  onClick={() => handleDownloadAgreementPDF(docPreviewData)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Draft PDF</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
