---
title: '🔑 Auth Tokens'
layout: 'docs'
---

Auth tokens are API keys for Breadcrum. Use them for scripts, integrations, and bookmarklet workflows. Treat them like passwords.

See the [⚙️ Account page](/account/) to manage auth tokens.

## Create a token

Go to your [account page](/account/) and create a new auth token. Add a note so you remember where it is used.

## Manage tokens

From your [account page](/account/), you can rename tokens, mark them as protected, or delete them. Protected tokens are excluded from bulk cleanup.
Each token includes metadata like last seen time, user agent info, IP address, and GeoIP location (when available) so you can spot unfamiliar sessions.

## Use a token

Use your token with the API by sending it as a Bearer token in the `Authorization` header.

## Safety tips

- Do not share tokens.
- Delete tokens you no longer use.
- If a token leaks, delete it immediately and create a new one.
