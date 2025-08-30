---
layout: article
title: "🤦‍♂️ Frontend Rewrite"
serif: false
publishDate: "2025-08-30T03:12:22.391Z"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "Breadcrum adds a Discord server and is accepting donations"
image: "./img/FIX-ME.png"
---

tldr; Breadcrum's frontend codebase has been fully rewritten.
If you see bugs, please report them on your preferred communication channel.

The bad news is that this means I sunk a TON of valuable work time on re-doing existing features.
The good news is a pile of techn debt isn't hanging over the project anymore.

If you are mildly curious about the engineering details please read on.

## `uhtml ➡️ preact`

Breadcrum's frontend is written with a bunch of custom frontend tooling.
The long term goal was to eventually enable an offline PWA experience, so please keep that in mind when reading about my mistakes.
The website frontend structure is orchestrated with a custom framework called [domstack](https://domstack.net).
I wrote this to power a bunch of projects, but Breadcrum is by far the largest projeve I've done with it,
achieving a static isomorphic pre-rednered functional-reactive frontend.

For the actual frontend reactive templates, I used a very niche frontend library called [uland]().
(I was using a custom wrapper called [uland-isomorphic]() to be preciese.)
`uland` is a variant of a slightly less niche library called `uhtml`, both of which are written by [webreflection](), a GOATed open source developer.
`uthml` is a highly performant, highly efficient functional-reactive html template library, that sort of works like react, except its smaller, works using [tagged template functuons]() so it doesn't require nasty transforms, and uses a syntax that more closely resembles actual html than preact.
`uhtml` provided the functional-reactive html templates, and `uland` provided a variant that included 'hooks' for stateful 'components'.
`uland-isomorphic` provided a wrapper around `uland` and `uland-ssr` so that you could write code using [dependency injection]() at the module resolution layer.
All in all, the library is beautiful, tasteful, performant, efficient, and a dream come true in a lot of ways.
I really liked both of them, and it was a joy to build with them, and I wouldn't hesitate to build with them again, but only in a way that aligns with the current goals for the project.

About a year ago, `uhtml@v4` came out (and more recently v5), and dropped support for hooks, instead adopting only [signals](), and thus `uland` became mostly unmaintained, meaning the frontend library that made up nearly 100% of Breadcrum's codebase was no longer being developed, leaving me with a few options:

1. continue using an unmataied library
2. forking it and maintianging it myself
3. switching libraries

Intiially I opted to stay on uland, but recently I eventually came across an actual bug in the library after attemoting something a bit more complicated componentwise, so I had to contemplate option 2 and 3.
Since I haden't really established community with any others using this version of the library, I knew that forking it would mean going solo, and to be honest, digging into the internals of functional-reactive templates is a lot of work.
Having working on a failed frontend framework similar to these in the past, it wasn't really a problem I was looking to revisit any time soon.
So I opted to switch to [`preact`]() and [`htm`](), which has maintained support for hooks due to its alignment with upstream react.

## What about LLMs?

Switching from one frontend framework to another was a lot of work.
I thought the similarity between the two libraries (uhtml and htm) would make things mostly easier, and I guess it did on some level, but there were dozens of small subtle differences.
One might thing an LLM would help with this kind of conversion.
The models have some level of understanding about both libraries, somehow, and you can enumerate the conversion patterns.
This worked, roughly, 75% of the way through.
I worked through a page or 3 at a time, until the context window would fill up, then re-start from a summary and the next page to convert.
Once you get through every page, you then have to get the tests passing, and then actually go through, literally every detail of the frontend app and QA every feature.
So... yes, LLMs did help, I blew through my month of Zed Pro credits in almost a weekend and it only got me about 75% of the way there.

The main drawback as as its doing the neive conversion, I'm missing out on all of the knowledge building of what actually is required to get things working.
Only when I went back over to check everything did I figure out all of the gritty details that were necessary to get converted between libraries.

## What are the takeaways

Here are my key takeways after this whole experience:

- Set an abstraction budget when picking core app abstractions. The less mainstrain a solutuon you pick, expect to spend more time on it long term.
- Bus factor is real, and sometimes the bus is upstream taking a different turn.
- You can always fork, but will others help you if you do? Maintaining a fork is easier with community help and harder when completely solo.
- The smaller the community around a project, the tighter the turns a maintainer might take. Take this into account.
- Writing your entire application in a functional-reactive templating language is a ton of work, and I still haven't shipped an offiline mode. Will I ever? This pattern hasn't paid off the long term goal I intended for it yet, so maybe I will change course more on the frontend further.
- Breadcrum would have been a great fit for something like [HTMX]()/hypermedia with just a sprinking of functional-reactive templating around the more advanced form interactions. It would have cut down on total lines of code, and offline mode might have still been possible.
- React is here to stay, no matter the amount of hate it gets. Preact is a really nice version of React, and htm works really really well along similar lines as uhtml, while still keeping in line with React's stability.
