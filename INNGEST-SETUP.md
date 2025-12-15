# Inngest Setup Guide

## For Local Development (Recommended)

The easiest way to develop with Inngest locally is to use the **Inngest Dev Server**. This runs entirely on your machine and doesn't require any cloud credentials.

### Step 1: Install Inngest CLI

In a **separate terminal window**, run:

```bash
npx inngest-cli@latest dev
```

This will:

- Start the Inngest Dev Server on `http://localhost:8288`
- Provide a web UI to view your functions and events
- Automatically discover your functions from `http://localhost:3000/api/inngest`

### Step 2: Keep Both Servers Running

You need TWO terminal windows:

1. **Terminal 1**: Your Next.js app (`npm run dev`)
2. **Terminal 2**: Inngest Dev Server (`npx inngest-cli@latest dev`)

### Step 3: Test It Out

1. Add a new job in your app
2. Open `http://localhost:8288` in your browser
3. You should see the `job/assess-fit` event and function execution

---

## For Production

When deploying to production, you'll need:

1. **Sign up for Inngest** at https://www.inngest.com/
2. **Get your Event Key** from the Inngest dashboard
3. **Add to your .env.local**:
   ```
   INNGEST_EVENT_KEY="your-event-key-here"
   INNGEST_SIGNING_KEY="your-signing-key-here"
   ```

---

## Verifying It Works

When a job is created, you should see:

1. ✅ Job created in database
2. ✅ Application created with status "PLANNED"
3. ✅ AiTask created with status "PENDING"
4. ✅ Event sent to Inngest (visible in Dev Server UI)
5. ✅ Function executes and updates AiTask to "RUNNING" → "SUCCEEDED"

The error "401 Event key not found" means Inngest Dev Server is not running. Start it with:

```bash
npx inngest-cli@latest dev
```
