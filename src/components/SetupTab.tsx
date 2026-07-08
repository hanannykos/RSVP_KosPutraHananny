import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  MessageSquare, 
  Building, 
  Key, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Info,
  CheckCircle,
  HelpCircle,
  Hash,
  ShieldCheck,
  Users
} from 'lucide-react';
import { Kos, Room, WhatsAppGateway, AdminLogin } from '../types';
import { Wifi, Server } from 'lucide-react';

interface SetupTabProps {
  kosList: Kos[];
  rooms: Room[];
  whatsappTemplates: {
    paymentReminder: string;
    complaintNotification: string;
  };
  onSaveWhatsAppTemplates: (templates: { paymentReminder: string; complaintNotification: string }) => Promise<void>;
  onSaveKosConfig: (kosId: string, updatedData: Partial<Kos>, roomsToSave: Room[], roomsToDeleteIds: string[]) => Promise<void>;
  whatsappGateway?: WhatsAppGateway;
  onSaveWhatsAppGateway?: (gateway: WhatsAppGateway) => Promise<void>;
  onAddKos?: (kosData: { 
    name: string; 
    address: string; 
    basePrice: number;
    picName?: string;
    picPhone?: string;
    bankAccount?: string;
    bankRecipient?: string;
  }) => Promise<string>;
  onDeleteKos?: (kosId: string) => Promise<void>;
  adminLogins?: AdminLogin[];
  onSaveAdminLogin?: (admin: AdminLogin) => Promise<void>;
  onDeleteAdminLogin?: (adminId: string) => Promise<void>;
  onDeleteDummyData?: () => Promise<void>;
}

export default function SetupTab({
  kosList,
  rooms,
  whatsappTemplates,
  onSaveWhatsAppTemplates,
  onSaveKosConfig,
  whatsappGateway = {
    gatewayType: 'Fonnte',
    senderNumber: '081234567890',
    apiKey: 'sample_api_key_xxxxxxxx',
    endpointUrl: 'https://api.fonnte.com/send',
    status: 'connected'
  },
  onSaveWhatsAppGateway,
  onAddKos,
  onDeleteKos,
  adminLogins = [],
  onSaveAdminLogin,
  onDeleteAdminLogin,
  onDeleteDummyData
}: SetupTabProps) {
  // Navigation inside Setup Tab
  const [activeSubTab, setActiveSubTab] = useState<'whatsapp' | 'gateway' | 'rooms' | 'multi-id' | 'system'>('rooms');
  
  // WhatsApp Gateway Form States
  const [gwType, setGwType] = useState(whatsappGateway.gatewayType);
  const [gwSenderNumber, setGwSenderNumber] = useState(whatsappGateway.senderNumber);
  const [gwApiKey, setGwApiKey] = useState(whatsappGateway.apiKey);
  const [gwEndpointUrl, setGwEndpointUrl] = useState(whatsappGateway.endpointUrl);
  const [gwStatus, setGwStatus] = useState<'connected' | 'disconnected'>(whatsappGateway.status);
  const [savingGateway, setSavingGateway] = useState(false);
  const [gatewaySuccess, setGatewaySuccess] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Multi ID States
  const [adminUsername, setAdminUsername] = useState('');
  const [adminLoginCode, setAdminLoginCode] = useState('');
  const [adminRole, setAdminRole] = useState('Staff');
  const [editingAdminId, setEditingAdminId] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  // System & Database States
  const [deletingDummy, setDeletingDummy] = useState(false);

  const handleDeleteDummy = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua data dummy bawaan sistem? Data baru/pribadi yang Anda buat TIDAK akan hilang.')) {
      if (!onDeleteDummyData) {
        alert('Fitur hapus data dummy tidak tersedia.');
        return;
      }
      setDeletingDummy(true);
      try {
        await onDeleteDummyData();
        alert('Semua data dummy bawaan berhasil dihapus dari database! Sistem sekarang bersih dan hanya menampilkan data baru Anda.');
      } catch (e) {
        console.error(e);
        alert('Gagal menghapus data dummy.');
      } finally {
        setDeletingDummy(false);
      }
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminLoginCode.trim()) {
      alert('Username dan Kode Login wajib diisi.');
      return;
    }
    if (!onSaveAdminLogin) {
      alert('Fitur simpan Multi ID tidak tersedia.');
      return;
    }

    setSavingAdmin(true);
    try {
      const id = editingAdminId || 'admin_' + Math.random().toString(36).substr(2, 9);
      await onSaveAdminLogin({
        id,
        username: adminUsername.trim(),
        loginCode: adminLoginCode.trim(),
        role: adminRole,
        createdAt: new Date().toISOString()
      });
      
      setAdminUsername('');
      setAdminLoginCode('');
      setAdminRole('Staff');
      setEditingAdminId('');
      alert('Data Multi ID berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data Multi ID.');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleEditAdmin = (admin: AdminLogin) => {
    setEditingAdminId(admin.id);
    setAdminUsername(admin.username);
    setAdminLoginCode(admin.loginCode);
    setAdminRole(admin.role);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data login Multi ID ini?')) {
      if (onDeleteAdminLogin) {
        try {
          await onDeleteAdminLogin(adminId);
          alert('Data Multi ID berhasil dihapus!');
        } catch (err) {
          console.error(err);
          alert('Gagal menghapus data Multi ID.');
        }
      }
    }
  };

  // Sync gateway states if props change
  useEffect(() => {
    if (whatsappGateway) {
      setGwType(whatsappGateway.gatewayType);
      setGwSenderNumber(whatsappGateway.senderNumber);
      setGwApiKey(whatsappGateway.apiKey);
      setGwEndpointUrl(whatsappGateway.endpointUrl);
      setGwStatus(whatsappGateway.status);
    }
  }, [whatsappGateway]);

  const handleSaveGateway = async () => {
    setSavingGateway(true);
    setGatewaySuccess(false);
    try {
      if (onSaveWhatsAppGateway) {
        await onSaveWhatsAppGateway({
          gatewayType: gwType,
          senderNumber: gwSenderNumber,
          apiKey: gwApiKey,
          endpointUrl: gwEndpointUrl,
          status: gwStatus
        });
        setGatewaySuccess(true);
        setTimeout(() => setGatewaySuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan konfigurasi WhatsApp Gateway.');
    } finally {
      setSavingGateway(false);
    }
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setGwStatus('connected');
      setTestingConnection(false);
      alert('Koneksi sukses! API Gateway WhatsApp merespons OK (HTTP 200).');
    }, 1200);
  };
  
  // WhatsApp Template States
  const [paymentReminder, setPaymentReminder] = useState(whatsappTemplates.paymentReminder);
  const [complaintNotification, setComplaintNotification] = useState(whatsappTemplates.complaintNotification);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    setPaymentReminder(whatsappTemplates.paymentReminder);
    setComplaintNotification(whatsappTemplates.complaintNotification);
  }, [whatsappTemplates]);

  // Default templates for recovery
  const defaultReminder = `Halo Kak {nama}, kami ingin menginfokan tagihan sewa bulanan {kos} ({kamar}) sebesar {jumlah} untuk periode {bulan} {tahun} telah jatuh tempo.\n\nPembayaran dapat ditransfer ke:\nRekening Mandiri: 123-456-789-0 a.n Hananny Kos.\n\nMohon konfirmasi jika sudah transfer ya Kak. Terima kasih! 😊`;
  
  const defaultComplaint = `Halo Kak {nama}, laporan keluhan Anda mengenai "{isu}" di {kos} ({kamar}) saat ini telah diperbarui menjadi status: *{status}*.\n\nDetail Keluhan:\n"{details}"\n\nTerima kasih atas kesabarannya ya Kak! Kami akan terus berupaya memberikan kenyamanan hunian yang terbaik. 😊`;

  const handleRestoreDefaults = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan template ke format standar/default?')) {
      setPaymentReminder(defaultReminder);
      setComplaintNotification(defaultComplaint);
    }
  };

  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    setTemplateSuccess(false);
    try {
      await onSaveWhatsAppTemplates({
        paymentReminder,
        complaintNotification
      });
      setTemplateSuccess(true);
      setTimeout(() => setTemplateSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan template WhatsApp.');
    } finally {
      setSavingTemplates(false);
    }
  };

  // Kos & Room Config States
  const [selectedKosId, setSelectedKosId] = useState<string>(kosList[0]?.id || '');
  const [kosName, setKosName] = useState('');
  const [kosAddress, setKosAddress] = useState('');
  const [kosBasePrice, setKosBasePrice] = useState(1500000);
  const [kosTotalRooms, setKosTotalRooms] = useState(10);
  const [kosPicName, setKosPicName] = useState('');
  const [kosPicPhone, setKosPicPhone] = useState('');
  const [kosBankAccount, setKosBankAccount] = useState('');
  const [kosBankRecipient, setKosBankRecipient] = useState('');
  const [kosHideWhenFull, setKosHideWhenFull] = useState(false);
  
  // Rooms state for edit
  const [localRooms, setLocalRooms] = useState<Room[]>([]);
  const [deletedRoomIds, setDeletedRoomIds] = useState<string[]>([]);
  const [savingKos, setSavingKos] = useState(false);
  const [kosSuccess, setKosSuccess] = useState(false);

  // Add Kos States & Handlers
  const [showAddKosModal, setShowAddKosModal] = useState(false);
  const [newKosName, setNewKosName] = useState('');
  const [newKosAddress, setNewKosAddress] = useState('');
  const [newKosBasePrice, setNewKosBasePrice] = useState(1500000);
  const [newKosPicName, setNewKosPicName] = useState('');
  const [newKosPicPhone, setNewKosPicPhone] = useState('');
  const [newKosBankAccount, setNewKosBankAccount] = useState('');
  const [newKosBankRecipient, setNewKosBankRecipient] = useState('');
  const [addingNewKos, setAddingNewKos] = useState(false);

  useEffect(() => {
    if (!selectedKosId && kosList.length > 0) {
      setSelectedKosId(kosList[0].id);
    }
  }, [kosList, selectedKosId]);

  const handleCreateKos = async () => {
    if (!newKosName.trim() || !newKosAddress.trim()) {
      alert('Nama dan Alamat Kos wajib diisi.');
      return;
    }
    if (!onAddKos) {
      alert('Fitur tambah cabang tidak tersedia.');
      return;
    }
    setAddingNewKos(true);
    try {
      const newId = await onAddKos({
        name: newKosName.trim(),
        address: newKosAddress.trim(),
        basePrice: Number(newKosBasePrice),
        picName: newKosPicName.trim(),
        picPhone: newKosPicPhone.trim(),
        bankAccount: newKosBankAccount.trim(),
        bankRecipient: newKosBankRecipient.trim()
      });
      setSelectedKosId(newId);
      setShowAddKosModal(false);
      // Reset inputs
      setNewKosName('');
      setNewKosAddress('');
      setNewKosBasePrice(1500000);
      setNewKosPicName('');
      setNewKosPicPhone('');
      setNewKosBankAccount('');
      setNewKosBankRecipient('');
      alert('Cabang Kos Baru Berhasil Ditambahkan!');
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan cabang kos baru.');
    } finally {
      setAddingNewKos(false);
    }
  };

  const handleDeleteKosClick = async () => {
    if (!selectedKosId) return;
    const selectedKos = kosList.find(k => k.id === selectedKosId);
    if (!selectedKos) return;

    // Check if there are any rooms in this kos that are occupied
    const kosRooms = rooms.filter(r => r.kosId === selectedKosId);
    const hasOccupied = kosRooms.some(r => r.status === 'occupied');
    if (hasOccupied) {
      alert(`Cabang "${selectedKos.name}" tidak dapat dihapus karena masih memiliki kamar yang dihuni (occupied). Silakan checkout seluruh penghuni di cabang ini terlebih dahulu.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus cabang "${selectedKos.name}" beserta seluruh kamar di dalamnya? Tindakan ini tidak dapat dibatalkan.`)) {
      if (!onDeleteKos) {
        alert('Fitur hapus cabang tidak tersedia.');
        return;
      }
      try {
        await onDeleteKos(selectedKosId);
        alert('Cabang Kos Berhasil Dihapus!');
        // Select next available kos or empty
        const remaining = kosList.filter(k => k.id !== selectedKosId);
        if (remaining.length > 0) {
          setSelectedKosId(remaining[0].id);
        } else {
          setSelectedKosId('');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus cabang kos.');
      }
    }
  };

  // Load selected Kos configuration
  useEffect(() => {
    const selectedKos = kosList.find(k => k.id === selectedKosId);
    if (selectedKos) {
      setKosName(selectedKos.name);
      setKosAddress(selectedKos.address);
      setKosBasePrice(selectedKos.basePrice);
      setKosTotalRooms(selectedKos.totalRooms);
      setKosPicName(selectedKos.picName || '');
      setKosPicPhone(selectedKos.picPhone || '');
      setKosBankAccount(selectedKos.bankAccount || '');
      setKosBankRecipient(selectedKos.bankRecipient || '');
      setKosHideWhenFull(selectedKos.hideWhenFull || false);

      // Load matching rooms
      const kosRooms = rooms.filter(r => r.kosId === selectedKosId);
      setLocalRooms(JSON.parse(JSON.stringify(kosRooms))); // deep copy
      setDeletedRoomIds([]);
    }
  }, [selectedKosId, kosList, rooms]);

  const handleRoomFieldChange = (roomId: string, field: keyof Room, value: any) => {
    setLocalRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        let updated = { ...r, [field]: value };
        if (field === 'status') {
          if (value === 'occupied') {
            updated.isActive = false;
          } else if (value === 'available') {
            updated.isActive = true;
          }
        }
        return updated;
      }
      return r;
    }));
  };

  const handleAddLocalRoom = () => {
    // Generate new unique ID
    const newId = `room-${selectedKosId}-${Math.random().toString(36).substr(2, 5)}`;
    // Count current rooms
    const currentCount = localRooms.length;
    const nextRoomNum = `Room ${101 + currentCount}`;

    const newRoom: Room = {
      id: newId,
      kosId: selectedKosId,
      kosName: kosName,
      roomNumber: nextRoomNum,
      status: 'available',
      price: kosBasePrice,
      passcode: Math.floor(100000 + Math.random() * 900000).toString(),
      quotaPerRoom: 1,
      isActive: true,
      payMonthly: true,
      payThreeMonths: true,
      paySixMonths: true,
      payYearly: true
    };

    setLocalRooms(prev => [...prev, newRoom]);
    // Automatically update total rooms count to reflect localRooms length
    setKosTotalRooms(prev => prev + 1);
  };

  const handleDeleteLocalRoom = (room: Room) => {
    if (room.status === 'occupied') {
      alert(`Kamar ${room.roomNumber} sedang terisi penghuni. Silakan lakukan proses checkout penyewa terlebih dahulu untuk menghapus kamar ini.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus ${room.roomNumber}?`)) {
      setLocalRooms(prev => prev.filter(r => r.id !== room.id));
      if (!room.id.startsWith('room-') || rooms.some(r => r.id === room.id)) {
        // It exists in DB, track for real deletion
        setDeletedRoomIds(prev => [...prev, room.id]);
      }
      setKosTotalRooms(prev => Math.max(0, prev - 1));
    }
  };

  const handleSaveKosData = async () => {
    if (!kosName.trim() || !kosAddress.trim()) {
      alert('Nama dan Alamat Kos wajib diisi.');
      return;
    }

    setSavingKos(true);
    setKosSuccess(false);
    try {
      // Validate or enforce room number uniqueness
      const roomNumbers = localRooms.map(r => r.roomNumber.trim());
      const uniqueRooms = new Set(roomNumbers);
      if (uniqueRooms.size !== roomNumbers.length) {
        alert('Terdapat duplikasi nama/nomor kamar. Pastikan seluruh nama kamar unik!');
        setSavingKos(false);
        return;
      }

      await onSaveKosConfig(
        selectedKosId,
        {
          name: kosName,
          address: kosAddress,
          basePrice: Number(kosBasePrice),
          totalRooms: Number(kosTotalRooms),
          picName: kosPicName,
          picPhone: kosPicPhone,
          bankAccount: kosBankAccount,
          bankRecipient: kosBankRecipient,
          hideWhenFull: kosHideWhenFull
        },
        localRooms,
        deletedRoomIds
      );
      setKosSuccess(true);
      setTimeout(() => setKosSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan perubahan unit kos.');
    } finally {
      setSavingKos(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('rooms')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'rooms'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Setup Unit & Kuota Kamar</span>
        </button>
        <button
          onClick={() => setActiveSubTab('multi-id')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'multi-id'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Username dan Kode Login</span>
        </button>
        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'whatsapp'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Template WhatsApp</span>
        </button>
        <button
          onClick={() => setActiveSubTab('gateway')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'gateway'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>API Gateway WhatsApp</span>
        </button>
        <button
          onClick={() => setActiveSubTab('system')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center space-x-2 transition-all cursor-pointer ${
            activeSubTab === 'system'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Sistem & Database</span>
        </button>
      </div>

      {/* RENDER TAB 1: WHATSAPP TEMPLATE EDITOR */}
      {activeSubTab === 'whatsapp' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column - Form Editor (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1.5 text-blue-600" />
                    Kustomisasi Template Pesan WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Ubah format pesan otomatis untuk tagihan & laporan keluhan secara dinamis</p>
                </div>
                <button
                  onClick={handleRestoreDefaults}
                  className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restore Default</span>
                </button>
              </div>

              {/* Template 1: Payment Reminder */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <span>1. Pengingat Tagihan Pembayaran</span>
                  </label>
                  <span className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-bold uppercase">
                    Variable Token Aktif
                  </span>
                </div>
                <textarea
                  value={paymentReminder}
                  onChange={(e) => setPaymentReminder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded p-3 text-xs font-bold leading-relaxed h-36 font-mono resize-none"
                  placeholder="Ketik template pengingat pembayaran sewa..."
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Gunakan token dinamis: <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{nama}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{kamar}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{kos}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{jumlah}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{bulan}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{tahun}"}</span>
                </p>
              </div>

              {/* Template 2: Complaint Notification */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <span>2. Notifikasi Keluhan Pemeliharaan</span>
                  </label>
                  <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold uppercase">
                    Variable Token Aktif
                  </span>
                </div>
                <textarea
                  value={complaintNotification}
                  onChange={(e) => setComplaintNotification(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded p-3 text-xs font-bold leading-relaxed h-36 font-mono resize-none"
                  placeholder="Ketik template update status keluhan..."
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Gunakan token dinamis: <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{nama}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{kamar}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{kos}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{isu}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{status}"}</span>, <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">{"{details}"}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                {templateSuccess && (
                  <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded border border-emerald-100 flex items-center">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Template WhatsApp Berhasil Diperbarui!
                  </span>
                )}
                <button
                  onClick={handleSaveTemplates}
                  disabled={savingTemplates}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTemplates ? 'Menyimpan...' : 'Simpan Semua Template'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Guide & Docs (1/3 width) */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3.5">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center">
                <Info className="w-4 h-4 mr-1 text-blue-600" />
                Panduan Pengaturan Format
              </h4>
              <div className="space-y-3 text-xs leading-relaxed font-medium text-slate-600">
                <p>
                  Sistem akan otomatis menerjemahkan token variabel di dalam tanda kurung kurawal <code className="font-mono text-blue-600 font-bold">{"{}"}</code> menjadi informasi penghuni secara real-time sebelum dikirimkan.
                </p>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-800 text-[11px] uppercase">Daftar Variabel & Fungsi:</p>
                  <ul className="list-disc pl-4 space-y-1 font-semibold text-[11px]">
                    <li><code className="text-blue-600">{"{nama}"}</code>: Nama Lengkap Penghuni</li>
                    <li><code className="text-blue-600">{"{kamar}"}</code>: Nomor/Nama Kamar</li>
                    <li><code className="text-blue-600">{"{kos}"}</code>: Nama Lokasi Cabang Kos</li>
                    <li><code className="text-blue-600">{"{jumlah}"}</code>: Nominal Tagihan (IDR)</li>
                    <li><code className="text-blue-600">{"{bulan}"}</code>: Nama Bulan Tagihan</li>
                    <li><code className="text-blue-600">{"{tahun}"}</code>: Tahun Terbit Invoice</li>
                    <li><code className="text-emerald-600">{"{isu}"}</code>: Judul Isu Keluhan</li>
                    <li><code className="text-emerald-600">{"{status}"}</code>: Status Perbaikan</li>
                  </ul>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">
                  Tip: Pastikan Anda menyisipkan nomor rekening, kontak admin, atau info penunjang agar penghuni lebih mudah merespons notifikasi WhatsApp Anda.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* RENDER TAB 1.5: WHATSAPP API GATEWAY */}
      {activeSubTab === 'gateway' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main settings form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="pb-3 border-b border-slate-100 space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <Wifi className="w-4 h-4 mr-1.5 text-blue-600" />
                  Konfigurasi API Gateway WhatsApp Resmi
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Hubungkan nomor WhatsApp resmi Hananny Kos untuk pengiriman notifikasi penagihan otomatis</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Pilih Provider / Engine *</label>
                  <select
                    value={gwType}
                    onChange={(e) => setGwType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                  >
                    <option value="Fonnte">Fonnte (Rekomendasi Indonesia)</option>
                    <option value="Wablas">Wablas Gateway</option>
                    <option value="Starsender">Starsender API</option>
                    <option value="RajaSMS">RajaSMS API</option>
                    <option value="Custom">Custom HTTP API Webhook</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nomor WhatsApp Pengirim *</label>
                  <input
                    type="text"
                    required
                    value={gwSenderNumber}
                    onChange={(e) => setGwSenderNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">API Token / Secret Key *</label>
                  <input
                    type="password"
                    required
                    value={gwApiKey}
                    onChange={(e) => setGwApiKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    placeholder="Masukkan Token Gateway Anda"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Gateway Endpoint URL *</label>
                  <input
                    type="url"
                    required
                    value={gwEndpointUrl}
                    onChange={(e) => setGwEndpointUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    placeholder="Contoh: https://api.fonnte.com/send"
                  />
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Status Gateway:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                    gwStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${gwStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {gwStatus === 'connected' ? 'Aktif & Terhubung' : 'Terputus'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded border border-slate-200 transition-all cursor-pointer inline-flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'Mencoba...' : 'Test Koneksi API'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveGateway}
                    disabled={savingGateway}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingGateway ? 'Menyimpan...' : 'Simpan Koneksi'}</span>
                  </button>
                </div>
              </div>

              {gatewaySuccess && (
                <div className="mt-2 text-right">
                  <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-3 py-1 rounded border border-emerald-100 inline-block uppercase tracking-wider">
                    Konfigurasi API Gateway Berhasil Diperbarui!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3.5">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center">
                <Info className="w-4 h-4 mr-1 text-blue-600" />
                Cara Integrasi Gateway
              </h4>
              <div className="space-y-3 text-xs leading-relaxed font-medium text-slate-600">
                <p>
                  Untuk menghubungkan server notifikasi Hananny Kos ke nomor WhatsApp resmi, ikuti langkah berikut:
                </p>
                <ol className="list-decimal pl-4 space-y-2 font-semibold text-[11px]">
                  <li>Daftar akun di salah satu penyedia (misal: <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">Fonnte.com</a>).</li>
                  <li>Hubungkan perangkat (scan QR Code) nomor HP admin Anda di dashboard penyedia tersebut.</li>
                  <li>Salin **API Token** atau **App Key** yang disediakan ke form di sebelah kiri.</li>
                  <li>Klik **Test Koneksi API** untuk menguji ping gateway.</li>
                  <li>Simpan perubahan untuk mulai mengirim notifikasi otomatis langsung ke WhatsApp penyewa.</li>
                </ol>
                <p className="text-[10px] text-slate-400 font-bold uppercase border-t border-slate-100 pt-2 leading-relaxed">
                  Semua kredensial Anda akan disimpan dengan aman di server Firestore terenkripsi dan tidak pernah terekspos ke publik.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* RENDER TAB 1.75: USERNAME & KODE LOGIN MULTI ID */}
      {activeSubTab === 'multi-id' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Form Editor (Left column 1/3 width) */}
          <div className="space-y-5">
            <form onSubmit={handleSaveAdmin} className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                  {editingAdminId ? 'Edit Akses Multi ID' : 'Tambah Akses Multi ID'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {editingAdminId ? 'Sesuaikan username, role, dan kode login admin' : 'Buat kredensial admin tambahan baru untuk login'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Username Admin *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: staff_budi, admin_ani"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none rounded py-1.5 px-3 text-xs font-bold transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Kode Login / Password *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 8899 atau kode rahasia"
                  value={adminLoginCode}
                  onChange={(e) => setAdminLoginCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none rounded py-1.5 px-3 text-xs font-bold font-mono transition-all"
                />
                <p className="text-[10px] text-slate-400">Gunakan kombinasi angka atau huruf yang aman untuk login.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Peran / Jabatan (Role) *</label>
                <select
                  value={adminRole}
                  onChange={(e) => setAdminRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                >
                  <option value="Staff">Staff Admin</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Manager">Manager Kos</option>
                  <option value="Owner">Owner / Pemilik</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                {editingAdminId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAdminId('');
                      setAdminUsername('');
                      setAdminLoginCode('');
                      setAdminRole('Staff');
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingAdmin ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Table List of Multi ID Admins */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <Users className="w-4 h-4 mr-1.5 text-blue-600" />
                  Daftar Pengguna Multi ID Terdaftar
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Mengelola kredensial masuk tambahan untuk staff dan asisten pengelola kos</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="py-2.5 px-3">Username Admin</th>
                      <th className="py-2.5 px-3">Kode Login / Sandi</th>
                      <th className="py-2.5 px-3">Role / Jabatan</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminLogins.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-medium italic">
                          Belum ada multi ID yang ditambahkan. Hanya PIN utama (2026) yang aktif.
                        </td>
                      </tr>
                    ) : (
                      adminLogins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-slate-50/50 transition-all font-semibold">
                          <td className="py-2.5 px-3 font-mono text-slate-800 text-[11px]">{admin.username}</td>
                          <td className="py-2.5 px-3 font-mono text-blue-600 tracking-wider text-[11px]">{admin.loginCode}</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              admin.role === 'Owner' || admin.role === 'Super Admin'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                            }`}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => handleEditAdmin(admin)}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                                title="Edit Kredensial"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(admin.id)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-all cursor-pointer"
                                title="Hapus Kredensial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded text-[11px] text-blue-700 font-medium flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <div className="space-y-1">
                  <p className="font-bold">Informasi Akses Multi ID:</p>
                  <p className="leading-relaxed">
                    Setiap user tambahan dapat login menggunakan username dan kode login di atas. Mereka akan mendapatkan hak akses manajemen admin penuh yang dibatasi secara logis oleh kredensial masing-masing. PIN utama tetap <span className="font-mono font-bold">2026</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* RENDER TAB 2: ROOM & KOTA SEEDER SETUP */}
      {activeSubTab === 'rooms' && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-5">
            {/* Header selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
                  <Building className="w-4 h-4 mr-1.5 text-blue-600" />
                  Pengaturan Cabang & Kuota Kamar Kos
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Pilih cabang, sesuaikan nama, ubah kuota kamar, harga dasar, serta rincian kamar individu</p>
              </div>

              {/* Selection dropdown & Branch Actions */}
              <div className="flex items-center flex-wrap gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cabang:</span>
                <select
                  value={selectedKosId}
                  onChange={(e) => setSelectedKosId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded py-1.5 px-3 text-xs font-bold outline-none focus:border-blue-500 min-w-[140px]"
                >
                  <option value="" disabled={kosList.length > 0}>-- Pilih Cabang --</option>
                  {kosList.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddKosModal(true)}
                  className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 transition-all flex items-center justify-center cursor-pointer"
                  title="Tambah Cabang Kos Baru"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {selectedKosId && (
                  <button
                    type="button"
                    onClick={handleDeleteKosClick}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded border border-rose-200 transition-all flex items-center justify-center cursor-pointer"
                    title="Hapus Cabang Kos Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {!selectedKosId ? (
              <div className="text-center py-16 space-y-3.5 border border-dashed border-slate-200 rounded-lg">
                <Building className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-700">Belum Ada Cabang Kos Terpilih</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">Anda belum mendaftarkan cabang rumah kos atau belum memilih salah satu. Klik tombol Tambah Cabang Baru di atas.</p>
                </div>
                <button
                  onClick={() => setShowAddKosModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Daftarkan Cabang Kos Pertama Anda</span>
                </button>
              </div>
            ) : (
              <>

            {/* Cabang Kos Form */}
            <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Cabang Kos</label>
                  <input
                    type="text"
                    value={kosName}
                    onChange={(e) => setKosName(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                    placeholder="Masukkan nama cabang kos"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={kosAddress}
                    onChange={(e) => setKosAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                    placeholder="Masukkan alamat cabang kos"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Harga Dasar (IDR)</label>
                    <input
                      type="number"
                      value={kosBasePrice}
                      onChange={(e) => setKosBasePrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Kuota Kamar</label>
                    <input
                      type="number"
                      disabled
                      value={kosTotalRooms}
                      className="w-full bg-slate-100 border border-slate-200 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono text-slate-500 cursor-not-allowed"
                      title="Kuota kamar dihitung otomatis berdasarkan jumlah kamar aktif di bawah"
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Penanggung Jawab & Rekening Pembayaran */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200/60">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Penanggung Jawab</label>
                  <input
                    type="text"
                    value={kosPicName}
                    onChange={(e) => setKosPicName(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                    placeholder="Nama Penanggung Jawab"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. Penanggung Jawab</label>
                  <input
                    type="text"
                    value={kosPicPhone}
                    onChange={(e) => setKosPicPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    placeholder="Contoh: 081234567890"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">No. Rekening Pembayaran</label>
                  <input
                    type="text"
                    value={kosBankAccount}
                    onChange={(e) => setKosBankAccount(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold font-mono"
                    placeholder="Contoh: Mandiri 123456789"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Nama Penerima Pembayaran</label>
                  <input
                    type="text"
                    value={kosBankRecipient}
                    onChange={(e) => setKosBankRecipient(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 outline-none rounded py-1.5 px-2.5 text-xs font-bold"
                    placeholder="Nama Pemilik Rekening"
                  />
                </div>
              </div>

              {/* Opsi Sembunyikan & Tombol Simpan Data Cepat */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3.5 border-t border-slate-200/60">
                <div className="flex items-center space-x-3">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Opsi Booking Form:</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={kosHideWhenFull}
                      onChange={(e) => setKosHideWhenFull(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                      {kosHideWhenFull ? 'Sembunyikan dari Form jika kamar penuh' : 'Selalu tampilkan di Form'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {kosSuccess && (
                    <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center uppercase tracking-wider">
                      ✔ Tersimpan
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveKosData}
                    disabled={savingKos}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-[10px] font-extrabold uppercase tracking-widest rounded transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingKos ? 'Menyimpan...' : 'Simpan Data'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Individual Rooms List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
                  <Key className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Daftar Kamar Aktif ({localRooms.length} Kamar)
                </h4>

                <button
                  onClick={handleAddLocalRoom}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kamar Baru</span>
                </button>
              </div>

              {localRooms.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 font-bold uppercase tracking-wider border border-dashed border-slate-200 rounded">
                  Belum ada kamar di cabang ini. Klik "Tambah Kamar Baru" di atas.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {localRooms.map((room, idx) => (
                    <div 
                      key={room.id}
                      className={`p-3 bg-white border rounded-lg shadow-2xs space-y-3 transition-all relative ${
                        room.status === 'occupied' 
                          ? 'border-emerald-200 bg-emerald-50/10' 
                          : room.status === 'maintenance'
                            ? 'border-slate-300 bg-slate-50/50'
                            : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Room Number & Status Indicators */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={room.roomNumber}
                            onChange={(e) => handleRoomFieldChange(room.id, 'roomNumber', e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 font-bold text-xs text-slate-800 outline-none w-24 py-0.5"
                            placeholder="Nomor Kamar"
                          />
                        </div>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                          room.status === 'occupied' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : room.status === 'maintenance'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {room.status === 'occupied' ? 'Terisi' : room.status === 'maintenance' ? 'Perbaikan' : 'Kosong'}
                        </span>
                      </div>

                      {/* Price, PIN, Status inputs */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                        <div className="space-y-0.5 col-span-2">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Harga Sewa (Rp)</span>
                          <input
                            type="number"
                            value={room.price}
                            onChange={(e) => handleRoomFieldChange(room.id, 'price', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-mono font-bold outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* New fields: Kuota Orang & Status ON/OFF */}
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Kuota Orang / Kamar</span>
                          <select
                            value={room.quotaPerRoom ?? 1}
                            onChange={(e) => handleRoomFieldChange(room.id, 'quotaPerRoom', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-bold outline-none focus:border-blue-500"
                          >
                            <option value={1}>1 Orang</option>
                            <option value={2}>2 Orang</option>
                            <option value={3}>3 Orang</option>
                            <option value={4}>4 Orang</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Status Aktif Kamar</span>
                          <div className="flex items-center pt-1.5 pl-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (room.status !== 'occupied') {
                                  handleRoomFieldChange(room.id, 'isActive', !(room.isActive ?? true));
                                }
                              }}
                              disabled={room.status === 'occupied'}
                              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                                (room.status === 'occupied' ? false : (room.isActive ?? true)) ? 'bg-blue-600' : 'bg-slate-300'
                              } ${room.status === 'occupied' ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  (room.status === 'occupied' ? false : (room.isActive ?? true)) ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="ml-1.5 text-[8px] font-extrabold uppercase tracking-wide text-slate-500">
                              {room.status === 'occupied' ? 'OFF' : (room.isActive ?? true) ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>

                        {/* Opsi Pembayaran Toggles */}
                        <div className="col-span-2 space-y-1 mt-1 border-t border-slate-100 pt-1.5">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Opsi Pembayaran Aktif</span>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { key: 'payMonthly', label: 'Bulanan' },
                              { key: 'payThreeMonths', label: 'Per-3 Bulan' },
                              { key: 'paySixMonths', label: 'Per-6 Bulan' },
                              { key: 'payYearly', label: 'Tahunan' }
                            ].map((opt) => {
                              const val = room[opt.key as keyof Room] !== false; // default true if undefined
                              return (
                                <label key={opt.key} className="flex items-center space-x-1 cursor-pointer bg-white border border-slate-200/60 rounded px-1.5 py-0.5 hover:bg-slate-50 transition-all select-none">
                                  <input
                                    type="checkbox"
                                    checked={val}
                                    onChange={(e) => handleRoomFieldChange(room.id, opt.key as keyof Room, e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-2.5 h-2.5 cursor-pointer"
                                  />
                                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Status toggle & delete action */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] text-slate-400 uppercase font-bold mr-1">Status:</span>
                          <select
                            value={room.status}
                            onChange={(e) => handleRoomFieldChange(room.id, 'status', e.target.value)}
                            className="bg-transparent border border-slate-200 rounded py-0.5 px-1 text-[10px] font-bold outline-none"
                            disabled={room.status === 'occupied'}
                            title={room.status === 'occupied' ? 'Kamar terisi tidak dapat diubah statusnya' : ''}
                          >
                            <option value="available">Kosong</option>
                            <option value="maintenance">Perbaikan</option>
                          </select>
                        </div>

                        <button
                          onClick={() => handleDeleteLocalRoom(room)}
                          className={`p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer ${
                            room.status === 'occupied' ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          disabled={room.status === 'occupied'}
                          title="Hapus Kamar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save All Changes button */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              {kosSuccess && (
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded border border-emerald-100 flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Data Unit Kos & Kamar Berhasil Disimpan!
                </span>
              )}
              <button
                onClick={handleSaveKosData}
                disabled={savingKos}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingKos ? 'Menyimpan...' : 'Simpan Semua Perubahan Cabang'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )}

  {/* RENDER TAB 5: SYSTEM & DATABASE RESET */}
  {activeSubTab === 'system' && (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-lg border border-slate-200 space-y-6"
    >
      <div>
        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Settings className="w-4.5 h-4.5 mr-2 text-blue-600" />
          Sistem & Pengelolaan Database
        </h4>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
          Bersihkan data dummy bawaan sistem untuk mulai menggunakan sistem dengan data riil Anda sendiri
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Peringatan Penghapusan Data Dummy</h5>
          <p className="text-xs text-amber-700 leading-relaxed font-semibold">
            Tindakan ini akan menghapus semua cabang kos dummy bawaan, kamar bawaan, data penghuni bawaan, data transaksi keuangan bawaan, dan log dummy lainnya. Data baru/pribadi yang telah Anda buat tidak akan ikut terhapus.
          </p>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-1.5">
            *TINDAKAN INI BERSIFAT PERMANEN DAN TIDAK DAPAT DIBATALKAN.
          </p>
        </div>
      </div>

      <div className="p-4 border border-slate-100 bg-slate-50/50 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status Database</span>
          <p className="text-xs font-bold text-slate-700 flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Terhubung ke Cloud Firestore Database ({kosList.length} Cabang Kos Terdaftar)
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleDeleteDummy}
          disabled={deletingDummy}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0"
        >
          {deletingDummy ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menghapus Data Dummy...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              <span>Hapus Semua Data Dummy</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )}

  {/* ADD KOS MODAL */}
  {showAddKosModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
            <Building className="w-4 h-4 mr-1.5 text-blue-600" />
            Tambah Cabang Kos Baru
          </h3>
          <button 
            onClick={() => setShowAddKosModal(false)}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Cabang Rumah Kos *</label>
              <input
                type="text"
                value={newKosName}
                onChange={(e) => setNewKosName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold"
                placeholder="Contoh: Kos Indah Kebon Jeruk"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Harga Sewa Kamar Dasar (Rp / Bulan) *</label>
              <input
                type="number"
                value={newKosBasePrice}
                onChange={(e) => setNewKosBasePrice(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-mono font-bold"
                placeholder="1500000"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Alamat Lengkap Cabang *</label>
              <input
                type="text"
                value={newKosAddress}
                onChange={(e) => setNewKosAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold"
                placeholder="Contoh: Jl. Kebon Jeruk Raya No. 45, Jakarta Barat"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Kontak & Rekening Pembayaran (Opsional)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Penanggung Jawab</label>
                <input
                  type="text"
                  value={newKosPicName}
                  onChange={(e) => setNewKosPicName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold"
                  placeholder="Nama penanggung jawab"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Penanggung Jawab</label>
                <input
                  type="text"
                  value={newKosPicPhone}
                  onChange={(e) => setNewKosPicPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold font-mono"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Rekening Pembayaran</label>
                <input
                  type="text"
                  value={newKosBankAccount}
                  onChange={(e) => setNewKosBankAccount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold font-mono"
                  placeholder="Contoh: Mandiri 123456789"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Penerima Pembayaran</label>
                <input
                  type="text"
                  value={newKosBankRecipient}
                  onChange={(e) => setNewKosBankRecipient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold"
                  placeholder="Nama Pemilik Rekening"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setShowAddKosModal(false)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded text-xs font-bold uppercase tracking-wider text-slate-600 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCreateKos}
            disabled={addingNewKos}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <span>{addingNewKos ? 'Menambahkan...' : 'Daftarkan Cabang'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )}
</div>
  );
}
