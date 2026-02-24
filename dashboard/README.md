# Free Coding Models Dashboard

A SvelteKit web dashboard for the Free Coding Models CLI tool. Provides a click-to-ping interface for testing AI model availability and latency.

## Features

- **Dashboard UI**: View all available coding models from NIM, Groq, and Cerebras
- **On-Demand Pinging**: Click to ping individual models, or ping selected/all models at once
- **No Continuous Monitoring**: Only pings when you request it - no background polling
- **Status Tracking**: Shows latest ping, status (up/down/timeout), and health verdict
- **Tier Filtering**: Filter models by performance tier (S/A/B/C)
- **Model Selection**: Select multiple models to ping in batch
- **API Key Management**: Secure settings modal to manage API keys for all providers

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Open Dashboard**:
   Navigate to `http://localhost:5173` (or the URL shown in terminal)

4. **Configure API Keys**:
   - Click "⚙️ Settings" button
   - Enter API keys for NIM, Groq, and/or Cerebras
   - Keys are saved to `~/.free-coding-models.json`

5. **Ping Models**:
   - Click "Ping" on any model row to test that model
   - Check the checkbox for multiple models and click "Ping Selected"
   - Click "Ping All" to test all models at once

## Model Data

Each model displays:
- **Rank**: Index in the model list
- **Tier**: Performance tier (S+, S, A+, A, A-, B+, B, C)
- **Model**: Human-readable model name
- **Origin**: Provider name (NIM / Groq / Cerebras)
- **Latest Ping**: Most recent successful ping latency
- **Status**: Current health (up/down/timeout/noauth)
- **Verdict**: Overall health assessment (Perfect/Normal/Slow/etc.)

## API Keys

Get free API keys from:
- **NVIDIA NIM**: https://build.nvidia.com
- **Groq**: https://console.groq.com/keys
- **Cerebras**: https://cloud.cerebras.ai

## Building for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- **SvelteKit**: Web framework
- **Svelte 5**: Reactive UI framework with runes
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Node.js**: Server-side runtime

## Related

- [Free Coding Models CLI](https://github.com/vava-nessa/free-coding-models)
- [SvelteKit Docs](https://svelte.dev/docs/kit)
