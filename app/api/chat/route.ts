import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an AI assistant for a maritime surveillance system called "Ghost Fleet Detector".
Your role is to help analysts understand vessel tracking data, specifically focusing on "dark periods" - times when vessels turn off their AIS transponders.

Current data context:
${context}

Guidelines:
- Be concise and tactical in your responses
- Use maritime terminology when appropriate
- Focus on the data provided
- If asked about suspicious activity, refer to the risk levels: CRITICAL (70-100), HIGH (50-69), MEDIUM (30-49), LOW (0-29)
- Format numbers clearly
- Use bullet points for lists
- Keep responses under 200 words unless detailed analysis is requested`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || 'OpenAI API error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'No response generated';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
