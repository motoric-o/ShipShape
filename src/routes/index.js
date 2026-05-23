const express = require('express');
const router = express.Router();

const DashboardController = require('../controllers/dashboard.controller');
const UserController = require('../controllers/user.controller');
const AuthController = require('../controllers/auth.controller');
const RoomController = require('../controllers/room.controller');
const InventoryController = require('../controllers/inventory.controller');
const BHPController = require('../controllers/bhp.controller');
const ProcurementController = require('../controllers/procurement.controller');
const MaintenanceController = require('../controllers/maintenance.controller');

// MVC Web Middlewares
const { requireWebAuth: requireAuth, requireWebRole: requireRole, requireApiAuth, requireApiRole } = require('../middleware/auth.middleware');

// --- Global Middleware ---
router.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// --- Auth Routes ---
router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);

// --- Root Redirect ---
router.get('/', (req, res) => {
  if (req.session.userId) {
    const role = req.session.userRole;
    if (role === 'ADMIN') return res.redirect('/admin');
    if (role === 'KAPRODI') return res.redirect('/kaprodi');
    if (role === 'STAF_ADMIN') return res.redirect('/staf-admin');
    if (role === 'KALAB') return res.redirect('/kalab');
    if (role === 'STAF_LAB') return res.redirect('/staf-lab');
    return res.redirect('/rooms');
  }
  res.redirect('/login');
});

// --- Dashboard Routes ---
router.get('/admin', requireAuth, requireRole(['ADMIN']), DashboardController.admin);
router.get('/kaprodi', requireAuth, requireRole(['KAPRODI']), DashboardController.kaprodi);
router.get('/staf-admin', requireAuth, requireRole(['STAF_ADMIN']), DashboardController.stafAdmin);
router.get('/kalab', requireAuth, requireRole(['KALAB']), DashboardController.kalab);
router.get('/staf-lab', requireAuth, requireRole(['STAF_LAB']), DashboardController.stafLab);

// --- User Routes ---
router.get('/users', requireAuth, requireRole(['ADMIN']), UserController.index);
router.get('/users/new', requireAuth, requireRole(['ADMIN']), UserController.create);
router.post('/users', requireAuth, requireRole(['ADMIN']), UserController.store);
router.get('/users/:id/edit', requireAuth, requireRole(['ADMIN']), UserController.edit);
router.put('/users/:id', requireAuth, requireRole(['ADMIN']), UserController.update);
router.delete('/users/:id', requireAuth, requireRole(['ADMIN']), UserController.destroy);

// --- Room Routes ---
router.get('/rooms', requireAuth, requireRole(['ADMIN']), RoomController.index);
router.get('/rooms/new', requireAuth, requireRole(['ADMIN']), RoomController.create);
router.post('/rooms', requireAuth, requireRole(['ADMIN']), RoomController.store);
router.get('/rooms/:id/edit', requireAuth, requireRole(['ADMIN']), RoomController.edit);
router.put('/rooms/:id', requireAuth, requireRole(['ADMIN']), RoomController.update);
router.delete('/rooms/:id', requireAuth, requireRole(['ADMIN']), RoomController.destroy);

// --- Legacy JSON API Routes ---
// These remain functional but under the /api/ prefix
router.get('/api/inventory', requireApiAuth, InventoryController.getAllInventory);
router.get('/api/inventory/:id', requireApiAuth, InventoryController.getInventoryDetails);
router.post('/api/inventory', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), InventoryController.createInventory);
router.put('/api/inventory/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), InventoryController.updateInventory);
router.delete('/api/inventory/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), InventoryController.deleteInventory);

router.get('/api/bhp', requireApiAuth, BHPController.getAllBHP);
router.get('/api/bhp/:id', requireApiAuth, BHPController.getBHPDetails);
router.post('/api/bhp', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), BHPController.createBHP);
router.put('/api/bhp/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), BHPController.updateBHP);
router.patch('/api/bhp/:id/stock', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), BHPController.adjustStock);
router.delete('/api/bhp/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), BHPController.deleteBHP);

router.get('/api/procurements', requireApiAuth, ProcurementController.getAllDrafts);
router.get('/api/procurements/:id', requireApiAuth, ProcurementController.getDraftDetails);
router.post('/api/procurements', requireApiAuth, requireApiRole(['ADMIN', 'STAF_ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.createDraft);
router.put('/api/procurements/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.updateDraft);
router.patch('/api/procurements/:id/status', requireApiAuth, requireApiRole(['ADMIN', 'KAPRODI', 'KALAB', 'STAF_LAB']), ProcurementController.updateDraftStatus);
router.delete('/api/procurements/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.deleteDraft);

router.post('/api/procurements/:draftId/items', requireApiAuth, requireApiRole(['ADMIN', 'STAF_ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.addItem);
router.put('/api/procurements/items/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.updateItem);
router.patch('/api/procurements/items/:id/status', requireApiAuth, requireApiRole(['ADMIN', 'KALAB', 'KAPRODI', 'STAF_ADMIN']), ProcurementController.updateItemStatus);
router.delete('/api/procurements/items/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.deleteItem);

router.get('/api/maintenance', requireApiAuth, MaintenanceController.getAllLogs);
router.get('/api/maintenance/:id', requireApiAuth, MaintenanceController.getLogDetails);
router.post('/api/maintenance', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), MaintenanceController.createLog);
router.delete('/api/maintenance/:id', requireApiAuth, requireApiRole(['ADMIN', 'STAF_LAB']), MaintenanceController.deleteLog);

module.exports = router;
