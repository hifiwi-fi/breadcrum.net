/* eslint-env browser */
import { Component, html, render } from 'uland-isomorphic'
import { bookmarklet } from '../bookmarklets/bookmarklet.js'

export const page = Component(() => {
  return html`
  <h1>
    Tutorial
  </h1>

  <p>Welcome to 🥖 Breadcrum! Many things are still WIP but the following quick tutorial should get you up to speed.</p>

  <h2>Step 1: Get the Bookmarklet</h2>

  <p>
    Everything you do on Breadcrum starts by adding a 🔖 Bookmark to your account.
    Creating bookmarks should be quick and painless.
    Until native app share sheets and WebExtensions are available for Breadcrum, the Bookmarklet is the best way to do this.
  </p>

  <p>
    Drag the following link to your browsers bookmark toolbar or sidebar.
    You can keep the bookmarklet wherever you like, but you should keep it somewhere handy for quick access.
  </p>

  <p><a class="bc-bookmarklet" href="${bookmarklet}">🥖 bookmark</a></p>

  <p>This can be done in a number of different ways. Here are some examples</p>

  <figure>
    <img src="./img/sidebar-safari.png" alt="Dragging bookmarklet to the safari sidebar">
    <figcaption>Use <kbd>cmd</kbd><kbd>shift</kbd><kbd>L</kbd> to show the Safari sidebar and drag the bookmarklet to the bookmark menu or favorite bar folder.</figcaption>
  </figure>

  <figure>
    <img src="./img/bookmark-bar-safari.png" alt="Dragging bookmarklet to the safari bookmark bar">
    <figcaption>Use <kbd>cmd</kbd><kbd>shift</kbd><kbd>B</kbd> to show the bookmark bar and drag the bookmarklet to the bookmark bar in safari. Use a similar procedure in other browsers.</figcaption>
  </figure>

  <figure>
    <img src="./img/ios-safari.jpg" alt="Dragging bookmarklet to the iOS safari bookmark button">
    <figcaption>On iOS, drag the bookmarklet to the bookmark button until the bookmark menu opens up. Place it anywhere you like.</figcaption>
  </figure>

  <p>Add the bookmarklet to all browsers you plan on using Breadcrum with. Using a cloud sync between devices can save you some extra work of adding it on more than one device.</p>

  <h2>Step 2: Bookmark a Website</h2>

  <p>When on a website, click on the bookmarklet that you added to your browser bookmarks. This will open the add bookmark window.</p>

  <figure class="borderless"  >
    <img src="./img/add-bookmark.png" alt="Create bookmark window">
    <figcaption>This window lets you create a new bookmark. You can add tags, a note, related archival links and even create podcast episodes from media found in the page.</figcaption>
  </figure>

  <p>Fill in the details and click <code>Submit</code>.</p>

  <h2>Step 2: View your 🔖 Bookmarks</h2>

  <p>Visit <a href="/bookmarks/">🔖 Bookmarks</a> to view your bookmarks.

  <figure class="borderless"  >
    <picture>
      <source srcset="/static/screenshots/bookmark-window-dark.png" media="(prefers-color-scheme: dark)">
      <img src="/static/screenshots/bookmark-window-light.png" alt="Screenshot of Breadcrum.net">
    </picture>
    <figcaption>This window lets you create a new bookmark. You can add tags, a note, related archival links and even create podcast episodes from media found in the page.</figcaption>
  </figure>

  <h2>Step 3: Subscribe to your 📡 Feed</h2>

  <p>Visit <a href="/feeds/">📡 Feeds</a> to get your private Breadcrum podcast feed URL.</p>

  <figure class="borderless"  >
    <picture>
      <source srcset="./img/feed-dark.png" media="(prefers-color-scheme: dark)">
      <img src="./img/feed-light.png" alt="Screenshot of Breadcrum.net feed page">
    </picture>
    <figcaption>On the feed page, get your private podcast feed URL to subscribe to in a podcast app. Don't share this URL! It has a private token that makes it so only you can see the feed.</figcaption>
  </figure>

  <p>Paste the feed URL into your favorite podcast app (that preferably supports video podcasts).</p>

  <figure>
    <img src="./img/follow-show-by-url-apple-podcasts.png" alt="Use Follow show by URL in apple podcasts">
    <figcaption>Follow the show in Apple Podcasts by going to the file Menu and selecting "Follow a Show by URL...".</figcaption>
  </figure>

  <p>After a moment, your feed will refresh and download any content that you capture when creating bookmarks!</p>

  <figure class="borderless">
    <img src="./img/apple-podcasts.png" alt="View your content in a podcast app">
    <figcaption>All media from around the web, ready for you as a podcast.</figcaption>
  </figure>

  <h2>Step 4: Play around!</h2>

  <p>Breadcrum has many features that will be documented soon! Follow <a href="https://twitter.com/breadcrum_">@_breadcrum</a> for updates as they are available.</p>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-docs-main'), page)
}
