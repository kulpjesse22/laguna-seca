# Laguna Seca

A live race-weekend companion for Laguna Seca — single static `index.html`,
deployed to Vercel as `laguna-seca.app`.

## Security headers

`vercel.json` sets the `Content-Security-Policy` (including `frame-ancestors`,
which allows `kulpritt.com`, `os.kulpritt.com`, `kulpritt-os.vercel.app`, and
`ux.kulpritt.com` to iframe this app), `X-Content-Type-Options`, and
`Referrer-Policy`.

This replaces a Vercel Routing Middleware rule ("Allow ux.kulpritt.com to
frame") that was setting the same `Content-Security-Policy` at the platform
level with no code-level equivalent — this repo is now the source of truth
for it, and that rule can be retired now that the header ships from here.
