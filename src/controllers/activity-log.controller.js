const prisma = require('../config/db');
const { logActivity } = require('../utils/activity-logger');

function getPrismaModel(entityType) {
  if (entityType === 'Room') return prisma.room;
  if (entityType === 'Inventory') return prisma.inventory;
  if (entityType === 'BHP') return prisma.bHP;
  if (entityType === 'ProcurementDraft') return prisma.procurementDraft;
  if (entityType === 'ProcurementItem') return prisma.procurementItem;
  if (entityType === 'MaintenanceLog') return prisma.maintenanceLog;
  if (entityType === 'Users') return prisma.users;
  return null;
}

const ActivityLogController = {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const search = req.query.search || '';
      const entityTypeFilter = req.query.entityType || '';
      const actionFilter = req.query.action || '';

      const skip = (page - 1) * limit;

      const where = {
        ...(entityTypeFilter ? { entityType: entityTypeFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(search.trim() !== '' ? {
          OR: [
            { user: { name: { contains: search } } },
            { entityType: { contains: search } },
            { action: { contains: search } }
          ]
        } : {})
      };

      const [logs, totalItems] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.activityLog.count({ where })
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

      // Unique entity types and actions for filter dropdowns
      const entityTypes = ['Room', 'Inventory', 'BHP', 'ProcurementDraft', 'ProcurementItem', 'MaintenanceLog', 'Users'];
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'ROLLBACK'];

      res.render('pages/activity-log/index', {
        logs,
        entityTypes,
        actions,
        selectedEntityType: entityTypeFilter,
        selectedAction: actionFilter,
        sessionUser: req.session,
        searchActionUrl: '/admin/activity-log',
        searchPlaceholder: 'Cari log...',
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
      res.status(500).send('Error fetching activity logs');
    }
  },

  async show(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      const log = await prisma.activityLog.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      if (!log) {
        return res.redirect('/admin/activity-log?error=Log tidak ditemukan');
      }

      const prev = log.previousState ? JSON.parse(log.previousState) : null;
      const curr = log.currentState ? JSON.parse(log.currentState) : null;

      const keys = Array.from(new Set([
        ...(prev ? Object.keys(prev) : []),
        ...(curr ? Object.keys(curr) : [])
      ])).filter(k => k !== 'createdAt' && k !== 'updatedAt');

      const diff = keys.map(key => {
        const oldValue = prev ? prev[key] : undefined;
        const newValue = curr ? curr[key] : undefined;
        
        let isDifferent = false;
        if (oldValue !== newValue) {
          if (typeof oldValue === 'object' && typeof newValue === 'object') {
            isDifferent = JSON.stringify(oldValue) !== JSON.stringify(newValue);
          } else {
            isDifferent = true;
          }
        }

        return { key, oldValue, newValue, isDifferent };
      });

      res.render('pages/activity-log/show', {
        log,
        prev,
        curr,
        diff,
        sessionUser: req.session
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching activity log details');
    }
  },

  async rollback(req, res, next) {
    try {
      const logId = parseInt(req.params.id);
      const log = await prisma.activityLog.findUnique({
        where: { id: logId }
      });

      if (!log) {
        return res.redirect('/admin/activity-log?error=Log tidak ditemukan');
      }

      const prismaModel = getPrismaModel(log.entityType);
      if (!prismaModel) {
        return res.redirect(`/admin/activity-log/${logId}?error=Model entitas tidak didukung untuk rollback`);
      }

      const entityId = log.entityId;

      if (log.action === 'CREATE') {
        // Rollback creation = Delete the created item
        const currentItem = await prismaModel.findUnique({ where: { id: entityId } });
        if (currentItem) {
          await prismaModel.delete({ where: { id: entityId } });
          await logActivity(req.session.userId, log.entityType, entityId, 'ROLLBACK', currentItem, null);
        } else {
          return res.redirect(`/admin/activity-log/${logId}?error=Entitas sudah tidak ada atau telah dihapus`);
        }
      } else if (log.action === 'UPDATE') {
        // Rollback update = Revert values to previousState
        if (!log.previousState) {
          return res.redirect(`/admin/activity-log/${logId}?error=Data versi sebelumnya tidak ditemukan`);
        }
        const prev = JSON.parse(log.previousState);
        const currentItem = await prismaModel.findUnique({ where: { id: entityId } });
        if (!currentItem) {
          return res.redirect(`/admin/activity-log/${logId}?error=Entitas saat ini tidak ditemukan. Tidak dapat rollback update.`);
        }

        const dataToUpdate = { ...prev };
        // Remove meta keys
        delete dataToUpdate.id;
        delete dataToUpdate.createdAt;
        delete dataToUpdate.updatedAt;

        const updated = await prismaModel.update({
          where: { id: entityId },
          data: dataToUpdate
        });
        await logActivity(req.session.userId, log.entityType, entityId, 'ROLLBACK', currentItem, updated);
      } else if (log.action === 'DELETE') {
        // Rollback deletion = Recreate entity with previousState values
        if (!log.previousState) {
          return res.redirect(`/admin/activity-log/${logId}?error=Data versi sebelumnya tidak ditemukan`);
        }
        const prev = JSON.parse(log.previousState);
        
        // Check if there is already an active entity with the same ID
        const existing = await prismaModel.findUnique({ where: { id: entityId } });
        if (existing) {
          // If it was soft-deleted in Users, we can just restore it
          if (log.entityType === 'Users') {
            const updated = await prismaModel.update({
              where: { id: entityId },
              data: { deletedAt: null, isActive: true }
            });
            await logActivity(req.session.userId, log.entityType, entityId, 'ROLLBACK', existing, updated);
          } else {
            return res.redirect(`/admin/activity-log/${logId}?error=Entitas dengan ID tersebut sudah ada`);
          }
        } else {
          // Hard recreate
          const dataToCreate = { ...prev };
          // Keep the ID so foreign key links work
          const recreated = await prismaModel.create({
            data: dataToCreate
          });
          await logActivity(req.session.userId, log.entityType, recreated.id, 'ROLLBACK', null, recreated);
        }
      } else if (log.action === 'ROLLBACK') {
        return res.redirect(`/admin/activity-log/${logId}?error=Tidak dapat me-rollback aksi rollback`);
      }

      res.redirect(`/admin/activity-log?success=Berhasil melakukan rollback data`);
    } catch (err) {
      console.error('Rollback error:', err);
      res.redirect(`/admin/activity-log/${req.params.id}?error=Gagal melakukan rollback: ${encodeURIComponent(err.message)}`);
    }
  }
};

module.exports = ActivityLogController;
