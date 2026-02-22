---
layout: article
title: "🤦‍♂️ Frontend Rewrite"
serif: false
publishDate: "2025-09-07T23:32:59.171Z"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "Breadcrum's frontend has been completely rewritten (unfortunately)"
image: "./img/preact.webp"
---

**TL;DR:** Breadcrum's frontend codebase has been fully rewritten.
If you see bugs, please report them on your preferred communication channel.

![](./img/lines.webp)

The bad news is that this means I sunk a ton of valuable work time into re-doing existing features.
The good news is that a pile of tech debt isn't hanging over the project anymore, so I can get back to feature work.

The short version of the story is that Breadcrum's frontend has been rewritten from [`uhtml`][uhtml] to [`preact`][preact]/[`htm`][htm].
The decision to make this change was due to encountering some intractable bugs in older versions of [`uhtml`][uhtml],
and because Breadcrum's frontend makes heavy use of components and "[hooks][hooks]" and [`uhtml`][uhtml]'s decision to remove them from the support matrix.
I wrote a big, long blog post about this switch, but I think rather than post all of that, I'll just write up some takeaways. If you are curious about more details, feel free to reach out or check out the [PR](https://github.com/hifiwi-fi/breadcrum.net/pull/541).

- [Bus factor][bus-factor] is real, and sometimes the factor is the bus deciding to drive to a different destination than when you got on. This is the case with [`uhtml`][uhtml]. Still great tech, but the decision to drop hook support diverged the project from what I had already written in Breadcrum, and I needed to get back to a supported library with hooks support due to practical needs.
- Writing your entire application in a functional-reactive templating language is a ton of work, and I still haven't shipped offline mode. Will I ever? This pattern hasn't paid off the long-term goal I intended for it yet, so maybe I will change course on the frontend further.
- Breadcrum would have been a great fit for something like [HTMX][htmx]/hypermedia with just a sprinkling of functional-reactive templating around the more advanced form interactions. It would have cut down on the total lines of code, and offline mode might have still been possible.
- [React][react] is here to stay, no matter how much hate it gets. [Preact][preact] is a really nice version of React, and [`htm`][htm] works really well along similar lines as [`uhtml`][uhtml], while still keeping in line with React's stability.
- Software development is chaotic. A turn at the beginning can permanently alter the trajectory of the project.
- The usefulness of [LLMs][llms] as a refactoring tool drops off significantly when you try to have them do large transformations on novel or unique patterns/codebases.

Onward and upward. Please don't let the pace discourage your support of the project.
As always, feedback and ideas are welcome.
Your input carries a lot of weight at this point in the project.

[uhtml]: https://github.com/WebReflection/uhtml
[preact]: https://preactjs.com
[htm]: https://github.com/developit/htm
[hooks]: https://react.dev/reference/react
[htmx]: https://htmx.org
[react]: https://react.dev
[llms]: https://en.wikipedia.org/wiki/Large_language_model
[bus-factor]: https://en.wikipedia.org/wiki/Bus_factor
