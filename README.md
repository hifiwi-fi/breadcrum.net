# api.breadcrumb.net
[![Actions Status](https://github.com/hifiwi-fi/api.breadcrum.net/workflows/tests/badge.svg)](https://github.com/hifiwi-fi/api.breadcrum.net/actions)

Breadcrum.net's backend API. What is it?

- Bookmarking storage and organization. This is the primary 'atom' of the service. Everything hangs off of saving a 'bookmark' of a URL. 
- Bookmarks have a title, description and tags.
- Lightweight content archival. Breacrum saves the 'reader mode' view of a webpage, as well as images it can find. Full text archival provides a more automatic and complete solution to messy hand-organized titles, descriptions and tags. Content archival requires a paid account. Image storage may be subject to additional storage fees. These storage fees should be at cost from b2.
- Shortcuts to stash and retrieve copies in http://archive.today will also be provided via http://mementoweb.org/guide/quick-intro/
- Content archival should provide different extraction methods
	- https://github.com/feedbin/extract
	- https://github.com/postlight/mercury-parser 
	- https://github.com/mozilla/readability
	- Query selector?
- Twitter gets a special content extractor
	- Unroll threads
	- Save media
	- Save metadata
- Full text search. Since bookmarks are stored with a consistent archive of the contents, full text search is a lot more useful than the notes or metadata usually associated with bookmarking tools.
- Podcast anything. Inspired by [huffduff-video](https://snarfed.org/2015-03-07_huffduff-video), when you save a bookmark to breadcrum, you can optionally request that the page be hit with youtube-dl (or yt-dlp) and have the results inserted into your private podcast feed. It let's you queue media and consume a private collage of media from around the web.
- Read it later.
	- A on-site reading queue that actually unmarks read items as you read them.
	- Print queue. Unread articles can be queued up into a single print job, and marked as 'read' when you print.
	- Send to kindle.
- Private only. The social bookmarking thing concept doesn't work. Bookmark streams are so hyperpersonalized, it's a bad way to 'share' with semi-related groups.
- Sensitive data mode. You should be able to designate some bookmarks as sensitive. These are not shown by default and require authentication to view. 
- Must be fast. Bookmarks should be a single click action and save quickly. All slow extractions must be done async. 

### Long shot goals

- webextension.
	- Client side conten extraction for when servers can't see the content.
- iOS App/Share sheet. Quick, offline access to breacrum data.
- macOS App. Same function as iOS but for desktop.
- e2e encrypted mode. All content in e2e mode is encrypted client side, except for maybe some optional metadata. To view and search it, it must be done client side.
	- Client creates a private key
	- Private key is encrypted with some hash of the password
	- Private key is custodial stored on breadrum.
	- Changing passwords re-encryptes the private key, bookmarks retain their original encryptio.
- Audio transcripts of extracted videos.
- Long term archival storage billed at use. Expse a frontend to B2 you want to use. 
- PDF storage with content extraction. 
- Collections mode / folders
- Recording mode.. Browser extension. Click record. Save bookmarks as you nav. 
