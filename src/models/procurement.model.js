const prisma = require('../config/db');

const ProcurementModel = {
  async findDraftById(id) {
    return prisma.procurementDraft.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            replacedInventory: true,
            room: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        reviewedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  },

  async findAllDrafts(filters = {}) {
    const where = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.year) {
      where.year = parseInt(filters.year);
    }
    if (filters.createdById) {
      where.createdById = parseInt(filters.createdById);
    }

    return prisma.procurementDraft.findMany({
      where,
      include: {
        createdBy: {
          select: { name: true },
        },
        reviewedBy: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async createDraft(data) {
    return prisma.procurementDraft.create({
      data,
    });
  },

  async updateDraft(id, data) {
    return prisma.procurementDraft.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async updateDraftStatus(id, status, reviewedById = null) {
    const data = { status };
    if (reviewedById) {
      data.reviewedById = parseInt(reviewedById);
    }
    return prisma.procurementDraft.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async deleteDraft(id) {
    await prisma.procurementItem.deleteMany({
      where: { draftId: parseInt(id) },
    });

    return prisma.procurementDraft.delete({
      where: { id: parseInt(id) },
    });
  },

  async findItemById(id) {
    return prisma.procurementItem.findUnique({
      where: { id: parseInt(id) },
      include: {
        draft: true,
        replacedInventory: true,
        room: true,
      },
    });
  },

  async addItemToDraft(draftId, itemData) {
    return prisma.procurementItem.create({
      data: {
        ...itemData,
        draftId: parseInt(draftId),
      },
    });
  },

  async updateItem(id, data) {
    return prisma.procurementItem.update({
      where: { id: parseInt(id) },
      data,
    });
  },

  async updateItemStatus(id, status, receiveDate = null) {
    return prisma.procurementItem.update({
      where: { id: parseInt(id) },
      data: {
        status,
        receiveDate,
      },
    });
  },

  async deleteItem(id) {
    return prisma.procurementItem.delete({
      where: { id: parseInt(id) },
    });
  },
};

module.exports = ProcurementModel;
