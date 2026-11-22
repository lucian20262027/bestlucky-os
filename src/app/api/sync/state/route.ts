import { NextRequest, NextResponse } from 'next/server';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const DEFAULT_WORKSPACE = 'lucian-main';

function getDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

async function ensureTable(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS loopos_workspaces (
      workspace_id TEXT PRIMARY KEY,
      state_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return NextResponse.json({
      configured: false,
      state: null,
      updatedAt: null,
    });
  }

  const workspaceId =
    req.nextUrl.searchParams.get('workspaceId')?.trim() || DEFAULT_WORKSPACE;

  try {
    const sql = neon(dbUrl);
    await ensureTable(sql);
    const rows = (await sql`
      SELECT state_json, updated_at
      FROM loopos_workspaces
      WHERE workspace_id = ${workspaceId}
      LIMIT 1
    `) as Array<{ state_json: unknown; updated_at: string }>;

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        configured: true,
        state: null,
        updatedAt: null,
      });
    }

    return NextResponse.json({
      configured: true,
      state: rows[0].state_json,
      updatedAt: rows[0].updated_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database read failed';
    return NextResponse.json(
      { configured: true, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return NextResponse.json({
      configured: false,
      saved: false,
    });
  }

  try {
    const body = (await req.json()) as {
      workspaceId?: string;
      state?: unknown;
    };
    const workspaceId = body.workspaceId?.trim() || DEFAULT_WORKSPACE;
    if (!body.state || typeof body.state !== 'object') {
      return NextResponse.json(
        { error: 'Invalid state payload' },
        { status: 400 }
      );
    }

    const sql = neon(dbUrl);
    await ensureTable(sql);
    const serialized = JSON.stringify(body.state);
    const rows = (await sql`
      INSERT INTO loopos_workspaces (workspace_id, state_json, updated_at)
      VALUES (${workspaceId}, ${serialized}::jsonb, NOW())
      ON CONFLICT (workspace_id)
      DO UPDATE SET
        state_json = EXCLUDED.state_json,
        updated_at = NOW()
      RETURNING updated_at
    `) as Array<{ updated_at: string }>;

    return NextResponse.json({
      configured: true,
      saved: true,
      updatedAt: rows[0]?.updated_at ?? new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database write failed';
    return NextResponse.json(
      { configured: true, error: message },
      { status: 500 }
    );
  }
}
