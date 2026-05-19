const ProcurementModel = require('../models/procurement.model');

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
      if (!title || !year || !createdById) {
        return res.status(400).json({ error: 'Title, year, and active session user are required' });
      }
      const newDraft = await ProcurementModel.createDraft({
        title,
        year: parseInt(year),
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
      const updatedData = {};
      if (title) updatedData.title = title;
      if (year) updatedData.year = parseInt(year);

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
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
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
      if (!type || !name || !price || !quantity) {
        return res.status(400).json({ error: 'Type, name, price, and quantity are required' });
      }
      const itemData = {
        type,
        name,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        link
      };
      if (replacedInventoryId) {
        itemData.replacedInventoryId = parseInt(replacedInventoryId);
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
      const updatedData = {};
      if (name) updatedData.name = name;
      if (price) updatedData.price = parseFloat(price);
      if (quantity) updatedData.quantity = parseInt(quantity);
      if (link !== undefined) updatedData.link = link;
      if (replacedInventoryId !== undefined) {
        updatedData.replacedInventoryId = replacedInventoryId ? parseInt(replacedInventoryId) : null;
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
      await ProcurementModel.deleteItem(id);
      return res.json({ message: 'Procurement item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = ProcurementController;
