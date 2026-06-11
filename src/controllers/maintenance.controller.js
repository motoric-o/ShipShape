const MaintenanceModel = require('../models/maintenance.model');
const prisma = require('../config/db');
const { z } = require('zod');

const maintenanceSchema = z.object({
  inventoryId: z.coerce.number().int().positive('Inventory ID is required'),
  description: z.string().trim().min(1, 'Description is required'),
  conditionAfter: z.enum(['GOOD', 'MAINTENANCE', 'BROKEN', 'DISPOSED'], { errorMap: () => ({ message: 'Invalid condition' }) }),
  maintenanceDate: z.string().optional().or(z.literal(''))
});

const roomMaintenanceSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  maintenanceDate: z.string().optional().or(z.literal('')),
  assets: z.array(
    z.object({
      id: z.coerce.number().int().positive(),
      checked: z.string().optional(),
      conditionAfter: z.enum(['GOOD', 'MAINTENANCE', 'BROKEN', 'DISPOSED']).optional(),
      bhpUsages: z.array(
        z.object({
          bhpId: z.coerce.number().int().positive(),
          quantity: z.coerce.number().int().nonnegative()
        })
      ).optional()
    })
  ).optional()
});

const MaintenanceController = {
  // --- Web MVC Actions ---
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const inventoryId = req.query.inventoryId ? parseInt(req.query.inventoryId) : undefined;
      const performedById = req.query.performedById ? parseInt(req.query.performedById) : undefined;
      const condition = req.query.condition || '';
      const year = req.query.year ? parseInt(req.query.year) : undefined;

      const skip = (page - 1) * limit;

      const where = {
        ...(search.trim() !== '' ? {
          OR: [
            { description: { contains: search } },
            {
              items: {
                some: {
                  OR: [
                    { inventory: { name: { contains: search } } },
                    { inventory: { labelNumber: { contains: search } } }
                  ]
                }
              }
            }
          ]
        } : {}),
        ...(inventoryId ? {
          items: {
            some: {
              inventoryId
            }
          }
        } : {}),
        ...(performedById ? { performedById } : {}),
        ...(condition ? {
          items: {
            some: {
              conditionAfter: condition
            }
          }
        } : {}),
        ...(year ? {
          maintenanceDate: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`)
          }
        } : {})
      };

      // Fetch distinct years from maintenance logs
      const uniqueYearsResult = await prisma.maintenanceLog.findMany({
        select: { maintenanceDate: true },
        distinct: ['maintenanceDate'],
        orderBy: { maintenanceDate: 'desc' }
      });
      const yearsSet = new Set();
      uniqueYearsResult.forEach(log => {
        if (log.maintenanceDate) {
          yearsSet.add(new Date(log.maintenanceDate).getFullYear());
        }
      });
      let yearsList = Array.from(yearsSet);
      const currentYear = new Date().getFullYear();
      const defaultYears = [currentYear - 1, currentYear, currentYear + 1];
      defaultYears.forEach(y => {
        if (!yearsList.includes(y)) {
          yearsList.push(y);
        }
      });
      yearsList.sort((a, b) => b - a);

      // Fetch list of performers
      const performersList = await prisma.users.findMany({
        where: {
          maintenances: { some: {} }
        },
        select: { id: true, name: true, role: { select: { name: true } } },
        orderBy: { name: 'asc' }
      });
      if (performersList.length === 0) {
        const fallbackUsers = await prisma.users.findMany({
          where: {
            role: { name: { in: ['KALAB', 'STAF_LAB', 'ADMIN'] } }
          },
          select: { id: true, name: true, role: { select: { name: true } } },
          orderBy: { name: 'asc' }
        });
        performersList.push(...fallbackUsers);
      }

      const [logs, totalItems, inventories] = await Promise.all([
        prisma.maintenanceLog.findMany({
          where,
          include: {
            performedBy: { select: { id: true, name: true, email: true } },
            items: {
              include: {
                inventory: { select: { id: true, name: true, labelNumber: true } },
                bhpUsages: {
                  include: {
                    bhp: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.maintenanceLog.count({ where }),
        prisma.inventory.findMany({ orderBy: { name: 'asc' } })
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
        inventories,
        selectedInventoryId: inventoryId || '',
        selectedCondition: condition,
        selectedPerformedById: performedById || '',
        selectedYear: year || '',
        yearsList,
        performersList,
        currentQuery: req.query,
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
      const selectedInventoryId = req.query.inventoryId ? parseInt(req.query.inventoryId) : undefined;
      const [inventories, bhps, rooms] = await Promise.all([
        prisma.inventory.findMany({ orderBy: { name: 'asc' } }),
        prisma.bHP.findMany({ orderBy: { name: 'asc' } }),
        prisma.room.findMany({ orderBy: { name: 'asc' } })
      ]);
      
      let selectedRoomId = undefined;
      if (selectedInventoryId) {
        const inv = inventories.find(i => i.id === selectedInventoryId);
        if (inv) {
          selectedRoomId = inv.roomId;
        }
      }

      res.render('pages/maintenance/form', {
        inventories,
        bhps,
        rooms,
        selectedInventoryId,
        selectedRoomId,
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
      const result = roomMaintenanceSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/maintenance/new?error=${encodeURIComponent(errorMsg)}`);
      }
      const { description, maintenanceDate, assets } = result.data;
      const performedById = req.session.userId;
      if (!performedById) {
        return res.redirect('/login');
      }

      const submittedAssets = (assets || []).filter(asset => asset.checked === 'on');
      if (submittedAssets.length === 0) {
        return res.redirect('/maintenance/new?error=Silakan pilih setidaknya satu aset untuk pemeliharaan');
      }

      // Map submitted assets and their specific BHP usages to the model format
      const items = submittedAssets.map(asset => {
        const bhpUsages = (asset.bhpUsages || [])
          .map(usage => ({
            bhpId: parseInt(usage.bhpId),
            quantity: parseInt(usage.quantity)
          }))
          .filter(u => !isNaN(u.bhpId) && !isNaN(u.quantity) && u.quantity > 0);

        return {
          inventoryId: asset.id,
          conditionAfter: asset.conditionAfter || 'GOOD',
          bhpUsages
        };
      });

      await MaintenanceModel.createLog(
        {
          description,
          performedById,
          maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : undefined
        },
        items
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
      const result = maintenanceSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const { inventoryId, description, conditionAfter, maintenanceDate } = result.data;
      const performedById = req.session.userId;
      if (!performedById) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { bhpUsages } = req.body;
      const parsedBhpUsages = Array.isArray(bhpUsages) ? bhpUsages : [];
      const newLog = await MaintenanceModel.createLog(
        {
          inventoryId,
          description,
          conditionAfter,
          performedById,
          maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : undefined
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
