import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { agentId, text, priority, interruptable } = body;
    
    // Validate required fields
    if (!agentId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId and text are required' },
        { status: 400 }
      );
    }

    // Validate text length (max 512 bytes)
    const textBytes = Buffer.from(text, 'utf8').length;
    if (textBytes > 512) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 512 bytes' },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (priority && !['INTERRUPT', 'APPEND', 'IGNORE'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value. Must be one of: INTERRUPT, APPEND, IGNORE' },
        { status: 400 }
      );
    }
    
    const agoraUsername = process.env.AGORA_USERNAME;
    const agoraPassword = process.env.AGORA_PASSWORD;
    const agoraAppId = process.env.AGORA_APP_ID;

    if (!agoraUsername || !agoraPassword || !agoraAppId) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Generate basic auth token
    const authToken = Buffer.from(`${agoraUsername}:${agoraPassword}`).toString('base64');

    // Prepare the request body for Agora speak API
    const agoraRequestBody = {
      text: text,
      ...(priority && { priority }),
      ...(interruptable !== undefined && { interruptable })
    };

    // Call Agora ConvoAI speak API
    const response = await fetch(`https://api.agora.io/api/conversational-ai-agent/v2/projects/${agoraAppId}/agents/${agentId}/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`,
      },
      body: JSON.stringify(agoraRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Agora API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to broadcast message', details: errorText },
        { status: response.status }
      );
    }

    // If response is empty (status 200), return success
    // Otherwise, parse and return the JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
