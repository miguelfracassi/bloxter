(async () => {
  const { esc, setTitle, feed, loadPosts } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'saved' });
  if (!v) return;
  setTitle('Salvos');
  v.innerHTML = `
    <div class="page-head"><div><h1>Salvos</h1><small>Só você vê esta lista</small></div></div>
    <div id="posts"></div><div id="more"></div>`;
  feed.endpoint = 'saved';
  feed.emptyHTML = `<div class="empty"><b>Nada salvo ainda</b>Toque no ícone de marcador em um post para guardá-lo aqui.</div>`;
  loadPosts(true);
})();
