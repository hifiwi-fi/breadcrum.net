---
layout: article
title: "📼 What's Going on with Episodes"
serif: false
publishDate: "2025-04-30T17:11:32.336Z"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "Breadcrum adds a Discord server and is accepting donations"
image: "./img/og.png"
---

If you've been a longtime user of Breadcrum or maybe just signing up, you may have noticed episode support has been rather flakey lately.
Well, more specifically, YouTube bookmarks with episodes are acting flakey.

The short answer is: Breadcrum's current approach to identifying, isolating, and redirecting podcast clients to media discovered in websites, which has worked for many years, is starting to run into intractable issues.

## The YouTube situation

Breadcrum is a generalized tool users can use to redirect their podcast clients to media available for public consumption on unauthenticated websites.
YouTube has a monopoly on publicly available videos on the web.
Therefore, it's also the most popular type of URL people bookmark with Breadcrum.

Previously, Breadcrum was able to identify the video content on a YouTube website URL, and share this information with your Podcast app.
The app would then happily download it for you so you could watch using your choice of media player rather than being forced to use the prescribed player.

Breadcrum can still do this.
However, the media URLs that are returned from YouTube now behave badly on purpose.
They don't work the first few times a client tries to access them!
Well-behaved video clients, of course, don't expect this, so they handle it like an error.
Additionally, if Breadcrum tries to negotiate with the URL before sending it back to the podcast client, YouTube decides it no longer wants to talk with Breadcrum and blocks further interactions.
Fair enough!

### The Work Around

Until a better solution is developed, the workaround is: try and try again!
Podcast apps have this built in, so it may already be doing this.
If you go to download an episode and get an error, wait a few seconds and try again.

## Where can we go from here?

There are a lot of options I'm considering.

### Breadcrum downloads the video for you and stores it in temporary storage.

This will cost money, but has a lot of other cool properties. In general, this is needed already for all media sources, so this will likely materialize this year sometime.


### You run a Breadcrum "agent" on your computer that processes videos for you

The satellite worker model. This could help keep costs down for users and work around other media source restrictions that block non-residential IP addresses.


### BYO Media extraction

You could run a custom video extractor at home (anything you want) and Breadcrum works with it to create episodes.

### An app

Breadcrum ships a podcast app that is more tolerant with bad video CDNs.

## Conclusion

- If you run into issues with your episodes, retry them. They might start working on the second or third access.
- Breadcrum is currently working on more robust solutions!
