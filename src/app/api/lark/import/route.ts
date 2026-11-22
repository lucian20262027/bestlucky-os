import { NextRequest, NextResponse } from 'next/server';
import {
  detectRoleFromText,
  ParsedImportItem,
  parseRawPagesToItems,
  RawFetchedPage,
  SplitMode,
} from '@/lib/lark-parser';
import { ROLES_BY_ID } from '@/lib/roles';
import { RoleTrack } from '@/lib/types';

function isAllowedLarkHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'larksuite.com' ||
    lower.endsWith('.larksuite.com') ||
    lower === 'feishu.cn' ||
    lower.endsWith('.feishu.cn') ||
    lower === 'larkoffice.com' ||
    lower.endsWith('.larkoffice.com')
  );
}

function resolveApiBase(hostname: string, preferredDomain?: string): string {
  if (hostname.toLowerCase().endsWith('.feishu.cn') || preferredDomain === 'feishu') {
    return 'https://open.feishu.cn';
  }
  return 'https://open.larksuite.com';
}

function extractBitableFieldText(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const rec = item as Record<string, unknown>;
          if (typeof rec.link === 'string') return rec.link;
          if (typeof rec.text === 'string') return rec.text;
          if (typeof rec.name === 'string') return rec.name;
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    if (typeof rec.link === 'string') return rec.link;
    if (typeof rec.text === 'string') return rec.text;
  }
  return '';
}

interface LarkTextElement {
  text_run?: {
    content?: string;
    text_element_style?: {
      bold?: boolean;
      link?: { url?: string };
    };
  };
  mention_doc?: { title?: string; url?: string };
  mention_user?: { user_id?: string };
}

interface LarkDocBlock {
  block_id?: string;
  block_type?: number;
  text?: { elements?: LarkTextElement[] };
  heading1?: { elements?: LarkTextElement[] };
  heading2?: { elements?: LarkTextElement[] };
  heading3?: { elements?: LarkTextElement[] };
  heading4?: { elements?: LarkTextElement[] };
  heading5?: { elements?: LarkTextElement[] };
  heading6?: { elements?: LarkTextElement[] };
  heading7?: { elements?: LarkTextElement[] };
  heading8?: { elements?: LarkTextElement[] };
  heading9?: { elements?: LarkTextElement[] };
  bullet?: { elements?: LarkTextElement[] };
  ordered?: { elements?: LarkTextElement[] };
  code?: { elements?: LarkTextElement[] };
  quote?: { elements?: LarkTextElement[] };
  todo?: { elements?: LarkTextElement[]; style?: { done?: boolean } };
}

function elementsToMarkdown(elements?: LarkTextElement[]): string {
  if (!Array.isArray(elements)) return '';
  return elements
    .map((el) => {
      if (el.text_run) {
        const content = el.text_run.content ?? '';
        const link = el.text_run.text_element_style?.link?.url;
        if (link) {
          try {
            const decoded = decodeURIComponent(link);
            return `[${content}](${decoded})`;
          } catch {
            return `[${content}](${link})`;
          }
        }
        return content;
      }
      if (el.mention_doc) {
        const title = el.mention_doc.title || 'Linked Doc';
        return el.mention_doc.url ? `[${title}](${el.mention_doc.url})` : title;
      }
      return '';
    })
    .join('');
}

async function fetchDocxAsStructuredMarkdown(
  apiBase: string,
  docToken: string,
  authHeaders: Record<string, string>
): Promise<{ title: string; markdown: string; error?: string }> {
  const metaRes = await fetch(`${apiBase}/open-apis/docx/v1/documents/${docToken}`, {
    headers: authHeaders,
  });
  const metaJson = (await metaRes.json()) as {
    code?: number;
    msg?: string;
    data?: { document?: { title?: string } };
  };
  const title = metaJson.data?.document?.title || 'Synced Lark Document';

  // Fetch all paginated blocks to preserve headings, lists, links, quotes, code & todos
  const allBlocks: LarkDocBlock[] = [];
  let pageToken = '';
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 20) {
    const qs = new URLSearchParams({ page_size: '500' });
    if (pageToken) qs.set('page_token', pageToken);
    const blkRes = await fetch(
      `${apiBase}/open-apis/docx/v1/documents/${docToken}/blocks?${qs.toString()}`,
      { headers: authHeaders }
    );
    const blkJson = (await blkRes.json()) as {
      code?: number;
      msg?: string;
      data?: {
        items?: LarkDocBlock[];
        has_more?: boolean;
        page_token?: string;
      };
    };

    if (blkJson.code !== 0 || !Array.isArray(blkJson.data?.items)) {
      // Fallback to raw_content if blocks fails
      const rawRes = await fetch(
        `${apiBase}/open-apis/docx/v1/documents/${docToken}/raw_content`,
        { headers: authHeaders }
      );
      const rawJson = (await rawRes.json()) as {
        code?: number;
        msg?: string;
        data?: { content?: string };
      };
      if (rawJson.code === 0 && typeof rawJson.data?.content === 'string') {
        return { title, markdown: rawJson.data.content };
      }
      return {
        title,
        markdown: '',
        error: blkJson.msg || rawJson.msg || metaJson.msg || '权限不足',
      };
    }

    allBlocks.push(...blkJson.data.items);
    hasMore = Boolean(blkJson.data.has_more && blkJson.data.page_token);
    pageToken = blkJson.data.page_token ?? '';
    pageCount++;
  }

  const lines: string[] = [];
  for (const blk of allBlocks) {
    const bt = blk.block_type;
    if (bt === 1) continue; // page root block (already have title)
    if (bt === 2) {
      const t = elementsToMarkdown(blk.text?.elements);
      if (t.trim()) lines.push(t);
    } else if (bt === 3) {
      const t = elementsToMarkdown(blk.heading1?.elements).trim();
      if (t) lines.push(`\n# ${t}`);
    } else if (bt === 4) {
      const t = elementsToMarkdown(blk.heading2?.elements).trim();
      if (t) lines.push(`\n## ${t}`);
    } else if (bt === 5) {
      const t = elementsToMarkdown(blk.heading3?.elements).trim();
      if (t) lines.push(`\n### ${t}`);
    } else if (bt && bt >= 6 && bt <= 11) {
      const h =
        blk.heading4 ??
        blk.heading5 ??
        blk.heading6 ??
        blk.heading7 ??
        blk.heading8 ??
        blk.heading9;
      const t = elementsToMarkdown(h?.elements).trim();
      if (t) lines.push(`\n#### ${t}`);
    } else if (bt === 12) {
      const t = elementsToMarkdown(blk.bullet?.elements).trim();
      if (t) lines.push(`- ${t}`);
    } else if (bt === 13) {
      const t = elementsToMarkdown(blk.ordered?.elements).trim();
      if (t) lines.push(`1. ${t}`);
    } else if (bt === 14) {
      const t = elementsToMarkdown(blk.code?.elements).trim();
      if (t) lines.push(`\`\`\`\n${t}\n\`\`\``);
    } else if (bt === 15) {
      const t = elementsToMarkdown(blk.quote?.elements).trim();
      if (t) lines.push(`> ${t}`);
    } else if (bt === 17) {
      const t = elementsToMarkdown(blk.todo?.elements).trim();
      if (t) {
        const mark = blk.todo?.style?.done ? '[x]' : '[ ]';
        lines.push(`- ${mark} ${t}`);
      }
    }
  }

  return { title, markdown: lines.join('\n').trim() };
}

async function fetchBitableItems(
  apiBase: string,
  appToken: string,
  tableIdParam: string,
  sourceUrl: string,
  defaultRole: RoleTrack,
  authHeaders: Record<string, string>
): Promise<{ items: ParsedImportItem[]; error?: string }> {
  let tableId = tableIdParam;
  if (!tableId) {
    const tablesRes = await fetch(
      `${apiBase}/open-apis/bitable/v1/apps/${appToken}/tables?page_size=20`,
      { headers: authHeaders }
    );
    const tablesJson = (await tablesRes.json()) as {
      code?: number;
      msg?: string;
      data?: { items?: Array<{ table_id?: string }> };
    };
    if (tablesJson.code !== 0 || !tablesJson.data?.items?.[0]?.table_id) {
      return { items: [], error: tablesJson.msg || '无数据表或权限不足' };
    }
    tableId = tablesJson.data.items[0].table_id;
  }

  const allRecords: Array<{ record_id?: string; fields?: Record<string, unknown> }> = [];
  let pageToken = '';
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 5) {
    const qs = new URLSearchParams({ page_size: '100' });
    if (pageToken) qs.set('page_token', pageToken);
    const recRes = await fetch(
      `${apiBase}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?${qs.toString()}`,
      { headers: authHeaders }
    );
    const recJson = (await recRes.json()) as {
      code?: number;
      msg?: string;
      data?: {
        items?: Array<{ record_id?: string; fields?: Record<string, unknown> }>;
        has_more?: boolean;
        page_token?: string;
      };
    };

    if (recJson.code !== 0 || !Array.isArray(recJson.data?.items)) {
      return { items: [], error: recJson.msg || '读取多维表格记录失败' };
    }

    allRecords.push(...recJson.data.items);
    hasMore = Boolean(recJson.data.has_more && recJson.data.page_token);
    pageToken = recJson.data.page_token ?? '';
    pageCount++;
  }

  const items: ParsedImportItem[] = allRecords
    .map((rec, idx) => {
      const fields = rec.fields ?? {};
      const entries = Object.entries(fields);
      const pickField = (pattern: RegExp) => {
        const hit = entries.find(([k]) => pattern.test(k.toLowerCase()));
        return hit ? extractBitableFieldText(hit[1]) : '';
      };

      const firstString = entries.map(([, v]) => extractBitableFieldText(v)).find(Boolean) ?? '';
      const title =
        pickField(/title|question|题目|问题|标题/) || firstString || `Bitable Row #${idx + 1}`;
      const prompt = pickField(/prompt|context|detail|描述|详情|背景/) || title;
      const answer = pickField(/answer|solution|回答|答案|思路|复盘/);
      const rawRole = pickField(/role|track|岗位|方向/);
      const company = pickField(/company|source|公司/) || 'Lark Bitable';
      const videoUrl = pickField(/video|url|link|视频|链接|妙记/);
      const notes = pickField(/note|remark|笔记|备注/);

      const role = detectRoleFromText(`${rawRole} ${title} ${prompt}`, defaultRole);

      return {
        id: `bitable-${rec.record_id || idx}`,
        selected: true,
        destination: 'question' as const,
        title,
        role,
        round: 'decomposition' as const,
        companyStyle: company,
        prompt,
        answer,
        notes,
        videoUrl,
        sourceUrl,
        tags: ['Lark Bitable', ROLES_BY_ID[role].shortLabel],
      };
    })
    .filter((it) => it.title.trim().length > 0);

  return { items };
}

interface WikiNodeMeta {
  space_id?: string;
  node_token?: string;
  obj_type?: string;
  obj_token?: string;
  title?: string;
  has_child?: boolean;
}

async function collectWikiTree(
  apiBase: string,
  originHost: string,
  rootNode: WikiNodeMeta,
  includeChildren: boolean,
  authHeaders: Record<string, string>
): Promise<WikiNodeMeta[]> {
  const collected: WikiNodeMeta[] = [rootNode];
  if (!includeChildren || !rootNode.space_id || !rootNode.node_token) {
    return collected;
  }

  const MAX_NODES = 40;
  const MAX_DEPTH = 4;

  const walk = async (parentToken: string, depth: number) => {
    if (depth > MAX_DEPTH || collected.length >= MAX_NODES) return;
    let pageToken = '';
    let hasMore = true;

    while (hasMore && collected.length < MAX_NODES) {
      const qs = new URLSearchParams({
        parent_node_token: parentToken,
        page_size: '50',
      });
      if (pageToken) qs.set('page_token', pageToken);

      const res = await fetch(
        `${apiBase}/open-apis/wiki/v2/spaces/${encodeURIComponent(
          rootNode.space_id!
        )}/nodes?${qs.toString()}`,
        { headers: authHeaders }
      );
      const json = (await res.json()) as {
        code?: number;
        data?: { items?: WikiNodeMeta[]; has_more?: boolean; page_token?: string };
      };
      if (json.code !== 0 || !Array.isArray(json.data?.items)) break;

      for (const child of json.data.items) {
        if (collected.length >= MAX_NODES) break;
        collected.push(child);
        if (child.has_child && child.node_token) {
          await walk(child.node_token, depth + 1);
        }
      }

      hasMore = Boolean(json.data.has_more && json.data.page_token);
      pageToken = json.data.page_token ?? '';
    }
  };

  if (rootNode.has_child) {
    await walk(rootNode.node_token, 1);
  }
  return collected.map((n) => ({
    ...n,
    title: n.title || 'Wiki Page',
    node_token: n.node_token,
    obj_token: n.obj_token,
    obj_type: n.obj_type,
    space_id: n.space_id ?? rootNode.space_id,
    has_child: n.has_child,
  }));
  void originHost;
}

export async function POST(req: NextRequest) {
  let body: {
    url?: string;
    domain?: 'larksuite' | 'feishu';
    appId?: string;
    appSecret?: string;
    userAccessToken?: string;
    defaultRole?: RoleTrack;
    targetMode?: 'auto' | 'questions' | 'library' | 'stories';
    splitMode?: SplitMode;
    includeChildren?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawUrl = body.url?.trim() ?? '';
  if (!rawUrl) {
    return NextResponse.json(
      { ok: false, error: '请填入飞书 / Lark 文档、Wiki 或多维表格链接。' },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { ok: false, error: '链接格式不正确，请输入完整 https://... 飞书/Lark URL。' },
      { status: 400 }
    );
  }

  if (!isAllowedLarkHost(parsedUrl.hostname)) {
    return NextResponse.json(
      {
        ok: false,
        error: '出于安全限制，仅支持官方 *.larksuite.com / *.feishu.cn / *.larkoffice.com 链接。',
      },
      { status: 400 }
    );
  }

  const apiBase = resolveApiBase(parsedUrl.hostname, body.domain ?? process.env.LARK_DOMAIN);
  const appId = body.appId?.trim() || process.env.LARK_APP_ID?.trim() || '';
  const appSecret = body.appSecret?.trim() || process.env.LARK_APP_SECRET?.trim() || '';
  let bearerToken = body.userAccessToken?.trim() || '';

  if (!bearerToken && (!appId || !appSecret)) {
    return NextResponse.json(
      {
        ok: false,
        error: '缺少飞书/Lark API 凭证（App ID + App Secret 或 User Access Token）。',
        hint: '如果你不想配置应用凭证，可以直接使用右侧「零配置秒导」标签，在飞书里 Cmd+A 复制内容或导出 Markdown/CSV 直接导入！',
      },
      { status: 400 }
    );
  }

  try {
    if (!bearerToken) {
      const authRes = await fetch(`${apiBase}/open-apis/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
      });
      const authJson = (await authRes.json()) as {
        code?: number;
        msg?: string;
        tenant_access_token?: string;
      };
      if (!authRes.ok || authJson.code !== 0 || !authJson.tenant_access_token) {
        return NextResponse.json(
          {
            ok: false,
            error: `Lark 鉴权失败: ${authJson.msg || authRes.statusText}`,
            hint: '请检查 App ID / App Secret 是否正确，以及是否选对了飞书中国版 (feishu.cn) 或国际版 (larksuite.com)。',
          },
          { status: 401 }
        );
      }
      bearerToken = authJson.tenant_access_token;
    }

    const authHeaders = {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    };

    const defaultRole: RoleTrack = body.defaultRole ?? 'fde';
    const targetMode = body.targetMode ?? 'auto';
    const splitMode: SplitMode = body.splitMode ?? 'qa';
    const includeChildren = body.includeChildren !== false;
    const pathname = parsedUrl.pathname;
    const tableIdParam = parsedUrl.searchParams.get('table') ?? '';

    const rawPages: RawFetchedPage[] = [];
    let rootTitle = 'Synced Lark Workspace';
    let sourceType: 'wiki' | 'docx' | 'bitable' = 'docx';

    // 1. Wiki link (/wiki/<token>) -> fetch node + optional recursive child nodes
    const wikiMatch = pathname.match(/\/wiki\/([A-Za-z0-9_-]+)/);
    if (wikiMatch?.[1]) {
      sourceType = 'wiki';
      const wikiRes = await fetch(
        `${apiBase}/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiMatch[1])}`,
        { headers: authHeaders }
      );
      const wikiJson = (await wikiRes.json()) as {
        code?: number;
        msg?: string;
        data?: { node?: WikiNodeMeta };
      };
      if (wikiJson.code !== 0 || !wikiJson.data?.node?.obj_token) {
        return NextResponse.json(
          {
            ok: false,
            error: `读取 Wiki 节点失败: ${wikiJson.msg || '无权访问或节点不存在'}`,
            hint: '请在飞书开放平台开启 Tenant token 的 wiki:wiki:readonly 与 docx:document:readonly 并发布新版本。',
          },
          { status: 403 }
        );
      }

      const rootNode = wikiJson.data.node;
      rootTitle = rootNode.title || 'Synced Wiki';
      const nodes = await collectWikiTree(
        apiBase,
        parsedUrl.origin,
        rootNode,
        includeChildren,
        authHeaders
      );

      for (const node of nodes) {
        if (!node.obj_token) continue;
        const nodeUrl = node.node_token
          ? `${parsedUrl.origin}/wiki/${node.node_token}`
          : rawUrl;
        if (node.obj_type === 'docx' || node.obj_type === 'doc') {
          const docRes = await fetchDocxAsStructuredMarkdown(
            apiBase,
            node.obj_token,
            authHeaders
          );
          if (docRes.markdown.trim()) {
            rawPages.push({
              title: docRes.title || node.title || 'Wiki Page',
              sourceUrl: nodeUrl,
              objType: 'docx',
              markdown: docRes.markdown,
              charCount: docRes.markdown.length,
            });
          } else if (nodes.length === 1 && docRes.error) {
            return NextResponse.json(
              {
                ok: false,
                error: `读取文档内容失败: ${docRes.error}`,
                hint: '请确保已开启 Tenant token 的 docx:document:readonly 并发布版本。',
              },
              { status: 403 }
            );
          }
        } else if (node.obj_type === 'bitable') {
          const bt = await fetchBitableItems(
            apiBase,
            node.obj_token,
            '',
            nodeUrl,
            defaultRole,
            authHeaders
          );
          if (bt.items.length > 0) {
            rawPages.push({
              title: node.title || 'Wiki Bitable',
              sourceUrl: nodeUrl,
              objType: 'bitable',
              markdown: '',
              charCount: bt.items.length,
              bitableItems: bt.items,
            });
          }
        }
      }
    } else {
      const docxMatch = pathname.match(/\/(?:docx|docs)\/([A-Za-z0-9_-]+)/);
      const baseMatch = pathname.match(/\/base\/([A-Za-z0-9_-]+)/);

      if (docxMatch?.[1]) {
        sourceType = 'docx';
        const docRes = await fetchDocxAsStructuredMarkdown(
          apiBase,
          docxMatch[1],
          authHeaders
        );
        if (!docRes.markdown.trim() && docRes.error) {
          return NextResponse.json(
            {
              ok: false,
              error: `读取文档内容失败: ${docRes.error}`,
              hint: '请确保已开启 Tenant token 的 docx:document:readonly 权限并添加协作者权限。',
            },
            { status: 403 }
          );
        }
        rootTitle = docRes.title;
        rawPages.push({
          title: docRes.title,
          sourceUrl: rawUrl,
          objType: 'docx',
          markdown: docRes.markdown,
          charCount: docRes.markdown.length,
        });
      } else if (baseMatch?.[1]) {
        sourceType = 'bitable';
        const bt = await fetchBitableItems(
          apiBase,
          baseMatch[1],
          tableIdParam,
          rawUrl,
          defaultRole,
          authHeaders
        );
        if (bt.error) {
          return NextResponse.json(
            {
              ok: false,
              error: `读取多维表格失败: ${bt.error}`,
              hint: '请检查 Tenant token 的 bitable:app:readonly 权限及多维表格协作权限。',
            },
            { status: 403 }
          );
        }
        rootTitle = `Lark Bitable (${bt.items.length} records)`;
        rawPages.push({
          title: rootTitle,
          sourceUrl: rawUrl,
          objType: 'bitable',
          markdown: '',
          charCount: bt.items.length,
          bitableItems: bt.items,
        });
      } else {
        return NextResponse.json(
          {
            ok: false,
            error: '暂不支持该链接格式，请提供 /docx/..., /wiki/..., 或多维表格 /base/... 链接。',
          },
          { status: 400 }
        );
      }
    }

    const items = parseRawPagesToItems(rawPages, {
      defaultRole,
      targetMode,
      splitMode,
    });

    const totalChars = rawPages.reduce(
      (sum, p) => sum + (p.objType === 'docx' ? p.charCount : 0),
      0
    );

    return NextResponse.json({
      ok: true,
      sourceType,
      docTitle: rootTitle,
      fetchedPagesCount: rawPages.length,
      totalChars,
      rawPages,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : '请求飞书接口时发生网络错误',
        hint: '请确认网络可访问 open.larksuite.com / open.feishu.cn，或直接使用「零配置秒导」导入。',
      },
      { status: 500 }
    );
  }
}
