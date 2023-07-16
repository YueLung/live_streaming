const express = require('express');
var https = require('httpolyglot');
var fs = require('fs');
const path = require('path');
const socket = require('socket.io');
const mediasoup = require("mediasoup");
const config = require('./config');

const app = express();
app.get('/', (req, res) => res.send('server'));

const options = {
  key: fs.readFileSync(path.join(__dirname, './cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './cert/cert.pem'))
};
const sslServer = https.createServer(options, app);
const port = config.port;
sslServer.listen(port, () => console.log(`[Info] Server listening at port ${port}`));

const io = socket(sslServer, {
  cors: {
    origin: config.cors,
    methods: ["GET", "POST"]
  }
});
// Middlewares
io.use((socket, next) => {
  var clientIpAddress = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  console.log(`[Warning] Someone try to connect no namespace ip => ${clientIpAddress}`);
});

/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer 
 **/
let worker;
let rooms = [] // [ { roomName, router, producerTransport, producer, socketIds: [socketId1,socketId2, ...] }, {...}, ... ]
let producerSocketIdRoomNameMap = [] // [{ roomName, socketId }]
let consumerTransports = []; // [ {socketId, consumerTransport}, ...]
let consumers = []; // [ {socketId, consumers}, ...]

const createWorker = async () => {
  worker = await mediasoup.createWorker(config.workerSettings);
  console.log(`[Info] Create a worker, pid = ${worker.pid}`);

  worker.on('died', error => {
    // This implies something serious happened, so kill the application
    console.error('[Error] Mediasoup worker has died')
    setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
  });

  return worker;
}
worker = createWorker();

function findRoomByRoomName(roomName) {
  const room = rooms.find(room => room.roomName === roomName);
  return room;
}

function findRoomBySocketId(socketId) {
  const roomName = findRoomNameBySocketId(socketId);
  const room = findRoomByRoomName(roomName);
  return room;
}

function findRoomNameBySocketId(socketId) {
  //Array.from(socket.rooms)[1]
  let roomName;
  rooms.forEach(room => {
    const findResult = room.socketIds.find(id => id === socketId);
    if (findResult) {
      roomName = room.roomName;
    }
  });

  return roomName;
}

// ####################################################
// SOCKET IO
// ####################################################

const my_socket = io.of('/mediasoup');

my_socket.on("connection", async socket => {
  console.log(`[Info] A user connected ${socket.id}`);

  socket.on('clientError', (error) => {
    console.log('[Error] Client error ', error);
    socket.destroy();
  });

  socket.on('message', (message) => {
    console.log(message);
    const roomName = findRoomNameBySocketId(socket.id);

    console.log(roomName, message);
    my_socket.to(roomName).emit('message', `${socket.id.substr(0, 2)} said ${roomName} ${message}`);
  });

  socket.on('joinRoom', async ({ roomName, isProducer }, callback) => {
    const idRoomName = producerSocketIdRoomNameMap.find(x => x.roomName === roomName);
    if (idRoomName && isProducer) {
      console.log('[Error] Already exist producer');
      return;
    }

    if (!idRoomName && !isProducer) {
      console.log(producerSocketIdRoomNameMap);
      console.log(`[Error] Not exist producer in room '${roomName}'`);
      return;
    }

    socket.join(roomName);
    console.log(`[Info] User(${socket.id}) join room => ${roomName}`);

    let router;
    const room = findRoomByRoomName(roomName);
    if (room) {
      room.socketIds.push(socket.id);
      router = room.router;
    } else {
      //producerSocketId
      router = await worker.createRouter({ mediaCodecs: config.mediaCodecs });
      rooms.push({ roomName, router, socketIds: [socket.id] });
      console.log(`[Info] Create a room(${roomName}) and router...`);
    }

    if (isProducer) {
      producerSocketIdRoomNameMap.push({ roomName, socketId: socket.id });
      console.log(producerSocketIdRoomNameMap);
    }

    const rtpCapabilities = router.rtpCapabilities;
    callback({ rtpCapabilities });
  });

  socket.on('createWebRtcTransport', async ({ isProducer }, callback) => {
    console.log(`Is this a sender request? ${isProducer}`);

    const roomName = findRoomNameBySocketId(socket.id);
    // The client indicates if it is a producer or a consumer
    // if sender is true, indicates a producer else a consumer
    if (isProducer) {
      // TODO 注意不同Producer 斷線重連....
      const producerTransport = await createWebRtcTransport(roomName, callback);
      const room = findRoomByRoomName(roomName);
      room.producerTransport = producerTransport;
    }
    else {
      const consumerTransport = await createWebRtcTransport(roomName, callback);
      consumerTransports.push({ socketId: socket.id, consumerTransport });

      // TODO 這裡要處理
      console.log('consumerTransports count = ', consumerTransports.length);
    }
  });

  // see client's socket.emit('transport-connect', ...)
  socket.on('transport-connect', async ({ dtlsParameters }) => {
    console.log('DTLS PARAMS... ', { dtlsParameters });

    const room = findRoomBySocketId(socket.id);
    await room.producerTransport.connect({ dtlsParameters });
  });

  // see client's socket.emit('transport-produce', ...)
  socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
    const room = findRoomBySocketId(socket.id);
    // call produce based on the prameters from the client
    const producer = await room.producerTransport.produce({ kind, rtpParameters, });
    room.producer = producer;

    console.log('Producer ID: ', producer.id, producer.kind);

    producer.on('transportclose', () => {
      console.log('transport for this producer closed ');
      producer.close();
    });

    // Send back to the client the Producer's id
    callback({ id: producer.id });
  });

  // see client's socket.emit('transport-recv-connect', ...)
  socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
    console.log(`DTLS PARAMS: ${dtlsParameters}`);
    await consumerTransports
      .find(ct => ct.socketId === socket.id)
      .consumerTransport
      .connect({ dtlsParameters });
  });

  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    try {
      const room = findRoomBySocketId(socket.id);
      // check if the router can consume the specified producer
      const canConsume = room.router.canConsume({ producerId: room.producer.id, rtpCapabilities });
      if (canConsume) {
        // transport can now consume and return a consumer
        consumer = await consumerTransports
          .find(ct => ct.socketId === socket.id).consumerTransport
          .consume({
            producerId: room.producer.id,
            rtpCapabilities,
            paused: true,
          })

        consumers = [...consumers, { socketId: socket.id, consumer }];

        consumer.on('transportclose', () => {
          console.log('transport close from consumer')
        });

        consumer.on('producerclose', () => {
          const roomName = findRoomNameBySocketId(socket.id);
          my_socket.to(roomName).emit('producerclose');
          console.log(`[Room info] ${roomName}: Producer of consumer closed`);
        });

        // from the consumer extract the following params
        // to send back to the Client
        const params = {
          id: consumer.id,
          producerId: room.producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        };

        // send the parameters to the client
        callback({ params });
      }
    } catch (error) {
      console.log(error.message)
      callback({ params: { error: error } });
    }
  });

  socket.on('consumer-resume', async () => {
    const consumer = consumers.find(ct => ct.socketId === socket.id);
    // console.log('consumer resume', consumer);
    await consumer.consumer.resume();
  });

  socket.on("disconnect", () => {
    // console.log(my_socket.adapter.rooms);
    producerSocketIdRoomNameMap =
      producerSocketIdRoomNameMap.filter(x => x.socketId !== socket.id);
    console.log(`[Info] A user disconnect ${socket.id}`);
  });
});


const createWebRtcTransport = async (roomName, callback) => {
  try {
    const router = findRoomByRoomName(roomName).router
    // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
    let transport = await router.createWebRtcTransport(config.webRtcTransport_options);
    console.log(`transport id: ${transport.id}`);

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        console.log('dtlsstatechange on closed');
        transport.close()
      }
    });

    transport.on('close', () => console.log('transport closed'));

    // send back to the client the following prameters
    callback({
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    });

    return transport;

  } catch (error) {
    console.log(error)
    callback({ params: { error: error } });
  }
}
