const MaintenanceModel = require('../models/maintenance.model');

const MaintenanceController = {
  async getAllLogs(req, res, next) {
    try {
      const { inventoryId, performedById } = req.query;
      const logs = await MaintenanceModel.findAllLogs({ inventoryId, performedById });
      return res.json({ logs });
    } catch (error) {
      next(error);
    }
  },

  async getLogDetails(req, res, next) {
    try {
      const { id } = req.params;
      const log = await MaintenanceModel.findLogById(id);
      if (!log) {
        return res.status(404).json({ error: 'Maintenance log not found' });
      }
      return res.json({ log });
    } catch (error) {
      next(error);
    }
  },

  async createLog(req, res, next) {
    try {
      const { inventoryId, description, conditionAfter, maintenanceDate, bhpUsages } = req.body;
      const performedById = req.session.userId;
      if (!inventoryId || !conditionAfter || !performedById) {
        return res.status(400).json({ error: 'inventoryId, conditionAfter, and active session user are required' });
      }
      const parsedBhpUsages = Array.isArray(bhpUsages) ? bhpUsages : [];
      const newLog = await MaintenanceModel.createLog(
        {
          inventoryId,
          description,
          conditionAfter,
          performedById,
          maintenanceDate
        },
        parsedBhpUsages
      );
      return res.status(201).json({ message: 'Maintenance log created successfully', log: newLog });
    } catch (error) {
      next(error);
    }
  },

  async deleteLog(req, res, next) {
    try {
      const { id } = req.params;
      await MaintenanceModel.deleteLog(id);
      return res.json({ message: 'Maintenance log deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = MaintenanceController;
