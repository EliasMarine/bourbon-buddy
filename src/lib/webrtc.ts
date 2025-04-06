export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private connectionState: RTCPeerConnectionState = 'new';
  private iceConnectionState: RTCIceConnectionState = 'new';
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  private onError?: (error: Error) => void;
  private onMetricsUpdate?: (metrics: StreamMetrics) => void;
  private metricsInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private iceCandidates: RTCIceCandidate[] = [];
  private isIceGatheringComplete: boolean = false;
  private streamQuality: 'low' | 'medium' | 'high' = 'medium';
  private isBackgroundBlurred: boolean = false;
  private blurCanvas: HTMLCanvasElement | null = null;
  private blurContext: CanvasRenderingContext2D | null = null;
  private virtualVideo: HTMLVideoElement | null = null;
  private blurredStream: MediaStream | null = null;

  constructor(
    callbacks?: {
      onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
      onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
      onError?: (error: Error) => void;
      onMetricsUpdate?: (metrics: StreamMetrics) => void;
    }
  ) {
    this.onConnectionStateChange = callbacks?.onConnectionStateChange;
    this.onIceConnectionStateChange = callbacks?.onIceConnectionStateChange;
    this.onError = callbacks?.onError;
    this.onMetricsUpdate = callbacks?.onMetricsUpdate;

    this.initializePeerConnection();
  }

  private initializePeerConnection() {
    try {
      console.log('Initializing peer connection with ICE servers');
      
      // First close any existing peer connection
      if (this.peerConnection) {
        console.log('Closing existing peer connection before reinitializing');
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Create a new peer connection with improved ICE servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
              'stun:stun3.l.google.com:19302',
              'stun:stun4.l.google.com:19302'
            ]
          }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      });

      this.setupPeerConnectionListeners();
      
      // Verify that the peer connection was created successfully
      if (!this.peerConnection) {
        throw new Error('Failed to create peer connection');
      }
      
      console.log('Peer connection initialized successfully:', this.peerConnection.connectionState);
      
      // Re-add any existing tracks to the new peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          if (this.peerConnection) {
            console.log(`Re-adding ${track.kind} track to peer connection`);
            this.peerConnection.addTrack(track, this.localStream!);
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing peer connection:', error);
      this.handleError(error instanceof Error ? error : new Error('Failed to initialize peer connection'));
      return false;
    }
  }

  private setupPeerConnectionListeners() {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate);
        // The caller should handle emitting these to the signaling server
      } else {
        console.log('ICE gathering completed');
        this.isIceGatheringComplete = true;
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      this.startMetricsCollection();
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      this.connectionState = this.peerConnection.connectionState;
      this.onConnectionStateChange?.(this.connectionState);
      
      console.log('Connection state changed:', this.connectionState);

      if (this.connectionState === 'connected') {
        console.log('WebRTC connection established successfully');
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.adaptStreamQuality();
      } else if (this.connectionState === 'failed') {
        this.handleError(new Error('Connection failed'));
        this.attemptReconnect();
      } else if (this.connectionState === 'disconnected') {
        console.log('Connection disconnected, attempting to stabilize...');
        setTimeout(() => {
          if (this.peerConnection?.connectionState === 'disconnected') {
            this.attemptReconnect();
          }
        }, 5000);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      this.iceConnectionState = this.peerConnection.iceConnectionState;
      this.onIceConnectionStateChange?.(this.iceConnectionState);
      
      console.log('ICE connection state changed:', this.iceConnectionState);

      if (this.iceConnectionState === 'failed') {
        this.handleError(new Error('ICE connection failed'));
        this.attemptReconnect();
      } else if (this.iceConnectionState === 'connected') {
        console.log('ICE connection established');
      }
    };

    this.peerConnection.onicegatheringstatechange = () => {
      if (!this.peerConnection) return;
      console.log('ICE gathering state:', this.peerConnection.iceGatheringState);
      
      if (this.peerConnection.iceGatheringState === 'complete') {
        this.isIceGatheringComplete = true;
        console.log('ICE gathering completed, all candidates collected');
      }
    };
    
    // Handle connection quality
    this.peerConnection.onconnectionstatechange = () => {
      this.adaptStreamQuality();
    };
  }

  /**
   * Adapt stream quality based on connection metrics
   */
  private adaptStreamQuality() {
    if (!this.localStream || !this.peerConnection) return;
    
    // Only change quality if we're connected
    if (this.peerConnection.connectionState !== 'connected') return;
    
    this.peerConnection.getStats().then(stats => {
      let totalBitrate = 0;
      let packetsLost = 0;
      let totalPackets = 0;
      
      stats.forEach(report => {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          if (report.bytesSent && report.timestamp) {
            totalBitrate = report.bytesSent * 8 / 1000; // kbps
          }
          if (report.packetsLost !== undefined && report.packetsSent !== undefined) {
            packetsLost = report.packetsLost;
            totalPackets = report.packetsSent;
          }
        }
      });
      
      const lossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;
      
      // Adapt quality based on metrics
      const videoTracks = this.localStream?.getVideoTracks();
      if (!videoTracks || videoTracks.length === 0) return;
      
      const videoTrack = videoTracks[0];
      if (!videoTrack) return;
      
      let newQuality: 'low' | 'medium' | 'high' = this.streamQuality;
      
      // Adjusted thresholds for better quality
      if (lossRate > 0.15 || totalBitrate < 300) {
        // Only reduce to low quality in very poor conditions
        newQuality = 'low';
      } else if (lossRate < 0.05 && totalBitrate > 1500) {
        // Increase to high quality in good conditions
        newQuality = 'high';
      } else {
        // Use medium quality as the default
        newQuality = 'medium';
      }
      
      // Only change constraints if quality changed
      if (newQuality !== this.streamQuality) {
        this.streamQuality = newQuality;
        console.log(`Adapting stream quality to ${newQuality} based on network conditions`);
        
        const constraints: MediaTrackConstraints = {
          width: { ideal: newQuality === 'high' ? 1920 : newQuality === 'medium' ? 1280 : 640 },
          height: { ideal: newQuality === 'high' ? 1080 : newQuality === 'medium' ? 720 : 480 },
          frameRate: { ideal: newQuality === 'high' ? 60 : newQuality === 'medium' ? 30 : 24 },
          aspectRatio: { ideal: 16/9 },
          backgroundBlur: this.isBackgroundBlurred,
          advanced: [{
            backgroundBlur: this.isBackgroundBlurred
          }]
        };
        
        videoTrack.applyConstraints(constraints)
          .catch(error => console.error('Error applying video constraints:', error));
      }
    });
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.handleError(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (this.peerConnection && this.peerConnection.connectionState !== 'connected') {
          console.log('Recreating peer connection...');
          this.peerConnection.close();
          this.initializePeerConnection();
          
          // Re-add tracks
          if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
              this.peerConnection?.addTrack(track, this.localStream!);
            });
          }
          
          // Renegotiate
          const offer = await this.createOffer();
          console.log('Created new offer for reconnection');
          // The caller should send this offer through the signaling channel
        }
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.attemptReconnect();
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)); // Exponential backoff, max 30s
  }

  private startMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(async () => {
      if (!this.peerConnection) return;

      try {
        const stats = await this.peerConnection.getStats();
        const metrics: StreamMetrics = {
          timestamp: Date.now(),
          video: {
            bitrate: 0,
            frameRate: 0,
            resolution: { width: 0, height: 0 },
            packetsLost: 0,
          },
          audio: {
            bitrate: 0,
            packetsLost: 0,
          },
          connection: {
            rtt: 0,
            bandwidth: 0,
          },
        };

        stats.forEach((report) => {
          if (report.type === 'outbound-rtp') {
            if (report.kind === 'video') {
              metrics.video.bitrate = report.bytesSent ? (report.bytesSent * 8) / 1000 : 0; // kbps
              metrics.video.packetsLost = report.packetsLost || 0;
            } else if (report.kind === 'audio') {
              metrics.audio.bitrate = report.bytesSent ? (report.bytesSent * 8) / 1000 : 0; // kbps
              metrics.audio.packetsLost = report.packetsLost || 0;
            }
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            metrics.connection.rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0; // ms
            metrics.connection.bandwidth = report.availableOutgoingBitrate ? report.availableOutgoingBitrate / 1000 : 0; // kbps
          }
        });

        // Get video track stats
        if (this.remoteStream) {
          const videoTrack = this.remoteStream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            metrics.video.resolution = {
              width: settings.width || 0,
              height: settings.height || 0,
            };
            metrics.video.frameRate = settings.frameRate || 0;
          }
        }

        this.onMetricsUpdate?.(metrics);
        
        // Adapt quality based on metrics
        this.adaptStreamQuality();
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, 2000); // Collect metrics every 2 seconds to reduce overhead
  }

  private handleError(error: Error) {
    console.error('WebRTC error:', error);
    this.onError?.(error);
  }

  /**
   * Get the local media stream
   */
  getLocalStream() {
    return this.localStream;
  }

  /**
   * Set an existing local media stream instead of creating a new one
   */
  async setLocalStream(stream: MediaStream) {
    // Clean up existing stream if we have one
    if (this.localStream) {
      console.log('Cleaning up existing local stream before setting new one');
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log(`Stopped existing ${track.kind} track`);
        } catch (err) {
          console.error('Error stopping existing track:', err);
        }
      });
    }
    
    this.localStream = stream;
    
    if (this.peerConnection) {
      // Remove any existing tracks first
      const senders = this.peerConnection.getSenders();
      senders.forEach(sender => {
        try {
          console.log('Removing existing track from peer connection');
          this.peerConnection?.removeTrack(sender);
        } catch (err) {
          console.error('Error removing track from peer connection:', err);
        }
      });
      
      // Add new tracks
      stream.getTracks().forEach(track => {
        try {
          console.log(`Adding ${track.kind} track to peer connection`);
          this.peerConnection?.addTrack(track, stream);
        } catch (err) {
          console.error('Error adding track to peer connection:', err);
        }
      });
    } else {
      // No peer connection yet, try to initialize one
      console.log('No peer connection available, initializing one');
      const success = this.initializePeerConnection();
      
      if (success && this.peerConnection) {
        // Add tracks to the newly initialized peer connection
        stream.getTracks().forEach(track => {
          try {
            console.log(`Adding ${track.kind} track to new peer connection`);
            this.peerConnection?.addTrack(track, stream);
          } catch (err) {
            console.error('Error adding track to new peer connection:', err);
          }
        });
      }
    }
    
    return stream;
  }

  async startLocalStream() {
    try {
      // First check if permissions are already granted
      const permissions = await this.checkPermissions();
      
      if (!permissions.camera || !permissions.microphone) {
        console.log('Requesting camera/microphone permissions...');
      }

      try {
        // Try with reasonable quality constraints first
        const constraints = this.getVideoConstraints(this.streamQuality);
        
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: constraints.video,
          audio: constraints.audio
        });
      } catch (highQualityError) {
        console.warn('Failed with quality settings, trying fallback options:', highQualityError);
        
        // Try with basic constraints if quality settings fail
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      }

      if (this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection?.addTrack(track, this.localStream!);
        });
      }

      return this.localStream;
    } catch (error) {
      console.error('Media access error:', error);
      const err = error instanceof Error ? error : new Error('Failed to access media devices. Please ensure you have allowed camera and microphone permissions in your browser settings.');
      this.handleError(err);
      throw err;
    }
  }

  /**
   * Get video constraints based on quality setting
   */
  private getVideoConstraints(quality: 'low' | 'medium' | 'high') {
    interface ExtendedVideoConstraints extends MediaTrackConstraints {
      width: { ideal: number; min: number };
      height: { ideal: number; min: number };
      frameRate: { ideal: number; min: number };
      aspectRatio: { ideal: number };
    }

    const constraints: { video: ExtendedVideoConstraints; audio: MediaTrackConstraints } = {
      video: {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 24 },
        aspectRatio: { ideal: 16/9 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2
      }
    };
    
    switch (quality) {
      case 'high':
        constraints.video = {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 60, min: 30 },
          aspectRatio: { ideal: 16/9 }
        };
        break;
      case 'medium':
        // Use default settings above
        break;
      case 'low':
        constraints.video = {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 24, min: 15 },
          aspectRatio: { ideal: 16/9 }
        };
        break;
    }
    
    return constraints;
  }

  /**
   * Check if camera and microphone permissions are already granted
   */
  private async checkPermissions(): Promise<{camera: boolean, microphone: boolean}> {
    const permissions = { camera: false, microphone: false };
    
    if (!navigator.permissions || !navigator.permissions.query) {
      console.warn('Permissions API not supported');
      return permissions;
    }
    
    try {
      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      permissions.camera = cameraPermission.state === 'granted';
      
      // Check microphone permission
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      permissions.microphone = microphonePermission.state === 'granted';
      
      return permissions;
    } catch (error) {
      console.warn('Error checking permissions:', error);
      return permissions;
    }
  }

  async createOffer() {
    // If no peer connection exists, or it's in a failed state, try to reinitialize it
    if (!this.peerConnection || 
        this.peerConnection.connectionState === 'failed' || 
        this.peerConnection.iceConnectionState === 'failed') {
      console.log('No valid peer connection found, reinitializing before creating offer');
      const initialized = this.initializePeerConnection();
      if (!initialized) {
        console.error('Failed to initialize peer connection');
        this.handleError(new Error('Peer connection initialization failed'));
        return null;
      }
    }

    if (!this.peerConnection) {
      this.handleError(new Error('Peer connection not initialized'));
      return null;
    }

    try {
      console.log('Creating offer with connection state:', this.peerConnection.connectionState);
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: this.reconnectAttempts > 0
      });
      
      console.log('Offer created successfully:', offer.type);
      
      await this.peerConnection.setLocalDescription(offer);
      console.log('Local offer description set successfully');
      
      // Wait for ICE gathering to complete or timeout
      if (!this.isIceGatheringComplete) {
        await new Promise<void>((resolve) => {
          const checkComplete = () => {
            if (this.isIceGatheringComplete || 
                (this.peerConnection && this.peerConnection.iceGatheringState === 'complete')) {
              resolve();
            } else {
              setTimeout(checkComplete, 500);
            }
          };
          
          // Set a timeout in case gathering takes too long
          setTimeout(resolve, 5000);
          checkComplete();
        });
      }
      
      // Make sure peerConnection is still valid
      if (!this.peerConnection) {
        console.warn('Peer connection became null after waiting for ICE gathering');
        return offer; // Return the original offer as fallback
      }
      
      // Make sure localDescription isn't null before returning it
      if (!this.peerConnection.localDescription) {
        console.warn('Local description is null after setting offer. Using the original offer object instead.');
        return offer; // Return the original offer we created as a fallback
      }
      
      return this.peerConnection.localDescription;
    } catch (error) {
      console.error('Error creating offer:', error);
      
      // Try to recover by reinitializing the peer connection
      console.log('Attempting to recover by reinitializing peer connection');
      this.initializePeerConnection();
      
      const err = error instanceof Error ? error : new Error('Failed to create offer');
      this.handleError(err);
      
      // Instead of throwing an error, return null to allow the app to continue
      return null;
    }
  }

  /**
   * Handle a remote offer (for viewers receiving an offer from the host)
   */
  async handleRemoteOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      this.handleError(new Error('Peer connection not initialized'));
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(offer);
      console.log('Remote offer description set successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to set remote offer');
      this.handleError(err);
      throw err;
    }
  }

  /**
   * Create an answer to a received offer (for viewers)
   */
  async createAnswer() {
    if (!this.peerConnection) {
      this.handleError(new Error('Peer connection not initialized'));
      return null;
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('Created and set local answer description');
      
      // Wait for ICE gathering to complete or timeout
      if (!this.isIceGatheringComplete) {
        await new Promise<void>((resolve) => {
          const checkComplete = () => {
            if (this.isIceGatheringComplete || 
                this.peerConnection?.iceGatheringState === 'complete') {
              resolve();
            } else {
              setTimeout(checkComplete, 500);
            }
          };
          
          // Set a timeout in case gathering takes too long
          setTimeout(resolve, 5000);
          checkComplete();
        });
      }
      
      return this.peerConnection.localDescription;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create answer');
      this.handleError(err);
      throw err;
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      this.handleError(new Error('Peer connection not initialized'));
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(answer);
      console.log('Remote answer description set successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to set remote description');
      this.handleError(err);
      throw err;
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      this.handleError(new Error('Peer connection not initialized'));
      return;
    }

    try {
      console.log('Adding ICE candidate:', candidate);
      await this.peerConnection.addIceCandidate(candidate);
      console.log('ICE candidate added successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to add ICE candidate');
      this.handleError(err);
      throw err;
    }
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getConnectionState() {
    return this.connectionState;
  }

  getIceConnectionState() {
    return this.iceConnectionState;
  }

  toggleMute() {
    if (!this.localStream) {
      this.handleError(new Error('Local stream not initialized'));
      return;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log(`Microphone ${audioTrack.enabled ? 'unmuted' : 'muted'}`);
    }
  }

  toggleCamera() {
    if (!this.localStream) {
      this.handleError(new Error('Local stream not initialized'));
      return;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log(`Camera ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Toggle background blur effect
   */
  async toggleBackgroundBlur() {
    if (!this.localStream) {
      console.error('No local stream available');
      return false;
    }

    try {
      this.isBackgroundBlurred = !this.isBackgroundBlurred;

      if (this.isBackgroundBlurred) {
        await this.startBackgroundBlur();
      } else {
        await this.stopBackgroundBlur();
      }

      console.log(`Background blur ${this.isBackgroundBlurred ? 'enabled' : 'disabled'}`);
      return this.isBackgroundBlurred;
    } catch (error) {
      console.error('Error toggling background blur:', error);
      this.isBackgroundBlurred = false;
      throw error;
    }
  }

  private async startBackgroundBlur() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Create virtual video element to receive the stream
    this.virtualVideo = document.createElement('video');
    this.virtualVideo.srcObject = new MediaStream([videoTrack]);
    this.virtualVideo.autoplay = true;
    this.virtualVideo.playsInline = true;
    await this.virtualVideo.play();

    // Create canvas for blur effect
    this.blurCanvas = document.createElement('canvas');
    this.blurContext = this.blurCanvas.getContext('2d');
    
    // Set canvas size to match video
    const { width, height } = videoTrack.getSettings();
    this.blurCanvas.width = width || 640;
    this.blurCanvas.height = height || 480;

    // Create new stream from canvas
    this.blurredStream = this.blurCanvas.captureStream();

    // Replace track in peer connection
    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find(s => s.track === videoTrack);
      if (sender) {
        await sender.replaceTrack(this.blurredStream.getVideoTracks()[0]);
      }
    }

    // Start blur effect loop
    this.applyBlurEffect();
  }

  private async stopBackgroundBlur() {
    if (!this.localStream) return;

    const originalTrack = this.localStream.getVideoTracks()[0];
    if (!originalTrack) return;

    // Replace blurred track with original in peer connection
    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(originalTrack);
      }
    }

    // Clean up resources
    if (this.virtualVideo) {
      this.virtualVideo.srcObject = null;
      this.virtualVideo = null;
    }
    if (this.blurredStream) {
      this.blurredStream.getTracks().forEach(track => track.stop());
      this.blurredStream = null;
    }
    this.blurCanvas = null;
    this.blurContext = null;
  }

  private applyBlurEffect() {
    if (!this.isBackgroundBlurred || !this.virtualVideo || !this.blurCanvas || !this.blurContext) return;

    // Draw video frame
    this.blurContext.save();
    this.blurContext.filter = 'blur(10px)';
    this.blurContext.drawImage(this.virtualVideo, 0, 0, this.blurCanvas.width, this.blurCanvas.height);
    this.blurContext.restore();

    // Draw unblurred center portion (simulating body segmentation)
    const centerX = this.blurCanvas.width / 2;
    const centerY = this.blurCanvas.height / 2;
    const radius = Math.min(this.blurCanvas.width, this.blurCanvas.height) * 0.3;

    this.blurContext.save();
    this.blurContext.beginPath();
    this.blurContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.blurContext.clip();
    this.blurContext.drawImage(this.virtualVideo, 0, 0, this.blurCanvas.width, this.blurCanvas.height);
    this.blurContext.restore();

    // Continue the loop
    if (this.isBackgroundBlurred) {
      requestAnimationFrame(() => this.applyBlurEffect());
    }
  }

  public stop(): void {
    console.log('WebRTCService: Stopping service');
    
    // Clear any running intervals and timeouts
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Keep track of devices that were in use to release them more thoroughly
    const activeDeviceIds = new Set<string>();
    
    // Stop all tracks in the local stream FIRST before closing connection
    if (this.localStream) {
      console.log('WebRTCService: Stopping all local tracks');
      this.localStream.getTracks().forEach(track => {
        console.log(`WebRTCService: Stopping track: ${track.kind}`, track);
        try {
          // Collect device IDs for more thorough cleanup - but better to skip this since TypeScript is complaining
          /*if (track.getSettings && typeof track.getSettings === 'function') {
            const settings = track.getSettings();
            if (settings && settings.deviceId) {
              activeDeviceIds.add(settings.deviceId);
            }
          }*/
          
          // First disable the track before stopping it
          track.enabled = false;
          // Then stop it
          track.stop();
          
          // For some browsers, detaching from srcObject can help
          if (typeof document !== 'undefined') {
            // Find any video elements that might be using this track
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach((videoEl) => {
              try {
                if (videoEl.srcObject instanceof MediaStream) {
                  const stream = videoEl.srcObject as MediaStream;
                  if (stream.getTracks().includes(track)) {
                    console.log('Removing track from video element');
                    // Just pause and clear the srcObject to help release the camera
                    videoEl.pause();
                    videoEl.srcObject = null;
                  }
                }
              } catch (err) {
                console.error('Error cleaning up video element:', err);
              }
            });
          }
        } catch (err) {
          console.error('Error stopping track:', err);
        }
      });
      this.localStream = null;
    }
    
    // Stop remote stream tracks
    if (this.remoteStream) {
      console.log('WebRTCService: Stopping all remote tracks');
      this.remoteStream.getTracks().forEach((track) => {
        try {
          // First disable the track
          track.enabled = false;
          // Then stop it
          track.stop(); 
        } catch (err) {
          console.error('Error stopping remote track:', err);
        }
      });
      this.remoteStream = null;
    }
    
    // Close peer connection AFTER stopping tracks
    if (this.peerConnection) {
      try {
        // First remove all tracks from peer connection
        const senders = this.peerConnection.getSenders();
        senders.forEach(sender => {
          try {
            this.peerConnection?.removeTrack(sender);
          } catch (err) {
            console.error('Error removing track from connection:', err);
          }
        });
        
        // Then close the peer connection
        this.peerConnection.onicecandidate = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.onicegatheringstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.ondatachannel = null;
        
        this.peerConnection.close();
      } catch (err) {
        console.error('Error closing peer connection:', err);
      }
      this.peerConnection = null;
    }
    
    // Clean up resources
    this.isIceGatheringComplete = false;
    this.iceCandidates = [];
    this.reconnectAttempts = 0;
    
    // Additional cleanup: Force a temporary media request and immediate release
    // This can help ensure the camera light goes off on some browsers
    try {
      if (typeof navigator !== 'undefined' && 
          navigator.mediaDevices) {
        
        // Force release all media devices
        this.forceReleaseAllDevices();
      }
    } catch (finalErr) {
      console.error('WebRTCService: Error in final cleanup step:', finalErr);
    }
    
    console.log('WebRTCService: Service stopped completely');
  }
  
  // Helper method to force release all media devices
  private forceReleaseAllDevices(): void {
    console.log('WebRTCService: Attempting to release all media devices');
    
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }
    
    // First try video+audio
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(tempStream => {
        tempStream.getTracks().forEach(track => {
          track.stop();
        });
        console.log('WebRTCService: All devices released successfully');
      })
      .catch(() => {
        // If that fails, try audio only
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(audioStream => {
            audioStream.getTracks().forEach(track => track.stop());
            console.log('WebRTCService: Audio device released');
          })
          .catch(() => {
            // If audio fails, try video only
            navigator.mediaDevices.getUserMedia({ audio: false, video: true })
              .then(videoStream => {
                videoStream.getTracks().forEach(track => track.stop());
                console.log('WebRTCService: Video device released');
              })
              .catch(err => {
                // Expected if all permissions are already revoked
                console.log('WebRTCService: All device release attempts failed (probably already released):', err.name);
              });
          });
      });
  }
}

export interface StreamMetrics {
  timestamp: number;
  video: {
    bitrate: number; // kbps
    frameRate: number;
    resolution: {
      width: number;
      height: number;
    };
    packetsLost: number;
  };
  audio: {
    bitrate: number; // kbps
    packetsLost: number;
  };
  connection: {
    rtt: number; // ms
    bandwidth: number; // kbps
  };
} 