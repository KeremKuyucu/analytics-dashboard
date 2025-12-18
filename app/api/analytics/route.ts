import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const MOBILE_API_KEY = process.env.MOBILE_APP_KEY
const ENABLE_MOBILE_AUTH = false

const allowedOrigins = [
  'https://geogame-api.keremkk.com.tr',
  'https://kisalink.icu'
];

function getCorsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  let isAuthorized = false;

  if (origin && allowedOrigins.includes(origin)) {
    isAuthorized = true;
  } else {
    if (ENABLE_MOBILE_AUTH) {
      const apiKey = request.headers.get('x-api-key');
      if (apiKey === MOBILE_API_KEY) isAuthorized = true;
    } else {
      isAuthorized = true; 
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  try {
    const body = await request.json()
    const { appId, userId, endpoint } = body

    if (!appId || !userId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers })
    }

    const { error } = await supabase
      .from('analytics_events')
      .insert({
        app_id: appId,
        user_id: userId,
        endpoint: endpoint || null,
      })

    if (error) {
      return NextResponse.json({ error: "DB Error" }, { status: 500, headers })
    }

    return NextResponse.json({ success: true }, { headers })

  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500, headers })
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (!origin || !allowedOrigins.includes(origin)) {
    return NextResponse.json(
      { error: "Forbidden" }, 
      { status: 403, headers }
    );
  }

  try {
    const { searchParams } = new URL(request.url)
    const appId = searchParams.get("appId")
    const timeRange = searchParams.get("timeRange") || "daily"
    
    let startDate = searchParams.get("startDate")
    let endDate = searchParams.get("endDate")

    const now = new Date();
    if (!endDate || endDate === 'all') {
      endDate = now.toISOString();
    } else {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      endDate = e.toISOString();
    }

    if (!startDate || startDate === 'all') {
      const s = new Date();
      s.setDate(s.getDate() - 30);
      startDate = s.toISOString();
    } else {
        startDate = new Date(startDate).toISOString();
    }

    if (!appId) {
      return NextResponse.json({ error: "appId required" }, { status: 400, headers })
    }

    const { data, error } = await supabase.rpc('get_analytics_stats', {
      p_app_id: appId,
      p_time_range: timeRange,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      return NextResponse.json({ error: "Fetch Error" }, { status: 500, headers });
    }

    return NextResponse.json({
      uniqueUsers: data.uniqueUsers,
      totalRequests: data.totalRequests,
      [`${timeRange}Data`]: data.chartData,
    }, { headers })

  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500, headers })
  }
}
