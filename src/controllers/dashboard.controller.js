const prisma = require('../config/db');

const DashboardController = {
  async admin(req, res, next) {
    try {
      const totalUsers = await prisma.users.count();
      const totalRooms = await prisma.room.count();

      res.render('pages/dashboards/admin_home', {
        sessionUser: req.session,
        stats: {
          totalUsers,
          totalRooms
        }
      });
    } catch (error) {
      console.error('Admin Dashboard Error:', error);
      next(error);
    }
  },

  async kaprodi(req, res, next) {
    try {
      const pendingReviewsCount = await prisma.procurementDraft.count({
        where: { status: 'PENDING_REVIEW' }
      });
      const approvedItemsCount = await prisma.procurementItem.count({
        where: { status: 'APPROVED' }
      });
      const rejectedItemsCount = await prisma.procurementItem.count({
        where: { status: 'REJECTED' }
      });

      res.render('pages/dashboards/kaprodi_home', {
        sessionUser: req.session,
        stats: {
          pendingReviewsCount,
          approvedItemsCount,
          rejectedItemsCount
        }
      });
    } catch (error) {
      console.error('Kaprodi Dashboard Error:', error);
      next(error);
    }
  },

  async kalab(req, res, next) {
    try {
      const processingDraftsCount = await prisma.procurementDraft.count({
        where: {
          status: { in: ['DRAFT', 'PENDING_REVIEW'] }
        }
      });
      const finalizedProposalsCount = await prisma.procurementDraft.count({
        where: { status: 'APPROVED' }
      });
      
      const items = await prisma.procurementItem.findMany({
        select: { price: true, quantity: true }
      });
      const totalCapitalProjected = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalCapitalProjectedFormatted = 'Rp ' + totalCapitalProjected.toLocaleString('id-ID');

      res.render('pages/dashboards/kepala_lab_home', {
        sessionUser: req.session,
        stats: {
          processingDraftsCount,
          finalizedProposalsCount,
          totalCapitalProjected: totalCapitalProjectedFormatted
        }
      });
    } catch (error) {
      console.error('Kalab Dashboard Error:', error);
      next(error);
    }
  },

  async stafAdmin(req, res, next) {
    try {
      const arrivalsCount = await prisma.procurementItem.count({
        where: {
          status: 'APPROVED',
          receiveDate: null
        }
      });
      const unlabelledCount = await prisma.inventory.count({
        where: {
          OR: [
            { labelNumber: null },
            { labelNumber: '' }
          ]
        }
      });
      const usersCount = await prisma.users.count();
      const roomsCount = await prisma.room.count();
      const inventoryCount = await prisma.inventory.count();
      const bhpCount = await prisma.bHP.count();
      const totalRecordsCount = usersCount + roomsCount + inventoryCount + bhpCount;

      res.render('pages/dashboards/staf_admin_home', {
        sessionUser: req.session,
        stats: {
          arrivalsCount,
          unlabelledCount,
          totalRecordsCount
        }
      });
    } catch (error) {
      console.error('Staf Admin Dashboard Error:', error);
      next(error);
    }
  },

  async stafLab(req, res, next) {
    try {
      const shortageCount = await prisma.bHP.count({
        where: {
          stock: { lte: 5 }
        }
      });
      const maintenanceCount = await prisma.maintenanceLog.count();
      const servicedAssetsCount = await prisma.inventory.count({
        where: {
          condition: 'GOOD'
        }
      });

      res.render('pages/dashboards/staf_lab_home', {
        sessionUser: req.session,
        stats: {
          shortageCount,
          maintenanceCount,
          servicedAssetsCount
        }
      });
    } catch (error) {
      console.error('Staf Lab Dashboard Error:', error);
      next(error);
    }
  },

  async stafAdminQRScanner(req, res, next) {
    try {
      res.render('pages/dashboards/staf_admin_qr_scanner', {
        sessionUser: req.session
      });
    } catch (error) {
      console.error('Staf Admin QR Scanner page error:', error);
      next(error);
    }
  },

  async searchQRLabel(req, res, next) {
    try {
      const { label } = req.query;
      if (!label) {
        return res.status(400).json({ error: 'Label parameter is required' });
      }

      const item = await prisma.inventory.findUnique({
        where: { labelNumber: label }
      });

      if (item) {
        return res.json({ found: true, id: item.id, name: item.name });
      }

      return res.json({ found: false });
    } catch (error) {
      console.error('QR search error:', error);
      next(error);
    }
  }
};

module.exports = DashboardController;
