'use client';

import { useEffect, useRef, useState } from 'react';

export default function AudioVisualizer({ audioTrack, isActive }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!audioTrack || !isActive) {
      setVolume(0);
      return;
    }

    let audioContext;
    let analyser;
    let source;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Get MediaStreamTrack from Agora audio track
      const mediaStreamTrack = audioTrack.getMediaStreamTrack 
        ? audioTrack.getMediaStreamTrack() 
        : (audioTrack.getTrack ? audioTrack.getTrack() : null);
      
      if (!mediaStreamTrack) {
        console.warn('Could not get MediaStreamTrack from audio track');
        return;
      }

      source = audioContext.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
      source.connect(analyser);

      analyserRef.current = analyser;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isActive || !audioTrack) {
          return;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedVolume = average / 255;
        setVolume(normalizedVolume);

        // Clear canvas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw bars
        const barWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, '#667eea');
          gradient.addColorStop(1, '#764ba2');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    } catch (error) {
      console.error('Error setting up audio visualizer:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (source) {
        try {
          source.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {
          // Ignore close errors
        });
      }
    };
  }, [audioTrack, isActive]);

  return (
    <div className="audio-visualizer-container">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="audio-visualizer-canvas"
      />
      {!isActive && (
        <div className="audio-visualizer-placeholder">
          <p>Audio visualizer will appear when conversation starts</p>
        </div>
      )}
    </div>
  );
}

