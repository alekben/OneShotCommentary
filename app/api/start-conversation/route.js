import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { channel, prompt, agentName} = body;
    
    // Validate required fields from request
    if (!channel || !prompt || !agentName) {
      return Response.json(
        { error: 'Missing required fields: channel, prompt, and agentName are required' },
        { status: 400 }
        );
    }
    
    const agoraUsername = process.env.AGORA_USERNAME;
    const agoraPassword = process.env.AGORA_PASSWORD;
    const agoraAppId = process.env.AGORA_APP_ID;
    const ttsKey = process.env.TTS_KEY;
    const llmUrl = process.env.LLM_URL;
    const llmApiKey = process.env.LLM_API_KEY;

    if (!agoraUsername || !agoraPassword || !agoraAppId || !ttsKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Generate basic auth token
    const authToken = Buffer.from(`${agoraUsername}:${agoraPassword}`).toString('base64');

    // Prepare the request to Agora ConvoAI API
    const agoraRequestBody = {
      name: agentName,
      properties: {
        channel: channel,
        token: "",
        agent_rtc_uid: "8888",
        remote_rtc_uids: ["12345"],
        enable_string_uid: false,
        idle_timeout: 120,
        advanced_features: {
          enable_rtm: "true"
        },
        asr: {
          vendor: "microsoft",
          params: {
            key: "key",
            region: "eastus",
            language: "en-US",
          },
        },
        parameters: {
          audio_scenario: "chorus",
          data_channel: "rtm",
          transcript: {
            enable: true
          }
        },
        llm: {
          url: llmUrl,
          api_key: llmApiKey,
          system_messages: [
            {
              role: "system",
              content: prompt
            }
          ],
          greeting_message: "",
          failure_message: "Error.",
          max_history: 1,
          input_modalities: ["text"],
          output_modalities: ["text"],
          params: {
            model: "gpt-4o-mini"
          },
          greeting_interruptable: false
        },
        tts: {
          vendor: "microsoft",
          params: {
            key: ttsKey,
            region: "eastus",
            voice_name: "en-US-AvaMultilingualNeural",
            sample_rate: 24000
          }
        }
      }
    };

    // Call Agora ConvoAI API
    const response = await fetch(`https://api.agora.io/api/conversational-ai-agent/v2/projects/${agoraAppId}/join`, {
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
        { error: 'Failed to start agent', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting agent:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

