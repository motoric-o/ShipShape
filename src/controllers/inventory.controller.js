const InventoryModel = require('../models/inventory.model');
const prisma = require('../config/db');
const { z } = require('zod');
const { logActivity } = require('../utils/activity-logger');

const inventorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  labelNumber: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
  qrCodePhotoPath: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
  condition: z.enum(['GOOD', 'MAINTENANCE', 'BROKEN', 'DISPOSED']).optional().default('GOOD'),
  roomId: z.coerce.number().int().positive('Room is required')
});

const inventoryUpdateSchema = inventorySchema.partial();

function getAssetPrefix(name) {
  const lower = name.toLowerCase();
  if (lower.includes('thinkcentre') || lower.includes('optiplex') || lower.includes('computer') || lower.includes('pc') || lower.includes('desktop')) return 'PC';
  if (lower.includes('router') || lower.includes('rtr')) return 'RTR';
  if (lower.includes('switch') || lower.includes('sw')) return 'SW';
  if (lower.includes('oscilloscope') || lower.includes('osc')) return 'OSC';
  if (lower.includes('projector') || lower.includes('prj')) return 'PRJ';
  if (lower.includes('server') || lower.includes('srv')) return 'SRV';
  if (lower.includes('ups')) return 'UPS';
  if (lower.includes('printer') || lower.includes('laserjet') || lower.includes('prn')) return 'PRN';
  if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('kbd') || lower.includes('combo')) return 'KBD';
  if (lower.includes('monitor') || lower.includes('mon')) return 'MON';
  if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('lap')) return 'LAP';
  if (lower.includes('raspberry') || lower.includes('pi') || lower.includes('sbc')) return 'SBC';
  if (lower.includes('arduino') || lower.includes('ard')) return 'ARD';
  if (lower.includes('soldering') || lower.includes('hakko') || lower.includes('sld')) return 'SLD';
  if (lower.includes('multimeter') || lower.includes('fluke') || lower.includes('dmm')) return 'DMM';
  if (lower.includes('nas') || lower.includes('diskstation')) return 'NAS';
  if (lower.includes('access point') || lower.includes('ubiquiti') || lower.includes('ap')) return 'AP';
  if (lower.includes('label')) return 'LBL';
  if (lower.includes('headset') || lower.includes('audio') || lower.includes('sound') || lower.includes('aud')) return 'AUD';
  return 'EQP';
}

async function generateLabelNumber(name, roomId) {
  const prefix = getAssetPrefix(name);
  const pattern = `LAB-R${roomId}-${prefix}-`;
  
  const items = await prisma.inventory.findMany({
    where: {
      labelNumber: {
        startsWith: pattern
      }
    },
    select: {
      labelNumber: true
    }
  });

  let nextSeq = 100;
  if (items.length > 0) {
    const numbers = items
      .map(item => {
        const match = item.labelNumber.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num >= 100);
    
    if (numbers.length > 0) {
      nextSeq = Math.max(...numbers) + 1;
    }
  }

  return `${pattern}${String(nextSeq).padStart(3, '0')}`;
}

const InventoryController = {
  getAssetPrefix,
  generateLabelNumber,
  // --- Web MVC Actions ---
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const roomId = req.query.roomId ? parseInt(req.query.roomId) : undefined;
      const condition = req.query.condition || '';
      const labelStatus = req.query.labelStatus || '';
      const qrStatus = req.query.qrStatus || '';
      
      const skip = (page - 1) * limit;

      const where = {
        ...(search.trim() !== '' ? {
          OR: [
            { name: { contains: search } },
            { labelNumber: { contains: search } }
          ]
        } : {}),
        ...(roomId ? { roomId } : {}),
        ...(condition.trim() !== '' ? { condition } : {}),
        ...(labelStatus === 'labeled' ? {
          AND: [
            { labelNumber: { not: null } },
            { labelNumber: { not: '' } }
          ]
        } : {}),
        ...(labelStatus === 'unlabeled' ? {
          OR: [
            { labelNumber: null },
            { labelNumber: '' }
          ]
        } : {}),
        ...(qrStatus === 'has_qr' ? {
          AND: [
            { qrCodePhotoPath: { not: null } },
            { qrCodePhotoPath: { not: '' } }
          ]
        } : {}),
        ...(qrStatus === 'no_qr' ? {
          OR: [
            { qrCodePhotoPath: null },
            { qrCodePhotoPath: '' }
          ]
        } : {})
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
        selectedLabelStatus: labelStatus,
        selectedQrStatus: qrStatus,
        currentQuery: req.query,
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
        const errorMsg = result.error.issues.map(e => e.message).join(', ');
        return res.redirect(`/inventory/new?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, condition, roomId } = result.data;

      // Auto-generate label number
      const labelNumber = await generateLabelNumber(name, roomId);

      // Handle file upload
      let qrCodePhotoPath = null;
      if (req.file) {
        qrCodePhotoPath = `/uploads/${req.file.filename}`;
      }

      const newInventory = await InventoryModel.create({
        name,
        labelNumber,
        qrCodePhotoPath,
        condition,
        roomId
      });
      await logActivity(req.session.userId, 'Inventory', newInventory.id, 'CREATE', null, newInventory);
      res.redirect('/inventory');
    } catch (error) {
      console.error('Error creating inventory:', error);
      res.redirect('/inventory/new?error=Failed to create inventory');
    }
  },

  async show(req, res, next) {
    try {
      const item = await InventoryModel.findById(req.params.id, { includeRoom: true, includeMaintenanceLogs: true });
      if (!item) return res.redirect('/inventory');
      res.render('pages/inventory/show', {
        sessionUser: req.session,
        item
      });
    } catch (error) {
      console.error(error);
      res.redirect('/inventory');
    }
  },

  async qr(req, res, next) {
    try {
      const item = await InventoryModel.findById(req.params.id);
      if (!item) return res.status(404).send('Not Found');
      
      const qrcode = require('qrcode');
      // Encode labelNumber instead of url
      const qrContent = item.labelNumber || `ITEM-${item.id}`;
      
      const qrImageBuffer = await qrcode.toBuffer(qrContent, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      
      res.setHeader('Content-Type', 'image/png');
      res.send(qrImageBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error generating QR code');
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
        const errorMsg = result.error.issues.map(e => e.message).join(', ');
        return res.redirect(`/inventory/${id}/edit?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, condition, roomId } = result.data;
      
      const originalItem = await InventoryModel.findById(id);
      if (!originalItem) return res.redirect('/inventory');

      const updateData = { name, condition, roomId };
      if (req.file) {
        updateData.qrCodePhotoPath = `/uploads/${req.file.filename}`;
      }

      if (roomId && roomId !== originalItem.roomId) {
        updateData.labelNumber = await generateLabelNumber(name || originalItem.name, roomId);
      }

      const updatedItem = await InventoryModel.update(id, updateData);
      await logActivity(req.session.userId, 'Inventory', id, 'UPDATE', originalItem, updatedItem);
      res.redirect('/inventory');
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.redirect(`/inventory/${req.params.id}/edit?error=Failed to update inventory`);
    }
  },

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const originalItem = await InventoryModel.findById(id);
      await InventoryModel.delete(id);
      await logActivity(req.session.userId, 'Inventory', id, 'DELETE', originalItem, null);
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
        const errorMsg = result.error.issues.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const { name, condition, roomId } = result.data;
      
      const labelNumber = await generateLabelNumber(name, roomId);
      
      const newItem = await InventoryModel.create({
        ...result.data,
        labelNumber
      });
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
        const errorMsg = result.error.issues.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const { name, roomId } = result.data;

      const originalItem = await InventoryModel.findById(id);
      if (!originalItem) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const updateData = { ...result.data };
      if (roomId && roomId !== originalItem.roomId) {
        updateData.labelNumber = await generateLabelNumber(name || originalItem.name, roomId);
      }

      const updatedItem = await InventoryModel.update(id, updateData);
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
