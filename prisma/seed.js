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

  console.log(`Seeded 5 users: ${adminUser.email}, ${kaprodiUser.email}, ${kalabUser.email}, ${stafAdminUser.email}, ${stafLabUser.email}`);

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

  console.log(`Seeded 3 rooms: ${netLab.name}, ${hwLab.name}, ${serverRoom.name}`);

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

  console.log(`Seeded BHP items: ${rj45.name}, ${utpCable.name}, ${solderWire.name}, ${cableTies.name}`);

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

  console.log('Seeded inventories.');

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

  console.log(`Seeded procurement drafts: "${draft1.title}", "${draft2.title}", "${draft3.title}"`);

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

  console.log('Seeded procurement items.');

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

  console.log('Seeded maintenance logs.');

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
      quantity: 1, // 1 roll of UTP Cable used
    },
  });

  console.log('Seeded maintenance BHP usages.');

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
