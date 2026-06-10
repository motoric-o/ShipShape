const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.coerce.number().int().positive('Role is required'),
  isActive: z.any()
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().optional().or(z.literal('')),
  roleId: z.coerce.number().int().positive('Role is required'),
  isActive: z.any()
});

const UserController = {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const roleId = req.query.roleId ? parseInt(req.query.roleId) : undefined;
      const status = req.query.status || '';

      const skip = (page - 1) * limit;

      const where = {
        deletedAt: null,
        ...(search.trim() !== '' ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } }
          ]
        } : {}),
        ...(roleId ? { roleId } : {}),
        ...(status === 'ACTIVE' ? { isActive: true } : {}),
        ...(status === 'INACTIVE' ? { isActive: false } : {})
      };

      const [users, totalItems, roles] = await Promise.all([
        prisma.users.findMany({
          where,
          include: { role: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.users.count({ where }),
        prisma.role.findMany({ orderBy: { name: 'asc' } })
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
        roles,
        selectedRoleId: roleId || '',
        selectedStatus: status,
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
      const result = createUserSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/users/new?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, email, password, roleId, isActive } = result.data;

      const existing = await prisma.users.findUnique({
        where: { email: email.toLowerCase() }
      });
      if (existing) {
        return res.redirect('/users/new?error=Email address is already in use');
      }

      await prisma.users.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: bcrypt.hashSync(password, 10),
          roleId: parseInt(roleId),
          isActive: isActive === 'on' || isActive === 'true' || isActive === true
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
      const result = updateUserSchema.safeParse(req.body);
      if (!result.success) {
        const errorMsg = result.error.errors.map(e => e.message).join(', ');
        return res.redirect(`/users/${id}/edit?error=${encodeURIComponent(errorMsg)}`);
      }
      const { name, email, password, roleId, isActive } = result.data;

      const existing = await prisma.users.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id: parseInt(id) }
        }
      });
      if (existing) {
        return res.redirect(`/users/${id}/edit?error=Email address is already in use`);
      }

      const updateData = {
        name,
        email: email.toLowerCase(),
        roleId: parseInt(roleId),
        isActive: isActive === 'on' || isActive === 'true' || isActive === true
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
