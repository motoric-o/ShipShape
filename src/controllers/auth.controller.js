const UserModel = require('../models/user.model');

const AuthController = {
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const newUser = await UserModel.create({ name, email, password, role });
      return res.status(201).json({
        message: 'Registration successful',
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user || !UserModel.verifyPassword(password, user.password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.userName = user.name;

      return res.json({
        message: 'Login successful',
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('sid');
      return res.json({ message: 'Logout successful' });
    });
  },

  async me(req, res, next) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await UserModel.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = AuthController;
