const InventoryModel = require('../models/inventory.model');
const prisma = require('../config/db');
const { z } = require('zod');

const inventorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  labelNumber: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
  qrCodePhotoPath: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
  condition: z.enum(['GOOD', 'MAINTENANCE', 'BROKEN', 'DISPOSED']).optional().default('GOOD'),
  roomId: z.coerce.number().int().positive('Room is required')
});

const inventoryUpdateSchema = inventorySchema.partial();

const InventoryController = {
  // --- Web MVC Actions ---
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const roomId = req.query.roomId ? parseInt(req.query.roomId) : undefined;
      const condition = req.query.condition || '';
      
      const skip = (page - 1) * limit;

      const where = {
        ...(search.trim() !== '' ? {
          OR: [
            { name: { contains: search } },
            { labelNumber: { contains: search } }
          ]
        } : {}),
        ...(roomId ? { roomId } : {}),
        ...(condition.trim() !== '' ? { condition } : {})
      };

      const [inventories, totalItems, rooms] = await Promise.all([
        prisma.inventory.findMany({
          where,
          include: { room: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.inventory.count({ where }),
        prisma.room.findMany({ orderBy: { name: 'asc' } })
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

      res.render('pages/inventory/index', {
        inventories,
        rooms,
        selectedRoomId: roomId || '',
        selectedCondition: condition,
        sessionUser: req.session,
        searchActionUrl: '/inventory',
        searchPlaceholder: 'Cari inventaris...',
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
      res.status(500).send('Error fetching inventories');
    }
  },

  async create(req, res, next) {
    try {
      const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      res.render('pages/inventory/form', {
        sessionUser: req.session,
        rooms,
        backUrl: '/inventory',
        actionUrl: '/inventory',
        isPut: false
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  },

  async store(req, res, next) {
    try {
      const result = inventorySchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/inventory/new?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, labelNumber, qrCodePhotoPath, condition, roomId } = result.data;
      if (labelNumber) {
        const existing = await InventoryModel.findByLabelNumber(labelNumber);
        if (existing) {
          return res.redirect('/inventory/new?error=Label number already exists');
        }
      }
      await InventoryModel.create({
        name,
        labelNumber,
        qrCodePhotoPath,
        condition,
        roomId
      });
      res.redirect('/inventory');
    } catch (error) {
      console.error('Error creating inventory:', error);
      res.redirect('/inventory/new?error=Failed to create inventory');
    }
  },

  async edit(req, res, next) {
    try {
      const item = await InventoryModel.findById(req.params.id);
      if (!item) return res.redirect('/inventory');
      const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      res.render('pages/inventory/form', {
        sessionUser: req.session,
        item,
        rooms,
        backUrl: '/inventory',
        actionUrl: `/inventory/${item.id}?_method=PUT`,
        isPut: true
      });
    } catch (error) {
      console.error(error);
      res.redirect('/inventory');
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = inventoryUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/inventory/${id}/edit?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, labelNumber, qrCodePhotoPath, condition, roomId } = result.data;
      if (labelNumber) {
        const existing = await InventoryModel.findByLabelNumber(labelNumber);
        if (existing && existing.id !== parseInt(id)) {
          return res.redirect(`/inventory/${id}/edit?error=Label number already exists`);
        }
      }
      await InventoryModel.update(id, { name, labelNumber, qrCodePhotoPath, condition, roomId });
      res.redirect('/inventory');
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.redirect(`/inventory/${req.params.id}/edit?error=Failed to update inventory`);
    }
  },

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      await InventoryModel.delete(id);
      res.redirect('/inventory');
    } catch (error) {
      console.error(error);
      res.redirect('/inventory');
    }
  },

  // --- API JSON Actions ---
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
      const result = inventorySchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const { name, labelNumber, qrCodePhotoPath, condition, roomId } = result.data;
      if (labelNumber) {
        const existing = await InventoryModel.findByLabelNumber(labelNumber);
        if (existing) {
          return res.status(400).json({ error: 'Label number already exists' });
        }
      }
      const newItem = await InventoryModel.create(result.data);
      return res.status(201).json({ message: 'Inventory item created successfully', item: newItem });
    } catch (error) {
      next(error);
    }
  },

  async updateInventory(req, res, next) {
    try {
      const { id } = req.params;
      const result = inventoryUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const { labelNumber } = result.data;
      if (labelNumber) {
        const existing = await InventoryModel.findByLabelNumber(labelNumber);
        if (existing && existing.id !== parseInt(id)) {
          return res.status(400).json({ error: 'Label number already exists' });
        }
      }
      const updatedItem = await InventoryModel.update(id, result.data);
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
