const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const bcrypt = require('bcryptjs');
const { URL } = require('url');

// Load environment variables
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

const dbUrl = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password || ''),
  database: dbUrl.pathname.substring(1),
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // 1. Clean the database in reverse order of dependencies
  console.log('Cleaning existing data...');
  await prisma.maintenanceBHPUsage.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.procurementItem.deleteMany({});
  await prisma.procurementDraft.deleteMany({});
  await prisma.bHP.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.session.deleteMany({});
  console.log('Database cleaned.');

  // Reset auto-increment counters
  console.log('Resetting auto-increment counters...');
  await prisma.$executeRawUnsafe(`ALTER TABLE maintenance_bhp_usages AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE maintenance_logs AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE procurement_items AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE procurement_drafts AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE bhps AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE inventories AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE rooms AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE users AUTO_INCREMENT = 1;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE roles AUTO_INCREMENT = 1;`);

  // 2. Seed Roles
  console.log('Seeding Roles...');
  const roleAdmin = await prisma.role.create({ data: { name: 'ADMIN', description: 'Administrator' } });
  const roleKaprodi = await prisma.role.create({ data: { name: 'KAPRODI', description: 'Ketua Program Studi' } });
  const roleKalab = await prisma.role.create({ data: { name: 'KALAB', description: 'Kepala Laboratorium' } });
  const roleStafAdmin = await prisma.role.create({ data: { name: 'STAF_ADMIN', description: 'Staf Administrasi' } });
  const roleStafLab = await prisma.role.create({ data: { name: 'STAF_LAB', description: 'Staf Laboratorium' } });

  // 3. Seed Users
  console.log('Seeding Users...');
  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Initial core users
  const adminUser = await prisma.users.create({
    data: {
      name: 'Super Admin',
      email: 'admin@shipshape.com',
      password: hashedPassword,
      roleId: roleAdmin.id,
      isActive: true,
    },
  });

  const kaprodiUser = await prisma.users.create({
    data: {
      name: 'Laura',
      email: 'kaprodi@shipshape.com',
      password: hashedPassword,
      roleId: roleKaprodi.id,
      isActive: true,
    },
  });

  const kalabUser = await prisma.users.create({
    data: {
      name: 'Lennon, John, M.T.',
      email: 'kalab@shipshape.com',
      password: hashedPassword,
      roleId: roleKalab.id,
      isActive: true,
    },
  });

  const stafAdminUser = await prisma.users.create({
    data: {
      name: 'Alice Staf Admin',
      email: 'staf_admin@shipshape.com',
      password: hashedPassword,
      roleId: roleStafAdmin.id,
      isActive: true,
    },
  });

  const stafLabUser = await prisma.users.create({
    data: {
      name: 'Bob Staf Lab',
      email: 'staf_lab@shipshape.com',
      password: hashedPassword,
      roleId: roleStafLab.id,
      isActive: true,
    },
  });

  // Additional mock users for testing pagination
  const additionalUserNames = [
    { name: 'Susi Santoso', email: 'budi.santoso@shipshape.com', role: roleStafLab },
    { name: 'Dewi Lestari', email: 'dewi.lestari@shipshape.com', role: roleKaprodi },
    { name: 'Eko Prasetyo', email: 'eko.prasetyo@shipshape.com', role: roleKalab },
    { name: 'Farida Indah', email: 'farida.indah@shipshape.com', role: roleStafAdmin },
    { name: 'Giri Suryo', email: 'giri.suryo@shipshape.com', role: roleStafLab },
    { name: 'Hendra Wijaya', email: 'hendra.wijaya@shipshape.com', role: roleStafLab },
    { name: 'Indah Permata', email: 'indah.permata@shipshape.com', role: roleKalab },
    { name: 'Joko Susilo', email: 'joko.susilo@shipshape.com', role: roleStafLab },
    { name: 'Kartika Sari', email: 'kartika.sari@shipshape.com', role: roleStafAdmin },
    { name: 'Lukman Hakim', email: 'lukman.hakim@shipshape.com', role: roleKaprodi },
    { name: 'Megawati Putri', email: 'megawati.putri@shipshape.com', role: roleStafLab },
    { name: 'Nugroho Adi', email: 'nugroho.adi@shipshape.com', role: roleStafLab },
    { name: 'Oki Rahardjo', email: 'oki.rahardjo@shipshape.com', role: roleKalab },
    { name: 'Pratiwi Lestari', email: 'pratiwi.lestari@shipshape.com', role: roleStafAdmin },
    { name: 'Rian Hidayat', email: 'rian.hidayat@shipshape.com', role: roleStafLab },
    { name: 'Sari Utami', email: 'sari.utami@shipshape.com', role: roleKaprodi },
    { name: 'Taufik Hidayat', email: 'taufik.hidayat@shipshape.com', role: roleKalab },
    { name: 'Utami Ningsih', email: 'utami.ningsih@shipshape.com', role: roleStafAdmin },
    { name: 'Wahyudi Pratama', email: 'wahyudi.pratama@shipshape.com', role: roleStafLab },
    { name: 'Yanti Kusuma', email: 'yanti.kusuma@shipshape.com', role: roleStafLab },
    { name: 'Zainal Abidin', email: 'zainal.abidin@shipshape.com', role: roleKalab },
    { name: 'Aditya Pratama', email: 'aditya.pratama@shipshape.com', role: roleStafLab },
    { name: 'Bella Citra', email: 'bella.citra@shipshape.com', role: roleStafAdmin },
    { name: 'Candra Wijaya', email: 'candra.wijaya@shipshape.com', role: roleStafLab },
    { name: 'Dina Marlina', email: 'dina.marlina@shipshape.com', role: roleStafLab },
    { name: 'Erik Setiawan', email: 'erik.setiawan@shipshape.com', role: roleKalab },
    { name: 'Fany Febriana', email: 'fany.febriana@shipshape.com', role: roleStafAdmin },
    { name: 'Gunawan Wibisono', email: 'gunawan.wibisono@shipshape.com', role: roleStafLab },
    { name: 'Hani Handayani', email: 'hani.handayani@shipshape.com', role: roleStafLab },
    { name: 'Irfan Bachdim', email: 'irfan.bachdim@shipshape.com', role: roleKaprodi },
    { name: 'Julia Perez', email: 'julia.perez@shipshape.com', role: roleStafLab },
    { name: 'Kevin Sanjaya', email: 'kevin.sanjaya@shipshape.com', role: roleStafLab },
    { name: 'Lia Ananta', email: 'lia.ananta@shipshape.com', role: roleStafAdmin },
    { name: 'Mulyadi Kusuma', email: 'mulyadi.kusuma@shipshape.com', role: roleKalab },
    { name: 'Nina Zatulini', email: 'nina.zatulini@shipshape.com', role: roleStafLab },
    { name: 'Oskar Pratama', email: 'oskar.pratama@shipshape.com', role: roleStafLab },
    { name: 'Putri Ayu', email: 'putri.ayu@shipshape.com', role: roleStafAdmin },
    { name: 'Rahmat Hidayat', email: 'rahmat.hidayat@shipshape.com', role: roleKalab },
    { name: 'Siska Amelia', email: 'siska.amelia@shipshape.com', role: roleStafLab },
    { name: 'Tedy Kurniawan', email: 'tedy.kurniawan@shipshape.com', role: roleStafLab },
    { name: 'Umar Syarif', email: 'umar.syarif@shipshape.com', role: roleStafAdmin },
    { name: 'Vania Larisa', email: 'vania.larisa@shipshape.com', role: roleStafLab },
    { name: 'Wira Sandi', email: 'wira.sandi@shipshape.com', role: roleStafLab },
    { name: 'Yuda Permana', email: 'yuda.permana@shipshape.com', role: roleKalab },
    { name: 'Zaskia Adya', email: 'zaskia.adya@shipshape.com', role: roleStafLab }
  ];

  const allUsers = [adminUser, kaprodiUser, kalabUser, stafAdminUser, stafLabUser];
  const staffLabUsers = [stafLabUser];
  const staffAdminUsers = [stafAdminUser];
  const kalabUsers = [kalabUser];
  const kaprodiUsers = [kaprodiUser];

  for (let i = 0; i < additionalUserNames.length; i++) {
    const item = additionalUserNames[i];
    const user = await prisma.users.create({
      data: {
        name: item.name,
        email: item.email,
        password: hashedPassword,
        roleId: item.role.id,
        // Make 90% of users active, 10% inactive
        isActive: i % 10 !== 0,
      }
    });
    allUsers.push(user);
    if (item.role.name === 'STAF_LAB') staffLabUsers.push(user);
    else if (item.role.name === 'STAF_ADMIN') staffAdminUsers.push(user);
    else if (item.role.name === 'KALAB') kalabUsers.push(user);
    else if (item.role.name === 'KAPRODI') kaprodiUsers.push(user);
  }

  console.log(`Seeded core users and ${additionalUserNames.length} additional users.`);

  // 4. Seed Rooms
  console.log('Seeding Rooms...');
  const netLab = await prisma.room.create({
    data: {
      name: 'Network Security Lab',
      description: 'Used for networking, network security, and cryptography practical work.',
    },
  });

  const hwLab = await prisma.room.create({
    data: {
      name: 'Hardware & Embedded Systems Lab',
      description: 'Used for robotics, microcontroller, and electronics lab sessions.',
    },
  });

  const serverRoom = await prisma.room.create({
    data: {
      name: 'Server Room',
      description: 'Housing main university lab servers, routers, and central storage.',
    },
  });

  // Additional rooms for testing pagination
  const roomNames = [
    'Database Systems Lab',
    'Software Engineering Lab',
    'Artificial Intelligence & Data Science Lab',
    'Multimedia & Game Development Lab',
    'Cloud Computing & DevOps Lab',
    'Operating Systems Lab',
    'Internet of Things (IoT) Lab',
    'Mobile Application Development Lab',
    'Web Programming Lab',
    'Digital Forensics Lab',
    'Cyber Security Operations Center',
    'Computer Graphics Lab',
    'Robotics & Automation Lab',
    'Algorithm & Programming Lab',
    'Information Systems Lab',
    'Distributed Systems Lab',
    'Human-Computer Interaction Lab',
    'Computer Network Lab',
    'Compiler Design Lab',
    'Embedded Systems Lab',
    'Signal Processing Lab',
    'Data Warehousing & Mining Lab',
    'Virtual Reality Lab',
    'Parallel Computing Lab',
    'Biomedical Informatics Lab',
    'Enterprise Architecture Lab',
    'UX Research Lab',
    'Telecommunication Lab',
    'Microprocessor Lab',
    'E-Commerce & Digital Business Lab',
    'Social Media Analytics Lab',
    'Geographic Information Systems Lab',
    'Decision Support Systems Lab',
    'Formal Methods & Logic Lab',
    'Quantum Computing Research Lab',
    'Laboratory Room 401',
    'Laboratory Room 402',
    'Laboratory Room 403',
    'Laboratory Room 404',
    'Laboratory Room 405'
  ];

  const allRooms = [netLab, hwLab, serverRoom];
  for (const name of roomNames) {
    const r = await prisma.room.create({
      data: {
        name,
        description: `Laboratory room dedicated to practical work and research in ${name.toLowerCase()}.`
      }
    });
    allRooms.push(r);
  }

  console.log(`Seeded 3 core rooms and ${roomNames.length} additional rooms.`);

  // 5. Seed BHP (Consumables)
  console.log('Seeding BHP (Consumables)...');
  const rj45 = await prisma.bHP.create({
    data: {
      name: 'RJ45 Connectors Cat6',
      stock: 250,
      unit: 'pcs',
      roomId: netLab.id,
    },
  });

  const utpCable = await prisma.bHP.create({
    data: {
      name: 'Cat6 UTP Cable',
      stock: 4,
      unit: 'roll',
      roomId: netLab.id,
    },
  });

  const solderWire = await prisma.bHP.create({
    data: {
      name: 'Lead-Free Solder Wire',
      stock: 12,
      unit: 'pcs',
      roomId: hwLab.id,
    },
  });

  const cableTies = await prisma.bHP.create({
    data: {
      name: 'Nylon Cable Ties 200mm',
      stock: 6,
      unit: 'pack',
      roomId: serverRoom.id,
    },
  });

  const bhpTemplates = [
    { name: 'A4 HVS Paper 80gr', unit: 'box', stockMin: 10, stockMax: 100 },
    { name: 'Whiteboard Marker Black', unit: 'pcs', stockMin: 20, stockMax: 200 },
    { name: 'Whiteboard Marker Blue', unit: 'pcs', stockMin: 20, stockMax: 200 },
    { name: 'Whiteboard Marker Red', unit: 'pcs', stockMin: 10, stockMax: 100 },
    { name: 'AA Alkaline Battery', unit: 'pack', stockMin: 15, stockMax: 120 },
    { name: 'AAA Alkaline Battery', unit: 'pack', stockMin: 15, stockMax: 120 },
    { name: 'Electrical Tape Black', unit: 'roll', stockMin: 5, stockMax: 50 },
    { name: 'WD-40 Multi-Use Product', unit: 'can', stockMin: 2, stockMax: 20 },
    { name: 'Thermal Paste Arctic MX-4', unit: 'pcs', stockMin: 5, stockMax: 30 },
    { name: 'Fiber Optic Patch Cord SC-SC', unit: 'pcs', stockMin: 8, stockMax: 60 },
    { name: 'Solder Flux Paste', unit: 'pcs', stockMin: 5, stockMax: 40 },
    { name: 'Desoldering Wick', unit: 'pcs', stockMin: 10, stockMax: 80 },
    { name: 'Heat Shrink Tubing Kit', unit: 'pack', stockMin: 3, stockMax: 25 },
    { name: 'Crimping Tool Blade Replacement', unit: 'pcs', stockMin: 2, stockMax: 15 },
    { name: 'Alcohol Prep Pads', unit: 'box', stockMin: 5, stockMax: 50 },
    { name: 'Compressed Air Duster Can', unit: 'can', stockMin: 4, stockMax: 40 },
    { name: 'Jumper Wires M-M 20cm', unit: 'pack', stockMin: 10, stockMax: 100 },
    { name: 'Jumper Wires M-F 20cm', unit: 'pack', stockMin: 10, stockMax: 100 },
    { name: 'Breadboard Full-Size', unit: 'pcs', stockMin: 15, stockMax: 120 },
    { name: 'Resistor Assortment Kit', unit: 'pack', stockMin: 5, stockMax: 30 },
    { name: 'Capacitor Assortment Kit', unit: 'pack', stockMin: 5, stockMax: 30 },
    { name: '5V Active Buzzer', unit: 'pcs', stockMin: 20, stockMax: 150 },
    { name: 'LED Light Assortment', unit: 'pack', stockMin: 10, stockMax: 70 },
    { name: 'Photoresistor LDR 5mm', unit: 'pcs', stockMin: 30, stockMax: 300 },
    { name: 'Micro USB Cable 1m', unit: 'pcs', stockMin: 15, stockMax: 100 },
    { name: 'USB-C Cable 1m', unit: 'pcs', stockMin: 20, stockMax: 150 },
    { name: 'HDMI Cable 1.8m', unit: 'pcs', stockMin: 10, stockMax: 80 },
    { name: 'Masking Tape 1 inch', unit: 'roll', stockMin: 5, stockMax: 40 },
    { name: 'Double-Sided Foam Tape', unit: 'roll', stockMin: 4, stockMax: 30 },
    { name: 'Cable Organizer Clips', unit: 'pack', stockMin: 10, stockMax: 100 }
  ];

  const allBHPs = [rj45, utpCable, solderWire, cableTies];

  for (let i = 0; i < 100; i++) {
    const template = bhpTemplates[i % bhpTemplates.length];
    const room = allRooms[i % allRooms.length];
    const stock = Math.floor(Math.random() * (template.stockMax - template.stockMin + 1)) + template.stockMin;

    const suffix = i >= bhpTemplates.length ? ` Type ${Math.floor(i / bhpTemplates.length) + 1}` : '';
    const bhpName = `${template.name}${suffix}`;

    const bhp = await prisma.bHP.create({
      data: {
        name: bhpName,
        stock: stock,
        unit: template.unit,
        roomId: room.id
      }
    });
    allBHPs.push(bhp);
  }

  console.log(`Seeded core BHPs and 100 additional BHP items.`);

  // 6. Seed Inventory (Assets)
  console.log('Seeding Inventories (Assets)...');
  const netPC1 = await prisma.inventory.create({
    data: {
      name: 'Lenovo ThinkCentre M70q Gen 4',
      labelNumber: 'LAB-NET-PC-001',
      condition: 'GOOD',
      roomId: netLab.id,
    },
  });

  const netPC2 = await prisma.inventory.create({
    data: {
      name: 'Lenovo ThinkCentre M70q Gen 4',
      labelNumber: 'LAB-NET-PC-002',
      condition: 'GOOD',
      roomId: netLab.id,
    },
  });

  const ciscoRouter = await prisma.inventory.create({
    data: {
      name: 'Cisco ISR 2911 Router',
      labelNumber: 'LAB-NET-RTR-001',
      condition: 'MAINTENANCE',
      roomId: netLab.id,
    },
  });

  const netSwitch = await prisma.inventory.create({
    data: {
      name: 'Cisco Catalyst 2960 Switch',
      labelNumber: 'LAB-NET-SW-001',
      condition: 'GOOD',
      roomId: netLab.id,
    },
  });

  const hwPC1 = await prisma.inventory.create({
    data: {
      name: 'Dell OptiPlex 7010 Tower',
      labelNumber: 'LAB-HW-PC-001',
      condition: 'GOOD',
      roomId: hwLab.id,
    },
  });

  const oscilloscope = await prisma.inventory.create({
    data: {
      name: 'Rigol DS1202Z-E Oscilloscope',
      labelNumber: 'LAB-HW-OSC-001',
      condition: 'GOOD',
      roomId: hwLab.id,
    },
  });

  const projector = await prisma.inventory.create({
    data: {
      name: 'Epson EB-X06 Projector',
      labelNumber: 'LAB-HW-PRJ-001',
      condition: 'BROKEN',
      roomId: hwLab.id,
    },
  });

  const dellServer = await prisma.inventory.create({
    data: {
      name: 'Dell PowerEdge R740 Server',
      labelNumber: 'SRV-R740-001',
      condition: 'GOOD',
      roomId: serverRoom.id,
    },
  });

  const apcUps = await prisma.inventory.create({
    data: {
      name: 'APC Smart-UPS C 1500VA',
      labelNumber: 'SRV-UPS-001',
      condition: 'DISPOSED',
      roomId: serverRoom.id,
    },
  });

  const inventoryTemplates = [
    { name: 'Lenovo ThinkCentre M70q Gen 4', prefix: 'PC' },
    { name: 'Dell OptiPlex 7010 Tower', prefix: 'PC' },
    { name: 'Cisco ISR 2911 Router', prefix: 'RTR' },
    { name: 'Cisco Catalyst 2960 Switch', prefix: 'SW' },
    { name: 'Rigol DS1202Z-E Oscilloscope', prefix: 'OSC' },
    { name: 'Epson EB-X06 Projector', prefix: 'PRJ' },
    { name: 'Dell PowerEdge R740 Server', prefix: 'SRV' },
    { name: 'APC Smart-UPS C 1500VA', prefix: 'UPS' },
    { name: 'HP LaserJet Pro MFP M227fdw', prefix: 'PRN' },
    { name: 'Logitech MK270 Wireless Combo', prefix: 'KBD' },
    { name: 'ASUS TUF Gaming VG249Q Monitor', prefix: 'MON' },
    { name: 'MacBook Pro 14 M3', prefix: 'LAP' },
    { name: 'Raspberry Pi 4 Model B 8GB', prefix: 'SBC' },
    { name: 'Arduino Uno R3 Starter Kit', prefix: 'ARD' },
    { name: 'Soldering Station Hakko FX-888D', prefix: 'SLD' },
    { name: 'Digital Multimeter Fluke 115', prefix: 'DMM' },
    { name: 'Synology DiskStation DS923+ NAS', prefix: 'NAS' },
    { name: 'Ubiquiti UniFi U6-Lite Access Point', prefix: 'AP' },
    { name: 'Brother PT-D210 Label Maker', prefix: 'LBL' },
    { name: 'Sony WH-1000XM4 Headset', prefix: 'AUD' }
  ];

  const allInventories = [netPC1, netPC2, ciscoRouter, netSwitch, hwPC1, oscilloscope, projector, dellServer, apcUps];

  for (let i = 0; i < 120; i++) {
    const template = inventoryTemplates[i % inventoryTemplates.length];
    const room = allRooms[i % allRooms.length];

    let condition = 'GOOD';
    const rand = Math.random();
    if (rand > 0.95) condition = 'DISPOSED';
    else if (rand > 0.85) condition = 'BROKEN';
    else if (rand > 0.70) condition = 'MAINTENANCE';

    const labelNumber = `LAB-R${room.id}-${template.prefix}-${String(100 + i).padStart(3, '0')}`;

    const inv = await prisma.inventory.create({
      data: {
        name: `${template.name} #${i + 1}`,
        labelNumber,
        condition,
        roomId: room.id
      }
    });
    allInventories.push(inv);
  }

  console.log(`Seeded core inventories and 120 additional inventory items.`);

  // 7. Seed ProcurementDraft (Procurement Requests)
  console.log('Seeding Procurement Drafts...');
  const draft1 = await prisma.procurementDraft.create({
    data: {
      title: 'Lab Equipment Upgrades 2026',
      year: 2026,
      status: 'APPROVED',
      createdById: stafLabUser.id,
      reviewedById: kalabUser.id,
    },
  });

  const draft2 = await prisma.procurementDraft.create({
    data: {
      title: 'Consumables Restock Q2',
      year: 2026,
      status: 'PENDING_REVIEW',
      createdById: stafLabUser.id,
    },
  });

  const draft3 = await prisma.procurementDraft.create({
    data: {
      title: 'Server Room Cooling System',
      year: 2026,
      status: 'DRAFT',
      createdById: stafAdminUser.id,
    },
  });

  const draftTitles = [
    'IoT Laboratory Kits Procurement',
    'Robotics Materials & Tools 2026',
    'Network Security Software License Renewal',
    'Web Development Server Hosting Allocation',
    'Department PC Upgrades Phase 1',
    'Stationery & Office Consumables Restock',
    'Server Room AC Replacement & Maintenance',
    'Multimedia Lab VR Headsets Procurement',
    'Cloud Computing Lab AWS Credit Purchase',
    'Database Lab SQL Server Licenses',
    'Electronics Lab Multimeters & Soldering Kits',
    'Mobile Programming Testing Device Purchase',
    'Artificial Intelligence GPU Server Allocation',
    'Data Science Lab Textbooks & Resources',
    'Network Lab Fiber Optic Splicer Purchase',
    'Basic Computer Programming Lab Keyboard/Mouse Set',
    'Operating Systems Lab RAM Upgrade (16GB)',
    'Digital Forensics Software License (EnCase)',
    'Computer Graphics Lab Drawing Tablets',
    'Human-Computer Interaction Eye Tracker',
    'Cyber Security Ops Center Display Monitors',
    'Fasilitas Ruang Dosen & Staf Procurement',
    'Emergency Power Supply Backup Generator',
    'Sound System and Mic Set for Audio Lab',
    'Office Chairs Replacement for Staff Lab',
    'High-Speed Router for Central Corridor',
    'Broadband Internet Line Annual Extension',
    'UPS Battery Cell Replacements',
    'Thermal Paste and Cleaner Restock',
    'Laser Engraving Machine for Prototype Lab'
  ];

  const allDrafts = [draft1, draft2, draft3];
  const draftStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED'];
  for (let i = 0; i < 40; i++) {
    const titleTemplate = draftTitles[i % draftTitles.length];
    const suffix = i >= draftTitles.length ? ` (Part ${Math.floor(i / draftTitles.length) + 1})` : '';
    const title = `${titleTemplate}${suffix}`;
    const status = draftStatuses[i % draftStatuses.length];
    const year = 2025 + (i % 2);

    const creator = staffLabUsers[i % staffLabUsers.length];

    let reviewer = null;
    if (status !== 'DRAFT') {
      reviewer = kalabUsers[i % kalabUsers.length];
    }

    const draft = await prisma.procurementDraft.create({
      data: {
        title,
        year,
        status,
        createdById: creator.id,
        reviewedById: reviewer ? reviewer.id : null
      }
    });
    allDrafts.push(draft);
  }

  console.log(`Seeded core drafts and 40 additional procurement drafts.`);

  // 8. Seed ProcurementItem
  console.log('Seeding Procurement Items...');
  await prisma.procurementItem.create({
    data: {
      draftId: draft1.id,
      type: 'INVENTORY',
      name: 'Dell OptiPlex 7010 Tower',
      price: 12500000.0,
      quantity: 5,
      link: 'https://tokopedia.com/dell-optiplex-7010',
      status: 'APPROVED',
    },
  });

  await prisma.procurementItem.create({
    data: {
      draftId: draft1.id,
      type: 'BHP',
      name: 'RJ45 Connectors Cat6',
      price: 150000.0,
      quantity: 2,
      link: 'https://tokopedia.com/rj45-cat6',
      status: 'APPROVED',
    },
  });

  await prisma.procurementItem.create({
    data: {
      draftId: draft1.id,
      type: 'INVENTORY',
      name: 'Cisco ISR 2911 Router (Replacement)',
      price: 8500000.0,
      quantity: 1,
      link: 'https://tokopedia.com/cisco-isr-2911',
      replacedInventoryId: ciscoRouter.id,
      status: 'APPROVED',
      receiveDate: new Date('2026-05-10T08:30:00Z'),
    },
  });

  await prisma.procurementItem.create({
    data: {
      draftId: draft2.id,
      type: 'BHP',
      name: 'Cat6 UTP Cable',
      price: 1800000.0,
      quantity: 2,
      link: 'https://tokopedia.com/utp-cable-cat6',
      status: 'PENDING',
    },
  });

  await prisma.procurementItem.create({
    data: {
      draftId: draft2.id,
      type: 'INVENTORY',
      name: 'Hakko FX-888D Soldering Station',
      price: 1750000.0,
      quantity: 3,
      link: 'https://tokopedia.com/hakko-fx888d',
      status: 'PENDING',
    },
  });

  await prisma.procurementItem.create({
    data: {
      draftId: draft3.id,
      type: 'INVENTORY',
      name: 'Daikin Portable AC 1.5 PK',
      price: 4500000.0,
      quantity: 2,
      link: 'https://tokopedia.com/daikin-portable-ac',
      status: 'PENDING',
    },
  });

  const procurementItemTemplates = [
    { name: 'Intel Core i7-14700K CPU', type: 'INVENTORY', price: 6500000 },
    { name: 'Kingston Fury Beast 32GB DDR5 RAM', type: 'INVENTORY', price: 1800000 },
    { name: 'Samsung 990 Pro 1TB NVMe SSD', type: 'INVENTORY', price: 1750000 },
    { name: 'Nvidia RTX 4070 Super GPU', type: 'INVENTORY', price: 11000000 },
    { name: 'Cat6 UTP Cable Roll 305m', type: 'BHP', price: 1500000 },
    { name: 'RJ45 Connectors Cat6 Box of 100', type: 'BHP', price: 200000 },
    { name: 'Rigol DS1102Z-E Oscilloscope', type: 'INVENTORY', price: 5500000 },
    { name: 'Hakko Soldering Iron FX-600', type: 'INVENTORY', price: 750000 },
    { name: 'Lead-Free Solder Wire 1kg Reel', type: 'BHP', price: 450000 },
    { name: 'A4 Copier Paper 80gsm Box', type: 'BHP', price: 350000 },
    { name: 'Epson L3210 Inkjet Printer', type: 'INVENTORY', price: 2200000 },
    { name: 'HDMI Cable 3m Flat Pack', type: 'BHP', price: 120000 },
    { name: 'ASUS RT-AX58U Wi-Fi 6 Router', type: 'INVENTORY', price: 1850000 },
    { name: 'Tp-Link 16-Port Gigabit Switch', type: 'INVENTORY', price: 950000 },
    { name: 'APC UPS Pro 1500VA', type: 'INVENTORY', price: 4200000 },
    { name: 'SanDisk Ultra Flair USB 3.0 64GB', type: 'BHP', price: 95000 },
    { name: 'Logitech B100 USB Mouse', type: 'BHP', price: 75000 },
    { name: 'Logitech K120 USB Keyboard', type: 'BHP', price: 120000 },
    { name: 'Arctic MX-4 Thermal Paste 4g', type: 'BHP', price: 85000 },
    { name: 'WD Purple 4TB Surveillance HDD', type: 'INVENTORY', price: 1650000 }
  ];

  for (let i = 0; i < 120; i++) {
    const template = procurementItemTemplates[i % procurementItemTemplates.length];
    const draft = allDrafts[i % allDrafts.length];

    const priceMultiplier = 0.8 + (Math.random() * 0.4);
    const price = Math.round((template.price * priceMultiplier) / 1000) * 1000;
    const quantity = Math.floor(Math.random() * 8) + 1;

    let status = 'PENDING';
    if (draft.status === 'APPROVED' || draft.status === 'PENDING_REVIEW') {
      status = Math.random() > 0.15 ? 'APPROVED' : 'REJECTED';
    }

    let replacedInventoryId = null;
    if (template.type === 'INVENTORY' && status === 'APPROVED' && Math.random() > 0.8) {
      const candidates = allInventories.filter(inv => inv.condition === 'BROKEN' || inv.condition === 'MAINTENANCE');
      if (candidates.length > 0) {
        replacedInventoryId = candidates[Math.floor(Math.random() * candidates.length)].id;
      }
    }

    let receiveDate = null;
    if (status === 'APPROVED' && Math.random() > 0.5) {
      receiveDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
    }

    await prisma.procurementItem.create({
      data: {
        draftId: draft.id,
        type: template.type,
        name: `${template.name} (${i + 1})`,
        price: parseFloat(price.toFixed(2)),
        quantity,
        link: `https://tokopedia.com/search?q=${encodeURIComponent(template.name)}`,
        status,
        replacedInventoryId,
        receiveDate
      }
    });
  }

  console.log(`Seeded core items and 120 additional procurement items.`);

  // 9. Seed MaintenanceLog
  console.log('Seeding Maintenance Logs...');
  const log1 = await prisma.maintenanceLog.create({
    data: {
      inventoryId: netPC1.id,
      description: 'Reinstalled Windows 11 OS, updated network drivers, and cleaned dust from chassis.',
      conditionAfter: 'GOOD',
      performedById: stafLabUser.id,
      maintenanceDate: new Date('2026-05-12T09:00:00Z'),
    },
  });

  const log2 = await prisma.maintenanceLog.create({
    data: {
      inventoryId: ciscoRouter.id,
      description: 'Firmware upgrade, diagnostic tests on LAN ports. Port 3 is physically damaged and non-responsive.',
      conditionAfter: 'MAINTENANCE',
      performedById: stafLabUser.id,
      maintenanceDate: new Date('2026-05-15T10:30:00Z'),
    },
  });

  const log3 = await prisma.maintenanceLog.create({
    data: {
      inventoryId: apcUps.id,
      description: 'Battery swelling detected. Chemical leakage present. Declared beyond repair and unsafe to use.',
      conditionAfter: 'DISPOSED',
      performedById: stafAdminUser.id,
      maintenanceDate: new Date('2026-05-18T14:15:00Z'),
    },
  });

  const logDescriptions = [
    'Cleaned dust from motherboard and power supply, reapplied high-quality thermal paste to CPU.',
    'Upgraded storage to 1TB NVMe SSD and cloned existing system partition.',
    'Replaced swollen capacitors on motherboard, verified boot sequence and stability.',
    'Patched operating system, updated antivirus definitions, and ran full system scan.',
    'Repaired broken power button casing and soldered lose cable connections.',
    'Replaced projector lamp, cleaned mirrors and lens, aligned keystone settings.',
    'Updated server firmware to latest stable version, verified RAID array status.',
    'Replaced bloated UPS battery, verified charge/discharge levels and warning alarms.',
    'Cleaned optical pick-up assembly on printer and ran print head utility.',
    'Fixed loose RJ45 keystone jack in wall outlet, re-terminated Cat6 cable.',
    'Replaced broken keyboard and mouse with new USB desktop set.',
    'Diagnosed RAM failure, replaced faulty 8GB DDR4 module with new tested stick.',
    'Reset firmware parameters to factory defaults, ran network speed diagnostics.',
    'Repaired damaged probe connectors on oscilloscope, calibrated vertical channel gains.',
    'Fixed overheating issue by installing two new 120mm chassis exhaust fans.'
  ];

  const allLogs = [log1, log2, log3];

  for (let i = 0; i < 50; i++) {
    const inventory = allInventories[i % allInventories.length];
    const descTemplate = logDescriptions[i % logDescriptions.length];
    const maintenanceDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000);
    const conditionAfter = i % 10 === 0 ? 'BROKEN' : (i % 15 === 0 ? 'DISPOSED' : 'GOOD');
    const performer = staffLabUsers[i % staffLabUsers.length];

    const log = await prisma.maintenanceLog.create({
      data: {
        inventoryId: inventory.id,
        description: `Routine maintenance: ${descTemplate}`,
        conditionAfter,
        performedById: performer.id,
        maintenanceDate
      }
    });
    allLogs.push(log);
  }

  console.log(`Seeded core maintenance logs and 50 additional logs.`);

  // 10. Seed MaintenanceBHPUsage
  console.log('Seeding Maintenance BHP Usages...');
  await prisma.maintenanceBHPUsage.create({
    data: {
      maintenanceLogId: log1.id,
      bhpId: rj45.id,
      quantity: 4,
    },
  });

  await prisma.maintenanceBHPUsage.create({
    data: {
      maintenanceLogId: log2.id,
      bhpId: utpCable.id,
      quantity: 1,
    },
  });

  for (let i = 0; i < 60; i++) {
    const log = allLogs[i % allLogs.length];
    const bhp = allBHPs[i % allBHPs.length];
    const quantity = Math.floor(Math.random() * 5) + 1;

    await prisma.maintenanceBHPUsage.create({
      data: {
        maintenanceLogId: log.id,
        bhpId: bhp.id,
        quantity
      }
    });
  }

  console.log('Seeded core maintenance BHP usages and 60 additional usage entries.');
  console.log('Seeding complete successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
