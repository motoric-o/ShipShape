const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const RoomController = require('../controllers/room.controller');
const InventoryController = require('../controllers/inventory.controller');
const BHPController = require('../controllers/bhp.controller');
const ProcurementController = require('../controllers/procurement.controller');
const MaintenanceController = require('../controllers/maintenance.controller');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.userRole)) {
      return res.status(403).json({ error: 'Access forbidden: insufficient permissions' });
    }
    next();
  };
}

router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', AuthController.me);

router.get('/rooms', requireAuth, RoomController.getAllRooms);
router.get('/rooms/:id', requireAuth, RoomController.getRoomDetails);
router.post('/rooms', requireAuth, requireRole(['ADMIN']), RoomController.createRoom);
router.put('/rooms/:id', requireAuth, requireRole(['ADMIN']), RoomController.updateRoom);
router.delete('/rooms/:id', requireAuth, requireRole(['ADMIN']), RoomController.deleteRoom);

router.get('/inventory', requireAuth, InventoryController.getAllInventory);
router.get('/inventory/:id', requireAuth, InventoryController.getInventoryDetails);
router.post('/inventory', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), InventoryController.createInventory);
router.put('/inventory/:id', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), InventoryController.updateInventory);
router.delete('/inventory/:id', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), InventoryController.deleteInventory);

router.get('/bhp', requireAuth, BHPController.getAllBHP);
router.get('/bhp/:id', requireAuth, BHPController.getBHPDetails);
router.post('/bhp', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), BHPController.createBHP);
router.put('/bhp/:id', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), BHPController.updateBHP);
router.patch('/bhp/:id/stock', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), BHPController.adjustStock);
router.delete('/bhp/:id', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), BHPController.deleteBHP);

router.get('/procurements', requireAuth, ProcurementController.getAllDrafts);
router.get('/procurements/:id', requireAuth, ProcurementController.getDraftDetails);
router.post('/procurements', requireAuth, requireRole(['ADMIN', 'STAF_ADMIN']), ProcurementController.createDraft);
router.put('/procurements/:id', requireAuth, requireRole(['ADMIN', 'STAF_ADMIN']), ProcurementController.updateDraft);
router.patch('/procurements/:id/status', requireAuth, requireRole(['ADMIN', 'KAPRODI', 'KALAB']), ProcurementController.updateDraftStatus);
router.delete('/procurements/:id', requireAuth, requireRole(['ADMIN', 'STAF_ADMIN']), ProcurementController.deleteDraft);

router.post('/procurements/:draftId/items', requireAuth, requireRole(['ADMIN', 'STAF_ADMIN']), ProcurementController.addItem);
router.put('/procurements/items/:id', requireAuth, requireRole(['ADMIN', 'STAF_ADMIN']), ProcurementController.updateItem);
router.patch('/procurements/items/:id/status', requireAuth, requireRole(['ADMIN', 'KALAB']), ProcurementController.updateItemStatus);
router.delete('/procurements/items/:id', requireAuth, requireRole(['ADMIN', 'STAF_ADMIN']), ProcurementController.deleteItem);

router.get('/maintenance', requireAuth, MaintenanceController.getAllLogs);
router.get('/maintenance/:id', requireAuth, MaintenanceController.getLogDetails);
router.post('/maintenance', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), MaintenanceController.createLog);
router.delete('/maintenance/:id', requireAuth, requireRole(['ADMIN', 'STAF_LAB']), MaintenanceController.deleteLog);

module.exports = router;
