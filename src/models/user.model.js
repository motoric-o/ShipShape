const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const UserModel = {
  async findById(id) {
    return prisma.users.findUnique({
      where: { id: parseInt(id) },
    });
  },

  async findByEmail(email) {
    return prisma.users.findUnique({
      where: { email },
    });
  },

  async findAll(where = {}) {
    return prisma.users.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data) {
    const payload = { ...data };
    if (payload.password) {
      payload.password = bcrypt.hashSync(payload.password, 10);
    }
    return prisma.users.create({
      data: payload,
    });
  },

  async update(id, data) {
    const payload = { ...data };
    if (payload.password) {
      payload.password = bcrypt.hashSync(payload.password, 10);
    }
    return prisma.users.update({
      where: { id: parseInt(id) },
      data: payload,
    });
  },

  async delete(id) {
    return prisma.users.delete({
      where: { id: parseInt(id) },
    });
  },

  verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  },
};

module.exports = UserModel;
