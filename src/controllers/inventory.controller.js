const InventoryModel = require('../models/inventory.model');

const InventoryController = {
  async getAllInventory(req, res, next) {
    try {
      const { roomId, condition } = req.query;
      const inventories = await InventoryModel.findAll({ roomId, condition });
      return res.json({ inventories });
    } catch (error) {
      next(error);
    }
  },

  async getInventoryDetails(req, res, next) {
    try {
      const { id } = req.params;
      const inventory = await InventoryModel.findById(id, { includeRoom: true, includeMaintenanceLogs: true });
      if (!inventory) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      return res.json({ inventory });
    } catch (error) {
      next(error);
    }
  },

  async createInventory(req, res, next) {
    try {
      const { name, labelNumber, qrCodePhotoPath, condition, roomId } = req.body;
      if (!name || !roomId) {
        return res.status(400).json({ error: 'Name and roomId are required' });
      }
      const newItem = await InventoryModel.create({
        name,
        labelNumber,
        qrCodePhotoPath,
        condition,
        roomId: parseInt(roomId)
      });
      return res.status(201).json({ message: 'Inventory item created successfully', item: newItem });
    } catch (error) {
      next(error);
    }
  },

  async updateInventory(req, res, next) {
    try {
      const { id } = req.params;
      const { name, labelNumber, qrCodePhotoPath, condition, roomId } = req.body;
      const updatedData = { name, labelNumber, qrCodePhotoPath, condition };
      if (roomId) {
        updatedData.roomId = parseInt(roomId);
      }
      const updatedItem = await InventoryModel.update(id, updatedData);
      return res.json({ message: 'Inventory item updated successfully', item: updatedItem });
    } catch (error) {
      next(error);
    }
  },

  async deleteInventory(req, res, next) {
    try {
      const { id } = req.params;
      await InventoryModel.delete(id);
      return res.json({ message: 'Inventory item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = InventoryController;
