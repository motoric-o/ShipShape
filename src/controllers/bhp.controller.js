const BHPModel = require('../models/bhp.model');

const BHPController = {
  async getAllBHP(req, res, next) {
    try {
      const { roomId } = req.query;
      const bhps = await BHPModel.findAll({ roomId });
      return res.json({ bhps });
    } catch (error) {
      next(error);
    }
  },

  async getBHPDetails(req, res, next) {
    try {
      const { id } = req.params;
      const bhp = await BHPModel.findById(id, { includeRoom: true });
      if (!bhp) {
        return res.status(404).json({ error: 'BHP item not found' });
      }
      return res.json({ bhp });
    } catch (error) {
      next(error);
    }
  },

  async createBHP(req, res, next) {
    try {
      const { name, stock, unit, roomId } = req.body;
      if (!name || !roomId) {
        return res.status(400).json({ error: 'Name and roomId are required' });
      }
      const newBHP = await BHPModel.create({
        name,
        stock: stock ? parseInt(stock) : 0,
        unit,
        roomId: parseInt(roomId)
      });
      return res.status(201).json({ message: 'BHP item created successfully', bhp: newBHP });
    } catch (error) {
      next(error);
    }
  },

  async updateBHP(req, res, next) {
    try {
      const { id } = req.params;
      const { name, stock, unit, roomId } = req.body;
      const updatedData = { name, unit };
      if (stock !== undefined) {
        updatedData.stock = parseInt(stock);
      }
      if (roomId) {
        updatedData.roomId = parseInt(roomId);
      }
      const updatedBHP = await BHPModel.update(id, updatedData);
      return res.json({ message: 'BHP item updated successfully', bhp: updatedBHP });
    } catch (error) {
      next(error);
    }
  },

  async adjustStock(req, res, next) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      if (amount === undefined) {
        return res.status(400).json({ error: 'Adjustment amount is required' });
      }
      const updatedBHP = await BHPModel.adjustStock(id, amount);
      return res.json({ message: 'BHP stock adjusted successfully', bhp: updatedBHP });
    } catch (error) {
      next(error);
    }
  },

  async deleteBHP(req, res, next) {
    try {
      const { id } = req.params;
      await BHPModel.delete(id);
      return res.json({ message: 'BHP item deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = BHPController;
