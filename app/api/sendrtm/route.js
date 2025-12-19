export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { agentuid, message } = body;

    // Validate required fields from request
    if (agentuid === undefined || !message) {
      return Response.json(
        { error: 'Missing required fields: agentuid and message are required' },
        { status: 400 }
      );
    }

    // Get environment variables
    const agoraUsername = process.env.AGORA_USERNAME;
    const agoraPassword = process.env.AGORA_PASSWORD;
    const agoraAppId = process.env.AGORA_APP_ID;

    // Validate environment variables
    if (!agoraUsername || !agoraPassword || !agoraAppId) {
      return Response.json(
        { error: 'Missing required environment variables: AGORA_USERNAME, AGORA_PASSWORD, AGORA_APP_ID' },
        { status: 500 }
      );
    }

    // Generate Basic Auth header
    const credentials = Buffer.from(`${agoraUsername}:${agoraPassword}`).toString('base64');
    const authHeader = `Basic ${credentials}`;

    // Construct Agora RTM API URL
    // Format: https://api.agora.io/dev/v2/project/{appId}/rtm/users/Server/peer_messages
    const url = `https://api.agora.io/dev/v2/project/${agoraAppId}/rtm/users/Server/peer_messages`;

    // Construct request body
    const requestBody = {
      destination: agentuid,
      payload: message,
      custom_type: "user.transcription",
    };

    // Make request to Agora RTM API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return Response.json(
        { 
          error: 'Agora RTM API request failed',
          details: responseData,
          status: response.status
        },
        { status: response.status }
      );
    }

    // Return successful response
    return Response.json({
      success: true,
      agora_response: responseData
    });

  } catch (error) {
    console.error('Error in sendrtm route:', error);
    return Response.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}