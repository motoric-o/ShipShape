const prisma = require('../config/db');

const RoomController = {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      
      const skip = (page - 1) * limit;

      const where = search.trim() !== '' ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } }
        ]
      } : {};

      const [rooms, totalItems] = await Promise.all([
        prisma.room.findMany({
          where,
          include: {
            _count: {
              select: { inventories: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.room.count({ where })
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

      res.render('pages/rooms/index', {
        rooms,
        sessionUser: req.session,
        searchActionUrl: '/rooms',
        searchPlaceholder: 'Cari ruangan...',
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
      res.status(500).send('Error fetching rooms');
    }
  },

  create(req, res, next) {
    res.render('pages/rooms/form', {
      sessionUser: req.session,
      backUrl: '/rooms',
      actionUrl: '/rooms',
      isPut: false
    });
  },

  async store(req, res, next) {
    try {
      const { name, description } = req.body;
      await prisma.room.create({
        data: { name, description }
      });
      res.redirect('/rooms');
    } catch (error) {
      console.error('Error creating room:', error);
      res.redirect('/rooms/new?error=Failed to create room');
    }
  },

  async edit(req, res, next) {
    try {
      const room = await prisma.room.findUnique({ where: { id: parseInt(req.params.id) } });
      if (!room) return res.redirect('/rooms');
      res.render('pages/rooms/form', {
        sessionUser: req.session,
        room,
        backUrl: '/rooms',
        actionUrl: `/rooms/${room.id}?_method=PUT`,
        isPut: true
      });
    } catch (error) {
      console.error(error);
      res.redirect('/rooms');
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      await prisma.room.update({
        where: { id: parseInt(id) },
        data: { name, description }
      });
      res.redirect('/rooms');
    } catch (error) {
      console.error('Error updating room:', error);
      res.redirect(`/rooms/${req.params.id}/edit?error=Failed to update room`);
    }
  },

  async destroy(req, res, next) {
    try {
      await prisma.room.delete({ where: { id: parseInt(req.params.id) } });
      res.redirect('/rooms');
    } catch (error) {
      console.error(error);
      res.redirect('/rooms');
    }
  }
};

module.exports = RoomController;
