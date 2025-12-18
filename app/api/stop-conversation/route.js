import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const agoraUsername = process.env.AGORA_USERNAME;
    const agoraPassword = process.env.AGORA_PASSWORD;

    if (!agoraUsername || !agoraPassword) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    if (!body.conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Generate basic auth token
    const authToken = Buffer.from(`${agoraUsername}:${agoraPassword}`).toString('base64');

    // Call Agora ConvoAI API to stop conversation
    // Note: Replace {projectId} with your actual Agora project ID
    const projectId = process.env.AGORA_PROJECT_ID || '{projectId}';
    const response = await fetch(`https://api.agora.io/v1/projects/${projectId}/rtc/ai-agent/conversations/${body.conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agora API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to stop conversation', details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

