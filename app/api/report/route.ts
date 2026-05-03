import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const { darkPeriod, weatherData, sanctionsData, stormData } = await request.json();

  const prompt = `You are a maritime intelligence analyst. Generate a brief intelligence report for the following suspicious vessel activity.

## Vessel Data
- MMSI: ${darkPeriod.mmsi}
- Last seen: ${darkPeriod.lastSeenTime}
- Reappeared: ${darkPeriod.reappearTime}
- Dark period: ${darkPeriod.gapHours} hours
- Distance traveled while dark: ${darkPeriod.distanceNm} nautical miles
- Implied speed: ${darkPeriod.impliedSpeedKnots} knots
- Last position: ${darkPeriod.lastLat}, ${darkPeriod.lastLon}
- Reappear position: ${darkPeriod.reappearLat}, ${darkPeriod.reappearLon}
- Suspicion score: ${darkPeriod.suspicionScore}/100
- Risk level: ${darkPeriod.riskLevel}
- Risk factors: ${darkPeriod.reasons.join('; ')}

${weatherData ? `## Weather Conditions\n- Wind: ${weatherData.windSpeedKnots} knots\n- Visibility: ${weatherData.visibilityM}m` : ''}

${stormData ? `## Storm Activity\n- Storm: ${stormData.name} (${stormData.category || 'Unknown category'})` : ''}

${sanctionsData?.isSanctioned ? `## Sanctions Alert\n- Sanctioned: YES\n- Details: ${sanctionsData.reasons.join('; ')}` : ''}

Generate a 2-3 paragraph intelligence summary covering:
1. Assessment of the vessel's behavior and likely intent
2. Recommended actions for further investigation
3. Confidence level in the assessment

Be concise and professional.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const report = content.type === 'text' ? content.text : '';

    return NextResponse.json({ report });
  } catch (error) {
    console.error('LLM report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
