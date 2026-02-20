/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { render } from 'preact'
// import { useUser } from './hooks/useUser.js'
import { Badge } from './components/badge/badge.js'

/** @type {FunctionComponent} */
export const Page = () => {
  // const { user } = useUser()

  // useEffect(() => {
  //   if (user) window.location.replace('/bookmarks')
  // }, [user])

  return html`
    <div class="bc-marketing">
      <${Badge}><a href="/docs/subscriptions/">Free + Paid Plans</a><//>
      <div class="bc-marketing-hero">
        <div class="bc-marketing-hero-icon">
          <img src="/static/bread.png" alt="Breadcrum logo" />
        </div>
        <h1 class="bc-marketing-hero-title">
          Breadcrum
        </h1>
        <p class="bc-marketing-hero-description">
          Breadcrum is a bookmarking service for collecting links, articles, and web media.
        </p>
        <p class="bc-marketing-hero-links">
          <a href="/register">Create free account</a> ·
          <a href="/docs/subscriptions/">View plans and pricing</a>
        </p>

        <div class="bc-marketing-hero-screenshot">
          <picture>
            <source srcSet="/static/screenshots/bookmark-window-dark.png" media="(prefers-color-scheme: dark)" />
            <img src="/static/screenshots/bookmark-window-light.png" alt="Screenshot of Breadcrum.net" />
          </picture>
        </div>
      </div>

      <div class="bc-marketing-plan-grid">
        <section class="bc-marketing-plan-card">
          <h2>🆓 Free plan</h2>
          <p>
            10 new bookmarks per month. Resets on the 1st of each month (UTC).
          </p>
          <p>
            Access all existing bookmarks and core features.
          </p>
        </section>

        <section class="bc-marketing-plan-card bc-marketing-plan-card-paid">
          <h2>💳 Paid plan</h2>
          <p>
            Unlimited bookmarks on a yearly subscription.
          </p>
          <p>
            Subscribe, cancel, and manage billing from <a href="/account/">account settings</a>.
          </p>
        </section>
      </div>

      <div class="bc-marketing-feature-grid">
        <div class="bc-marketing-feature-block">
            <h2>🔖 Bookmark everything</h2>
            <p>
              It all starts with a bookmark.
              Collect all of the good links and never lose track of something on the web again.
              For every action you take on Breadcrum, it starts by saving a bookmark that is available
              on every device and in every browser.
            </p>

            <div class="bc-marketing-feature-screenshot">
              <picture>
                <source srcSet="/static/screenshots/bookmark-edit-dark.png" media="(prefers-color-scheme: dark)" />
                <img src="/static/screenshots/bookmark-edit-light.png" alt="Screenshot of Breadcrum.net" />
              </picture>
            </div>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>💿 Podcast anything</h2>
            <p>
              Finally listen (or watch) that lecture you never have time for at your own pace.
              Consuming long form media is a solved problem, and the solution is podcasts.
              If you see video or audio on the web, Breadcrum can forward it for your favorite podcast
              app that subscribes to your private Breadcrum podcast feed. Seriously, (almost) any media that
              <a href="https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md">yt-dlp</a> supports will work.
              Assert your (user-)agency and consume media in the podcast client of your choice!
            </p>
            <div class="bc-marketing-feature-screenshot">
              <picture>
                <source srcSet="/static/screenshots/apple-podcasts-dark.png" media="(prefers-color-scheme: dark)" />
                <img src="/static/screenshots/apple-podcasts-light.png" alt="Screenshot of Breadcrum.net" />
              </picture>
            </div>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🗄️ Readability Archive</h2>
            <p>
              Privately archive a minimal full-text content (aka article or reader mode) extraction of every article you bookmark.
              Contents are indexed and full text searchable alongside your bookmark notes and tags.
              Quit fumbling your hand written note, and just clip out the full contents of the article sent to your browser.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🏷️ Tags</h2>
            <p>
              Tag it up like it's 2005! Organize bookmarks by tags.
            </p>

            <div class="bc-marketing-feature-screenshot">
              <picture>
                <source srcSet="/static/screenshots/tag-window-dark.png" media="(prefers-color-scheme: dark)" />
                <img src="/static/screenshots/tag-window-light.png" alt="Screenshot of Breadcrum.net" />
              </picture>
            </div>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🗒️ Notes</h2>
            <p>
              Leave yourself a note, or not. Freeform text field for writing whatever you want. Poems, ideas, who sent the link, excerpts. Whatever you want!
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🫙 Public archives</h2>
            <p>
              The web is not permanent, but public archives are. If you don't want to lose track of dead links, you can save
              related archival links on your bookmarks.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>⭐️ Stars</h2>
            <p>
              Special links deserve special recognition. Frequently accessed or high quality links can be easily designated by giving them a gold star.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🔵 Read it later</h2>
            <p>
              Bookmarking a long article you don't have time to read?
              Mark it as "read it later" so you can quickly find it again when you have time.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🤫 Sensitive mode</h2>
            <p>
              Some bookmarks (and their notes) are more private than others.
              Designate extra private bookmarks as "sensitive", and easily toggle their visibility on or off with
              a single click of a button.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🐈 Open source</h2>
            <p>
              Breadcrum is developed and sold as a service, but the software is developed as open source.
              This provides increased transparency into how it works and the opportunity to submit ideas and changes directly to the service.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>💳 Subscriptions</h2>
            <p>
              Breadcrum offers free and paid plans.
              Free includes 10 new bookmarks per month. Paid is yearly and unlocks unlimited bookmarks.
              See <a href="/docs/subscriptions/">subscriptions and pricing</a> for details.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🔎 Full text search</h2>
            <p>
              Find your old bookmarks, archives and episodes by phrase or word.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>📡 Multiple feeds <small>(Coming soon)</small></h2>
            <p>
              Organize video and audio episodes into separate podcast feeds.
              Create a themed media collage.
              Create a personal podcast feed for a friend or family member.
              Subscribe to different feeds on different devices.
            </p>

            <div class="bc-marketing-feature-screenshot">
              <picture>
                <source srcSet="/static/screenshots/feed-window-dark.png" media="(prefers-color-scheme: dark)" />
                <img src="/static/screenshots/feed-window-light.png" alt="Screenshot of Breadcrum.net" />
              </picture>
            </div>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>☁️ Cloud storage <small>(Coming soon)</small></h2>
            <p>
              Remux audio and video formats into affordable cloud storage sold at cost.
              Upload un-hosted files into your private podcast feeds.
              Save indefinitely or set expiration dates to auto-delete after your podcast app has downloaded
              a copy.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>✒️ Markdown notes <small>(Coming soon)</small></h2>
            <p>
              Rich formatting of bookmark notes with markdown.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>🖨️ Print queue <small>(Coming soon)</small></h2>
            <p>
              Articles piling up in your read it later queue?
              Queue up articles in a consistent visual layout and print them all out as a single
              document.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>💌 Send to <small>(Coming soon)</small></h2>
            <p>
              Send extracted articles to devices like Kindle or ReMarkable,
              or just email them to a friend.
            </p>
          </div>

          <div class="bc-marketing-feature-block">
            <h2>📠 Import/Export <small>(Coming soon)</small></h2>
            <p>
              Import your data from your browser or other bookmarking sites, or export what you collected on Breadcrum.
            </p>
          </div>

        </div>
    </div>
`
}

if (typeof window !== 'undefined') {
  const container = document.querySelector('.bc-main')
  if (container) {
    render(html`<${Page}/>`, container)
  }
}
