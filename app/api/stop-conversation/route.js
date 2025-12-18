import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { agent_id } = body;
    
    const agoraUsername = process.env.AGORA_USERNAME;
    const agoraPassword = process.env.AGORA_PASSWORD;
    const agoraAppId = process.env.AGORA_APP_ID;

    if (!agoraUsername || !agoraPassword || !agoraAppId) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    if (!body.agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      );
    }

    // Generate basic auth token
    const authToken = Buffer.from(`${agoraUsername}:${agoraPassword}`).toString('base64');

    // Call Agora ConvoAI API to stop conversation
    // Note: The projectId should be included in the request or determined from your Agora account
    // For now, using a placeholder - you may need to adjust this based on your Agora API structure
    const response = await fetch(`https://api.agora.io/api/conversational-ai-agent/v2/projects/${agoraAppId}/agents/${agent_id}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agora API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to stop agent', details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping agent:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

