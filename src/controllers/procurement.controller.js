const ProcurementModel = require('../models/procurement.model');
const prisma = require('../config/db');

const ProcurementController = {
  async getAllDrafts(req, res, next) {
    try {
      const { status, year, createdById } = req.query;
      const drafts = await ProcurementModel.findAllDrafts({ status, year, createdById });
      return res.json({ drafts });
    } catch (error) {
      next(error);
    }
  },

  async getDraftDetails(req, res, next) {
    try {
      const { id } = req.params;
      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.status(404).json({ error: 'Procurement draft not found' });
      }
      return res.json({ draft });
    } catch (error) {
      next(error);
    }
  },

  async createDraft(req, res, next) {
    try {
      const { title, year } = req.body;
      const createdById = req.session.userId;
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
      }
      const parsedYear = parseInt(year);
      if (isNaN(parsedYear) || parsedYear <= 0) {
        return res.status(400).json({ error: 'Year is required and must be a positive integer' });
      }
      if (!createdById) {
        return res.status(401).json({ error: 'Authentication session is required' });
      }
      const newDraft = await ProcurementModel.createDraft({
        title: title.trim(),
        year: parsedYear,
        createdById: parseInt(createdById)
      });
      return res.status(201).json({ message: 'Procurement draft created successfully', draft: newDraft });
    } catch (error) {
      next(error);
    }
  },

  async updateDraft(req, res, next) {
    try {
      const { id } = req.params;
      const { title, year } = req.body;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.status(404).json({ error: 'Procurement draft not found' });
      }

      // Ownership authorization check for non-admin/non-staf-admin roles
      if (userRole !== 'ADMIN' && userRole !== 'STAF_ADMIN') {
        if (draft.createdById !== userId) {
          return res.status(403).json({ error: 'You are not authorized to update this draft' });
        }
      }

      // Status lock check
      if (draft.status === 'LOCKED' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot modify a draft that is locked or approved' });
      }

      const updatedData = {};
      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') {
          return res.status(400).json({ error: 'Title must be a non-empty string' });
        }
        updatedData.title = title.trim();
      }
      if (year !== undefined) {
        const parsedYear = parseInt(year);
        if (isNaN(parsedYear) || parsedYear <= 0) {
          return res.status(400).json({ error: 'Year must be a positive integer' });
        }
        updatedData.year = parsedYear;
      }

      const updatedDraft = await ProcurementModel.updateDraft(id, updatedData);
      return res.json({ message: 'Procurement draft updated successfully', draft: updatedDraft });
    } catch (error) {
      next(error);
    }
  },

  async updateDraftStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const reviewedById = req.session.userId;
      const userRole = req.session.userRole;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const allowedStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'LOCKED'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.status(404).json({ error: 'Procurement draft not found' });
      }

      // Non-admin, non-kaprodi users (like KALAB and STAF_LAB) cannot approve drafts
      if (status === 'APPROVED' && userRole !== 'ADMIN' && userRole !== 'KAPRODI') {
        return res.status(403).json({ error: 'You are not authorized to approve procurement drafts' });
      }

      const updatedDraft = await ProcurementModel.updateDraftStatus(id, status, reviewedById);
      return res.json({ message: `Draft status updated to ${status}`, draft: updatedDraft });
    } catch (error) {
      next(error);
    }
  },

  async deleteDraft(req, res, next) {
    try {
      const { id } = req.params;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.status(404).json({ error: 'Procurement draft not found' });
      }

      // Ownership check for non-admin/non-staf-admin roles
      if (userRole !== 'ADMIN' && userRole !== 'STAF_ADMIN') {
        if (draft.createdById !== userId) {
          return res.status(403).json({ error: 'You are not authorized to delete this draft' });
        }
      }

      // Status lock check
      if (draft.status === 'LOCKED' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot delete a draft that is locked or approved' });
      }

      await ProcurementModel.deleteDraft(id);
      return res.json({ message: 'Procurement draft and associated items deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  async addItem(req, res, next) {
    try {
      const { draftId } = req.params;
      const { type, name, price, quantity, link, replacedInventoryId } = req.body;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(draftId);
      if (!draft) {
        return res.status(404).json({ error: 'Procurement draft not found' });
      }

      // Ownership check for non-admin/non-staf-admin roles
      if (userRole !== 'ADMIN' && userRole !== 'STAF_ADMIN') {
        if (draft.createdById !== userId) {
          return res.status(403).json({ error: 'You are not authorized to add items to this draft' });
        }
      }

      // Status lock check
      if (draft.status === 'LOCKED' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot add items to a draft that is locked or approved' });
      }

      // Validations
      if (type !== 'INVENTORY' && type !== 'BHP') {
        return res.status(400).json({ error: 'Type must be either INVENTORY or BHP' });
      }
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
      }
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
      }
      const parsedQty = parseInt(quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
      }

      const itemData = {
        type,
        name: name.trim(),
        price: parsedPrice,
        quantity: parsedQty,
        link: link || null
      };

      if (replacedInventoryId !== undefined && replacedInventoryId !== null && replacedInventoryId !== '') {
        const invId = parseInt(replacedInventoryId);
        if (isNaN(invId)) {
          return res.status(400).json({ error: 'replacedInventoryId must be an integer' });
        }
        const inventory = await prisma.inventory.findUnique({ where: { id: invId } });
        if (!inventory) {
          return res.status(400).json({ error: 'Replaced inventory item not found' });
        }
        itemData.replacedInventoryId = invId;
      }

      const newItem = await ProcurementModel.addItemToDraft(draftId, itemData);
      return res.status(201).json({ message: 'Procurement item added successfully', item: newItem });
    } catch (error) {
      next(error);
    }
  },

  async updateItem(req, res, next) {
    try {
      const { id } = req.params;
      const { name, price, quantity, link, replacedInventoryId } = req.body;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const item = await ProcurementModel.findItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Procurement item not found' });
      }

      const draft = item.draft;
      // Ownership check for non-admin/non-staf-admin roles
      if (userRole !== 'ADMIN' && userRole !== 'STAF_ADMIN') {
        if (draft.createdById !== userId) {
          return res.status(403).json({ error: 'You are not authorized to update items in this draft' });
        }
      }

      // Status lock check
      if (draft.status === 'LOCKED' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot update items in a draft that is locked or approved' });
      }

      const updatedData = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim() === '') {
          return res.status(400).json({ error: 'Name must be a non-empty string' });
        }
        updatedData.name = name.trim();
      }
      if (price !== undefined) {
        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({ error: 'Price must be a non-negative number' });
        }
        updatedData.price = parsedPrice;
      }
      if (quantity !== undefined) {
        const parsedQty = parseInt(quantity);
        if (isNaN(parsedQty) || parsedQty <= 0) {
          return res.status(400).json({ error: 'Quantity must be a positive integer' });
        }
        updatedData.quantity = parsedQty;
      }
      if (link !== undefined) {
        updatedData.link = link || null;
      }
      if (replacedInventoryId !== undefined) {
        if (replacedInventoryId === null || replacedInventoryId === '') {
          updatedData.replacedInventoryId = null;
        } else {
          const invId = parseInt(replacedInventoryId);
          if (isNaN(invId)) {
            return res.status(400).json({ error: 'replacedInventoryId must be an integer' });
          }
          const inventory = await prisma.inventory.findUnique({ where: { id: invId } });
          if (!inventory) {
            return res.status(400).json({ error: 'Replaced inventory item not found' });
          }
          updatedData.replacedInventoryId = invId;
        }
      }

      const updatedItem = await ProcurementModel.updateItem(id, updatedData);
      return res.json({ message: 'Procurement item updated successfully', item: updatedItem });
    } catch (error) {
      next(error);
    }
  },

  async updateItemStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, receiveDate } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const allowedItemStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!allowedItemStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      const item = await ProcurementModel.findItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Procurement item not found' });
      }

      const parsedReceiveDate = receiveDate ? new Date(receiveDate) : null;
      const updatedItem = await ProcurementModel.updateItemStatus(id, status, parsedReceiveDate);
      return res.json({ message: `Item status updated to ${status}`, item: updatedItem });
    } catch (error) {
      next(error);
    }
  },

  async deleteItem(req, res, next) {
    try {
      const { id } = req.params;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const item = await ProcurementModel.findItemById(id);
      if (!item) {
        return res.status(404).json({ error: 'Procurement item not found' });
      }

      const draft = item.draft;
      // Ownership check for non-admin/non-staf-admin roles
      if (userRole !== 'ADMIN' && userRole !== 'STAF_ADMIN') {
        if (draft.createdById !== userId) {
          return res.status(403).json({ error: 'You are not authorized to delete items from this draft' });
        }
      }

      // Status lock check
      if (draft.status === 'LOCKED' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot delete items from a draft that is locked or approved' });
      }

      await ProcurementModel.deleteItem(id);
      return res.json({ message: 'Procurement item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = ProcurementController;
