const RoomModel = require('../models/room.model');

const RoomController = {
  async getAllRooms(req, res, next) {
    try {
      const rooms = await RoomModel.findAll();
      return res.json({ rooms });
    } catch (error) {
      next(error);
    }
  },

  async getRoomDetails(req, res, next) {
    try {
      const { id } = req.params;
      const room = await RoomModel.findById(id, { includeInventories: true, includeBHPs: true });
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      return res.json({ room });
    } catch (error) {
      next(error);
    }
  },

  async createRoom(req, res, next) {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Room name is required' });
      }
      const newRoom = await RoomModel.create({ name, description });
      return res.status(201).json({ message: 'Room created successfully', room: newRoom });
    } catch (error) {
      next(error);
    }
  },

  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const updatedRoom = await RoomModel.update(id, { name, description });
      return res.json({ message: 'Room updated successfully', room: updatedRoom });
    } catch (error) {
      next(error);
    }
  },

  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      await RoomModel.delete(id);
      return res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = RoomController;
