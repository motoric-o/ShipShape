const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const AuthController = {
  showLogin(req, res) {
    if (req.session.userId) return res.redirect('/');
    res.render('pages/login', { error: req.query.error });
  },

  async login(req, res, next) {
    const { email, password } = req.body;
    try {
      const user = await prisma.users.findUnique({
        where: { email },
        include: { role: true }
      });
      if (!user || user.deletedAt !== null) {
        return res.redirect('/login?error=Invalid email or password');
      }

      if (!user.isActive) {
        return res.redirect('/login?error=Account disabled');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.redirect('/login?error=Invalid email or password');
      }

      req.session.userId = user.id;
      req.session.userRole = user.role.name;
      req.session.userName = user.name;

      req.session.save((err) => {
        if (err) {
          console.error('Session Save Error:', err);
          return res.redirect('/login?error=Internal Server Error');
        }
        res.redirect('/');
      });
    } catch (error) {
      console.error('Login Error:', error);
      res.redirect('/login?error=Internal Server Error');
    }
  },

  logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.redirect('/login');
    });
  }
};

module.exports = AuthController;
