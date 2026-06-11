const prisma = require('../config/db');

const MaintenanceModel = {
  async findLogById(id) {
    return prisma.maintenanceLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        items: {
          include: {
            inventory: {
              include: { room: true },
            },
            bhpUsages: {
              include: {
                bhp: true,
              },
            },
          },
        },
      },
    });
  },

  async findAllLogs(filters = {}) {
    const where = {};
    if (filters.inventoryId) {
      where.items = {
        some: {
          inventoryId: parseInt(filters.inventoryId)
        }
      };
    }
    if (filters.performedById) {
      where.performedById = parseInt(filters.performedById);
    }

    return prisma.maintenanceLog.findMany({
      where,
      include: {
        items: {
          include: {
            inventory: {
              select: { name: true, labelNumber: true },
            },
            bhpUsages: {
              include: {
                bhp: true
              }
            }
          }
        },
        performedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { maintenanceDate: 'desc' },
    });
  },

  async createLog(logData, bhpUsagesOrItems = []) {
    let items = [];
    if (logData.inventoryId) {
      // Old format: single asset log
      items = [{
        inventoryId: logData.inventoryId,
        conditionAfter: logData.conditionAfter || 'GOOD',
        bhpUsages: bhpUsagesOrItems
      }];
    } else {
      // New format: bhpUsagesOrItems is the list of items
      items = bhpUsagesOrItems;
    }

    return prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.create({
        data: {
          description: logData.description,
          performedById: parseInt(logData.performedById),
          maintenanceDate: logData.maintenanceDate ? new Date(logData.maintenanceDate) : new Date(),
        },
      });

      for (const item of items) {
        const inventoryId = parseInt(item.inventoryId);
        const inventory = await tx.inventory.findUnique({
          where: { id: inventoryId }
        });
        if (!inventory) {
          throw new Error(`Inventory item with ID ${inventoryId} not found`);
        }

        const maintenanceItem = await tx.maintenanceItem.create({
          data: {
            maintenanceLogId: log.id,
            inventoryId: inventoryId,
            conditionAfter: item.conditionAfter,
          },
        });

        const bhpUsages = item.bhpUsages || [];
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
              maintenanceItemId: maintenanceItem.id,
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
          where: { id: inventoryId },
          data: {
            condition: item.conditionAfter,
          },
        });
      }

      return log;
    });
  },

  async deleteLog(id) {
    return prisma.maintenanceLog.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = MaintenanceModel;
