# Vercel Deployment Checklist

- Set Node.js 22.x in Vercel Project Settings.
- Connect the GitHub repository and use `npm ci` + `npm run build`.
- Add all variables from `.env.example` in Preview and Production environments.
- Set the production domain before creating push subscriptions; changing origin invalidates PWA scope/subscriptions.
- Use Supabase Edge Function secrets separately from Vercel variables.
- Add `/api/health` to deployment monitoring.
- Configure a Vercel Cron or external scheduler to call the cutoff/notification worker with `CRON_SECRET`.
- Test PWA install and push on Chrome Android, desktop Chrome/Edge/Safari, and iOS/iPadOS 16.4+ Home Screen mode.
- Never commit `.env.local`, service-role keys, VAPID private keys, or Supabase secrets.
