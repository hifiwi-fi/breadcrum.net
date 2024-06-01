---
title: 📆 Scheduled Episodes
publishDate: "2024-06-01T20:32:15.550Z"
layout: "article"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "Breadcrum now supports scheduled livestreams and premieres"
image: "./img/scheduled.png"
---

Breadcrum has shipped rudimentary support for scheduled episodes!
If you previously tried to bookmark a URL with a video that was scheduled to livestream or premiere in the future, the episode would fail, requiring you to go back after the stream or premiere started to try again.
Now, when you create an episode for a video that is scheduled in the future, Breadcrum will wait for the stream to start before finalizing the episode.

<figure class="borderless">
  <a href="./img/scheduled.png"><img loading="auto" src="./img/scheduled.png" alt="Screenshot of a scheduled episode"></a>
  <figcaption>The episode will remain in the waiting state until the video is ready.</figcaption>
</figure>

The video will initially resolve to the livestream (which podcast apps usually can't download but can typically play) and then automatically switch over to the recorded copy once it's available.
Watching the livestream in the podcast app provides additional benefits, such as the ability to sleep your device and continue streaming on headphones or other devices.

The UI for this feature is still rudimentary and will improve with further iteration.
In the meantime, enjoy scheduling future episodes for yourself and not having to remember one more thing.
This feature was made possible by the enhancements detailed in the previous post: [🏗️ Improved Architecture](https://breadcrum.net/blog/2024/improved-architecture/).
Go give that a read if you missed it!
