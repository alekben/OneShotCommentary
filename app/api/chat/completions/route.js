import { NextResponse } from 'next/server';

// Proxy endpoint for LLM requests from Agora AI Agent
// This allows you to use your own LLM without exposing API keys
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to your LLM service
    // You can add your LLM API key here or in environment variables
    const llmUrl = process.env.LLM_URL;
    const llmApiKey = process.env.LLM_API_KEY;

    if (!llmUrl) {
      return NextResponse.json(
        { error: 'LLM_URL not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(llmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(llmApiKey && { 'Authorization': `Bearer ${llmApiKey}` }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', errorText);
      return NextResponse.json(
        { error: 'LLM request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying LLM request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

