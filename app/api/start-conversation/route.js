import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const agoraUsername = process.env.AGORA_USERNAME;
    const agoraPassword = process.env.AGORA_PASSWORD;
    const agoraAppId = process.env.AGORA_APP_ID;
    const publicUrl = process.env.PUBLIC_URL;

    if (!agoraUsername || !agoraPassword || !agoraAppId || !publicUrl) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Generate basic auth token
    const authToken = Buffer.from(`${agoraUsername}:${agoraPassword}`).toString('base64');

    // Prepare the request to Agora ConvoAI API
    const agoraRequest = {
      appId: agoraAppId,
      channelName: body.channelName || `channel_${Date.now()}`,
      token: body.token || null,
      agentConfig: {
        agentId: body.agentId || null,
        agentName: body.agentName || 'OneShotAgent',
        llm: {
          provider: body.llmProvider || 'custom',
          endpoint: `${publicUrl}/api/chat/completions`,
          apiKey: body.llmApiKey || null,
          model: body.llmModel || 'gpt-4',
          temperature: body.temperature || 0.7,
          maxTokens: body.maxTokens || 500,
        },
        tts: {
          provider: body.ttsProvider || 'azure',
          voice: body.ttsVoice || 'en-US-JennyNeural',
          key: body.ttsKey || null,
          region: body.ttsRegion || 'eastus',
        },
        context: body.context || '',
        enableTTS: body.enableTTS !== false,
        enableSTT: body.enableSTT !== false,
      },
      callback: {
        url: `${publicUrl}/api/sendrtm`,
      },
    };

    // Call Agora ConvoAI API
    // Note: Replace {projectId} with your actual Agora project ID
    // You may want to add AGORA_PROJECT_ID to environment variables
    const projectId = process.env.AGORA_PROJECT_ID || '{projectId}';
    const response = await fetch(`https://api.agora.io/v1/projects/${projectId}/rtc/ai-agent/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`,
      },
      body: JSON.stringify(agoraRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agora API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to start conversation', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

