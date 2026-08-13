# mml-funnel — Infrastructure Context

> ⚠️ **READ FIRST:** `~/Library/CloudStorage/GoogleDrive-steve@metricmentorlabs.com/My Drive/MML-AI-Memory/INFRASTRUCTURE.md`
> That file has the canonical infrastructure details. Everything below is the app-specific overlay.

## Production deployment

- **Droplet**: `147.182.143.160` (new — old `162.243.221.126` is OFF). SSH via `mml@ssh.metricmentorlabs.com`.
- **App path on droplet**: `/opt/mml-funnel`
- **Service**: `mml-funnel.service` (systemd, runs as `mml-funnel` user)
- **Port**: `3002` (localhost) — hardcoded in the systemd unit's exec wrapper
- **Public hostnames**:
  - `sophiafunnels.com` + `www.sophiafunnels.com` — root product host, served via nginx on droplet (see `~/Desktop/mml-droplet-migration/03-nginx-ssl.sh`)
  - `sophiafunnels.metricmentorlabs.com` — staging-style access via Cloudflare Tunnel (UUID `fca31a9e-3586-4346-8228-a6b91e320a8c`). NOT in `MAIN_SITE_HOSTS` — landing pages on this host currently 404; dashboard works.
  - `selfhealingfunnel.metricmentorlabs.com` — alias
- **Deployed Next.js version**: 15.5.15 (CVE-2025-29927 patched)
- **Repo**: `github.com/kopshaw/mml-funnel`

## Supabase

- **Dedicated project**, NOT the shared Command Center one. Doppler exposes it as `SOPHIA_SUPABASE_URL` / `SOPHIA_SUPABASE_ANON_KEY` / `SOPHIA_SUPABASE_SERVICE_ROLE_KEY`; the systemd wrapper aliases those into the standard `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` names at exec time.
- App code reads the standard names — nothing tenant-specific in `src/`.

## Secrets

- **Source of truth**: Doppler project `mml-production`, config `prd`
- Apps read via `doppler run` in systemd
- **No local `.env` files on droplet.** All env injected at runtime.
- Per-tenant keys (Fireflies, GHL, Meta, Notion, n8n) are NOT in Doppler — they live in `user_integrations` / `client_integrations` DB per tenant.

## Deployment procedure

```bash
ssh mml@ssh.metricmentorlabs.com
cd /opt/mml-funnel
sudo -u mml-funnel bash -c "git pull && npm ci && npm run build"
sudo systemctl restart mml-funnel
sudo journalctl -u mml-funnel --since "1 min ago" -n 30
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/
```

## Critical rules

- Never commit `.env` files.
- Never point DNS at origin IP. All traffic via Cloudflare Tunnel.
- Next.js version must stay ≥ 15.3.9.
- Don't open ports in UFW — use the tunnel.
- `NEXT_PUBLIC_*` vars bake at build time → changing them requires rebuild, not just restart.

## Cloudflare

- Zone: metricmentorlabs.com (Pro)
- Tunnel UUID: `fca31a9e-3586-4346-8228-a6b91e320a8c`
- sophiafunnels.metricmentorlabs.com → CNAME → tunnel
- WAF blocks x-middleware-subrequest (CVE-2025-29927) at edge
