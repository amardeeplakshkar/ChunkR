# ChunkR

A self-hosted, private cloud storage platform that uses **Telegram as its backend** — no subscriptions, no third-party storage bills, completely yours.

## How it works

ChunkR uses a private Telegram channel as its file storage layer. When you upload a file, it is sent to your Telegram channel via the Bot API and the metadata (file ID, message ID, owner, folder) is stored in a PostgreSQL database. Files larger than 45 MB are automatically split into chunks and reassembled on download.

## Features

- **Telegram Storage** — Files live in your own private Telegram channel. No storage cap.
- **Multipart Uploads** — Files over 45 MB are split into 45 MB chunks and transparently reassembled on download.
- **Folder Tree** — Organise files in a hierarchical folder structure.
- **Shareable Links** — Generate public links with optional expiry dates and use-count limits. Revoke at any time.
- **File Preview** — Preview images, videos, audio, and PDFs directly in the browser.
- **Storage Analytics** — Track total usage, per-type breakdowns, and recent uploads.
- **Auth via Clerk** — Sign-up / sign-in handled by [Clerk](https://clerk.com). Files are isolated per user.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Auth:** Clerk
- **Database:** PostgreSQL + Prisma 7
- **Storage:** Telegram Bot API
- **Styling:** Tailwind CSS v4
- **Package manager:** pnpm

## Prerequisites

- Node.js ≥ 20
- pnpm
- PostgreSQL database
- A Telegram bot token and a private Telegram channel

### Creating the Telegram bot & channel

1. Message [@BotFather](https://t.me/BotFather) on Telegram and run `/newbot`. Copy the **bot token**.
2. Create a private Telegram channel and add your bot as an **administrator** (with permission to post messages).
3. Send a message to the channel, then call `https://api.telegram.org/bot<TOKEN>/getUpdates` to find the `chat.id` of the channel (it will be a negative number).

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/chunkr"
DIRECT_URL="postgresql://user:password@host:5432/chunkr"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Telegram
TELEGRAM_BOT_TOKEN=123456789:AAF...
TELEGRAM_CHAT_ID=-100123456789
```

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Apply the database schema
pnpm prisma migrate deploy

# 3. Generate the Prisma client
pnpm prisma generate

# 4. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  (dashboard)/        # Authenticated dashboard pages
    dashboard/        # Main file manager
    dashboard/shared/ # Shared-with-me view
    dashboard/storage/# Storage analytics
  api/
    files/            # Upload, list, download, share endpoints
    folders/          # Folder CRUD
    storage/usage/    # Storage stats endpoint
  s/[token]/          # Public share-link pages & download route
  sign-in/ sign-up/   # Clerk auth pages

components/           # UI components (FileUploader, FolderTree, ShareLinkModal, …)
lib/
  db.ts               # Prisma client singleton
  telegram.ts         # Telegram Bot API helpers (upload / download / delete)
  utils.ts            # Shared utilities
prisma/
  schema.prisma       # Database schema
  migrations/         # SQL migration history
```

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma migrate dev` | Create and apply a new migration |
| `pnpm prisma studio` | Open Prisma Studio (DB GUI) |

## Deployment

ChunkR is a standard Next.js application and can be deployed anywhere Node.js runs (Vercel, Railway, Fly.io, a plain VPS, etc.).

Make sure all environment variables are set in your deployment environment before running `pnpm build && pnpm start`.

## License

MIT
