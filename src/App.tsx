import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc 
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { checkAndSeedDB, DEFAULT_KOS, deleteDummyData } from './lib/seed';
import { Kos, Room, Tenant, Reservation, Payment, Complaint, DoorLockLog, WhatsAppGateway, AdminLogin, FinancialTransaction } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-error';


import { motion } from 'motion/react';

// Tab Components
import OverviewTab from './components/OverviewTab';
import RoomsTab from './components/RoomsTab';
import TenantsTab from './components/TenantsTab';
import ReservationsTab from './components/ReservationsTab';
import PaymentsTab from './components/PaymentsTab';
import ComplaintsTab from './components/ComplaintsTab';
import CloudSyncTab from './components/CloudSyncTab';
import PublicPortal from './components/PublicPortal';
import SetupTab from './components/SetupTab';
import CalendarTab from './components/CalendarTab';
import FinancialTab from './components/FinancialTab';

// Icons
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Wrench, 
  Cloud, 
  Home, 
  Lock, 
  Menu, 
  X,
  User,
  Clock,
  RefreshCw,
  LogOut,
  Settings,
  Calendar,
  Wallet
} from 'lucide-react';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'public' | 'admin'>(() => {
    return sessionStorage.getItem('adminUnlocked') === 'true' ? 'admin' : 'public';
  });
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<'pin' | 'multi'>('pin');
  const [multiUsername, setMultiUsername] = useState<string>('');
  const [multiLoginCode, setMultiLoginCode] = useState<string>('');

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Database States
  const [kosList, setKosList] = useState<Kos[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [doorLogs, setDoorLogs] = useState<DoorLockLog[]>([]);
  const [adminLogins, setAdminLogins] = useState<AdminLogin[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<{
    paymentReminder: string;
    complaintNotification: string;
  }>({
    paymentReminder: `Halo Kak {nama}, kami ingin menginfokan tagihan sewa bulanan {kos} ({kamar}) sebesar {jumlah} untuk periode {bulan} {tahun} telah jatuh tempo.\n\nPembayaran dapat ditransfer ke:\nRekening Mandiri: 123-456-789-0 a.n Hananny Kos.\n\nMohon konfirmasi jika sudah transfer ya Kak. Terima kasih! 😊`,
    complaintNotification: `Halo Kak {nama}, laporan keluhan Anda mengenai "{isu}" di {kos} ({kamar}) saat ini telah diperbarui menjadi status: *{status}*.\n\nDetail Keluhan:\n"{details}"\n\nTerima kasih atas kesabarannya ya Kak! Kami akan terus berupaya memberikan kenyamanan hunian yang terbaik. 😊`
  });

  const [whatsappGateway, setWhatsappGateway] = useState<WhatsAppGateway>({
    gatewayType: 'Fonnte',
    senderNumber: '081234567890',
    apiKey: 'sample_api_key_xxxxxxxx',
    endpointUrl: 'https://api.fonnte.com/send',
    status: 'connected'
  });

  // Seed and Listen to Database
  useEffect(() => {
    async function init() {
      // 1. Seed database if empty
      await checkAndSeedDB();

      // 2. Load and listen real-time to firestore collections
      const unsubTemplates = onSnapshot(doc(db, 'settings', 'whatsapp'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWhatsappTemplates({
            paymentReminder: data.paymentReminder || `Halo Kak {nama}, kami ingin menginfokan tagihan sewa bulanan {kos} ({kamar}) sebesar {jumlah} untuk periode {bulan} {tahun} telah jatuh tempo.\n\nPembayaran dapat ditransfer ke:\nRekening Mandiri: 123-456-789-0 a.n Hananny Kos.\n\nMohon konfirmasi jika sudah transfer ya Kak. Terima kasih! 😊`,
            complaintNotification: data.complaintNotification || `Halo Kak {nama}, laporan keluhan Anda mengenai "{isu}" di {kos} ({kamar}) saat ini telah diperbarui menjadi status: *{status}*.\n\nDetail Keluhan:\n"{details}"\n\nTerima kasih atas kesabarannya ya Kak! Kami akan terus berupaya memberikan kenyamanan hunian yang terbaik. 😊`
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/whatsapp');
      });

      const unsubGateway = onSnapshot(doc(db, 'settings', 'whatsapp_gateway'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWhatsappGateway({
            gatewayType: data.gatewayType || 'Fonnte',
            senderNumber: data.senderNumber || '081234567890',
            apiKey: data.apiKey || 'sample_api_key_xxxxxxxx',
            endpointUrl: data.endpointUrl || 'https://api.fonnte.com/send',
            status: data.status || 'connected'
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/whatsapp_gateway');
      });

      const unsubKos = onSnapshot(collection(db, 'kos'), (snap) => {
        const list: Kos[] = [];
        snap.forEach(d => list.push(d.data() as Kos));
        setKosList(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'kos');
      });

      const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
        const list: Room[] = [];
        snap.forEach(d => list.push(d.data() as Room));
        // Sort rooms by roomNumber
        list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        setRooms(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'rooms');
      });

      const unsubTenants = onSnapshot(collection(db, 'tenants'), (snap) => {
        const list: Tenant[] = [];
        snap.forEach(d => list.push(d.data() as Tenant));
        setTenants(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tenants');
      });

      const unsubReservations = onSnapshot(collection(db, 'reservations'), (snap) => {
        const list: Reservation[] = [];
        snap.forEach(d => list.push(d.data() as Reservation));
        setReservations(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reservations');
      });

      const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
        const list: Payment[] = [];
        snap.forEach(d => list.push(d.data() as Payment));
        setPayments(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
      });

      const unsubComplaints = onSnapshot(collection(db, 'complaints'), (snap) => {
        const list: Complaint[] = [];
        snap.forEach(d => list.push(d.data() as Complaint));
        // Sort by date newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setComplaints(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'complaints');
      });

      const unsubDoorLogs = onSnapshot(collection(db, 'doorLockLogs'), (snap) => {
        const list: DoorLockLog[] = [];
        snap.forEach(d => list.push(d.data() as DoorLockLog));
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setDoorLogs(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'doorLockLogs');
      });

      const unsubAdminLogins = onSnapshot(collection(db, 'adminLogins'), (snap) => {
        const list: AdminLogin[] = [];
        snap.forEach(d => list.push(d.data() as AdminLogin));
        list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setAdminLogins(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'adminLogins');
      });

      const unsubFinancials = onSnapshot(collection(db, 'financials'), (snap) => {
        const list: FinancialTransaction[] = [];
        snap.forEach(d => list.push(d.data() as FinancialTransaction));
        // Sort by date newest first as standard
        list.sort((a, b) => b.date.localeCompare(a.date));
        setFinancials(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'financials');
      });

      // 3. Load initial WhatsApp logs from backend
      fetchWhatsappLogs();

      setLoading(false);
    }

    init();
  }, []);

  const fetchWhatsappLogs = async () => {
    try {
      const res = await fetch('/api/whatsapp-logs');
      const data = await res.json();
      if (data.success) {
        setWhatsappLogs(data.logs);
      }
    } catch (e) {
      console.error('Error fetching WhatsApp logs:', e);
    }
  };

  // HANDLER: Update Room Price or Status
  const handleUpdateRoom = async (roomId: string, updates: Partial<Room>) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, updates);
    } catch (err) {
      console.error('Failed to update room:', err);
    }
  };

  // HANDLER: Save WhatsApp Templates to Firestore
  const handleSaveWhatsAppTemplates = async (templates: { paymentReminder: string; complaintNotification: string }) => {
    try {
      const docRef = doc(db, 'settings', 'whatsapp');
      await setDoc(docRef, templates);
      setWhatsappTemplates(templates);
    } catch (err) {
      console.error('Failed to save WhatsApp templates:', err);
      throw err;
    }
  };

  // HANDLER: Save WhatsApp API Gateway Configuration to Firestore
  const handleSaveWhatsAppGateway = async (gatewayData: WhatsAppGateway) => {
    try {
      const docRef = doc(db, 'settings', 'whatsapp_gateway');
      await setDoc(docRef, gatewayData);
      setWhatsappGateway(gatewayData);
    } catch (err) {
      console.error('Failed to save WhatsApp API Gateway:', err);
      throw err;
    }
  };

  // HANDLER: Save/Add Admin Login for Multi ID
  const handleSaveAdminLogin = async (admin: AdminLogin) => {
    try {
      const docRef = doc(db, 'adminLogins', admin.id);
      await setDoc(docRef, admin);
    } catch (err) {
      console.error('Failed to save admin login:', err);
      throw err;
    }
  };

  // HANDLER: Delete Admin Login
  const handleDeleteAdminLogin = async (adminId: string) => {
    try {
      const docRef = doc(db, 'adminLogins', adminId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Failed to delete admin login:', err);
      throw err;
    }
  };

  // HANDLER: Save Kos Branch Unit & Rooms Configuration
  const handleSaveKosConfig = async (
    kosId: string, 
    updatedData: Partial<Kos>, 
    roomsToSave: Room[], 
    roomsToDeleteIds: string[]
  ) => {
    try {
      // 1. Update Kos document
      const kosRef = doc(db, 'kos', kosId);
      await updateDoc(kosRef, updatedData);

      // 2. Save/Update individual rooms
      for (const r of roomsToSave) {
        const updatedRoom = {
          ...r,
          kosName: updatedData.name || r.kosName
        };
        const roomRef = doc(db, 'rooms', r.id);
        await setDoc(roomRef, updatedRoom);
      }

      // 3. Delete requested rooms
      for (const id of roomsToDeleteIds) {
        const roomRef = doc(db, 'rooms', id);
        await deleteDoc(roomRef);
      }
    } catch (err) {
      console.error('Failed to save Kos configuration:', err);
      throw err;
    }
  };

  // HANDLER: Add new Kos Branch
  const handleAddKos = async (kosData: { 
    name: string; 
    address: string; 
    basePrice: number;
    picName?: string;
    picPhone?: string;
    bankAccount?: string;
    bankRecipient?: string;
  }) => {
    try {
      const newId = 'kos_' + Math.random().toString(36).substring(2, 11);
      const docRef = doc(db, 'kos', newId);
      const newKos: Kos = {
        id: newId,
        name: kosData.name,
        address: kosData.address,
        basePrice: kosData.basePrice,
        totalRooms: 0,
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80',
        picName: kosData.picName || '',
        picPhone: kosData.picPhone || '',
        bankAccount: kosData.bankAccount || '',
        bankRecipient: kosData.bankRecipient || ''
      };
      await setDoc(docRef, newKos);
      return newId;
    } catch (err) {
      console.error('Failed to add Kos branch:', err);
      throw err;
    }
  };

  // HANDLER: Delete Kos Branch and its rooms
  const handleDeleteKos = async (kosId: string) => {
    try {
      // 1. Delete Kos document
      await deleteDoc(doc(db, 'kos', kosId));
      
      // 2. Delete all rooms associated
      const roomsToDelete = rooms.filter(r => r.kosId === kosId);
      for (const r of roomsToDelete) {
        await deleteDoc(doc(db, 'rooms', r.id));
      }
    } catch (err) {
      console.error('Failed to delete Kos branch:', err);
      throw err;
    }
  };

  // HANDLER: Send Custom WhatsApp Complaint Notification
  const handleSendWhatsAppComplaint = async (complaint: Complaint, customMsg: string) => {
    try {
      const tenant = tenants.find(t => t.name === complaint.tenantName || t.id === complaint.tenantId);
      const phone = tenant ? tenant.phone : '081234567890';
      const body = {
        phone,
        message: customMsg,
        tenantName: complaint.tenantName,
        roomNumber: complaint.roomNumber,
        type: 'complaint'
      };

      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        fetchWhatsappLogs();
      }
    } catch (err) {
      console.error('Failed to send WhatsApp complaint notification:', err);
    }
  };

  // HANDLER: Register Tenant
  const handleAddTenant = async (tenantData: Omit<Tenant, 'id'>) => {
    try {
      const tenantId = 'tenant_' + Math.random().toString(36).substr(2, 9);
      const newTenant: Tenant = {
        id: tenantId,
        ...tenantData
      };

      // 1. Save Tenant
      await setDoc(doc(db, 'tenants', tenantId), newTenant);

      // 2. Update Room Status & Current Occupant
      if (tenantData.roomId && tenantData.roomId !== 'Lainnya') {
        const roomRef = doc(db, 'rooms', tenantData.roomId);
        await updateDoc(roomRef, {
          status: 'occupied',
          currentTenantId: tenantId,
          isActive: false
        }).catch(err => console.warn('Room update skipped (custom room):', err));
      }

      // 3. Generate initial Juli 2026 payment invoice
      const paymentId = `payment-${tenantId}-jul`;
      const selectedRoom = rooms.find(r => r.id === tenantData.roomId);
      const invoice: Payment = {
        id: paymentId,
        tenantId,
        tenantName: tenantData.name,
        kosId: tenantData.kosId,
        kosName: tenantData.kosName,
        roomId: tenantData.roomId,
        roomNumber: tenantData.roomNumber,
        amount: selectedRoom ? selectedRoom.price : 1500000,
        month: 'Juli',
        year: 2026,
        status: 'pending',
        invoiceNumber: `INV/202607/${tenantId}`
      };
      await setDoc(doc(db, 'payments', paymentId), invoice);

      // 4. Record Door Access log (access granted on register)
      const doorLogId = `doorlog_${tenantId}_init`;
      const doorLog: DoorLockLog = {
        id: doorLogId,
        tenantName: tenantData.name,
        kosName: tenantData.kosName,
        roomNumber: tenantData.roomNumber,
        timestamp: new Date().toISOString(),
        action: 'unlock',
        method: 'passcode'
      };
      await setDoc(doc(db, 'doorLockLogs', doorLogId), doorLog);

      // 5. Send automated welcome message
      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: tenantData.phone,
          message: `Selamat Datang Kak ${tenantData.name}! Registrasi sewa kamar ${tenantData.roomNumber} di ${tenantData.kosName} berhasil. Silakan ambil kunci fisik kamar Anda di kantor pengelola. Selamat beristirahat!`,
          tenantName: tenantData.name,
          roomNumber: tenantData.roomNumber,
          type: 'custom'
        })
      });
      fetchWhatsappLogs();

    } catch (err) {
      console.error('Failed to register tenant:', err);
    }
  };

  // HANDLER: Remove Tenant Data entirely
  const handleRemoveTenant = async (tenantId: string) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return;

      // 1. Delete tenant doc
      await deleteDoc(doc(db, 'tenants', tenantId));

      // 2. Restore room status to available
      if (tenant.roomId && tenant.roomId !== 'Lainnya') {
        const roomRef = doc(db, 'rooms', tenant.roomId);
        await updateDoc(roomRef, {
          status: 'available',
          currentTenantId: null,
          isActive: true
        }).catch(err => console.warn('Room update skipped (custom room):', err));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Update Tenant Data
  const handleUpdateTenant = async (tenantId: string, updatedData: Partial<Tenant>) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId), updatedData);
    } catch (err) {
      console.error('Error updating tenant:', err);
    }
  };

  // HANDLER: Checkout/Sign-out Tenant (with refund & documentation documentation)
  const handleCheckoutTenant = async (tenantId: string, checkoutData: { checkOutDate: string; checkoutNotes: string; checkoutRefund: number }) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      if (!tenant) return;

      // 1. Update Tenant doc as Archived/Checked out
      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, {
        isCheckedOut: true,
        checkOutDate: checkoutData.checkOutDate,
        checkoutNotes: checkoutData.checkoutNotes,
        checkoutRefund: checkoutData.checkoutRefund
      });

      // 2. Restore Room to available
      if (tenant.roomId && tenant.roomId !== 'Lainnya') {
        const roomRef = doc(db, 'rooms', tenant.roomId);
        await updateDoc(roomRef, {
          status: 'available',
          currentTenantId: null,
          isActive: true
        }).catch(err => console.warn('Room update skipped (custom room):', err));
      }

      // 3. Create Door access revocation log
      const doorLogId = `doorlog_${tenantId}_revoked`;
      const doorLog: DoorLockLog = {
        id: doorLogId,
        tenantName: tenant.name,
        kosName: tenant.kosName,
        roomNumber: tenant.roomNumber,
        timestamp: new Date().toISOString(),
        action: 'lock',
        method: 'remote_admin'
      };
      await setDoc(doc(db, 'doorLockLogs', doorLogId), doorLog);

      // 4. Send departure WhatsApp
      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: tenant.phone,
          message: `Halo Kak ${tenant.name}, Berita Acara Serah Terima kamar ${tenant.roomNumber} di ${tenant.kosName} telah disetujui. Deposit sebesar Rp ${checkoutData.checkoutRefund.toLocaleString('id-ID')} telah diproses untuk dikembalikan. 

Terima kasih atas kepercayaan Kakak tinggal bersama kami! 😊`,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          type: 'custom'
        })
      });
      fetchWhatsappLogs();

    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Create Reservation
  const handleAddReservation = async (resData: Omit<Reservation, 'id'>) => {
    try {
      const resId = 'res_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'reservations', resId), {
        id: resId,
        ...resData
      });
    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Approve Reservation (Only set status to approved)
  const handleApproveReservation = async (resId: string) => {
    try {
      await updateDoc(doc(db, 'reservations', resId), { status: 'approved' });
    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Move Reservation to Tenant List (Check-In)
  const handleMoveToTenants = async (resId: string) => {
    try {
      const res = reservations.find(r => r.id === resId);
      if (!res) return;

      const selectedRoom = rooms.find(r => r.id === res.roomId);
      const initialPasscode = selectedRoom ? selectedRoom.passcode : '123456';
      
      await handleAddTenant({
        name: res.name,
        phone: res.phone,
        email: res.email,
        ktpNik: res.ktpDetails?.nik || 'Belum Terdata',
        ktpAlamat: res.ktpDetails?.alamat || 'Belum Terdata',
        ktpTtl: res.ktpDetails?.ttl || 'Belum Terdata',
        jenisKelamin: res.jenisKelamin,
        kosId: res.kosId,
        kosName: res.kosName,
        roomId: res.roomId,
        roomNumber: res.roomNumber,
        checkInDate: res.checkInDate,
        isCheckedOut: false,
        passcode: initialPasscode,
        pekerjaan: res.pekerjaan || '',
        pekerjaanDetail: res.pekerjaanDetail || '',
        statusPerkawinan: res.statusPerkawinan || '',
        statusPerkawinanDetail: res.statusPerkawinanDetail || '',
        guarantorName: res.guarantorName || '',
        guarantorPhone: res.guarantorPhone || '',
        guarantorRelationship: res.guarantorRelationship || '',
        guarantorRelationshipDetail: res.guarantorRelationshipDetail || '',
        signatureUrl: res.signatureUrl || '',
        ktpPhotoUrl: res.ktpPhotoUrl || '',
        idCardPhotoUrl: res.idCardUrl || ''
      });

      // Update status to 'moved' to mark it as checked in
      await updateDoc(doc(db, 'reservations', resId), { status: 'moved' });

    } catch (err) {
      console.error('Failed to move reservation to tenants:', err);
    }
  };

  // HANDLER: Reject Reservation
  const handleRejectReservation = async (resId: string) => {
    try {
      await updateDoc(doc(db, 'reservations', resId), { status: 'rejected' });
    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Delete Reservation
  const handleDeleteReservation = async (resId: string) => {
    try {
      await deleteDoc(doc(db, 'reservations', resId));
    } catch (err) {
      console.error('Failed to delete reservation:', err);
    }
  };

  // HANDLER: Delete All Dummy Data
  const handleDeleteDummyData = async () => {
    try {
      await deleteDummyData();
    } catch (err) {
      console.error('Failed to delete dummy data:', err);
      throw err;
    }
  };

  // HANDLER: Mark Payment Paid
  const handleMarkPaid = async (paymentId: string) => {
    try {
      const pRef = doc(db, 'payments', paymentId);
      await updateDoc(pRef, {
        status: 'paid',
        paidAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Update Payment Details (Edit, Proof of Transfer, etc)
  const handleUpdatePayment = async (paymentId: string, updatedData: Partial<Payment>) => {
    try {
      const pRef = doc(db, 'payments', paymentId);
      await updateDoc(pRef, updatedData);
    } catch (err) {
      console.error('Failed to update payment:', err);
      throw err;
    }
  };

  // HANDLER: Delete Payment
  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
    } catch (err) {
      console.error('Failed to delete payment:', err);
      throw err;
    }
  };

  // HANDLER: Send Simulated WhatsApp payment reminder
  const handleSendWhatsAppReminder = async (pay: Payment, customMsg?: string) => {
    try {
      const tenant = tenants.find(t => t.id === pay.tenantId);
      const phoneNum = tenant ? tenant.phone : '081234567890';
      
      const defaultMsg = `Halo Kak ${pay.tenantName}, ini pengingat pembayaran sewa kamar ${pay.roomNumber} di ${pay.kosName} sebesar Rp ${pay.amount.toLocaleString('id-ID')} untuk periode ${pay.month} ${pay.year}. Terima kasih!`;
      
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNum,
          message: customMsg || defaultMsg,
          tenantName: pay.tenantName,
          roomNumber: pay.roomNumber,
          type: 'reminder'
        })
      });

      const resData = await response.json();
      if (resData.success) {
        // Update payment remind status
        await updateDoc(doc(db, 'payments', pay.id), { reminderSent: true });
        fetchWhatsappLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // HANDLER: Add Complaint
  const handleAddComplaint = async (compData: Omit<Complaint, 'id' | 'createdAt'>) => {
    try {
      const compId = 'comp_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'complaints', compId), {
        id: compId,
        createdAt: new Date().toISOString(),
        ...compData
      });
    } catch (e) {
      console.error(e);
    }
  };

  // HANDLER: Update Complaint Status
  const handleUpdateComplaintStatus = async (compId: string, status: 'pending' | 'in_progress' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'complaints', compId), { status });
    } catch (e) {
      console.error(e);
    }
  };

  // HANDLER: Delete Complaint
  const handleDeleteComplaint = async (compId: string) => {
    try {
      await deleteDoc(doc(db, 'complaints', compId));
    } catch (e) {
      console.error('Failed to delete complaint:', e);
      throw e;
    }
  };

  // HANDLER: Add Financial Transaction
  const handleAddTransaction = async (data: Omit<FinancialTransaction, 'id' | 'createdAt'>) => {
    try {
      const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'financials', txId), {
        id: txId,
        createdAt: new Date().toISOString(),
        ...data
      });
    } catch (e) {
      console.error('Failed to add transaction:', e);
    }
  };

  // HANDLER: Update Financial Transaction
  const handleUpdateTransaction = async (id: string, data: Partial<FinancialTransaction>) => {
    try {
      await updateDoc(doc(db, 'financials', id), data);
    } catch (e) {
      console.error('Failed to update transaction:', e);
    }
  };

  // HANDLER: Delete Financial Transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'financials', id));
    } catch (e) {
      console.error('Failed to delete transaction:', e);
    }
  };

  // HANDLER: Import Paid Rent Payments as Incomes
  const handleImportPaidPayments = async (): Promise<number> => {
    let count = 0;
    try {
      const paidPayments = payments.filter(p => p.status === 'paid');
      for (const pay of paidPayments) {
        // Look if we already have a financial transaction for this payment/invoice
        const alreadyExists = financials.some(tx => 
          tx.description.includes(pay.invoiceNumber) || 
          (tx.category === 'Sewa Kamar' && tx.description.includes(pay.tenantName) && tx.amount === pay.amount && tx.date === (pay.paidAt ? pay.paidAt.split('T')[0] : ''))
        );
        if (!alreadyExists) {
          const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
          const payDate = pay.paidAt ? pay.paidAt.split('T')[0] : new Date().toISOString().split('T')[0];
          await setDoc(doc(db, 'financials', txId), {
            id: txId,
            type: 'income',
            amount: pay.amount,
            date: payDate,
            category: 'Sewa Kamar',
            description: `Pembayaran sewa kamar ${pay.roomNumber} oleh ${pay.tenantName} (${pay.month} ${pay.year}) - No. Invoice: ${pay.invoiceNumber}`,
            kosId: pay.kosId,
            kosName: pay.kosName,
            createdAt: new Date().toISOString()
          });
          count++;
        }
      }
    } catch (e) {
      console.error('Failed to import paid payments:', e);
    }
    return count;
  };

  const handlePinPress = (digit: string) => {
    if (pinError) return;
    setPinInput((prev) => {
      const newPin = prev + digit;
      if (newPin.length <= 4) {
        if (newPin.length === 4) {
          if (newPin === '2026') {
            sessionStorage.setItem('adminUnlocked', 'true');
            setCurrentMode('admin');
            setActiveTab('overview');
            setShowPinModal(false);
            return '';
          } else {
            setPinError(true);
            setTimeout(() => {
              setPinInput('');
              setPinError(false);
            }, 1000);
          }
        }
        return newPin;
      }
      return prev;
    });
  };

  const handlePinBackspace = () => {
    if (pinError) return;
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleMultiLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!multiUsername.trim() || !multiLoginCode.trim()) {
      alert('Mohon isi username dan kode login.');
      return;
    }

    const matched = adminLogins.find(
      (admin) =>
        admin.username.toLowerCase() === multiUsername.trim().toLowerCase() &&
        admin.loginCode === multiLoginCode.trim()
    );

    if (matched) {
      sessionStorage.setItem('adminUnlocked', 'true');
      sessionStorage.setItem('adminUser', matched.username);
      sessionStorage.setItem('adminRole', matched.role);
      setCurrentMode('admin');
      setActiveTab('overview');
      setShowPinModal(false);
      setMultiUsername('');
      setMultiLoginCode('');
      setPinError(false);
    } else {
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
      }, 1500);
    }
  };

  // Listen to keyboard for PIN entry when modal is open
  useEffect(() => {
    if (!showPinModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (loginMode !== 'pin') return;
      if (pinError) return;
      if (e.key >= '0' && e.key <= '9') {
        handlePinPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        setShowPinModal(false);
        setPinInput('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPinModal, pinError, loginMode]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500">Menghubungkan ke Cloud Firestore...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard },
    { id: 'reservations', name: 'Reservasi Penyewa', icon: CalendarCheck },
    { id: 'rooms', name: 'Daftar Kamar', icon: Building2 },
    { id: 'tenants', name: 'Data Penghuni', icon: Users },
    { id: 'calendar', name: 'Kalender Penagihan', icon: Calendar },
    { id: 'payments', name: 'Keuangan & Tagihan', icon: CreditCard },
    { id: 'financials', name: 'Laporan Keuangan', icon: Wallet },
    { id: 'complaints', name: 'Laporan Keluhan', icon: Wrench },
    { id: 'cloud-sync', name: 'Multi-Device API', icon: Cloud },
    { id: 'setup', name: 'Setup & WA Template', icon: Settings },
  ];

  const navGroups = [
    {
      groupName: 'Bookings',
      items: [
        { id: 'reservations', name: 'Reservasi Penyewa', icon: CalendarCheck }
      ]
    },
    {
      groupName: 'Database',
      items: [
        { id: 'rooms', name: 'Daftar Kamar', icon: Building2 },
        { id: 'tenants', name: 'Data Penghuni', icon: Users }
      ]
    },
    {
      groupName: 'Report',
      items: [
        { id: 'calendar', name: 'Kalender Penagihan', icon: Calendar },
        { id: 'payments', name: 'Keuangan & Tagihan', icon: CreditCard },
        { id: 'financials', name: 'Laporan Keuangan', icon: Wallet }
      ]
    },
    {
      groupName: 'Setup',
      items: [
        { id: 'complaints', name: 'Laporan Keluhan', icon: Wrench },
        { id: 'setup', name: 'Setup & WA Template', icon: Settings },
        { id: 'cloud-sync', name: 'Multi-Device API', icon: Cloud }
      ]
    }
  ];

  const renderPinModal = () => {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-slate-900 border border-slate-800 text-white w-full max-w-sm rounded-xl p-6 space-y-4 shadow-2xl text-center ${
            pinError ? 'animate-bounce border-rose-500' : ''
          }`}
        >
          <div className="flex flex-col items-center space-y-1.5">
            <div className={`p-3 bg-blue-950 text-blue-400 rounded-full border border-blue-900 ${pinError ? 'bg-rose-950 text-rose-500 border-rose-900' : ''}`}>
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm uppercase tracking-wider">Akses Manajemen Kos</h4>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Silakan Masuk Untuk Mengelola Kos</p>
          </div>

          {/* Tab Selector inside Login Modal */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setLoginMode('pin');
                setPinError(false);
              }}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                loginMode === 'pin'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PIN Cepat
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('multi');
                setPinError(false);
              }}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                loginMode === 'multi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Multi ID Login
            </button>
          </div>

          {loginMode === 'pin' ? (
            <>
              {/* Dots Indicator */}
              <div className="flex justify-center space-x-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <span
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 border ${
                      pinError 
                        ? 'bg-rose-500 border-rose-400' 
                        : idx < pinInput.length 
                          ? 'bg-blue-500 border-blue-400 scale-110' 
                          : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider animate-pulse">
                  PIN Salah! Akses Ditolak.
                </p>
              )}

              {/* Numeric Pad Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinPress(digit)}
                    className="py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm font-mono font-bold transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                  }}
                  className="py-3 bg-slate-800/20 hover:bg-slate-800/40 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handlePinPress('0')}
                  className="py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-sm font-mono font-bold transition-all active:scale-95 cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="py-3 bg-slate-800/20 hover:bg-slate-800/40 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
                >
                  Hapus
                </button>
              </div>

              <div className="text-[9px] text-slate-500 border-t border-slate-800/50 pt-2 font-bold uppercase tracking-widest">
                Akses Dibatasi — Khusus Owner & Manajemen Kos
              </div>
            </>
          ) : (
            <form onSubmit={handleMultiLoginSubmit} className="space-y-4 text-left pt-2">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Username Admin</label>
                <input
                  type="text"
                  required
                  placeholder="Ketik Username..."
                  value={multiUsername}
                  onChange={(e) => setMultiUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold text-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Kode Login / Password</label>
                <input
                  type="password"
                  required
                  placeholder="Ketik Kode Login..."
                  value={multiLoginCode}
                  onChange={(e) => setMultiLoginCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 outline-none rounded py-2 px-3 text-xs font-bold text-white transition-all font-mono"
                />
              </div>

              {pinError && (
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider text-center animate-pulse">
                  Username atau Kode Login Salah!
                </p>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setMultiUsername('');
                    setMultiLoginCode('');
                    setPinError(false);
                  }}
                  className="flex-1 py-2.5 bg-slate-800/40 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md text-center"
                >
                  Masuk
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    );
  };

  if (currentMode === 'public') {
    return (
      <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <PublicPortal 
            kosList={kosList}
            rooms={rooms}
            tenants={tenants}
            reservations={reservations}
            onAddReservation={handleAddReservation}
            onAddComplaint={handleAddComplaint}
            onEnterAdminMode={() => {
              setPinInput('');
              setPinError(false);
              setShowPinModal(true);
            }}
          />
        </div>
        {showPinModal && renderPinModal()}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 font-sans text-slate-800 overflow-hidden">
      
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-16 px-2 py-4' : 'w-56 p-4'} bg-slate-900 text-slate-300 space-y-4 border-r border-slate-700 shrink-0 h-screen sticky top-0 overflow-y-auto transition-all duration-300 ease-in-out`}>
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-2'} pb-4 border-b border-slate-800`}>
          <div className="p-1.5 bg-blue-600 rounded">
            <Home className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="text-sm font-bold text-white tracking-tight">Hananny Kos</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">MANAJEMEN KOS v1.2</p>
            </div>
          )}
        </div>

        {/* Dynamic Navigation Items */}
        <nav className="flex-1 space-y-3">
          {!sidebarCollapsed && (
            <div className="px-2 py-1 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest transition-opacity duration-300">ADMIN MENU</div>
          )}
          
          {/* Overview Tab (always standalone at top of admin menu) */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              title={sidebarCollapsed ? 'Overview' : undefined}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'space-x-3 px-3 py-2'} rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                activeTab === 'overview' 
                  ? 'bg-blue-600 text-white shadow-sm font-extrabold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate transition-opacity duration-300">Overview</span>}
            </button>
          </div>

          {/* Grouped Admin Menus */}
          {navGroups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              {!sidebarCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[9px] text-slate-500 font-extrabold uppercase tracking-widest transition-opacity duration-300">
                  {group.groupName}
                </div>
              ) : (
                <div className="border-t border-slate-800 my-1 mx-2"></div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'space-x-3 px-3 py-2'} rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                      activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-sm font-extrabold' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate transition-opacity duration-300">{item.name}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Workspace info, real-time clock & exit button */}
        <div className="space-y-2">
          <button
            onClick={() => {
              sessionStorage.removeItem('adminUnlocked');
              setCurrentMode('public');
            }}
            title={sidebarCollapsed ? "Keluar Admin" : undefined}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'justify-center space-x-2 px-3'} py-2 bg-slate-800 hover:bg-slate-700 rounded text-[11px] font-bold uppercase tracking-wider text-rose-400 transition-all cursor-pointer border border-slate-800`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="transition-opacity duration-300">Keluar Admin</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="bg-slate-800/40 p-3 rounded border border-slate-800/50 space-y-1 transition-opacity duration-300">
              <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center">
                <Clock className="w-3 h-3 mr-1" /> Real-time System
              </p>
              <p className="text-xs font-bold font-mono text-slate-300">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold">Session: hanannykos@gmail.com</p>
            </div>
          )}
        </div>
      </aside>

      {/* Header for Mobile */}
      <header className="md:hidden bg-slate-900 text-white p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Home className="w-5 h-5 text-blue-400" />
          <h1 className="text-xs font-extrabold tracking-wider uppercase">Hananny Kos</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              sessionStorage.removeItem('adminUnlocked');
              setCurrentMode('public');
            }}
            className="p-1.5 hover:bg-slate-800 rounded text-rose-400 transition-colors"
            title="Keluar Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-white border-t border-slate-800 p-4 space-y-4 shrink-0 z-50 absolute top-14 left-0 right-0 shadow-lg max-h-[80vh] overflow-y-auto">
          {/* Overview Standalone */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setActiveTab('overview');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider ${
                activeTab === 'overview' ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>
          </div>

          {/* Grouped sections */}
          {navGroups.map((group) => (
            <div key={group.groupName} className="space-y-1 border-t border-slate-800 pt-3 first:border-t-0 first:pt-0">
              <div className="px-3 pb-1 text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                {group.groupName}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded text-xs font-bold uppercase tracking-wider ${
                      activeTab === item.id ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto h-[calc(100vh-56px)] md:h-screen">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Main heading */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
            <div className="flex items-center space-x-3">
              {/* Desktop Hamburger Toggle */}
              <button
                id="desktop-hamburger-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 hover:bg-slate-200 rounded text-slate-700 transition-colors cursor-pointer"
                title={sidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
              
              <div>
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                  ADMINISTRATOR PANEL
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight capitalize">
                  {navItems.find(n => n.id === activeTab)?.name}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Real-time Sync Active
              </span>
            </div>
          </div>

          {/* Tab Renderers with Framer Motion Transition */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full"
          >
            {activeTab === 'overview' && (
              <OverviewTab 
                kosList={kosList} 
                rooms={rooms} 
                tenants={tenants} 
                payments={payments}
                doorLogs={doorLogs}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'rooms' && (
              <RoomsTab 
                kosList={kosList} 
                rooms={rooms} 
                tenants={tenants} 
                onUpdateRoom={handleUpdateRoom}
                onUpdateTenant={handleUpdateTenant}
              />
            )}

            {activeTab === 'tenants' && (
              <TenantsTab 
                kosList={kosList} 
                rooms={rooms} 
                tenants={tenants} 
                payments={payments} 
                onAddTenant={handleAddTenant}
                onRemoveTenant={handleRemoveTenant}
                onCheckoutTenant={handleCheckoutTenant}
                onUpdateTenant={handleUpdateTenant}
              />
            )}

            {activeTab === 'reservations' && (
              <ReservationsTab 
                kosList={kosList} 
                rooms={rooms} 
                reservations={reservations} 
                onAddReservation={handleAddReservation}
                onApproveReservation={handleApproveReservation}
                onRejectReservation={handleRejectReservation}
                onDeleteReservation={handleDeleteReservation}
                onMoveToTenants={handleMoveToTenants}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsTab 
                payments={payments} 
                tenants={tenants}
                rooms={rooms}
                onMarkPaid={handleMarkPaid} 
                onSendWhatsAppReminder={handleSendWhatsAppReminder}
                whatsappLogs={whatsappLogs}
                onRefreshLogs={fetchWhatsappLogs}
                whatsappTemplates={whatsappTemplates}
                onUpdatePayment={handleUpdatePayment}
                onDeletePayment={handleDeletePayment}
              />
            )}

            {activeTab === 'financials' && (
              <FinancialTab 
                kosList={kosList}
                payments={payments}
                financials={financials}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onImportPaidPayments={handleImportPaidPayments}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarTab 
                payments={payments} 
                onMarkPaid={handleMarkPaid} 
                onSendWhatsAppReminder={handleSendWhatsAppReminder}
              />
            )}

            {activeTab === 'complaints' && (
              <ComplaintsTab 
                kosList={kosList} 
                rooms={rooms} 
                complaints={complaints} 
                onAddComplaint={handleAddComplaint}
                onUpdateComplaintStatus={handleUpdateComplaintStatus}
                onDeleteComplaint={handleDeleteComplaint}
                whatsappTemplates={whatsappTemplates}
                onSendWhatsAppNotification={handleSendWhatsAppComplaint}
              />
            )}

            {activeTab === 'setup' && (
              <SetupTab 
                kosList={kosList}
                rooms={rooms}
                whatsappTemplates={whatsappTemplates}
                onSaveWhatsAppTemplates={handleSaveWhatsAppTemplates}
                onSaveKosConfig={handleSaveKosConfig}
                whatsappGateway={whatsappGateway}
                onSaveWhatsAppGateway={handleSaveWhatsAppGateway}
                onAddKos={handleAddKos}
                onDeleteKos={handleDeleteKos}
                adminLogins={adminLogins}
                onSaveAdminLogin={handleSaveAdminLogin}
                onDeleteAdminLogin={handleDeleteAdminLogin}
                onDeleteDummyData={handleDeleteDummyData}
              />
            )}

            {activeTab === 'cloud-sync' && (
              <CloudSyncTab />
            )}
          </motion.div>

        </div>
      </main>

    </div>
  );
}
