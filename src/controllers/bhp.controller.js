const BHPModel = require('../models/bhp.model');
const prisma = require('../config/db');
const { z } = require('zod');

const bhpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  stock: z.coerce.number().int().nonnegative('Stock must be a non-negative integer'),
  unit: z.string().trim().min(1, 'Unit is required'),
  roomId: z.coerce.number().int().positive('Room is required')
});

const bhpUpdateSchema = bhpSchema.partial();

const BHPController = {
  // --- Web MVC Actions ---
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const roomId = req.query.roomId ? parseInt(req.query.roomId) : undefined;
      
      const skip = (page - 1) * limit;

      const where = {
        ...(search.trim() !== '' ? {
          name: { contains: search }
        } : {}),
        ...(roomId ? { roomId } : {})
      };

      const [bhps, totalItems, rooms] = await Promise.all([
        prisma.bHP.findMany({
          where,
          include: { room: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.bHP.count({ where }),
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

      res.render('pages/bhp/index', {
        bhps,
        rooms,
        selectedRoomId: roomId || '',
        sessionUser: req.session,
        searchActionUrl: '/bhp',
        searchPlaceholder: 'Cari BHP...',
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
      res.status(500).send('Error fetching BHPs');
    }
  },

  async create(req, res, next) {
    try {
      const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      res.render('pages/bhp/form', {
        sessionUser: req.session,
        rooms,
        backUrl: '/bhp',
        actionUrl: '/bhp',
        isPut: false
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  },

  async store(req, res, next) {
    try {
      const result = bhpSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/bhp/new?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, stock, unit, roomId } = result.data;
      await BHPModel.create({
        name,
        stock,
        unit,
        roomId
      });
      res.redirect('/bhp');
    } catch (error) {
      console.error('Error creating BHP:', error);
      res.redirect('/bhp/new?error=Failed to create BHP');
    }
  },

  async edit(req, res, next) {
    try {
      const bhp = await BHPModel.findById(req.params.id);
      if (!bhp) return res.redirect('/bhp');
      const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      res.render('pages/bhp/form', {
        sessionUser: req.session,
        bhp,
        rooms,
        backUrl: '/bhp',
        actionUrl: `/bhp/${bhp.id}?_method=PUT`,
        isPut: true
      });
    } catch (error) {
      console.error(error);
      res.redirect('/bhp');
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = bhpUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/bhp/${id}/edit?error=${encodeURIComponent(errorMsg)}`);
      }
      await BHPModel.update(id, result.data);
      res.redirect('/bhp');
    } catch (error) {
      console.error('Error updating BHP:', error);
      res.redirect(`/bhp/${req.params.id}/edit?error=Failed to update BHP`);
    }
  },

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      await BHPModel.delete(id);
      res.redirect('/bhp');
    } catch (error) {
      console.error(error);
      res.redirect('/bhp');
    }
  },

  // --- API JSON Actions & Shared Actions ---
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
      const result = bhpSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const newBHP = await BHPModel.create(result.data);
      return res.status(201).json({ message: 'BHP item created successfully', bhp: newBHP });
    } catch (error) {
      next(error);
    }
  },

  async updateBHP(req, res, next) {
    try {
      const { id } = req.params;
      const result = bhpUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const updatedBHP = await BHPModel.update(id, result.data);
      return res.json({ message: 'BHP item updated successfully', bhp: updatedBHP });
    } catch (error) {
      next(error);
    }
  },

  async setStock(req, res, next) {
    try {
      const { id } = req.params;
      const { stock } = req.body;
      const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.headers['content-type'] === 'application/json' || req.originalUrl.startsWith('/api');
      
      const stockSchema = z.coerce.number().int().nonnegative('Stock must be a non-negative integer');
      const stockResult = stockSchema.safeParse(stock);
      if (!stockResult.success) {
        const errorMsg = stockResult.error.errors.map(e => e.message).join(', ');
        if (isApi) return res.status(400).json({ error: errorMsg });
        return res.redirect(`/bhp?error=${encodeURIComponent(errorMsg)}`);
      }
      const parsedStock = stockResult.data;

      const bhp = await BHPModel.findById(id);
      if (!bhp) {
        if (isApi) return res.status(404).json({ error: 'BHP item not found' });
        return res.redirect(`/bhp?error=BHP item not found`);
      }

      const updatedBHP = await BHPModel.setStock(id, parsedStock);
      if (isApi) {
        return res.json({ message: 'BHP stock updated successfully', bhp: updatedBHP });
      }
      res.redirect('/bhp');
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
