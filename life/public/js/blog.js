(() => {
  const list=document.getElementById('blog-list');document.querySelector('.year').textContent=new Date().getFullYear();
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=(v)=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeStyle:'short'}).format(d)};
  async function load(){try{const r=await fetch('/api/blog',{headers:{Accept:'application/json'}});const data=await r.json();if(!r.ok)throw new Error();if(!data.articles?.length){list.innerHTML='<div class="blog-empty">Ainda não há notícias publicadas. Volte em breve!</div>';return}list.innerHTML=data.articles.map((a)=>'<article class="news-card">'+(a.image_data?'<img class="news-cover" src="'+esc(a.image_data)+'" alt="">':'')+'<div class="news-content"><time class="news-date" datetime="'+esc(a.created_at)+'">'+esc(date(a.created_at))+'</time><h2>'+esc(a.title)+'</h2><div class="news-body">'+esc(a.content)+'</div><div class="blog-author">Bloxter · Notícias oficiais</div></div></article>').join('')}catch{list.innerHTML='<div class="blog-empty">Não foi possível carregar as notícias agora. Atualize a página para tentar novamente.</div>'}}
  load();
})();

