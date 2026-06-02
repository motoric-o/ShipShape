const ProcurementModel = require('../models/procurement.model');
const prisma = require('../config/db');
const { z } = require('zod');

const draftSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  year: z.coerce.number().int().positive('Year must be a positive integer')
});

const draftUpdateSchema = draftSchema.partial();

const itemSchema = z.object({
  type: z.enum(['INVENTORY', 'BHP'], { errorMap: () => ({ message: 'Type must be either INVENTORY or BHP' }) }),
  name: z.string().trim().min(1, 'Name is required'),
  price: z.coerce.number().nonnegative('Price must be a non-negative number'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  link: z.string().trim().nullable().optional().transform(v => v === '' ? null : v),
  replacedInventoryId: z.any()
});

const itemUpdateSchema = itemSchema.partial();

const ProcurementController = {
  // --- Web MVC Actions ---
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const sortBy = req.query.sortBy || 'latest';
      const year = req.query.year ? parseInt(req.query.year) : undefined;
      const createdById = req.query.createdById ? parseInt(req.query.createdById) : undefined;

      const skip = (page - 1) * limit;

      const where = {
        ...(search.trim() !== '' ? {
          title: { contains: search }
        } : {}),
        ...(status.trim() !== '' ? { status } : {}),
        ...(year ? { year } : {}),
        ...(createdById ? { createdById } : {})
      };

      let orderBy = { createdAt: 'desc' };
      if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
      else if (sortBy === 'names') orderBy = { title: 'asc' };
      else if (sortBy === 'status') orderBy = { status: 'asc' };
      else if (sortBy === 'item_amount') orderBy = { items: { _count: 'desc' } };

      const [drafts, totalItems] = await Promise.all([
        prisma.procurementDraft.findMany({
          where,
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            reviewedBy: { select: { id: true, name: true, email: true } },
            items: true
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.procurementDraft.count({ where })
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

      res.render('pages/procurements/index', {
        drafts,
        selectedStatus: status,
        selectedSort: sortBy,
        currentQuery: req.query,
        selectedYear: year || '',
        sessionUser: req.session,
        searchActionUrl: '/procurements',
        searchPlaceholder: 'Cari pengadaan...',
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
      res.status(500).send('Error fetching procurements');
    }
  },

  async show(req, res, next) {
    try {
      const { id } = req.params;
      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.redirect('/procurements');
      }
      const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      const inventoryItems = await prisma.inventory.findMany({ orderBy: { name: 'asc' } });
      res.render('pages/procurements/show', {
        draft,
        rooms,
        inventoryItems,
        sessionUser: req.session
      });
    } catch (error) {
      console.error(error);
      res.redirect('/procurements');
    }
  },

  async create(req, res, next) {
    try {
      res.render('pages/procurements/form', {
        sessionUser: req.session,
        backUrl: '/procurements',
        actionUrl: '/procurements',
        isPut: false
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  },

  async store(req, res, next) {
    try {
      const result = draftSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/procurements/new?error=${encodeURIComponent(errorMsg)}`);
      }
      const { title, year } = result.data;
      const createdById = req.session.userId;
      if (!createdById) {
        return res.redirect('/login');
      }
      const newDraft = await ProcurementModel.createDraft({
        title,
        year,
        createdById: parseInt(createdById)
      });
      res.redirect(`/procurements/${newDraft.id}`);
    } catch (error) {
      console.error('Error creating draft:', error);
      res.redirect('/procurements/new?error=Failed to create draft');
    }
  },

  async edit(req, res, next) {
    try {
      const draft = await ProcurementModel.findDraftById(req.params.id);
      if (!draft) return res.redirect('/procurements');
      res.render('pages/procurements/form', {
        sessionUser: req.session,
        draft,
        backUrl: `/procurements/${draft.id}`,
        actionUrl: `/procurements/${draft.id}?_method=PUT`,
        isPut: true
      });
    } catch (error) {
      console.error(error);
      res.redirect('/procurements');
    }
  },

  async update(req, res, next) {
    const { id } = req.params;
    try {
      const result = draftUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/procurements/${id}/edit?error=${encodeURIComponent(errorMsg)}`);
      }
      
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.redirect('/procurements');
      }

      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        return res.redirect(`/procurements/${id}?error=You are not authorized to update this draft`);
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        return res.redirect(`/procurements/${id}?error=Cannot modify a draft that is pending review or approved`);
      }

      await ProcurementModel.updateDraft(id, result.data);
      res.redirect(`/procurements/${id}`);
    } catch (error) {
      console.error('Error updating draft:', error);
      res.redirect(`/procurements/${id}/edit?error=Failed to update draft`);
    }
  },

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.redirect('/procurements');
      }

      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        return res.redirect(`/procurements/${id}?error=You are not authorized to delete this draft`);
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        return res.redirect(`/procurements/${id}?error=Cannot delete a draft that is pending review or approved`);
      }

      await ProcurementModel.deleteDraft(id);
      res.redirect('/procurements');
    } catch (error) {
      console.error(error);
      res.redirect('/procurements');
    }
  },

  // --- API JSON Actions & Shared Actions ---
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
      const result = draftSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const { title, year } = result.data;
      const createdById = req.session.userId;
      if (!createdById) {
        return res.status(401).json({ error: 'Authentication session is required' });
      }
      const newDraft = await ProcurementModel.createDraft({
        title,
        year,
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
      const result = draftUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ error: errorMsg });
      }
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        return res.status(404).json({ error: 'Procurement draft not found' });
      }

      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        return res.status(403).json({ error: 'You are not authorized to update this draft' });
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot modify a draft that is pending review or approved' });
      }

      const updatedDraft = await ProcurementModel.updateDraft(id, result.data);
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
      const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.headers['content-type'] === 'application/json' || req.originalUrl.startsWith('/api');

      if (!status) {
        if (isApi) return res.status(400).json({ error: 'Status is required' });
        return res.redirect(`/procurements/${id}?error=Status is required`);
      }

      const allowedStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED'];
      if (!allowedStatuses.includes(status)) {
        if (isApi) return res.status(400).json({ error: 'Invalid status value' });
        return res.redirect(`/procurements/${id}?error=Invalid status value`);
      }

      const draft = await ProcurementModel.findDraftById(id);
      if (!draft) {
        if (isApi) return res.status(404).json({ error: 'Procurement draft not found' });
        return res.redirect(`/procurements?error=Procurement draft not found`);
      }

      // Check transitions and roles
      if (status === 'APPROVED') {
        if (userRole !== 'KAPRODI') {
          if (isApi) return res.status(403).json({ error: 'You are not authorized to approve/finalize procurement drafts' });
          return res.redirect(`/procurements/${id}?error=You are not authorized to approve/finalize procurement drafts`);
        }
        if (draft.status !== 'PENDING_REVIEW') {
          if (isApi) return res.status(400).json({ error: 'Only pending review drafts can be approved/finalized' });
          return res.redirect(`/procurements/${id}?error=Only pending review drafts can be approved/finalized`);
        }
        const hasPendingItems = draft.items.some(item => item.status === 'PENDING');
        if (hasPendingItems) {
          if (isApi) return res.status(400).json({ error: 'Cannot finalize draft. All items must be either APPROVED or REJECTED.' });
          return res.redirect(`/procurements/${id}?error=Cannot finalize draft. All items must be either APPROVED or REJECTED.`);
        }
      } else if (status === 'DRAFT') {
        if (userRole !== 'KAPRODI' && (userRole !== 'KALAB' || draft.createdById !== reviewedById)) {
          if (isApi) return res.status(403).json({ error: 'You are not authorized to reset this draft status' });
          return res.redirect(`/procurements/${id}?error=You are not authorized to reset this draft status`);
        }
        if (draft.status !== 'PENDING_REVIEW') {
          if (isApi) return res.status(400).json({ error: 'Only pending review drafts can be returned to DRAFT status' });
          return res.redirect(`/procurements/${id}?error=Only pending review drafts can be returned to DRAFT status`);
        }
      } else if (status === 'PENDING_REVIEW') {
        if (userRole !== 'KALAB' || draft.createdById !== reviewedById) {
          if (isApi) return res.status(403).json({ error: 'You are not authorized to submit this draft' });
          return res.redirect(`/procurements/${id}?error=You are not authorized to submit this draft`);
        }
        if (draft.status !== 'DRAFT') {
          if (isApi) return res.status(400).json({ error: 'Only drafts in DRAFT status can be submitted for review' });
          return res.redirect(`/procurements/${id}?error=Only drafts in DRAFT status can be submitted for review`);
        }
      }

      const updatedDraft = await ProcurementModel.updateDraftStatus(id, status, reviewedById);
      if (isApi) {
        return res.json({ message: `Draft status updated to ${status}`, draft: updatedDraft });
      }
      res.redirect(`/procurements/${id}`);
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

      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        return res.status(403).json({ error: 'You are not authorized to delete this draft' });
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        return res.status(400).json({ error: 'Cannot delete a draft that is pending review or approved' });
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
      const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.headers['content-type'] === 'application/json' || req.originalUrl.startsWith('/api');
      
      const result = itemSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        if (isApi) return res.status(400).json({ error: errorMsg });
        return res.redirect(`/procurements/${draftId}?error=${encodeURIComponent(errorMsg)}`);
      }
      
      const { type, name, price, quantity, link, replacedInventoryId } = result.data;
      const userRole = req.session.userRole;
      const userId = req.session.userId;

      const draft = await ProcurementModel.findDraftById(draftId);
      if (!draft) {
        if (isApi) return res.status(404).json({ error: 'Procurement draft not found' });
        return res.redirect(`/procurements?error=Procurement draft not found`);
      }

      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        if (isApi) return res.status(403).json({ error: 'You are not authorized to add items to this draft' });
        return res.redirect(`/procurements/${draftId}?error=You are not authorized to add items to this draft`);
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        if (isApi) return res.status(400).json({ error: 'Cannot add items to a draft that is pending review or approved' });
        return res.redirect(`/procurements/${draftId}?error=Cannot add items to a draft that is pending review or approved`);
      }

      const itemData = {
        type,
        name,
        price,
        quantity,
        link
      };

      if (replacedInventoryId !== undefined && replacedInventoryId !== null && replacedInventoryId !== '') {
        const invId = parseInt(replacedInventoryId);
        if (isNaN(invId)) {
          if (isApi) return res.status(400).json({ error: 'replacedInventoryId must be an integer' });
          return res.redirect(`/procurements/${draftId}?error=replacedInventoryId must be an integer`);
        }
        const inventory = await prisma.inventory.findUnique({ where: { id: invId } });
        if (!inventory) {
          if (isApi) return res.status(400).json({ error: 'Replaced inventory item not found' });
          return res.redirect(`/procurements/${draftId}?error=Replaced inventory item not found`);
        }
        itemData.replacedInventoryId = invId;
      }

      const newItem = await ProcurementModel.addItemToDraft(draftId, itemData);
      if (isApi) {
        return res.status(201).json({ message: 'Procurement item added successfully', item: newItem });
      }
      res.redirect(`/procurements/${draftId}`);
    } catch (error) {
      next(error);
    }
  },

  async updateItem(req, res, next) {
    try {
      const { id } = req.params;
      const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.headers['content-type'] === 'application/json' || req.originalUrl.startsWith('/api');
      
      const item = await ProcurementModel.findItemById(id);
      if (!item) {
        if (isApi) return res.status(404).json({ error: 'Procurement item not found' });
        return res.redirect(`/procurements?error=Procurement item not found`);
      }

      const draft = item.draft;
      const draftId = draft.id;

      const result = itemUpdateSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        if (isApi) return res.status(400).json({ error: errorMsg });
        return res.redirect(`/procurements/${draftId}?error=${encodeURIComponent(errorMsg)}`);
      }

      const userRole = req.session.userRole;
      const userId = req.session.userId;

      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        if (isApi) return res.status(403).json({ error: 'You are not authorized to update items in this draft' });
        return res.redirect(`/procurements/${draftId}?error=You are not authorized to update items in this draft`);
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        if (isApi) return res.status(400).json({ error: 'Cannot update items in a draft that is pending review or approved' });
        return res.redirect(`/procurements/${draftId}?error=Cannot update items in a draft that is pending review or approved`);
      }

      const updatedData = { ...result.data };
      
      // replacedInventoryId validation manually
      const { replacedInventoryId } = req.body;
      if (replacedInventoryId !== undefined) {
        if (replacedInventoryId === null || replacedInventoryId === '') {
          updatedData.replacedInventoryId = null;
        } else {
          const invId = parseInt(replacedInventoryId);
          if (isNaN(invId)) {
            if (isApi) return res.status(400).json({ error: 'replacedInventoryId must be an integer' });
            return res.redirect(`/procurements/${draftId}?error=replacedInventoryId must be an integer`);
          }
          const inventory = await prisma.inventory.findUnique({ where: { id: invId } });
          if (!inventory) {
            if (isApi) return res.status(400).json({ error: 'Replaced inventory item not found' });
            return res.redirect(`/procurements/${draftId}?error=Replaced inventory item not found`);
          }
          updatedData.replacedInventoryId = invId;
        }
      }

      const updatedItem = await ProcurementModel.updateItem(id, updatedData);
      if (isApi) {
        return res.json({ message: 'Procurement item updated successfully', item: updatedItem });
      }
      res.redirect(`/procurements/${draftId}`);
    } catch (error) {
      next(error);
    }
  },

  async updateItemStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, receiveDate } = req.body;
      const userRole = req.session.userRole;
      const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.headers['content-type'] === 'application/json' || req.originalUrl.startsWith('/api');

      if (!status) {
        if (isApi) return res.status(400).json({ error: 'Status is required' });
        return res.redirect(`/procurements?error=Status is required`);
      }

      const allowedItemStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!allowedItemStatuses.includes(status)) {
        if (isApi) return res.status(400).json({ error: 'Invalid status value' });
        return res.redirect(`/procurements?error=Invalid status value`);
      }

      const item = await ProcurementModel.findItemById(id);
      if (!item) {
        if (isApi) return res.status(404).json({ error: 'Procurement item not found' });
        return res.redirect(`/procurements?error=Procurement item not found`);
      }

      const draft = item.draft;
      const draftId = draft.id;

      // Case 1: Recording receiveDate (receipt logistics)
      if (receiveDate !== undefined && receiveDate !== null && receiveDate !== '') {
        if (userRole !== 'STAF_ADMIN') {
          if (isApi) return res.status(403).json({ error: 'Only Staf Admin can record item receipts' });
          return res.redirect(`/procurements/${draftId}?error=Only Staf Admin can record item receipts`);
        }
        if (draft.status !== 'APPROVED') {
          if (isApi) return res.status(400).json({ error: 'Items can only be received after the draft is finalized and approved' });
          return res.redirect(`/procurements/${draftId}?error=Items can only be received after the draft is finalized and approved`);
        }
        if (status !== 'APPROVED' && item.status !== 'APPROVED') {
          if (isApi) return res.status(400).json({ error: 'Only approved items can be marked as received' });
          return res.redirect(`/procurements/${draftId}?error=Only approved items can be marked as received`);
        }
      } 
      // Case 2: Approving or Rejecting items (Kaprodi review)
      else {
        if (userRole !== 'KAPRODI') {
          if (isApi) return res.status(403).json({ error: 'Only Kaprodi can approve/reject procurement items' });
          return res.redirect(`/procurements/${draftId}?error=Only Kaprodi can approve/reject procurement items`);
        }
        if (draft.status !== 'PENDING_REVIEW') {
          if (isApi) return res.status(400).json({ error: 'Items can only be approved/rejected when the draft is pending review' });
          return res.redirect(`/procurements/${draftId}?error=Items can only be approved/rejected when the draft is pending review`);
        }
      }

      const parsedReceiveDate = receiveDate ? new Date(receiveDate) : null;
      const finalReceiveDate = status === 'REJECTED' ? null : parsedReceiveDate;
      const isNewlyReceived = item.receiveDate === null && finalReceiveDate !== null;

      const updatedItem = await ProcurementModel.updateItemStatus(id, status, finalReceiveDate);

      // Automatic asset registration if newly received and is of type INVENTORY
      if (isNewlyReceived && item.type === 'INVENTORY') {
        let roomId = null;
        if (item.replacedInventoryId) {
          const replaced = await prisma.inventory.findUnique({
            where: { id: item.replacedInventoryId }
          });
          if (replaced) roomId = replaced.roomId;
        }

        if (!roomId) {
          const defaultRoom = await prisma.room.findFirst({
            orderBy: { id: 'asc' }
          });
          roomId = defaultRoom ? defaultRoom.id : 1;
        }

        const promises = [];
        for (let i = 0; i < item.quantity; i++) {
          promises.push(
            prisma.inventory.create({
              data: {
                name: item.name,
                condition: 'GOOD',
                roomId: roomId
              }
            })
          );
        }
        await Promise.all(promises);
      }

      if (isApi) {
        return res.json({ message: `Item status updated to ${status}`, item: updatedItem });
      }
      res.redirect(`/procurements/${draftId}`);
    } catch (error) {
      next(error);
    }
  },

  async deleteItem(req, res, next) {
    try {
      const { id } = req.params;
      const userRole = req.session.userRole;
      const userId = req.session.userId;
      const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.headers['content-type'] === 'application/json' || req.originalUrl.startsWith('/api');

      const item = await ProcurementModel.findItemById(id);
      if (!item) {
        if (isApi) return res.status(404).json({ error: 'Procurement item not found' });
        return res.redirect(`/procurements?error=Procurement item not found`);
      }

      const draft = item.draft;
      const draftId = draft.id;
      if (userRole !== 'KALAB' || draft.createdById !== userId) {
        if (isApi) return res.status(403).json({ error: 'You are not authorized to delete items from this draft' });
        return res.redirect(`/procurements/${draftId}?error=You are not authorized to delete items from this draft`);
      }

      if (draft.status === 'PENDING_REVIEW' || draft.status === 'APPROVED') {
        if (isApi) return res.status(400).json({ error: 'Cannot delete items from a draft that is pending review or approved' });
        return res.redirect(`/procurements/${draftId}?error=Cannot delete items from a draft that is pending review or approved`);
      }

      await ProcurementModel.deleteItem(id);
      if (isApi) {
        return res.json({ message: 'Procurement item deleted successfully' });
      }
      res.redirect(`/procurements/${draftId}`);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = ProcurementController;
