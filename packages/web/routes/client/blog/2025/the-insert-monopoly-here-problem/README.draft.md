---
layout: article
title: "😈 The Insert-Monopoly-Here Problem"
serif: false
publishDate: "2025-01-07T00:22:25.473Z"
authorName: "Bret Comnes"
authorUrl: "https://bret.io"
authorImgUrl: "/static/bret-ava.png"
description: "Breadcrum adds a Discord server and is accepting donations"
image: "./img/FIX-ME.png"
---

**Whats the deal with BotGuard/X/Reddit/YouTube/etc?**

It turns out that once a service has a monopoly on distribution, the temptation to leverage their position becomes irrisitable to the point where they are willing to degrade their own service at the expense of user experience.

## Breaking your OS to sell it back to you

When a service degrades it's own service on a user, it usually takes the form of circumventing features a users computer can normally take on public data sent to it: removing download buttons, disabling right click menu options, breaking content filters, disabling background media playback and picture and picture, obfuscating data from local analysis etc.
Often the service then tries to sell these features back to you because they understand these are desirable actions to take.

We've seen various forms of this over the last year:

- Twitter/X making it impossible to crawl content intended to be shared on the public internet.
- Newspapers of record paywalling search indexed content
- YouTube making it impossible to fetch page metadata from data center IPs.
- YouTube Plus as a service to sell OS level features back to you.
- Reddit clamping down on CuRL requests.
- Distributing content in inconvenient, less useful formats.
- Slot-machine style interfaces designed to distract and harm you by wasting your time and attention

With the LLM hype-cycle in full effect, services are doubling down on their efforts to make their content even more difficult to access.

## How did we get here?

These services popularized by generally playing by unobjectionable open web rules that attracted their initial user base.
Eventually through network effects, these services becomes a monopoly on certain types of content to the point where people are obliged to interact with the service if they want any semblance of discoverability on their content, and in effect, forces the audience to follow these choices.

The web was designed to be an open document library, freely navigable by the users agent of choice.
This is not true today.
The internet is a centralizing walled garden that is hostile to user agent and intent or any attempts at personal computing.

If these content services decided that they would prefer you pay to access content via license, they could simply take the content behind a login, add Widevine, etc.
Instead they prefer to battle it out in this weird gray area of presenting "public" content.

## How does this affect Breadcrum?

Many of the content services users of Breadcrum like to bookmark have become very hostile to any
attempt by any tool to make requests on behalf of those users.
For example, when Breadcrum attempts to extract metadata of a URL a user is bookmarking, so that the bookmark is populated with more useful data,
many services have begun to reply with generic or very limited amounts of data.
In order to fetch the data the user is seeing, Breadcrum has to implement special handling for each popular URL that has made attempts to obfuscate seemingly publicly available content.

Breadcrum is not necessarily the target of this deliberate interference.
Content services are often attempting to prevent mass scraping of content by large commercial scraping operations.
This kind of activity usually falls far outside of fair-use and section 203 protections,
or people generally aiming to game usage metrics,
so on some level its understandable.

Breadcrum intends to offer various tools and techniques that users are free to apply to any web URL they wish.
These may break from time to time, and the plan is to just fix them as they break.

### Might need your help

Many of the techniques to circumvent scraping tools and techniques involves blocking datacenter IP addresses.
Breadcrum runs in a hosted environment, so it is is susceptible to this kind of interference.

If IP blocks become more prevalent, more advanced extraction tools might have to migrate to user devices.
If push comes to shove, and this is still way far off, you may eventually need to run a small agent/task tray process on your computer or phone that periodically checks for
bookmarks on your account that need extraction.
