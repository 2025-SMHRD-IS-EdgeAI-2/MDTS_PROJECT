# MDTS Vercel Deployment Notes

## TL;DR

The Vercel deployment hosts the React/Vite dashboard only.

Jetson Nano, Raspberry Pi, PyQt5, Ollama, MariaDB, and FastAPI are still local edge services. For the deployed Vercel dashboard to talk to them, the local Windows gateway must keep Node API, FastAPI, Ollama tunnel, and Cloudflare tunnels running.

## Production URL

```text
https://frontendaibackend.vercel.app
```

## Required Runtime Topology

```text
Vercel dashboard
  -> Cloudflare tunnel for Node API
    -> Windows Node API :4000
      -> Raspberry Pi sensor server :5000
      -> Raspberry Pi MariaDB :3306
      -> Jetson Ollama tunnel :11434

Vercel dashboard
  -> Cloudflare tunnel for FastAPI
    -> Windows FastAPI :8000
      -> Remote MariaDB
      -> Raspberry Pi local MariaDB
      -> Ollama through local tunnel
```

## Current Vercel Production Environment Variables

These are public Vite build variables. They are not secrets.

```text
VITE_LEGACY_API_BASE=https://YOUR_TUNNEL.trycloudflare.com/api
VITE_AI_API_BASE=https://YOUR_TUNNEL.trycloudflare.com
```

## Current Tunnel Health Checks

```bash
curl https://YOUR_TUNNEL.trycloudflare.com/api/ai/ollama-health
curl https://YOUR_TUNNEL.trycloudflare.com/health
```

Expected result:

```text
Node API: connected=true, Ollama model list visible
FastAPI: status=ok, remote_db_connected=true, local_db_connected=true
```

## Important Limitation

`trycloudflare.com` Quick Tunnel URLs are temporary.

If `cloudflared` is stopped or restarted, the public URLs can change. When that happens:

1. Start new tunnels for local ports `4000` and `8000`.
2. Update Vercel production environment variables.
3. Redeploy the Vercel project.

## Redeploy Commands

Run from:

```text
D:\mdts-separated-workspace\05_github_release_20260513\frontend_aibackend
```

Set environment variables:

```bash
printf "https://NEW_NODE_TUNNEL.trycloudflare.com/api" | vercel env add VITE_LEGACY_API_BASE production
printf "https://NEW_FASTAPI_TUNNEL.trycloudflare.com" | vercel env add VITE_AI_API_BASE production
```

Deploy:

```bash
vercel --prod --yes
```

## Stable Production Recommendation

For stable team demos, replace Quick Tunnel with one of these:

```text
Cloudflare Named Tunnel with fixed hostname
ngrok reserved domain
VPS-hosted Node/FastAPI reverse proxy
```

The recommended path is Cloudflare Named Tunnel because it keeps the edge-device architecture while providing fixed HTTPS URLs.
