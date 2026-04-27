# mml-funnel — Infrastructure Context

> ⚠️ **READ FIRST:** `~/Library/CloudStorage/GoogleDrive-steve@metricmentorlabs.com/My Drive/MML-AI-Memory/INFRASTRUCTURE.md`
> That file has the canonical infrastructure details. Everything below is the app-specific overlay.

## Production deployment

- **Droplet**: `147.182.143.160` (new — old `162.243.221.126` is OFF)
- **App path on droplet**: `/opt/mml-funnel`
- **Service**: `mml-funnel.service` (systemd, runs as `mml-funnel` user)
- **Port**: 3000 (localhost)
- **Public hostnames**: `sophiafunnels.metricmentorlabs.com` via Cloudflare Tunnel — NOT direct IP
- **Deployed Next.js version**: 15.3.9 (minimum — CVE-2025-29927 patched)
- **Repo**: `github.com/kopshaw/mml-funnel`

## Supabase

- Shared with Command Center: `cummfyfxeedkdpjfcgxw.supabase.co` (ref `cummfyfxeedkdpjfcgxw`)
- Reads standard `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no override wrapper needed)

## Secrets

- **Source of truth**: Doppler project `mml-production`, config `prd`
- Apps read via `doppler run` in systemd
- **No local `.env` files on droplet.** All env injected at runtime.
- Per-tenant keys (Fireflies, GHL, Meta, Notion, n8n) are NOT in Doppler — they live in `user_integrations` / `client_integrations` DB per tenant.

## Deployment procedure

```bash
ssh mml@147.182.143.160    # or ssh ssh.metricmentorlabs.com once port 22 closes
cd /opt/mml-funnel
sudo -u mml-funnel bash -c "git pull && npm ci && npm run build"
sudo systemctl restart mml-funnel
sudo journalctl -u mml-funnel --since "1 min ago" -n 30
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
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
