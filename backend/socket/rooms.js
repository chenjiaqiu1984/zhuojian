const { v4: uuidv4 } = require('uuid');

// rooms: { roomId: { members: { socketId: {userId, name, cards, ready, shared} } } }
const rooms = new Map();

module.exports = function setupRooms(io) {
  io.on('connection', socket => {
    let currentRoom = null;

    socket.on('join-room', ({ roomId, userId, name }) => {
      currentRoom = roomId;
      socket.join(roomId);
      if (!rooms.has(roomId)) rooms.set(roomId, { members: {} });
      rooms.get(roomId).members[socket.id] = { userId, name, cards: [], ready: false, shared: false };
      io.to(roomId).emit('room-update', getRoomState(roomId));
    });

    socket.on('deal-cards', ({ roomId, cards }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.members[socket.id].cards = cards;
      room.members[socket.id].ready = false;
      room.members[socket.id].shared = false;
      socket.emit('cards-dealt', cards);
    });

    socket.on('set-ready', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room?.members[socket.id]) return;
      room.members[socket.id].ready = true;
      io.to(roomId).emit('room-update', getRoomState(roomId));
    });

    socket.on('share-cards', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room?.members[socket.id]) return;
      room.members[socket.id].shared = true;
      io.to(roomId).emit('room-update', getRoomState(roomId));
    });

    socket.on('unshare-cards', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room?.members[socket.id]) return;
      room.members[socket.id].shared = false;
      io.to(roomId).emit('room-update', getRoomState(roomId));
    });

    socket.on('disconnect', () => {
      if (currentRoom && rooms.has(currentRoom)) {
        delete rooms.get(currentRoom).members[socket.id];
        if (Object.keys(rooms.get(currentRoom).members).length === 0) {
          rooms.delete(currentRoom);
        } else {
          io.to(currentRoom).emit('room-update', getRoomState(currentRoom));
        }
      }
    });
  });
};

function getRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { members: [] };
  return {
    members: Object.entries(room.members).map(([socketId, m]) => ({
      socketId, name: m.name, ready: m.ready, shared: m.shared,
      cards: m.shared ? m.cards : null
    }))
  };
}
