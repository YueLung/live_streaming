const express = require('express');
var https = require('httpolyglot');
var fs = require('fs');
const path = require('path');
const socket = require('socket.io');
const mediasoup = require("mediasoup");
const config = require('./config');

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!')
});

const options = {
  key: fs.readFileSync(path.join(__dirname, './cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, './cert/cert.pem'))
};
const sslServer = https.createServer(options, app);

const port = 3000;

sslServer.listen(port, () => {
  console.log('Server listening at port %d', port);
});

const io = socket(sslServer, {
  // TODO
  cors: { origin: '*' }
});

// We create a Worker as soon as our application starts
let worker;
let router;
let producerTransport;
let consumerTransports = [];
let producer;
let consumers = [];

const createWorker = async () => {
  worker = await mediasoup.createWorker(config.workerSettings);
  console.log(`worker pid ${worker.pid}`);

  worker.on('died', error => {
    // This implies something serious happened, so kill the application
    console.error('mediasoup worker has died')
    setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
  });

  return worker;
}
worker = createWorker();

// ####################################################
// SOCKET IO
// ####################################################

io.on("connection", async socket => {
  console.log(`a user connected ${socket.id}`);

  socket.on('clientError', (error) => {
    log.error('Client error', error);
    socket.destroy();
  });

  socket.on("disconnect", () => console.log(`a user disconnect ${socket.id}`));

  socket.on('message', (message) => {
    console.log(message);
    io.emit('message', `${socket.id.substr(0, 2)} said ${message}`);
  });

  // worker.createRouter(options)
  // options = { mediaCodecs, appData }
  // mediaCodecs -> defined above
  // appData -> custom application data - we are not supplying any
  // none of the two are required
  if (!router) {
    console.log('createRouter');
    router = await worker.createRouter({ mediaCodecs: config.mediaCodecs });
  }

  // Client emits a request for RTP Capabilities
  // This event responds to the request
  socket.on('getRtpCapabilities', (callback) => {
    const rtpCapabilities = router.rtpCapabilities;
    console.log('rtp Capabilities', rtpCapabilities);

    // call callback from the client and send back the rtpCapabilities
    callback({ rtpCapabilities });
    // io.emit('getRtpCapabilities', rtpCapabilities);
  });

  // Client emits a request to create server side Transport
  // We need to differentiate between the producer and consumer transports
  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    console.log(`Is this a sender request? ${sender}`);
    // The client indicates if it is a producer or a consumer
    // if sender is true, indicates a producer else a consumer
    if (sender) {
      // if (!producerTransport) {
      //   console.log('producer not exist');
      producerTransport = await createWebRtcTransport(callback);
      // }
      // else {
      //   console.log('producer already exist');
      // }

    }
    else {
      const consumerTransport = await createWebRtcTransport(callback);
      consumerTransports = [...consumerTransports, { socketId: socket.id, consumerTransport }];
    }

  });

  // see client's socket.emit('transport-connect', ...)
  socket.on('transport-connect', async ({ dtlsParameters }) => {
    console.log('DTLS PARAMS... ', { dtlsParameters });
    await producerTransport.connect({ dtlsParameters });
  });

  // see client's socket.emit('transport-produce', ...)
  socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
    // call produce based on the prameters from the client
    producer = await producerTransport.produce({
      kind,
      rtpParameters,
    });

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
      // check if the router can consume the specified producer

      const canConsume = router.canConsume({ producerId: producer.id, rtpCapabilities });
      if (canConsume) {
        // transport can now consume and return a consumer
        consumer = await consumerTransports
          .find(ct => ct.socketId === socket.id).consumerTransport
          .consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: true,
          })

        consumers = [...consumers, { socketId: socket.id, consumer }];

        consumer.on('transportclose', () => {
          console.log('transport close from consumer')
        });

        consumer.on('producerclose', () => {
          console.log('producer of consumer closed')
        });

        // from the consumer extract the following params
        // to send back to the Client
        const params = {
          id: consumer.id,
          producerId: producer.id,
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
    const a = consumers.find(ct => ct.socketId === socket.id);
    console.log('consumer resume', a);
    const res = await a.consumer.resume();

  })

});

const createWebRtcTransport = async (callback) => {
  try {
    // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
    let transport = await router.createWebRtcTransport(config.webRtcTransport_options);
    console.log(`transport id: ${transport.id}`);

    transport.on('dtlsstatechange', dtlsState => {
      if (dtlsState === 'closed') {
        console.log('dtlsstatechange on closed');
        transport.close()
      }
    });

    transport.on('close', () => {
      console.log('transport closed')
    });

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
