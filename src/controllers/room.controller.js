const prisma = require('../config/db');

const RoomController = {
  async index(req, res, next) {
    try {
      const rooms = await prisma.room.findMany({
        include: {
          _count: {
            select: { inventories: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.render('pages/rooms/index', { rooms, sessionUser: req.session });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching rooms');
    }
  },

  create(req, res, next) {
    res.render('pages/rooms/form', { sessionUser: req.session });
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
      res.render('pages/rooms/form', { sessionUser: req.session, room });
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
