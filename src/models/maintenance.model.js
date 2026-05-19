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
        await tx.maintenanceBHPUsage.create({
          data: {
            maintenanceLogId: log.id,
            bhpId: parseInt(usage.bhpId),
            quantity: parseInt(usage.quantity),
          },
        });

        await tx.bHP.update({
          where: { id: parseInt(usage.bhpId) },
          data: {
            stock: {
              decrement: parseInt(usage.quantity),
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
