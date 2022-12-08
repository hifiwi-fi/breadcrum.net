/* eslint-env browser */
import { Component, html, render } from 'uland-isomorphic'

const bookmarklet = `javascript:(function()%7Bvar%20e=true;var%20t=null;var%20r=false;var%20n=%7Bjavascript:%22javascript%22,js:%22javascript%22,python:%22python%22,ios:%22ios%22,youtube:%22video%22,vimeo:%22video%22,video:%22video%22,books:%22book%22,book:%22book%22%7D;var%20o=%7B%22github.com%22:%22.entry-title%20.js-current-repository%22%7D;var%20i=%7B%22www.kickstarter.com%22:%22.short-blurb%22%7D;var%20a=1e3;var%20u=function(e)%7Breturn%20e.toLowerCase()%7D;var%20c=function(e)%7Breturn%20e?e.textContent.trim().replace(/%5Cs+/g,%22%20%22):null%7D;var%20l=u(document.title);var%20f=function(e)%7Bif(e)%7Breturn%20l.indexOf(u(e))!==-1%7Delse%7Breturn%20false%7D%7D;var%20s=function(e,t,r)%7Br=r%7C%7Cwindow;var%20n=e.length;var%20o;for(var%20i=0;i%3Cn;++i)%7Bo=t.call(r,e%5Bi%5D);if(o!==null)%7Breturn%20o%7D%7Dreturn%20null%7D;var%20v=function()%7Bvar%20e=location.href;var%20t=location.hostname;var%20r;if(t%20in%20o)%7Br=document.querySelector(o%5Bt%5D);if(r)%7Breturn%20c(r)%7D%7Dvar%20n=document.title;r=document.querySelector(%22meta%5Bproperty='og:title'%5D%22);if(r)%7Bn=r.content.trim().replace(/%5Cs+/g,%22%20%22)%7Dif(s(document.getElementsByClassName(%22hentry%22),function()%7Breturn%20true%7D))%7Bvar%20i=document.querySelector(%22.hentry%20.entry-title%22);if(i)%7Breturn%20c(i)%7D%7Dvar%20a=s(document.getElementsByTagName(%22A%22),function(t)%7Bif(t.href===e)%7Ba=c(t);if(f(a))%7Breturn%20a%7D%7Dreturn%20null%7D);if(a)%7Breturn%20a%7Dvar%20u=%5B%22h1%22,%22h2%22,%22h3%22,%22h4%22,%22h5%22,%22h6%22%5D;var%20l;for(var%20v=0;v%3Cu.length;++v)%7Bs(document.getElementsByTagName(u%5Bv%5D),function(e)%7Bvar%20t=c(e);if(f(t)&&(!l%7C%7Ct.length%3El.length))%7Bl=t%7Dreturn%20null%7D)%7Dif(l)%7Breturn%20l%7Dreturn%20n%7D;var%20m=function(e)%7Be=u(e);var%20t=%5B%5D;var%20r;for(var%20o%20in%20n)%7Br=o%20instanceof%20RegExp?o:new%20RegExp(%22%5C%5Cb%22+o+%22%5C%5Cb%22,%22i%22);if(r.test(e))%7Bt.push(n%5Bo%5D)%7D%7Dreturn%20t%7D;var%20d=function()%7Bvar%20e;e=document.querySelector(%22meta%5Bname='description'%5D%22);if(e)%7Breturn%20e.content.trim().replace(/%5Cs+/g,%22%20%22)%7De=document.querySelector(%22meta%5Bproperty='og:description'%5D%22);if(e)%7Breturn%20e.content.trim().replace(/%5Cs+/g,%22%20%22)%7Dreturn%22%22%7D;var%20p=function()%7Bvar%20e;if(%22%22!==(e=String(document.getSelection())))%7Bif(r)%7Be=e.trim().split(%22%5Cn%22).map(function(e)%7Breturn%22%3E%20%22+e%7D).join(%22%5Cn%22)%7D%7Dvar%20t=location.hostname;var%20n;if(t%20in%20i)%7Bn=document.querySelector(i%5Bt%5D);if(n)%7Breturn%20c(n)%7D%7Dif(!e)%7Be=d()%7Dreturn%20e%7D;var%20h=location.href;var%20g=v();var%20y=p();var%20b=y.indexOf(g);if(b===0)%7By=y.substring(g.length).trim()%7Delse%20if(b===y.length-g.length)%7By=y.substring(0,b).trim()%7Dvar%20j=m(document.title+%22%20%22+y+%22%20%22+d());if(a%3E0)%7Bg=g.substring(0,a);y=y.substring(0,a)%7Dvar%20w=%5B%22url=%22,encodeURIComponent(h),%22&title=%22,encodeURIComponent(g),%22&description=%22,encodeURIComponent(y),%22&tags=%22,encodeURIComponent(j.join(%22%20%22))%5D;if(e)%7Bw=w.concat(%5B%22&later=%22,%22yes%22,%22&jump=%22,%22close%22%5D)%7Dif(t)%7Bw=w.concat(%5B%22&x-source=Safari%22,%22&x-success=%22,encodeURIComponent(location.href),%22&x-cancel=%22,encodeURIComponent(location.href)%5D);window.location=t+w.join(%22%22)%7Delse%7Bvar%20C=open(%22${process.env.TRANSPORT}://${process.env.HOST}/bookmarks/add?%22+w.join(%22%22),%22Breadcrum%22,%22toolbar=no,width=710,height=660%22);if(e)%7BC.blur()%7D%7D%7D)();`

export const page = Component(() => {
  return html`
    <h1>
      Docs
    </h1>
    <p>Drag this bookmarklet to your bookmark bar or menu. When you visit a page you want to bookmark, click the the bookmarklet that saved and it will open a new bookmark window.</p>
    <li>
      <a class="bookmarklet" href="${bookmarklet}">
        🥖 bookmark
      </a>
    </li>
`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
