const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const UserController = {
  async index(req, res, next) {
    try {
      const users = await prisma.users.findMany({
        where: { deletedAt: null },
        include: { role: true },
        orderBy: { createdAt: 'desc' }
      });
      res.render('pages/users/index', { users, sessionUser: req.session });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching users');
    }
  },

  async create(req, res, next) {
    try {
      const roles = await prisma.role.findMany();
      res.render('pages/users/form', { sessionUser: req.session, roles });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error loading form');
    }
  },

  async store(req, res, next) {
    try {
      const { name, email, password, roleId, isActive } = req.body;
      await prisma.users.create({
        data: {
          name,
          email,
          password: bcrypt.hashSync(password, 10),
          roleId: parseInt(roleId),
          isActive: isActive === 'on' || isActive === 'true'
        }
      });
      res.redirect('/users');
    } catch (error) {
      console.error('Error creating user:', error);
      res.redirect('/users/new?error=Failed to create user');
    }
  },

  async edit(req, res, next) {
    try {
      const user = await prisma.users.findUnique({ where: { id: parseInt(req.params.id) } });
      if (!user) return res.redirect('/users');
      const roles = await prisma.role.findMany();
      res.render('pages/users/form', { sessionUser: req.session, user, roles });
    } catch (error) {
      console.error(error);
      res.redirect('/users');
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, roleId, isActive, password } = req.body;
      const updateData = {
        name,
        email,
        roleId: parseInt(roleId),
        isActive: isActive === 'on' || isActive === 'true'
      };
      if (password && password.trim() !== '') {
        updateData.password = bcrypt.hashSync(password, 10);
      }
      await prisma.users.update({
        where: { id: parseInt(id) },
        data: updateData
      });
      res.redirect('/users');
    } catch (error) {
      console.error('Error updating user:', error);
      res.redirect(`/users/${req.params.id}/edit?error=Failed to update user`);
    }
  },

  async destroy(req, res, next) {
    try {
      await prisma.users.update({
        where: { id: parseInt(req.params.id) },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });
      res.redirect('/users');
    } catch (error) {
      console.error(error);
      res.redirect('/users');
    }
  }
};

module.exports = UserController;
