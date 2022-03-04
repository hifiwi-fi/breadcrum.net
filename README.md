# api.breadcrumb.net
[![Actions Status](https://github.com/hifiwi-fi/api.breadcrum.net/workflows/tests/badge.svg)](https://github.com/hifiwi-fi/api.breadcrum.net/actions)

Breadcrum.net's backend API.

Breadcrum is a swiss army knife for the web. It combines a few ideas together:

- Bookmarking storage and organization. This is the primary 'atom' of the service. Everything hangs off of saving a 'bookmark' of a URL. It should replcae my useage of pinboard.
- Content archival. Instead of saving a janky web page archive, breacrum saves the 'reader mode' view of a webpage, as well as images it can find. Shortcuts to stash and retrieve copies in http://archive.today will also be provided.
- Different reader mode algorithms should be provided (metior or firefix etc)
- Special content extractors should be provided for 'popular' hubs, like twitter.
- Twitter thread unroller. You should be able to bookmark a thread, and read it back like an article, with content in it. Twitter censors. A lot. You should have a system for saving this content for your own use.
- Full text search. Since bookmarks are stored with a consistent archive of the contents, full text search is a lot more useful than the notes or metadata usually associated with bookmarking tools.
- Podcast anything. Inspired by [huffduff-video](http://huffduff-video.snarfed.org), when you save a bookmark to breadcrum, you can optionally request that the page be hit with youtube-dl (or yt-dlp) and have the results inserted into your private podcast feed. It let's you queue media and consume a private collage of media from around the web, free from algorithms or censorship.
- Read it later queue. Read it later on breadcrum in a consistent UI, or send it off to kindle devices, or print queues.
- Private only. No one will see your bookmarks (though there are tools to send people content you save). There are no privacy settings to screw up and leak data. Read/watch/listen in private. The service does expose your data to custodial maintenance work, but breadcrum is dedicated to acting as a neutral platform, to as much of an extent as it legally can.
- Sensitive data mode. You should be able to designate some bookmarks as sensitive. These are not shown by default and require authentication to view.
- Popularity contest. You can designate bookmarks to be included in the top bookmarks list or not. This is the only public aspect of the service and you can opt out of it if you want. Users are not asked if they like or dislike content, just that they would like to save a pointer to it, and optionally extract the content for later consumption. This can surface interesting content.
- Must be fast. Bookmarks should be a single click action and save quickly. All slow extractions must be done async. 

### Long shot goals

- webextension with client local content extraction. While the primary purposes of the tool is to delegate content archival and extraction to a webservice, the fact is most content these days lives behind a login form. You should be able to bookmark and save content that requires you to log in, and this has to be done client side.
- iOS App/Share sheet. Quick, offline access to breacrum data.
- macOS App. Same function as iOS but for desktop.
- e2e encrypted mode. All content in e2e mode is encrypted client side, except for maybe some optional metadata. To view and search it, it must be done client side.
- Plugable input. Not sure what this what this looks like but you should be able to capture content from custom sources.
- Audio transcripts of extracted videos.
- Long term archival storage billed at use. Expse a frontend to B2 you want to use. 
- Collections mode / folders
- Recording mode.. Browser extenion. Click record. Save bookmarks as you nav. 
