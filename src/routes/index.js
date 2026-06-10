const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DashboardController = require('../controllers/dashboard.controller');
const UserController = require('../controllers/user.controller');
const AuthController = require('../controllers/auth.controller');
const RoomController = require('../controllers/room.controller');
const InventoryController = require('../controllers/inventory.controller');
const BHPController = require('../controllers/bhp.controller');
const ProcurementController = require('../controllers/procurement.controller');
const MaintenanceController = require('../controllers/maintenance.controller');

// Ensure public/uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// MVC Web Middlewares
const { requireWebAuth: requireAuth, requireWebRole: requireRole } = require('../middleware/auth.middleware');

// --- Global Middleware ---
router.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.currentQuery = req.query;
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

// --- Inventory Routes ---
router.get('/inventory', requireAuth, requireRole(['KAPRODI', 'KALAB', 'STAF_ADMIN', 'STAF_LAB']), InventoryController.index);
router.get('/inventory/new', requireAuth, requireRole(['KAPRODI', 'KALAB', 'STAF_ADMIN', 'STAF_LAB']), InventoryController.create);
router.post('/inventory', requireAuth, requireRole(['KAPRODI', 'KALAB', 'STAF_ADMIN', 'STAF_LAB']), upload.single('qrCodePhoto'), InventoryController.store);
router.get('/inventory/:id', requireAuth, InventoryController.show);
router.get('/inventory/:id/qr', requireAuth, InventoryController.qr);
router.get('/inventory/:id/edit', requireAuth, requireRole(['KAPRODI', 'KALAB', 'STAF_ADMIN', 'STAF_LAB']), InventoryController.edit);
router.put('/inventory/:id', requireAuth, requireRole(['KAPRODI', 'KALAB', 'STAF_ADMIN', 'STAF_LAB']), upload.single('qrCodePhoto'), InventoryController.update);
router.delete('/inventory/:id', requireAuth, requireRole(['KAPRODI', 'KALAB', 'STAF_ADMIN', 'STAF_LAB']), InventoryController.destroy);

// --- BHP Routes ---
router.get('/bhp', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.index);
router.get('/bhp/new', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.create);
router.post('/bhp', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.store);
router.get('/bhp/:id/edit', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.edit);
router.put('/bhp/:id', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.update);
router.patch('/bhp/:id/stock', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.setStock);
router.delete('/bhp/:id', requireAuth, requireRole(['KALAB', 'STAF_ADMIN', 'STAF_LAB']), BHPController.destroy);

// --- Procurement Routes ---
router.get('/procurements', requireAuth, ProcurementController.index);
router.get('/procurements/new', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.create);
router.post('/procurements', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.store);
router.get('/procurements/:id', requireAuth, ProcurementController.show);
router.get('/procurements/:id/edit', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.edit);
router.put('/procurements/:id', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.update);
router.patch('/procurements/:id/status', requireAuth, requireRole(['ADMIN', 'KAPRODI', 'KALAB', 'STAF_LAB']), ProcurementController.updateDraftStatus);
router.delete('/procurements/:id', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.destroy);

router.post('/procurements/:draftId/items', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.addItem);
router.put('/procurements/items/:id', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.updateItem);
router.patch('/procurements/items/:id/status', requireAuth, requireRole(['ADMIN', 'KALAB', 'KAPRODI', 'STAF_ADMIN']), ProcurementController.updateItemStatus);
router.delete('/procurements/items/:id', requireAuth, requireRole(['ADMIN', 'KALAB', 'STAF_LAB']), ProcurementController.deleteItem);

// --- Maintenance Routes ---
router.get('/maintenance', requireAuth, requireRole(['STAF_LAB']), MaintenanceController.index);
router.get('/maintenance/new', requireAuth, requireRole(['STAF_LAB']), MaintenanceController.create);
router.post('/maintenance', requireAuth, requireRole(['STAF_LAB']), MaintenanceController.store);
router.get('/maintenance/:id', requireAuth, requireRole(['STAF_LAB']), MaintenanceController.show);
router.delete('/maintenance/:id', requireAuth, requireRole(['STAF_LAB']), MaintenanceController.destroy);

module.exports = router;
