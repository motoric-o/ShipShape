const prisma = require('../config/db');

const RoomModel = {
  async findById(id, options = {}) {
    const { includeInventories = false, includeBHPs = false } = options;
    return prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: {
        inventories: includeInventories,
        bhps: includeBHPs,
      },
    });
  },

  async findAll() {
    return prisma.room.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async create(data) {
    return prisma.room.create({
      data,
    });
  },

  async update(id, data) {
    return prisma.room.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async delete(id) {
    return prisma.room.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = RoomModel;
