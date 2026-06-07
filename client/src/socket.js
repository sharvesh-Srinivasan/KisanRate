import { io } from "socket.io-client";

const socketUrl = process.env.REACT_APP_SOCKET_URL;

const socket = socketUrl
  ? io(socketUrl, {
      withCredentials: true
    })
  : {
      on: () => {},
      off: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {}
    };

export default socket;
