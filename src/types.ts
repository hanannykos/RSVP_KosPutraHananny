export interface Kos {
  id: string;
  name: string;
  address: string;
  basePrice: number;
  totalRooms: number;
  image: string;
  picName?: string;
  picPhone?: string;
  bankAccount?: string;
  bankRecipient?: string;
  hideWhenFull?: boolean;
}

export interface Room {
  id: string;
  kosId: string;
  kosName: string;
  roomNumber: string;
  status: 'available' | 'occupied' | 'maintenance';
  currentTenantId?: string;
  price: number;
  passcode: string;
  quotaPerRoom?: number;
  isActive?: boolean;
  payMonthly?: boolean;
  payThreeMonths?: boolean;
  paySixMonths?: boolean;
  payYearly?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  ktpNik: string;
  ktpAlamat: string;
  ktpTtl: string;
  jenisKelamin: 'LAKI-LAKI' | 'PEREMPUAN';
  kosId: string;
  kosName: string;
  roomId: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate?: string;
  isCheckedOut: boolean;
  checkoutNotes?: string;
  checkoutRefund?: number;
  passcode: string;
  pekerjaan?: string;
  pekerjaanDetail?: string;
  statusPerkawinan?: string;
  statusPerkawinanDetail?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelationship?: string;
  guarantorRelationshipDetail?: string;
  signatureUrl?: string;
  paymentOption?: string;
  ktpPhotoUrl?: string;
  idCardPhotoUrl?: string;
}

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string;
  jenisKelamin: 'LAKI-LAKI' | 'PEREMPUAN';
  kosId: string;
  kosName: string;
  roomId: string;
  roomNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'moved';
  checkInDate: string;
  notes?: string;
  ktpVerified: boolean;
  ktpDetails?: {
    nik: string;
    nama: string;
    alamat: string;
    ttl: string;
    jenisKelamin: string;
    confidenceScore: number;
  };
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorRelationship?: string;
  guarantorRelationshipDetail?: string;
  paymentProofUrl?: string;
  signatureUrl?: string;
  informedConsentAccepted?: boolean;
  pekerjaan?: string;
  pekerjaanDetail?: string;
  statusPerkawinan?: string;
  statusPerkawinanDetail?: string;
  idCardUrl?: string;
  idCardName?: string;
  ktpPhotoUrl?: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  tenantName: string;
  kosId: string;
  kosName: string;
  roomId: string;
  roomNumber: string;
  amount: number;
  month: string; // e.g., "Juli"
  year: number;  // e.g., 2026
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  invoiceNumber: string;
  reminderSent?: boolean;
  deadlineDate?: string;
  proofOfTransferUrl?: string;
  proofOfTransferUploadedAt?: string;
  paymentOption?: string;
  billingDate?: string;
}

export interface Complaint {
  id: string;
  tenantId: string;
  tenantName: string;
  kosId: string;
  kosName: string;
  roomId: string;
  roomNumber: string;
  issue: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
  documentationPhotos?: string[];
}

export interface DoorLockLog {
  id: string;
  tenantName: string;
  kosName: string;
  roomNumber: string;
  timestamp: string;
  action: 'unlock' | 'lock';
  method: 'passcode' | 'remote_admin' | 'emergency_key';
}

export interface WhatsAppGateway {
  gatewayType: string;
  senderNumber: string;
  apiKey: string;
  endpointUrl: string;
  status: 'connected' | 'disconnected';
}

export interface AdminLogin {
  id: string;
  username: string;
  loginCode: string;
  role: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // Format: YYYY-MM-DD
  category: string;
  description: string;
  kosId?: string;
  kosName?: string;
  createdAt: string;
}

