const { Server } = require("socket.io");

let ioInstance = null;

const timestamp = () => new Date().toISOString();
const logInfo = (message) => {
  process.stdout.write(`[INFO] ${timestamp()} ${message}\n`);
};

const initSocket = (server, corsOptions) => {
  ioInstance = new Server(server, {
    cors: corsOptions
  });

  ioInstance.on("connection", () => {
    logInfo("Client connected");
  });
};

const emitPricesUpdated = () => {
  if (ioInstance) {
    ioInstance.emit("prices_updated");
  }
};

const getIo = () => ioInstance;

module.exports = { initSocket, emitPricesUpdated, getIo };
