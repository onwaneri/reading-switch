import { NextRequest, NextResponse } from 'next/server';

const NOUN_PROJECT_KEY = process.env.NOUN_PROJECT_KEY;
const NOUN_PROJECT_SECRET = process.env.NOUN_PROJECT_SECRET;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  if (!NOUN_PROJECT_KEY || !NOUN_PROJECT_SECRET) {
    console.error('[Icons API] Noun Project credentials not configured');
    return NextResponse.json({ error: 'API credentials not configured' }, { status: 500 });
  }

  console.log(`[Icons API] Fetching icon for query: "${query}"`);

  try {
    // Create OAuth 1.0 credentials for Noun Project API
    const auth = Buffer.from(`${NOUN_PROJECT_KEY}:${NOUN_PROJECT_SECRET}`).toString('base64');

    const response = await fetch(
      `https://api.thenounproject.com/v2/icon?query=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`[Icons API] Noun Project API error for "${query}":`, response.status);
      return NextResponse.json({ error: 'Failed to fetch icon' }, { status: response.status });
    }

    const data = await response.json();

    // Return the first icon's preview URL
    if (data.icons && data.icons.length > 0) {
      const iconUrl = data.icons[0].thumbnail_url || data.icons[0].preview_url;
      console.log(`[Icons API] Found icon for "${query}": ${iconUrl}`);
      return NextResponse.json({
        iconUrl,
        attribution: data.icons[0].attribution,
      });
    }

    console.log(`[Icons API] No icons found for query: "${query}"`);
    return NextResponse.json({ iconUrl: null });
  } catch (error) {
    console.error(`[Icons API] Error fetching icon for "${query}":`, error);
    return NextResponse.json({ error: 'Failed to fetch icon' }, { status: 500 });
  }
}
