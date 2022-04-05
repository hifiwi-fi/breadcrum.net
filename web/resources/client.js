/* eslint-env browser */
import { html, render, useEffect } from 'uland-isomorphic'
import { useUser } from '../hooks/useUser.js'

export function addBookmarkPage () {
  const { user, loading } = useUser()

  useEffect(() => {
    if (!user && !loading) window.location.replace('/login')
  }, [user, loading])

  return html`
    <li>
      <a class="bookmarklet" href="javascript:q=location.href;if(document.getSelection){d=document.getSelection();}else{d='';};p=document.title;void(open('https://breadcrum.net/bookmarks/add?url='+encodeURIComponent(q)+'&description='+encodeURIComponent(d)+'&title='+encodeURIComponent(p),'🥖 Bredcrum','toolbar=no,scrollbars=yes,width=750,height=700'));">
        add bookmark popup
      </a> is a slightly larger bookmarklet that shows a clickable tag cloud.
    </li>
    <li>
      <a class="bookmarklet" href="javascript:q=location.href;if(document.getSelection){d=document.getSelection();}else{d='';};p=document.title;void(open('http://localhost:3000/bookmarks/add?url='+encodeURIComponent(q)+'&description='+encodeURIComponent(d)+'&title='+encodeURIComponent(p),'🥖 Bredcrum','toolbar=no,scrollbars=yes,width=750,height=700'));">
        locahost add bookmark popup
      </a> is a slightly larger bookmarklet that shows a clickable tag cloud.
    </li>
`
}

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), addBookmarkPage)
}
