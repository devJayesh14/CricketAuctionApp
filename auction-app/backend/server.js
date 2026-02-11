require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const auctionSocket = require('./src/socket/auctionSocket');

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();

  const server = http.createServer(app);

  auctionSocket.init(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
