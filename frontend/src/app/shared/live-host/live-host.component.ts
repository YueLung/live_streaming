import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment.development';
import { Socket, io } from 'socket.io-client';
import * as mediasoupClient from "mediasoup-client";
import { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters';
import { Consumer, Producer, Transport } from 'mediasoup-client/lib/types';

@Component({
  selector: 'com-live-host',
  templateUrl: './live-host.component.html',
  styleUrls: ['./live-host.component.less']
})
export class LiveHostComponent implements OnInit {
  @ViewChild('localVideo') localVideo?: ElementRef;
  @ViewChild('remoteVideo') remoteVideo?: ElementRef;

  _roomName?: string;
  @Input() set roomName(value: string) {
    this._roomName = value;
  }

  @Input() set isHosting(value: boolean) {
    if (!this._roomName) return;
    if (value) this.startLiveStream();
  }

  socket?: Socket;

  messageList: Array<string> = [];

  device?: mediasoupClient.Device;
  rtpCapabilities?: RtpCapabilities;
  producerTransport?: Transport;
  consumerTransport?: Transport;
  producer?: Producer;
  consumer?: Consumer;

  //#region
  encodings = [
    {
      rid: 'r0',
      maxBitrate: 100000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r1',
      maxBitrate: 300000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r2',
      maxBitrate: 900000,
      scalabilityMode: 'S1T3',
    },
  ]
  //#endregion

  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
  params = {}

  ngOnInit(): void {
    this.socket = io(`${environment.server_url}/mediasoup`);

    this.socket?.on('message', message => {
      this.messageList.push(message);
    });

    this.socket?.on('producerclose', () => {
      this.remoteVideo!.nativeElement.srcObject = null;
    });
  }

  sendMessage(message: string) {
    this.socket?.emit('message', message);
  }

  startLiveStream() {
    const mediaStreamConstraints = {
      audio: true,
      video: true
    };

    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
      .then(stream => {
        // this.localStream = stream;
        this.localVideo!.nativeElement.srcObject = stream;

        const tracks = stream.getVideoTracks();
        console.log('tracks count = ', tracks.length);

        // const track = stream.getVideoTracks()[0];
        this.params =
        {
          track: tracks[0],
          encodings: this.encodings,
          // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
          codecOptions: {
            videoGoogleStartBitrate: 1000
          }
        };

        this.socket?.emit('joinRoom', { roomName: this._roomName, isProducer: true }, (data: any) => {
          console.log('Router RTP Capabilities...', data)

          // we assign to local variable and will be used when
          // loading the client Device (see createDevice above)
          this.rtpCapabilities = data.rtpCapabilities;

          this.createDevice();
        });
        // this.getRtpCapabilities();
      })
      .catch(err => console.log(err));
  }

  getRtpCapabilities() {
    // make a request to the server for Router RTP Capabilities
    // see server's socket.on('getRtpCapabilities', ...)
    // the server sends back data object which contains rtpCapabilities
    this.socket?.emit('getRtpCapabilities', (data: any) => {
      console.log('Router RTP Capabilities...', data)

      // we assign to local variable and will be used when
      // loading the client Device (see createDevice above)
      this.rtpCapabilities = data.rtpCapabilities;

      this.createDevice();
    })
  }

  async createDevice() {
    try {
      this.device = new mediasoupClient.Device()
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
      // Loads the device with RTP capabilities of the Router (server side)
      await this.device.load({ routerRtpCapabilities: this.rtpCapabilities! })

      console.log('RTP Capabilities', this.device.rtpCapabilities);

      this.createSendTransport();
    } catch (error: any) {
      console.log(error)
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported')
    }
  }

  createSendTransport() {
    // see server's socket.on('createWebRtcTransport', sender?, ...)
    // this is a call from Producer, so sender = true
    this.socket?.emit('createWebRtcTransport', { isProducer: true }, ({ params }: any) => {
      // The server sends back params needed
      // to create Send Transport on the client side
      if (params.error) {
        console.log(params.error)
        return
      }
      console.log(params)

      // creates a new WebRTC Transport to send media
      // based on the server's producer transport params
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      this.producerTransport = this.device?.createSendTransport(params)

      // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
      // this event is raised when a first call to transport.produce() is made
      // see connectSendTransport() below
      this.producerTransport?.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          // Signal local DTLS parameters to the server side transport
          // see server's socket.on('transport-connect', ...)
          await this.socket?.emit('transport-connect', {
            dtlsParameters,
          })

          // Tell the transport that parameters were transmitted.
          callback()

        } catch (error: any) {
          errback(error)
        }
      })

      this.producerTransport?.on('produce', async (parameters, callback, errback) => {
        console.log(parameters)

        try {
          // tell the server to create a Producer
          // with the following parameters and produce
          // and expect back a server side producer id
          // see server's socket.on('transport-produce', ...)
          await this.socket?.emit('transport-produce', {
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData,
          }, ({ id }: any) => {
            // Tell the transport that parameters were transmitted and provide it with the
            // server side producer's id.
            callback({ id })
          })
        } catch (error: any) {
          errback(error)
        }
      });

      this.connectSendTransport()
    });
  }

  async connectSendTransport() {
    // we now call produce() to instruct the producer transport
    // to send media to the Router
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
    // this action will trigger the 'connect' and 'produce' events above
    this.producer = await this.producerTransport?.produce(this.params)

    this.createRecvTransport();

    this.producer?.on('trackended', () => {
      console.log('track ended')
      // close video track
    });

    this.producer?.on('transportclose', () => {
      console.log('transport ended')
      // close video track
    });
  }

  async createRecvTransport() {
    // see server's socket.on('consume', sender?, ...)
    // this is a call from Consumer, so isProducer = false
    await this.socket?.emit('createWebRtcTransport', { isProducer: false },
      ({ params }: any) => {
        // The server sends back params needed
        // to create Send Transport on the client side
        if (params.error) {
          console.log(params.error)
          return;
        }
        // creates a new WebRTC Transport to receive media
        // based on server's consumer transport params
        // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-createRecvTransport
        this.consumerTransport = this.device?.createRecvTransport(params)

        // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
        // this event is raised when a first call to transport.produce() is made
        // see connectRecvTransport() below
        this.consumerTransport?.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-recv-connect', ...)
            await this.socket?.emit('transport-recv-connect', { dtlsParameters });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error: any) {
            // Tell the transport that something was wrong
            errback(error)
          }
        });

        this.connectRecvTransport();
      });
  }

  async connectRecvTransport() {
    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    await this.socket?.emit('consume', { rtpCapabilities: this.device?.rtpCapabilities, },
      async ({ params }: any) => {
        if (params.error) {
          console.log('Cannot Consume');
          return;
        }

        console.log(params);
        // then consume with the local consumer transport
        // which creates a consumer
        this.consumer = await this.consumerTransport?.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters
        });

        // destructure and retrieve the video track from the producer
        const track = this.consumer?.track;
        this.remoteVideo!.nativeElement.srcObject = new MediaStream([track!]);;
        // this.remoteVideo!.nativeElement.muted = true;
        console.log(this.remoteVideo!.nativeElement.srcObject);

        // the server consumer started with media paused
        // so we need to inform the server to resume
        this.socket?.emit('consumer-resume');
      })
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
