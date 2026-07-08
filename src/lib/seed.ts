import { collection, doc, getDocs, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { Kos, Room, Tenant, Reservation, Payment, Complaint, DoorLockLog } from '../types';
import { handleFirestoreError, OperationType } from './firestore-error';

export const DEFAULT_KOS: Kos[] = [
  {
    id: 'kos-1',
    name: 'Kos Melati',
    address: 'Jl. Melati No. 12, Jakarta Selatan',
    basePrice: 1500000,
    totalRooms: 10,
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'kos-2',
    name: 'Kos Mawar',
    address: 'Jl. Mawar No. 45, Jakarta Pusat',
    basePrice: 2000000,
    totalRooms: 10,
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'kos-3',
    name: 'Kos Tulip',
    address: 'Jl. Tulip No. 8, Jakarta Barat',
    basePrice: 1800000,
    totalRooms: 10,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'kos-4',
    name: 'Kos Kamboja',
    address: 'Jl. Kamboja No. 19, Jakarta Timur',
    basePrice: 1200000,
    totalRooms: 10,
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'kos-5',
    name: 'Kos Anggrek',
    address: 'Jl. Anggrek No. 3, Bandung',
    basePrice: 1600000,
    totalRooms: 10,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'kos-6',
    name: 'Kos Lavender',
    address: 'Jl. Lavender No. 27, Surabaya',
    basePrice: 1700000,
    totalRooms: 10,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600'
  }
];

export async function checkAndSeedDB() {
  try {
    const sysDoc = await getDoc(doc(db, 'settings', 'system'));
    if (sysDoc.exists() && sysDoc.data()?.disableSeeding) {
      console.log('Seeding is disabled by settings/system.');
      return;
    }
  } catch (error) {
    console.error('Error checking system settings:', error);
  }

  let snapshot;
  try {
    const kosCol = collection(db, 'kos');
    snapshot = await getDocs(kosCol);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'kos');
  }

  try {
    if (!snapshot || !snapshot.empty) {
      console.log('Database already contains data, skipping seed.');
      // Update system settings to prevent re-checking
      try {
        await setDoc(doc(db, 'settings', 'system'), { disableSeeding: true }, { merge: true });
      } catch (e) {
        console.error(e);
      }
      return;
    }

    console.log('Seeding Firestore database with default data...');
    const batch = writeBatch(db);

    // Set disableSeeding: true in system settings as part of this seed
    batch.set(doc(db, 'settings', 'system'), { disableSeeding: true }, { merge: true });

    // 1. Seed Kos
    DEFAULT_KOS.forEach((k) => {
      batch.set(doc(db, 'kos', k.id), k);
    });

    // Helper names for tenants
    const sampleNames = [
      'Budi Santoso', 'Siti Rahma', 'Rian Hidayat', 'Dewi Lestari', 
      'Adi Nugroho', 'Eka Wijaya', 'Slamet Riyadi', 'Indah Permata', 
      'Hendra Wijaya', 'Yuki Prasetyo', 'Amir Hamzah', 'Nia Ramadhani'
    ];

    // 2. Seed Rooms & Tenants & Payments
    let tenantCounter = 1;
    DEFAULT_KOS.forEach((kos) => {
      for (let i = 1; i <= 10; i++) {
        const roomNum = `Room ${100 + i}`;
        const roomId = `${kos.id}-r${i}`;
        const roomPasscode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit PIN

        // We make some rooms occupied, some available, some in maintenance
        let status: 'available' | 'occupied' | 'maintenance' = 'available';
        if (i <= 7) {
          status = 'occupied';
        } else if (i === 10) {
          status = 'maintenance';
        }

        const roomData: Room = {
          id: roomId,
          kosId: kos.id,
          kosName: kos.name,
          roomNumber: roomNum,
          status,
          price: kos.basePrice + (i * 50000), // higher rooms slightly more expensive
          passcode: roomPasscode
        };

        if (status === 'occupied') {
          const tenantId = `tenant-${tenantCounter}`;
          const tName = sampleNames[tenantCounter % sampleNames.length];
          roomData.currentTenantId = tenantId;

          const tenantData: Tenant = {
            id: tenantId,
            name: tName,
            phone: `081234567${10 + tenantCounter}`,
            email: `${tName.toLowerCase().replace(' ', '')}@example.com`,
            ktpNik: `317101234567000${tenantCounter}`,
            ktpAlamat: `Alamat Penghuni ${tName}, KTP Asal Jawa Barat`,
            ktpTtl: `Bandung, 15-05-199${tenantCounter % 10}`,
            jenisKelamin: tenantCounter % 2 === 0 ? 'PEREMPUAN' : 'LAKI-LAKI',
            kosId: kos.id,
            kosName: kos.name,
            roomId: roomId,
            roomNumber: roomNum,
            checkInDate: '2026-01-10',
            isCheckedOut: false,
            passcode: roomPasscode
          };

          batch.set(doc(db, 'tenants', tenantId), tenantData);

          // Payments (Generate Paid for Jun, Pending/Overdue for Juli)
          const billAmount = roomData.price;
          
          // June payment (Paid)
          const pJuneId = `payment-${tenantId}-jun`;
          const pJune: Payment = {
            id: pJuneId,
            tenantId,
            tenantName: tName,
            kosId: kos.id,
            kosName: kos.name,
            roomId,
            roomNumber: roomNum,
            amount: billAmount,
            month: 'Juni',
            year: 2026,
            status: 'paid',
            paidAt: '2026-06-05T09:15:00.000Z',
            invoiceNumber: `INV/202606/${tenantId}`
          };
          batch.set(doc(db, 'payments', pJuneId), pJune);

          // July payment (Pending or Overdue)
          // Let's make some odd tenants overdue (menunggak) and others paid/pending
          const isOverdue = tenantCounter % 3 === 0;
          const isPaidJuly = tenantCounter % 3 === 1;
          
          const pJulyId = `payment-${tenantId}-jul`;
          const pJuly: Payment = {
            id: pJulyId,
            tenantId,
            tenantName: tName,
            kosId: kos.id,
            kosName: kos.name,
            roomId,
            roomNumber: roomNum,
            amount: billAmount,
            month: 'Juli',
            year: 2026,
            status: isPaidJuly ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
            invoiceNumber: `INV/202607/${tenantId}`,
            ...(isPaidJuly ? { paidAt: '2026-07-02T14:30:00.000Z' } : {})
          };
          batch.set(doc(db, 'payments', pJulyId), pJuly);

          // Door access logs
          const logId = `doorlog-${tenantId}`;
          const logData: DoorLockLog = {
            id: logId,
            tenantName: tName,
            kosName: kos.name,
            roomNumber: roomNum,
            timestamp: new Date(Date.now() - (tenantCounter * 15 * 60 * 1000)).toISOString(),
            action: 'unlock',
            method: 'passcode'
          };
          batch.set(doc(db, 'doorLockLogs', logId), logData);

          tenantCounter++;
        }

        batch.set(doc(db, 'rooms', roomId), roomData);
      }
    });

    // 3. Seed some mock reservations
    const mockReservations: Reservation[] = [
      {
        id: 'res-1',
        name: 'Gisella Anastasia',
        phone: '081398765432',
        email: 'gisella@example.com',
        jenisKelamin: 'PEREMPUAN',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        roomId: 'kos-1-r8',
        roomNumber: 'Room 108',
        status: 'pending',
        checkInDate: '2026-07-15',
        notes: 'Ingin kamar yang bersih dan AC dingin.',
        ktpVerified: true,
        ktpDetails: {
          nik: '3171029384750001',
          nama: 'GISELLA ANASTASIA',
          alamat: 'Kec. Kebayoran Baru, Jakarta Selatan',
          ttl: 'SURABAYA, 16-11-1990',
          jenisKelamin: 'PEREMPUAN',
          confidenceScore: 0.98
        }
      },
      {
        id: 'res-2',
        name: 'Fatih Al-Fatih',
        phone: '087812345678',
        email: 'fatih@example.com',
        jenisKelamin: 'LAKI-LAKI',
        kosId: 'kos-2',
        kosName: 'Kos Mawar',
        roomId: 'kos-2-r9',
        roomNumber: 'Room 109',
        status: 'pending',
        checkInDate: '2026-07-20',
        notes: 'Butuh parkir mobil.',
        ktpVerified: false
      }
    ];

    mockReservations.forEach((res) => {
      batch.set(doc(db, 'reservations', res.id), res);
    });

    // 4. Seed some mock complaints
    const mockComplaints: Complaint[] = [
      {
        id: 'comp-1',
        tenantId: 'tenant-1',
        tenantName: sampleNames[1],
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        roomId: 'kos-1-r1',
        roomNumber: 'Room 101',
        issue: 'Kran air bocor',
        details: 'Kran air di kamar mandi terus meneteskan air, membuat lantai licin.',
        severity: 'medium',
        status: 'pending',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'comp-2',
        tenantId: 'tenant-2',
        tenantName: sampleNames[2],
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        roomId: 'kos-1-r2',
        roomNumber: 'Room 102',
        issue: 'AC tidak dingin',
        details: 'AC di kamar 102 mengeluarkan udara biasa, tidak sejuk sama sekali. Mohon diservis.',
        severity: 'high',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      }
    ];

    mockComplaints.forEach((comp) => {
      batch.set(doc(db, 'complaints', comp.id), comp);
    });

    // 5. Seed some mock financials
    const mockFinancials = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 1500000,
        date: '2026-06-01',
        category: 'Sewa Kamar',
        description: 'Pembayaran sewa Room 101 oleh Budi Santoso (Juni 2026)',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-2',
        type: 'income',
        amount: 1500000,
        date: '2026-06-02',
        category: 'Sewa Kamar',
        description: 'Pembayaran sewa Room 102 oleh Siti Rahma (Juni 2026)',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-3',
        type: 'expense',
        amount: 450000,
        date: '2026-06-05',
        category: 'WiFi / Internet',
        description: 'Tagihan Indihome internet kos Melati',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-4',
        type: 'expense',
        amount: 300000,
        date: '2026-06-10',
        category: 'Pekerjaan Listrik / Token',
        description: 'Isi ulang token listrik utama lantai 1',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-5',
        type: 'expense',
        amount: 250000,
        date: '2026-06-12',
        category: 'Perawatan & Perbaikan Kamar',
        description: 'Service AC bocor Kamar 102',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-6',
        type: 'expense',
        amount: 200000,
        date: '2026-06-15',
        category: 'Kebersihan & Sampah',
        description: 'Iuran kebersihan lingkungan bulanan',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-7',
        type: 'income',
        amount: 2000000,
        date: '2026-07-01',
        category: 'Sewa Kamar',
        description: 'Pembayaran sewa Room 201 oleh Rian Hidayat (Juli 2026)',
        kosId: 'kos-2',
        kosName: 'Kos Mawar',
        createdAt: new Date().toISOString()
      },
      {
        id: 'tx-8',
        type: 'income',
        amount: 1500000,
        date: '2026-07-02',
        category: 'Sewa Kamar',
        description: 'Pembayaran sewa Room 101 oleh Budi Santoso (Juli 2026)',
        kosId: 'kos-1',
        kosName: 'Kos Melati',
        createdAt: new Date().toISOString()
      }
    ];

    mockFinancials.forEach((tx) => {
      batch.set(doc(db, 'financials', tx.id), tx);
    });

    try {
      await batch.commit();
      console.log('Firestore Database successfully seeded!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-seed');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

export async function deleteDummyData() {
  const batch = writeBatch(db);
  
  // Set disableSeeding: true in settings/system
  batch.set(doc(db, 'settings', 'system'), { disableSeeding: true }, { merge: true });

  // 1. Delete kos-1 to kos-6
  for (let i = 1; i <= 6; i++) {
    batch.delete(doc(db, 'kos', `kos-${i}`));
    // Rooms kos-i-r1 to r10
    for (let r = 1; r <= 10; r++) {
      batch.delete(doc(db, 'rooms', `kos-${i}-r${r}`));
    }
  }

  // 2. Delete tenants (tenant-1 to tenant-42 or scan and delete starting with 'tenant-')
  try {
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    tenantsSnap.docs.forEach(docSnap => {
      if (docSnap.id.startsWith('tenant-')) {
        batch.delete(docSnap.ref);
      }
    });
  } catch (e) {
    console.error('Error fetching tenants for deletion:', e);
  }

  // 3. Delete payments
  try {
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    paymentsSnap.docs.forEach(docSnap => {
      if (docSnap.id.startsWith('payment-tenant-')) {
        batch.delete(docSnap.ref);
      }
    });
  } catch (e) {
    console.error('Error fetching payments for deletion:', e);
  }

  // 4. Delete door logs
  try {
    const doorLogsSnap = await getDocs(collection(db, 'doorLockLogs'));
    doorLogsSnap.docs.forEach(docSnap => {
      if (docSnap.id.startsWith('doorlog-tenant-')) {
        batch.delete(docSnap.ref);
      }
    });
  } catch (e) {
    console.error('Error fetching door logs for deletion:', e);
  }

  // 5. Delete reservations
  batch.delete(doc(db, 'reservations', 'res-1'));
  batch.delete(doc(db, 'reservations', 'res-2'));

  // 6. Delete complaints
  batch.delete(doc(db, 'complaints', 'comp-1'));
  batch.delete(doc(db, 'complaints', 'comp-2'));

  // 7. Delete financials (tx-1 to tx-8)
  for (let i = 1; i <= 8; i++) {
    batch.delete(doc(db, 'financials', `tx-${i}`));
  }

  try {
    await batch.commit();
    console.log('Dummy data deleted successfully!');
  } catch (e) {
    console.error('Failed to commit dummy data deletion batch:', e);
    throw e;
  }
}
