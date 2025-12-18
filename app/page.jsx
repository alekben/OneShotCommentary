'use client';

import { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm-sdk';
import AudioVisualizer from './components/AudioVisualizer';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState('idle'); // idle, starting, active, stopping
  const [error, setError] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  
  const rtcClientRef = useRef(null);
  const rtmClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const remoteAudioTrackRef = useRef(null);
  const conversationIdRef = useRef(null);
  const channelNameRef = useRef(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (rtcClientRef.current || rtmClientRef.current) {
        handleStop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setAgentState('starting');

      const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      if (!agoraAppId) {
        throw new Error('NEXT_PUBLIC_AGORA_APP_ID is not configured');
      }

      // Generate unique channel name
      const channelName = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      channelNameRef.current = channelName;

      // Initialize Agora RTC client
      const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      rtcClientRef.current = rtcClient;

      // Initialize Agora RTM client
      const rtmClient = AgoraRTM.createInstance(agoraAppId);
      rtmClientRef.current = rtmClient;

      // Get user media for microphone
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudioTrackRef.current = localAudioTrack;

      // Join RTC channel
      const uid = await rtcClient.join(
        agoraAppId,
        channelName,
        null, // token - can be generated server-side if needed
        null  // uid - auto-generated if null
      );

      // Publish local audio track
      await rtcClient.publish([localAudioTrack]);

      // Set up remote audio track handler
      rtcClient.on('user-published', async (user, mediaType) => {
        if (mediaType === 'audio') {
          await rtcClient.subscribe(user, mediaType);
          const remoteAudioTrack = user.audioTrack;
          remoteAudioTrackRef.current = remoteAudioTrack;
          setRemoteAudioTrack(remoteAudioTrack);
          setAgentState('active');
          setIsConnected(true);
        }
      });

      // Handle user unpublish
      rtcClient.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'audio') {
          remoteAudioTrackRef.current = null;
          setRemoteAudioTrack(null);
          setAgentState('idle');
          setIsConnected(false);
        }
      });

      // Start conversation via API
      const response = await fetch('/api/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelName: channelName,
          context: 'You are a helpful AI assistant. Provide a brief, informative response.',
          // Add other parameters as needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start conversation');
      }

      const data = await response.json();
      conversationIdRef.current = data.conversationId || data.id;

      setIsLoading(false);
    } catch (err) {
      console.error('Error starting agent:', err);
      setError(err.message);
      setAgentState('idle');
      setIsLoading(false);
      handleStop();
    }
  };

  const handleStop = async () => {
    try {
      setAgentState('stopping');
      setIsLoading(true);

      // Stop conversation via API
      if (conversationIdRef.current) {
        await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
          }),
        });
      }

      // Unpublish and leave RTC channel
      if (rtcClientRef.current) {
        if (localAudioTrackRef.current) {
          await rtcClientRef.current.unpublish([localAudioTrackRef.current]);
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        await rtcClientRef.current.leave();
        rtcClientRef.current = null;
      }

      // Leave RTM channel if connected
      if (rtmClientRef.current) {
        await rtmClientRef.current.logout();
        rtmClientRef.current = null;
      }

      remoteAudioTrackRef.current = null;
      setRemoteAudioTrack(null);
      conversationIdRef.current = null;
      channelNameRef.current = null;
      
      setAgentState('idle');
      setIsConnected(false);
      setIsLoading(false);
    } catch (err) {
      console.error('Error stopping agent:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="content">
        <h1>One Shot Commentary</h1>
        
        <div className="controls">
          {!isConnected ? (
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Starting Agent...' : 'Start Agent'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              {isLoading ? 'Stopping...' : 'Stop Agent'}
            </button>
          )}
        </div>

        {error && (
          <div className="error">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="status">
          <p>Status: <span className={`status-${agentState}`}>{agentState}</span></p>
        </div>

        <div className="visualizer-container">
          <AudioVisualizer
            audioTrack={remoteAudioTrack}
            isActive={isConnected && agentState === 'active'}
          />
        </div>
      </div>
    </main>
  );
}

