const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const UserController = {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      
      const skip = (page - 1) * limit;

      const where = {
        deletedAt: null,
        ...(search.trim() !== '' ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } }
          ]
        } : {})
      };

      const [users, totalItems] = await Promise.all([
        prisma.users.findMany({
          where,
          include: { role: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.users.count({ where })
      ]);

      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = totalItems === 0 ? 0 : skip + 1;
      const endIndex = Math.min(skip + limit, totalItems);

      // Generate page window array (maximum 5 buttons)
      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(totalPages, startPage + 4);
      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }
      const pages = [];
      for (let p = startPage; p <= endPage; p++) {
        pages.push(p);
      }

      res.render('pages/users/index', {
        users,
        sessionUser: req.session,
        searchActionUrl: '/users',
        searchPlaceholder: 'Cari pengguna...',
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
      res.status(500).send('Error fetching users');
    }
  },

  async create(req, res, next) {
    try {
      const roles = await prisma.role.findMany();
      res.render('pages/users/form', {
        sessionUser: req.session,
        roles,
        backUrl: '/users',
        actionUrl: '/users',
        isPut: false,
        onSubmitJs: 'return validatePassword()'
      });
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
      res.render('pages/users/form', {
        sessionUser: req.session,
        user,
        roles,
        backUrl: '/users',
        actionUrl: `/users/${user.id}?_method=PUT`,
        isPut: true,
        onSubmitJs: 'return validatePassword()'
      });
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
