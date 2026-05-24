const prisma = require('../config/db');

const MaintenanceModel = {
  async findLogById(id) {
    return prisma.maintenanceLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        inventory: {
          include: { room: true },
        },
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        bhpUsages: {
          include: {
            bhp: true,
          },
        },
      },
    });
  },

  async findAllLogs(filters = {}) {
    const where = {};
    if (filters.inventoryId) {
      where.inventoryId = parseInt(filters.inventoryId);
    }
    if (filters.performedById) {
      where.performedById = parseInt(filters.performedById);
    }

    return prisma.maintenanceLog.findMany({
      where,
      include: {
        inventory: {
          select: { name: true, labelNumber: true },
        },
        performedBy: {
          select: { name: true },
        },
      },
      orderBy: { maintenanceDate: 'desc' },
    });
  },

  async createLog(logData, bhpUsages = []) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify inventory item exists
      const inventory = await tx.inventory.findUnique({
        where: { id: parseInt(logData.inventoryId) }
      });
      if (!inventory) {
        throw new Error(`Inventory item with ID ${logData.inventoryId} not found`);
      }

      const log = await tx.maintenanceLog.create({
        data: {
          inventoryId: parseInt(logData.inventoryId),
          description: logData.description,
          conditionAfter: logData.conditionAfter,
          performedById: parseInt(logData.performedById),
          maintenanceDate: logData.maintenanceDate ? new Date(logData.maintenanceDate) : new Date(),
        },
      });

      for (const usage of bhpUsages) {
        const bhpId = parseInt(usage.bhpId);
        const qty = parseInt(usage.quantity);

        if (isNaN(bhpId) || bhpId <= 0) {
          throw new Error('bhpId must be a positive integer');
        }
        if (isNaN(qty) || qty <= 0) {
          throw new Error('BHP quantity must be a positive integer');
        }

        // Verify BHP item exists and has enough stock
        const bhp = await tx.bHP.findUnique({
          where: { id: bhpId }
        });
        if (!bhp) {
          throw new Error(`BHP item with ID ${bhpId} not found`);
        }
        if (bhp.stock < qty) {
          throw new Error(`Insufficient stock for BHP item: ${bhp.name}. Available: ${bhp.stock}, requested: ${qty}`);
        }

        await tx.maintenanceBHPUsage.create({
          data: {
            maintenanceLogId: log.id,
            bhpId: bhpId,
            quantity: qty,
          },
        });

        await tx.bHP.update({
          where: { id: bhpId },
          data: {
            stock: {
              decrement: qty,
            },
          },
        });
      }

      await tx.inventory.update({
        where: { id: parseInt(logData.inventoryId) },
        data: {
          condition: logData.conditionAfter,
        },
      });

      return log;
    });
  },

  async deleteLog(id) {
    return prisma.$transaction(async (tx) => {
      await tx.maintenanceBHPUsage.deleteMany({
        where: { maintenanceLogId: parseInt(id) },
      });

      return tx.maintenanceLog.delete({
        where: { id: parseInt(id) },
      });
    });
  },
};

module.exports = MaintenanceModel;
