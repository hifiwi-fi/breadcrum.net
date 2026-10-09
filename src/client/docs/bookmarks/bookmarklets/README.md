---
title: 'Bookmarklets'
layout: 'docs'
---

Drag this bookmarklet to your bookmark bar or menu.
When you visit a page you want to bookmark, click the bookmarklet in
your bookmark bar or menu and it will open a new bookmark window. Existing
URLs will open an edit window.

<div>
  <p>
    <a class="bc-bookmarklet" href="{{ vars.bookmarklet }}">🥖 bookmark</a>
    <a class="bc-help-text" href="https://github.com/hifiwi-fi/bc-bookmarklet/releases/tag/v{{ vars.version }}">Version {{ vars.version }}</a>
    <br/>
    <span class="bc-help-text">Drag me to your bookmarks!</span>
  </p>
  <p>
    The bookmarklet window shows its version at the bottom. When a newer version is
    available, you will see a small update link. To update, remove the old bookmarklet
    and add the new one. Updates are infrequent, but please update when you see the link
    to ensure you have the latest features and compatibility fixes.
  </p>
</div>

Alternatively, manually create a new bookmark in your Browser bookmark manager
and copy/paste the following script into the bookmark URL field.

<div id="bc-bookmarklet-copy"></div>

More options:

- [🍎 Apple Shortcuts](/docs/bookmarks/apple-shortcuts/)
- [🔗 Bookmark Add Page API](/docs/bookmarks/bookmark-add-page-api/)
