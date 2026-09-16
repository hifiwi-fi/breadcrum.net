---
title: 🦋 Bluesky Support & Other Updates
publishDate: "2024-11-04T19:28:11.345Z"
layout: "article"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "Breadcrum now supports Bsky (and other updates)"
image: "./img/bsky.png"
---

Starting today, Breadcrum now supports [Bluesky][bsky] episode extraction.
This capability comes from the excellent upstream work in the [yt-dlp][yt-dlp] project, so kudos to the contributors there.

<figure class="borderless">
  <img src="./img/bsky.png" alt="">
  <figcaption>Breadcrum now supports episodes from Bluesky 🦋.</figcaption>
</figure>

Bluesky videos are currently limited to 50MB and 30 seconds, so you won't be saving much long-form content to listen to later.
However, I expect these limits to increase in the future.
It's exciting to see support grow for Twitter alternatives.

An interesting detail is that this feature came to Breadcrum as an [automatic update](https://github.com/hifiwi-fi/yt-dlp-api/pull/107).
I architected Breadcrum to inherit new features and capabilities quickly and painlessly.
It's incredibly satisfying to see this decision pay off.

## Update on the `yt-dlp` situation

You may have noticed, or [found out about Breadcrum](https://github.com/snarfed/huffduff-video/issues/52) due to the recent changes being implemented at YouTube.
Most notably, YouTube is making it more difficult to run tools like `yt-dlp` in hosted and cloud environments and is causing disruption for Breadcrum and other related services.
Previously, all media discovery in Breadcrum was done solely through `yt-dlp`.

`yt-dlp` has no immediate or short-term solutions to address this issue other than to run using consumer home internet connections.
While that is a possibility (Anyone remember AudioGalaxy satellite?), Breadcrum has found a workaround for the time being.

Breadcrum now has a pluggable extraction proxy that can swap in different media extraction tools and solutions quickly.
We're currently running a custom solution that's working well. When that fails, I'm hoping our time to ship alternative media extraction tools are cut down to days rather than weeks.

## Other Updates

Service updates have been slower this year, for which I apologize.
Breadcrum is undergoing a much-needed back-end refactor (adding types for those interested).
This cleanup addresses some long-running technical debt and will hopefully pay off over the coming years.
Here are our priorities before the end of the year:

- Improved initial bookmark extraction
  - Utilize client, archive, and episode metadata when populating bookmark details initially
- Improved bookmark create form
- Media remux into cloud storage (Paid feature)
  - Better format support and personal archiving of media

Hope everyone is having a good year and, as always, feel free to share ideas, requests or other thoughts you have when using Breadcrum.

[bsky]: https://bsky.app
[yt-dlp]: https://github.com/yt-dlp/yt-dlp/pull/11055
