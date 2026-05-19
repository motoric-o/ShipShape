const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

// Middleware untuk proteksi halaman
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Redirect otomatis ke dashboard yang sesuai
router.get('/', (req, res) => {
  if (req.session.userId) {
    const role = req.session.userRole;
    if (role === 'ADMIN') return res.redirect('/admin');
    if (role === 'KAPRODI') return res.redirect('/kaprodi');
    if (role === 'STAF_ADMIN') return res.redirect('/staf-admin');
    return res.redirect('/rooms');
  }
  res.redirect('/login');
});

// GET Login Page
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('pages/login', { error: req.query.error });
});

// POST Login (Proses Autentikasi)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.redirect('/login?error=Invalid email or password');
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.redirect('/login?error=Invalid email or password');
    }
    
    // Set Session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    
    res.redirect('/');
  } catch (error) {
    console.error('Login Error:', error);
    res.redirect('/login?error=Internal Server Error');
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/login');
  });
});

// --- Rute Halaman UI (Dengan Data Asli) ---

router.get('/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.render('pages/users/index', { users, sessionUser: req.session });
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});

router.get('/users/new', requireAuth, (req, res) => {
  res.render('pages/users/form', { sessionUser: req.session });
});

router.get('/rooms', requireAuth, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.render('pages/rooms/index', { rooms, sessionUser: req.session });
  } catch (err) {
    res.status(500).send('Error fetching rooms');
  }
});

router.get('/rooms/new', requireAuth, (req, res) => {
  res.render('pages/rooms/form', { sessionUser: req.session });
});

module.exports = router;
