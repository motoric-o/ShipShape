const prisma = require('../config/db');

const BHPModel = {
  async findById(id, options = {}) {
    const { includeRoom = true } = options;
    return prisma.bHP.findUnique({
      where: { id: parseInt(id) },
      include: {
        room: includeRoom,
      },
    });
  },

  async findAll(filters = {}) {
    const where = {};
    if (filters.roomId) {
      where.roomId = parseInt(filters.roomId);
    }
    return prisma.bHP.findMany({
      where,
      include: { room: true },
      orderBy: { name: 'asc' },
    });
  },

  async create(data) {
    return prisma.bHP.create({
      data,
    });
  },

  async update(id, data) {
    return prisma.bHP.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async adjustStock(id, amount) {
    return prisma.bHP.update({
      where: { id: parseInt(id) },
      data: {
        stock: {
          increment: parseInt(amount),
        },
      },
    });
  },

  async delete(id) {
    return prisma.bHP.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = BHPModel;
