const prisma = require('../config/db');

const InventoryModel = {
  async findById(id, options = {}) {
    const { includeRoom = true, includeMaintenanceLogs = false } = options;
    return prisma.inventory.findUnique({
      where: { id: parseInt(id) },
      include: {
        room: includeRoom,
        maintenanceItems: includeMaintenanceLogs ? {
          include: {
            maintenanceLog: {
              include: {
                performedBy: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        } : false,
      },
    });
  },

  async findByLabelNumber(labelNumber) {
    return prisma.inventory.findUnique({
      where: { labelNumber },
      include: { room: true },
    });
  },

  async findAll(filters = {}) {
    const where = {};
    if (filters.roomId) {
      where.roomId = parseInt(filters.roomId);
    }
    if (filters.condition) {
      where.condition = filters.condition;
    }
    return prisma.inventory.findMany({
      where,
      include: { room: true },
      orderBy: { labelNumber: 'asc' },
    });
  },

  async create(data) {
    return prisma.inventory.create({
      data,
    });
  },

  async update(id, data) {
    return prisma.inventory.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async delete(id) {
    return prisma.inventory.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = InventoryModel;
