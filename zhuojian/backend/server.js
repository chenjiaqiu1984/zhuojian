const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads/ohcards');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/upload', require('./routes/upload'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/about', require('./routes/about'));
app.use('/api/consultants', require('./routes/consultants'));
app.use('/api/news', require('./routes/news'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/ohcard', require('./routes/ohcard'));
app.use('/api/assessment', require('./routes/assessment'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/registrations', require('./routes/registrations'));

require('./socket/rooms')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
