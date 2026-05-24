const MaintenanceModel = require('../models/maintenance.model');
const prisma = require('../config/db');

const MaintenanceController = {
  // --- Web MVC Actions ---
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const inventoryId = req.query.inventoryId ? parseInt(req.query.inventoryId) : undefined;
      const performedById = req.query.performedById ? parseInt(req.query.performedById) : undefined;

      const skip = (page - 1) * limit;

      const where = {
        ...(search.trim() !== '' ? {
          description: { contains: search }
        } : {}),
        ...(inventoryId ? { inventoryId } : {}),
        ...(performedById ? { performedById } : {})
      };

      const [logs, totalItems] = await Promise.all([
        prisma.maintenanceLog.findMany({
          where,
          include: {
            inventory: { select: { id: true, name: true, labelNumber: true } },
            performedBy: { select: { id: true, name: true, email: true } },
            bhpUsages: {
              include: {
                bhp: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.maintenanceLog.count({ where })
      ]);

      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = totalItems === 0 ? 0 : skip + 1;
      const endIndex = Math.min(skip + limit, totalItems);

      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(totalPages, startPage + 4);
      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }
      const pages = [];
      for (let p = startPage; p <= endPage; p++) {
        pages.push(p);
      }

      res.render('pages/maintenance/index', {
        logs,
        sessionUser: req.session,
        searchActionUrl: '/maintenance',
        searchPlaceholder: 'Cari log pemeliharaan...',
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          limit,
          startIndex,
          endIndex,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          search,
          pages
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching maintenance logs');
    }
  },

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const log = await MaintenanceModel.findLogById(id);
      if (!log) {
        return res.redirect('/maintenance');
      }
      res.render('pages/maintenance/show', {
        log,
        sessionUser: req.session
      });
    } catch (error) {
      console.error(error);
      res.redirect('/maintenance');
    }
  },

  async create(req, res, next) {
    try {
      const [inventories, bhps] = await Promise.all([
        prisma.inventory.findMany({ orderBy: { name: 'asc' } }),
        prisma.bHP.findMany({ orderBy: { name: 'asc' } })
      ]);
      res.render('pages/maintenance/form', {
        inventories,
        bhps,
        sessionUser: req.session,
        backUrl: '/maintenance',
        actionUrl: '/maintenance',
        isPut: false
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  },

  async store(req, res, next) {
    try {
      const { inventoryId, description, conditionAfter, maintenanceDate, bhpUsages } = req.body;
      const performedById = req.session.userId;
      if (!inventoryId || !conditionAfter || !performedById) {
        return res.redirect('/maintenance/new?error=inventoryId, conditionAfter, and active session user are required');
      }

      let parsedBhpUsages = [];
      if (Array.isArray(bhpUsages)) {
        parsedBhpUsages = bhpUsages.map(usage => ({
          bhpId: parseInt(usage.bhpId),
          quantity: parseInt(usage.quantity)
        })).filter(u => !isNaN(u.bhpId) && !isNaN(u.quantity) && u.quantity > 0);
      } else if (bhpUsages && typeof bhpUsages === 'object') {
        for (const [key, val] of Object.entries(bhpUsages)) {
          const bhpId = parseInt(key);
          const quantity = parseInt(val);
          if (!isNaN(bhpId) && !isNaN(quantity) && quantity > 0) {
            parsedBhpUsages.push({ bhpId, quantity });
          }
        }
      }

      await MaintenanceModel.createLog(
        {
          inventoryId: parseInt(inventoryId),
          description,
          conditionAfter,
          performedById,
          maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : undefined
        },
        parsedBhpUsages
      );
      res.redirect('/maintenance');
    } catch (error) {
      console.error('Error creating maintenance log:', error);
      res.redirect(`/maintenance/new?error=${encodeURIComponent(error.message)}`);
    }
  },

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      await MaintenanceModel.deleteLog(id);
      res.redirect('/maintenance');
    } catch (error) {
      console.error(error);
      res.redirect('/maintenance');
    }
  },

  // --- API JSON Actions ---
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
      if (error.message.includes('not found') || error.message.includes('stock') || error.message.includes('positive integer')) {
        return res.status(400).json({ error: error.message });
      }
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
