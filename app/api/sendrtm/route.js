import { NextResponse } from 'next/server';

// This endpoint receives RTM messages from Agora AI Agent
// It can be used to handle agent state updates if needed
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Handle RTM messages from Agora AI Agent
    // You can process agent state updates here if needed
    console.log('RTM message received:', body);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling RTM message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

