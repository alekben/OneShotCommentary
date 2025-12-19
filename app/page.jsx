'use client';

import { useState, useEffect, useRef } from 'react';
import AudioVisualizer from './components/AudioVisualizer';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agentState, setAgentState] = useState('stopped'); // idle, starting, stopping, silent, speaking, listening, thinking
  const [error, setError] = useState(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState(null);
  const [stateLogs, setStateLogs] = useState([]);
  
  const rtcClientRef = useRef(null);
  const rtmClientRef = useRef(null);
  const remoteAudioTrackRef = useRef(null);
  const agentIdRef = useRef(null);
  const channelNameRef = useRef(null);
  const agoraRTCRef = useRef(null);
  const agoraRTMRef = useRef(null);
  const previousAgentStateRef = useRef('stopped');

  // Load Agora SDKs dynamically on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('agora-rtc-sdk-ng'),
        import('agora-rtm-sdk')
      ]).then(([AgoraRTCModule, AgoraRTMModule]) => {
        agoraRTCRef.current = AgoraRTCModule.default;
        agoraRTMRef.current = AgoraRTMModule.default;
      }).catch((error) => {
        console.error('Error loading Agora SDKs:', error);
      });
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = async () => {
    try {
      if (remoteAudioTrack) {
        remoteAudioTrack.stop();
        remoteAudioTrack.close();
        setRemoteAudioTrack(null);
      }
      if (rtcClientRef.current) {
        await rtcClientRef.current.leave();
        rtcClientRef.current = null;
      }
      if (rtmClientRef.current) {
        try {
          await rtmClientRef.current.logout();
        } catch (error) {
          console.error('Error logging out RTM client:', error);
        }
        try {
          rtmClientRef.current.removeAllListeners();
        } catch (error) {
          console.error('Error removing RTM listeners:', error);
        }
        rtmClientRef.current = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleStart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setAgentState('starting');

      //Get Agora App ID from environment variables
      const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
      if (!agoraAppId) {
        throw new Error('AGORA_APP_ID is not configured');
      }

      // Generate unique channel name
      const channelName = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      channelNameRef.current = channelName;

      // Initialize and login RTM client first
      const rtmUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // RTM config
      const rtmConfig = {
        presenceTimeout: 30, // in seconds
        logUpload: false,
        logLevel: "none",
        cloudProxy: false,
        useStringUserId: true,
      };

      // Wait for Agora SDKs to load if not already loaded
      if (!agoraRTMRef.current) {
        const AgoraRTMModule = await import('agora-rtm-sdk');
        agoraRTMRef.current = AgoraRTMModule.default;
      }

      // Create and initialize RTM client
      const { RTM } = agoraRTMRef.current;
      const rtmClient = new RTM(agoraAppId, rtmUserId, rtmConfig);
      rtmClientRef.current = rtmClient;

      // Login to RTM (token can be empty for this AppID)
      await rtmClient.login({ token: '' });
      console.log('RTM client logged in successfully with userId:', rtmUserId);

      // Subscribe to RTM channel in v2.x using the correct API
      try {
        if (rtmClient) {
          const subscribeOptions = {
            withMessage: true,
            withPresence: true,
            withMetadata: false,
            withLock: false
          };
          await rtmClient.subscribe(channelName, subscribeOptions);
          console.log('Subscribed to RTM channel:', channelName);
        }
      } catch (error) {
        console.error('Failed to subscribe to RTM channel:', error);
      }

      // Handle RTM presence events
      const handleRtmPresence = async (presence) => {
        console.log('[DEBUG] RTM presence event:', presence)
        console.log('[DEBUG] RTM presence event (JSON):', JSON.stringify(presence, null, 2))
        const stateChanged = presence.stateChanged;
        if (stateChanged && stateChanged.state) {
          const newState = stateChanged.state;
          console.log(`[DEBUG] ${new Date().toISOString()} RTM Agent state from presence: ${newState}`);
          
          // Check if transitioning from 'speaking' to another state
          if (previousAgentStateRef.current === 'silent' && newState == 'silent') {
            // Trigger handleStop when transitioning from 'speaking' to any other state
            handleStop();
            return; // Don't update state here, handleStop will manage it
          }
          
          // Update state if it's a valid state
          if (['silent', 'speaking', 'listening', 'thinking', 'idle'].includes(newState)) {
            const timestamp = new Date().toISOString();
            setAgentState(newState);
            previousAgentStateRef.current = newState;
            
            // Log the state change with timestamp
            setStateLogs((prevLogs) => [
              ...prevLogs,
              { timestamp, state: newState }
            ]);
          }

          // Send RTM message to agent when state is 'idle'
          if (newState === 'idle') {
            // Send RTM message to agent directly
            try {
              const messageStr = "{game:Blackjack,players:{John:{outcome:bust,value:25},Frank:{outcome:win,value:21},House:{outcome:bust,value:23}},events:{John:'hit with 10 without going over',Frank:'hit 3 times in a row without busting'}}"
              const agentUserId = "8888"
              
              const publishOptions = {
                channelType: "USER",
                customType: "user.transcription"
              }
              
              if (rtmClientRef.current) {
                const result = await rtmClientRef.current.publish(agentUserId, messageStr, publishOptions)
                console.log('✅ Successfully sent message to agent RTC UID', agentUserId, ':', messageStr)
              } else {
                console.error('RTM client not available')
              }
            } catch (rtmError) {
              console.error('❌ Failed to send RTM message:', rtmError)
              // Don't throw here - the agent update was successful, RTM is secondary
            }
          }
        }
      };

      const handleRtmMessage = (eventArgs) => {
        try {
          // RTM v2.x event structure is different
          const message = eventArgs.message
          const publisher = eventArgs.publisher || eventArgs.channelName || eventArgs.peerId || eventArgs.from || 'unknown'
  
          let messageData = message
          let parsedMessage = JSON.parse(messageData)
  
          // DEBUG: Log all received message object types
          //if (parsedMessage && parsedMessage.object) {
          //console.log('[DEBUG] RTM message received - parsedMessage.object:', parsedMessage.object)
          //}
  
          // Handle assistant transcription messages
          if (parsedMessage.object === 'assistant.transcription') {
            // AI agent transcript - only add if turn_status is 1
            if (parsedMessage.turn_status === 1 && parsedMessage?.text) {
              const timestamp = new Date().toISOString();
              console.log(`[DEBUG] ${timestamp} RTM message received - turn_status 1 - parsedMessage.object:`, parsedMessage.object);
              setStateLogs((prevLogs) => [
                ...prevLogs,
                { timestamp, state: `AI Host Commentary: ${parsedMessage.text}` }
              ]);
            }
          } 
        } catch (error) {
          console.error('Error processing RTM message:', error, eventArgs)
          console.error('Error processing RTM message - eventArgs:', eventArgs)
          console.error('Error processing RTM message - error stack:', error.stack)
        }
      }
       
      rtmClient.addEventListener("message", handleRtmMessage);
      rtmClient.addEventListener('presence', handleRtmPresence);


      // Start conversation via API first to get agentId
      const startRequestTimestamp = new Date().toISOString();
      setStateLogs((prevLogs) => [
        ...prevLogs,
        { timestamp: startRequestTimestamp, state: 'API Request: /api/start-conversation' }
      ]);

      const response = await fetch('/api/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelName,
          prompt: 'You are a gameshow host, with a lively and witty personality. You will receive game type, player names, scores, notable moments, and outcome in a JSON format. You will then generate a commentary on the game based on the JSON data. Your commentary should be 1-3 sentences long.',
          agentName: Math.random().toString(36).substring(2, 12),
        }),
      });

      const startResponseTimestamp = new Date().toISOString();
      if (!response.ok) {
        const errorData = await response.json();
        setStateLogs((prevLogs) => [
          ...prevLogs,
          { timestamp: startResponseTimestamp, state: `API Response: /api/start-conversation (Error: ${errorData.error || 'Failed to start agent'})` }
        ]);
        throw new Error(errorData.error || 'Failed to start agent');
      }

      const data = await response.json();
      setStateLogs((prevLogs) => [
        ...prevLogs,
        { timestamp: startResponseTimestamp, state: 'API Response: /api/start-conversation (Success)' }
      ]);
      agentIdRef.current = data.agent_id;

      // Wait for Agora SDKs to load if not already loaded
      if (!agoraRTCRef.current) {
        const AgoraRTCModule = await import('agora-rtc-sdk-ng');
        agoraRTCRef.current = AgoraRTCModule.default;
      }

      // Create Agora RTC client
      agoraRTCRef.current.setLogLevel(0);
      const rtcClient = agoraRTCRef.current.createClient({ mode: 'rtc', codec: 'vp8' });
      rtcClientRef.current = rtcClient;

      // Set up event listeners before joining
      setupEventListeners(rtcClient);

      // Join RTC channel
      await rtcClient.join(agoraAppId, channelName, null, 12345);

      setIsConnected(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error starting agent:', err);
      setError(err.message);
      setAgentState('stopped');
      setIsLoading(false);
      await cleanup();
    }
  };

  const setupEventListeners = (client) => {
    // Handle remote user publishing audio
    client.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio') {
        try {
          const remoteTrack = await client.subscribe(user, mediaType);
          setRemoteAudioTrack(remoteTrack);
          remoteTrack.play();
        } catch (error) {
          console.error('Error subscribing to remote audio:', error);
        }
      }
    });

    // Handle remote user unpublishing (AI Agent leaving)
    client.on('user-unpublished', async (user, mediaType) => {
      if (mediaType === 'audio') {
        setRemoteAudioTrack((currentTrack) => {
          if (currentTrack) {
            currentTrack.stop();
            currentTrack.close();
          }
          return null;
        });
        setAgentState('idle');
        setIsConnected(false);
        console.log('Remote user unpublished audio');
      }
    });
  };

  const handleStop = async () => {
    try {
      setAgentState('stopping');
      setIsLoading(true);

      // Stop conversation via API
      if (agentIdRef.current) {
        const stopRequestTimestamp = new Date().toISOString();
        setStateLogs((prevLogs) => [
          ...prevLogs,
          { timestamp: stopRequestTimestamp, state: 'API Request: /api/stop-conversation' }
        ]);

        const stopResponse = await fetch('/api/stop-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: agentIdRef.current,
          }),
        });

        const stopResponseTimestamp = new Date().toISOString();
        if (stopResponse.ok) {
          setStateLogs((prevLogs) => [
            ...prevLogs,
            { timestamp: stopResponseTimestamp, state: 'API Response: /api/stop-conversation (Success)' }
          ]);
        } else {
          setStateLogs((prevLogs) => [
            ...prevLogs,
            { timestamp: stopResponseTimestamp, state: 'API Response: /api/stop-conversation (Error)' }
          ]);
        }
      }

      // Cleanup frontend
      await cleanup();
      setAgentState('idle');
      setIsConnected(false);
      agentIdRef.current = null;
      channelNameRef.current = null;
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
              {isLoading ? 'Starting Agent...' : 'Generate Agent Commentary'}
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
            isActive={isConnected && ['idle', 'silent'].includes(agentState)}
          />
        </div>

        <div className="state-logs">
          <h3>Agent State Logs</h3>
          <div className="logs-container">
            {stateLogs.length === 0 ? (
              <p>No state changes logged yet.</p>
            ) : (
              <ul>
                {stateLogs.map((log, index) => (
                  <li key={index}>
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span className="log-state"> - {log.state}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

