# GrowEasy AI - Chief Harness

An AI-powered performance marketing engine built with Next.js 15, Vercel AI SDK, Drizzle ORM, and the GrowEasy Model Context Protocol (MCP) server.

---

## Architecture Overview

- **Framework:** Next.js 15 (App Router, React 19, Tailwind CSS v4)
- **Database:** PostgreSQL (Supabase) with Drizzle ORM & native time-ordered RFC 9562 `UUIDv7` primary keys
- **AI Providers:** Vercel AI SDK with Google Gemini (`gemini-2.5-flash` / `gemini-2.5-pro`) and OpenAI (`gpt-4o`)
- **GrowEasy MCP Integration:** OAuth 2.0 PKCE authentication with token persistence in PostgreSQL and dynamic organization discovery
- **Marketing Integrations:**
  - Meta Ad Library & TikTok ad scraping (Apify)
  - Search volume, CPC, and keyword difficulty (DataForSEO)
  - Landing page intelligence (Firecrawl)
  - Facebook audience interest validation (Meta Graph API)
  - Generative marketing posters (Gemini Image models + Cloudflare R2 storage)

---

## Prerequisites

- **Node.js:** `v20.x` or higher
- **Package Manager:** `pnpm` (install via `npm i -g pnpm` or `corepack enable pnpm`)
- **Database:** PostgreSQL database instance (Supabase recommended)

---

## Quickstart Setup

### 1. Clone the Repository

```bash
git clone https://github.com/groweasy-ai/harness.git
cd harness
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in the required credentials in `.env`:

```env
# AI Provider: "google" or "openai"
AI_PROVIDER="google"
GENERAL_GEMINI_API_KEYS="your_gemini_api_key_or_comma_separated_keys"
OPENAI_API_KEY="your_openai_api_key_optional"

# Database (PostgreSQL / Supabase connection pooler or direct URL)
DATABASE_URL="postgresql://user:password@host:port/database"

# Web Research & Scraping
TAVILY_API_KEY="tvly-..."
FIRECRAWL_API_KEY="fc-..."
APIFY_API_TOKEN="apify_api_..."

# SEO & Keyword Analytics
DATAFORSEO_LOGIN="your_email@domain.com"
DATAFORSEO_PASSWORD="your_password"

# Meta Graph API
META_ACCESS_TOKEN="EAB..."

# Cloudflare R2 (Poster asset storage)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="groweasy"
R2_PUBLIC_DOMAIN="https://pub-....r2.dev"

# GrowEasy MCP Server URL
GROWEASY_MCP_URL="https://groweasy.ai/api/mcp"
AWS_SUPPRESS_NODE_VERSION_WARNING=true
```

---

### 4. Database Setup & UUIDv7 Initialization

All database tables (`threads`, `thread_messages`, `oauth_connections`) use RFC 9562 time-ordered `UUIDv7` identifiers generated at the database level.

If you are setting up a **new PostgreSQL database**, run the following SQL once to define `uuid_generate_v7()`:

```sql
create or replace function uuid_generate_v7()
returns uuid
as $$
declare
  unix_time_ms bytea;
  uuid_bytes bytea;
begin
  unix_time_ms := substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3 for 6);
  uuid_bytes := gen_random_bytes(16);
  uuid_bytes := set_byte(uuid_bytes, 0, get_byte(unix_time_ms, 0));
  uuid_bytes := set_byte(uuid_bytes, 1, get_byte(unix_time_ms, 1));
  uuid_bytes := set_byte(uuid_bytes, 2, get_byte(unix_time_ms, 2));
  uuid_bytes := set_byte(unix_time_ms, 3, get_byte(unix_time_ms, 3));
  uuid_bytes := set_byte(unix_time_ms, 4, get_byte(unix_time_ms, 4));
  uuid_bytes := set_byte(unix_time_ms, 5, get_byte(unix_time_ms, 5));
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  return encode(uuid_bytes, 'hex')::uuid;
end;
$$
language plpgsql
volatile;
```

Then push the Drizzle schema to your database:

```bash
pnpm db:push
```

---

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 6. Connect GrowEasy MCP (OAuth)

1. In the sidebar on the left, click **"Connect GrowEasy"**.
2. Authorize via your GrowEasy account in the browser modal.
3. The OAuth callback will automatically:
   - Exchange the authorization code for an access token.
   - Query the GrowEasy MCP server to auto-discover your organization ID.
   - Save the active connection to PostgreSQL (`oauth_connections` table).
4. The AI chat agent can now directly read user organizations, live campaigns, day-by-day metrics, and audience breakdowns!

---

## Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `pnpm dev` | `next dev` | Start local development server with Hot Module Reloading |
| `pnpm build` | `next build` | Create optimized production build & typecheck |
| `pnpm start` | `next start` | Run production server locally |
| `pnpm lint` | `eslint` | Run ESLint checks |
| `pnpm db:push` | `drizzle-kit push` | Push Drizzle schema changes directly to PostgreSQL |
| `pnpm db:studio` | `drizzle-kit studio` | Launch web GUI to inspect and query the database |

---

## Project Structure

```
src/
├── app/
│   ├── (chat)/               # Chat UI pages & layouts
│   └── api/
│       ├── auth/groweasy/    # OAuth 2.0 PKCE login, callback, status & MCP tester
│       └── chat/             # AI agent streaming endpoint
├── components/
│   ├── chat/                 # Modular chat UI components (headers, inputs, thinking steps)
│   └── sidebar.tsx           # Conversation threads & GrowEasy OAuth connector
├── hooks/
│   └── use.chat.stream.ts    # Streaming state management
├── lib/
│   ├── agent/
│   │   ├── mcp/              # GrowEasy MCP client
│   │   ├── skills/           # Specialized agent skill prompts
│   │   ├── tools/            # AI tools (MCP, Ad Library, Keywords, Posters)
│   │   ├── orchestrator.ts   # Multi-turn agent execution loop
│   │   └── system.prompt.ts  # Master Chief instructions
│   ├── drizzle/              # Drizzle ORM schema with UUIDv7
│   ├── providers/            # Google Gemini & OpenAI LLM providers
│   └── services/             # Database services (threads, messages, OAuth connections)
```
