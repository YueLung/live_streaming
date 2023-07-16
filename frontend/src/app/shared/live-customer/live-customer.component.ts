import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment.development';
import { Socket, io } from 'socket.io-client';
import * as mediasoupClient from "mediasoup-client";
import { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters';
import { Consumer } from 'mediasoup-client/lib/Consumer';
import { Transport } from 'mediasoup-client/lib/types';

@Component({
  selector: 'com-live-customer',
  templateUrl: './live-customer.component.html',
  styleUrls: ['./live-customer.component.less']
})
export class LiveCustomerComponent implements OnInit {
  @ViewChild('remoteVideo') remoteVideo?: ElementRef;

  _roomName?: string;
  @Input() set roomName(value: string) {
    this._roomName = value;
  }

  @Input() set isWatching(value: boolean) {
    if (!this._roomName) return;
    if (value) this.startLiveStream();
  }

  socket?: Socket;

  messageList: Array<string> = [];

  device?: mediasoupClient.Device;
  rtpCapabilities?: RtpCapabilities;
  consumerTransport?: Transport;
  consumer?: Consumer;

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
    this.socket?.emit('joinRoom', { roomName: this._roomName, isProducer: false }, (data: any) => {
      // we assign to local variable and will be used when
      // loading the client Device (see createDevice above)
      this.rtpCapabilities = data.rtpCapabilities;
      this.createDevice();
    });
  }

  async createDevice() {
    try {
      this.device = new mediasoupClient.Device()

      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
      // Loads the device with RTP capabilities of the Router (server side)
      await this.device.load({ routerRtpCapabilities: this.rtpCapabilities! });

      console.log('RTP Capabilities', this.device.rtpCapabilities);
      this.createRecvTransport();

    } catch (error: any) {
      console.log(error)
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported')
    }
  }

  async createRecvTransport() {
    // see server's socket.on('consume', sender?, ...)
    // this is a call from Consumer, so sender = false
    await this.socket?.emit('createWebRtcTransport', { isProducer: false }, ({ params }: any) => {
      // The server sends back params needed
      // to create Send Transport on the client side
      if (params.error) {
        console.log(params.error)
        return
      }
      console.log('createWebRtcTransport =>', params)

      // creates a new WebRTC Transport to receive media
      // based on server's consumer transport params
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-createRecvTransport
      try {
        this.consumerTransport = this.device?.createRecvTransport(params)
      }
      catch (error: any) {
        console.log('createRecvTransport error =>', error);
      }
      console.log('this.consumerTransport -> ', this.consumerTransport);

      // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
      // this event is raised when a first call to transport.produce() is made
      // see connectRecvTransport() below
      this.consumerTransport?.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('consumerTransport connect');

          // Signal local DTLS parameters to the server side transport
          // see server's socket.on('transport-recv-connect', ...)
          await this.socket?.emit('transport-recv-connect', {
            dtlsParameters,
          })

          // Tell the transport that parameters were transmitted.
          callback()
        } catch (error: any) {
          // Tell the transport that something was wrong
          errback(error)
        }
      });

      this.connectRecvTransport();
    })
  }

  async connectRecvTransport() {
    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    await this.socket?.emit('consume', { rtpCapabilities: this.device?.rtpCapabilities },
      async ({ params }: any) => {
        if (params.error) {
          console.log('Cannot Consume')
          return
        }

        console.log(params)
        // then consume with the local consumer transport
        // which creates a consumer
        this.consumer = await this.consumerTransport?.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters
        })

        // destructure and retrieve the video track from the producer
        const track = this.consumer?.track;
        this.remoteVideo!.nativeElement.srcObject = new MediaStream([track!]);

        // the server consumer started with media paused
        // so we need to inform the server to resume
        this.socket?.emit('consumer-resume')
      })
  }

  disconnect() {
    this.socket?.disconnect();
  }

}
