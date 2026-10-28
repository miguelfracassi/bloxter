/* Bloxter — código compartilhado por todas as páginas.
   Cada página carrega este arquivo e depois o seu próprio script (/js/<página>.js). */
(() => {
  'use strict';

  /* =====================================================
     Utilitários
  ===================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const root = $('#root');
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => {
    let id;
    return (...a) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...a), ms);
    };
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  const state = {
    me: null,
    ready: false,
    lang: 'pt',
    theme: 'dark',
    shell: null, // 'app' | 'public'
    next: null,
    timers: [],
    feedTab: 'all',
    unread: 0,
  };

  /* =====================================================
     Idioma (PT / EN)
  ===================================================== */
  const I18N = {
    pt: {
      slogan: 'A rede social feita<br>para quem vive o roleplay',
      sloganText: 'A rede social feita para quem vive o roleplay',
      heroSub: 'Crie seu perfil, publique suas histórias e encontre quem vive o mesmo universo que você.',
      signup: 'Criar conta',
      login: 'Entrar',
      logout: 'Sair',
      or: 'ou',
      'nav.home': 'Home',
      'nav.search': 'Buscar',
      'nav.messages': 'Mensagens',
      'nav.notifications': 'Notificações',
      'nav.menu': 'Menu',
      'nav.conversations': 'Conversas',
      'nav.profile': 'Perfil',
      'nav.settings': 'Configurações',
      post: 'Postar',
      'auth.loginTitle': 'Entrar no Bloxter',
      'auth.loginSub': 'Bem-vindo de volta.',
      'auth.signupTitle': 'Criar sua conta',
      'auth.signupSub': 'Leva menos de um minuto.',
      'auth.identifier': 'E-mail ou nome de usuário',
      'auth.email': 'E-mail',
      'auth.password': 'Senha',
      'auth.passwordHint': 'Mínimo de 8 caracteres.',
      'auth.name': 'Nome',
      'auth.username': 'Nome de usuário',
      'auth.noAccount': 'Ainda não tem conta?',
      'auth.haveAccount': 'Já tem conta?',
      'user.checking': 'Verificando...',
      'user.available': 'Disponível!',
      'user.taken': 'Esse nome de usuário já está em uso.',
      'user.invalid': 'Use de 3 a 20 caracteres: letras, números e _.',
      'user.hint': 'Letras, números e _ (3 a 20). Seu perfil: /account?u=seunome',
      'home.placeholder': 'O que está acontecendo no seu roleplay?',
      'home.forYou': 'Para você',
      'home.following': 'Seguindo',
      'home.emptyTitle': 'Nada por aqui ainda',
      'home.emptyText': 'Publique algo ou siga pessoas para ver posts no seu feed.',
      'home.emptyFollowing': 'Siga pessoas para ver os posts delas aqui.',
      loadMore: 'Carregar mais',
      loading: 'Carregando...',
      'time.now': 'agora',
      like: 'Curtir',
      delete: 'Excluir',
      'post.deleted': 'Post excluído.',
      'post.confirmDelete': 'Excluir este post?',
      follow: 'Seguir',
      followBack: 'Seguir de volta',
      verifiedLbl: 'Verificado',
      unfollow: 'Seguindo',
      followers: 'seguidores',
      followingLbl: 'seguindo',
      posts: 'posts',
      message: 'Mensagem',
      editProfile: 'Editar perfil',
      joined: 'Entrou em {date}',
      'search.title': 'Buscar',
      'search.placeholder': 'Buscar pessoas',
      'search.empty': 'Nenhuma pessoa encontrada.',
      'search.hint': 'Digite um nome ou @usuário para encontrar pessoas.',
      'who.title': 'Quem seguir',
      'msg.title': 'Mensagens',
      'msg.empty': 'Nenhuma conversa ainda. Entre no perfil de alguém e toque em "Mensagem".',
      'msg.placeholder': 'Escreva uma mensagem',
      'msg.send': 'Enviar',
      'msg.you': 'Você: ',
      'msg.start': 'Diga oi para começar a conversa.',
      'settings.title': 'Configurações',
      'settings.profile': 'Perfil',
      'settings.photo': 'Foto de perfil',
      'settings.changePhoto': 'Trocar foto',
      'settings.removePhoto': 'Remover',
      'settings.bio': 'Bio',
      'settings.link': 'Link da bio',
      'settings.linkPh': 'seusite.com',
      'settings.save': 'Salvar alterações',
      'settings.saved': 'Perfil atualizado!',
      'settings.appearance': 'Aparência',
      'settings.language': 'Idioma',
      'settings.theme': 'Tema',
      'settings.themeDark': 'Escuro',
      'settings.themeLight': 'Claro',
      'settings.account': 'Conta',
      'settings.loggedAs': 'Conectado como {email}',
      'notfound.title': 'Página não encontrada',
      'notfound.text': 'Essa página não existe ou foi movida.',
      'notfound.back': 'Voltar ao início',
      'profile.notfound': 'Esta conta não existe',
      'profile.notfoundText': 'Tente buscar por outro nome de usuário.',
      'footer': '© {year} Bloxter',
      poweredBy: 'Desenvolvido por',
      'toggle.theme': 'Alternar tema',
      back: 'Voltar',
      'err.server': 'Algo deu errado. Tente novamente em instantes.',
      'err.site_closed': 'O Bloxter ainda está fechado. Reserve seu nome em /acess.',
      'err.verified_offer_closed': 'A verificação por clique não está disponível agora.',
      'err.email_domain_invalid': 'O domínio não foi encontrado ou não aceita e-mail.',
      'auth.checkEmail': 'Verificar e-mail',
      'auth.emailAvailable': 'Formato válido, domínio ativo e endereço disponível.',
      'auth.checkEmailFirst': 'Verifique o e-mail antes de criar a conta.',
      'err.network': 'Sem conexão. Verifique sua internet.',
      'err.api_down': 'Servidor indisponível: a API não respondeu. Verifique se o deploy da pasta api/ funcionou na Vercel.',
      'err.config_db': 'Banco de dados não configurado: falta a variável DATABASE_URL na Vercel (Storage → Neon → conectar ao projeto) e um novo deploy.',
      'err.config_jwt': 'Falta a variável JWT_SECRET na Vercel (Settings → Environment Variables) e um novo deploy.',
      'err.db_unreachable': 'Não foi possível conectar ao banco de dados. Confira a DATABASE_URL.',
      'err.unauthorized': 'Faça login para continuar.',
      'err.invalid_credentials': 'E-mail/usuário ou senha incorretos.',
      'err.invalid_email': 'Digite um e-mail válido.',
      'err.weak_password': 'A senha precisa ter pelo menos 8 caracteres.',
      'err.invalid_username': 'Nome de usuário inválido. Use 3 a 20 caracteres: letras, números e _.',
      'err.username_taken': 'Esse nome de usuário já está em uso.',
      'err.email_taken': 'Já existe uma conta com esse e-mail.',
      'err.name_required': 'Digite seu nome.',
      'err.terms_required': 'Para criar a conta, você precisa aceitar os Termos de Serviço.',
      'err.post_empty': 'Escreva algo ou adicione uma foto antes de postar.',
      'err.too_many_images': 'Você pode enviar até 4 fotos por publicação.',
      'err.invalid_image': 'Essa imagem não pôde ser usada. Use JPG, PNG ou WebP.',
      'err.images_too_large': 'As fotos ficaram pesadas demais. Tente menos fotos ou fotos menores.',
      'err.message_empty': 'Escreva uma mensagem.',
      'err.invalid_link': 'Link inválido. Use algo como https://seusite.com',
      'err.invalid_avatar': 'Imagem inválida ou muito grande.',
      'err.not_found': 'Não encontrado.',
      'err.cannot_follow_self': 'Você não pode seguir a si mesmo.',
      'err.cannot_message_self': 'Você não pode enviar mensagem para si mesmo.',
      'err.comment_empty': 'Escreva algo antes de comentar.',
      'err.cannot_repost_self': 'Você não pode republicar o seu próprio post.',
      'err.rate_limited': 'Calma! Você está comentando rápido demais. Tente de novo em instantes.',
      'err.invalid_post': 'Post inválido.',
      'comment.aria': 'Comentar',
      'comment.title': 'Comentários',
      'comment.placeholder': 'Escreva um comentário…',
      'comment.send': 'Comentar',
      'comment.emptyTitle': 'Nenhum comentário ainda',
      'comment.emptyText': 'Seja o primeiro a comentar.',
      'comment.confirmDelete': 'Excluir este comentário?',
      'comment.deleted': 'Comentário excluído.',
      'repost.aria': 'Republicar',
      'repost.label': 'Republicado',
      'repost.done': 'Post republicado no seu perfil.',
      'repost.undone': 'Republicação removida.',
      'repost.tab': 'Republicados',
      'repost.emptyTitle': 'Nada republicado ainda',
      'repost.emptyText': 'Os posts republicados aparecem aqui.',
      'profile.postsTab': 'Posts',
      'share.aria': 'Compartilhar',
      'share.title': 'Compartilhar no story',
      'share.story': 'Compartilhar no Instagram',
      'share.download': 'Baixar imagem',
      'share.generating': 'Criando imagem…',
      'share.saved': 'Imagem salva! Abra o Instagram e poste no seu story.',
      'share.error': 'Não foi possível criar a imagem.',
      'share.dark': 'Escuro',
      'share.light': 'Claro',
      close: 'Fechar',
    },
    en: {
      slogan: 'The social network made<br>for those who live roleplay',
      sloganText: 'The social network made for those who live roleplay',
      heroSub: 'Build your profile, share your stories and find people who live in the same universe as you.',
      signup: 'Create account',
      login: 'Log in',
      logout: 'Log out',
      or: 'or',
      'nav.home': 'Home',
      'nav.search': 'Search',
      'nav.messages': 'Messages',
      'nav.notifications': 'Notifications',
      'nav.menu': 'Menu',
      'nav.conversations': 'Conversations',
      'nav.profile': 'Profile',
      'nav.settings': 'Settings',
      post: 'Post',
      'auth.loginTitle': 'Log in to Bloxter',
      'auth.loginSub': 'Welcome back.',
      'auth.signupTitle': 'Create your account',
      'auth.signupSub': 'It takes less than a minute.',
      'auth.identifier': 'Email or username',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.passwordHint': 'At least 8 characters.',
      'auth.name': 'Name',
      'auth.username': 'Username',
      'auth.noAccount': "Don't have an account?",
      'auth.haveAccount': 'Already have an account?',
      'user.checking': 'Checking...',
      'user.available': 'Available!',
      'user.taken': 'That username is already taken.',
      'user.invalid': 'Use 3 to 20 characters: letters, numbers and _.',
      'user.hint': 'Letters, numbers and _ (3 to 20). Your profile: /account?u=yourname',
      'home.placeholder': "What's happening in your roleplay?",
      'home.forYou': 'For you',
      'home.following': 'Following',
      'home.emptyTitle': 'Nothing here yet',
      'home.emptyText': 'Post something or follow people to fill your feed.',
      'home.emptyFollowing': "Follow people to see their posts here.",
      loadMore: 'Load more',
      loading: 'Loading...',
      'time.now': 'now',
      like: 'Like',
      delete: 'Delete',
      'post.deleted': 'Post deleted.',
      'post.confirmDelete': 'Delete this post?',
      follow: 'Follow',
      followBack: 'Follow back',
      verifiedLbl: 'Verified',
      unfollow: 'Following',
      followers: 'followers',
      followingLbl: 'following',
      posts: 'posts',
      message: 'Message',
      editProfile: 'Edit profile',
      joined: 'Joined {date}',
      'search.title': 'Search',
      'search.placeholder': 'Search people',
      'search.empty': 'No people found.',
      'search.hint': 'Type a name or @username to find people.',
      'who.title': 'Who to follow',
      'msg.title': 'Messages',
      'msg.empty': 'No conversations yet. Visit someone\'s profile and tap "Message".',
      'msg.placeholder': 'Write a message',
      'msg.send': 'Send',
      'msg.you': 'You: ',
      'msg.start': 'Say hi to start the conversation.',
      'settings.title': 'Settings',
      'settings.profile': 'Profile',
      'settings.photo': 'Profile photo',
      'settings.changePhoto': 'Change photo',
      'settings.removePhoto': 'Remove',
      'settings.bio': 'Bio',
      'settings.link': 'Bio link',
      'settings.linkPh': 'yoursite.com',
      'settings.save': 'Save changes',
      'settings.saved': 'Profile updated!',
      'settings.appearance': 'Appearance',
      'settings.language': 'Language',
      'settings.theme': 'Theme',
      'settings.themeDark': 'Dark',
      'settings.themeLight': 'Light',
      'settings.account': 'Account',
      'settings.loggedAs': 'Signed in as {email}',
      'notfound.title': 'Page not found',
      'notfound.text': 'This page does not exist or was moved.',
      'notfound.back': 'Back to home',
      'profile.notfound': "This account doesn't exist",
      'profile.notfoundText': 'Try searching for another username.',
      'footer': '© {year} Bloxter',
      poweredBy: 'Powered by',
      'toggle.theme': 'Toggle theme',
      back: 'Back',
      'err.server': 'Something went wrong. Please try again in a moment.',
      'err.site_closed': 'Bloxter is not open yet. Reserve your name at /acess.',
      'err.verified_offer_closed': 'Get-verified is not available right now.',
      'err.email_domain_invalid': 'The domain was not found or does not accept email.',
      'auth.checkEmail': 'Check email',
      'auth.emailAvailable': 'Valid format, active domain, and address available.',
      'auth.checkEmailFirst': 'Check your email before creating an account.',
      'err.network': 'No connection. Check your internet.',
      'err.api_down': 'Server unavailable: the API did not respond. Check that the api/ folder deployed on Vercel.',
      'err.config_db': 'Database not configured: the DATABASE_URL variable is missing on Vercel, then redeploy.',
      'err.config_jwt': 'The JWT_SECRET variable is missing on Vercel, then redeploy.',
      'err.db_unreachable': 'Could not connect to the database. Check DATABASE_URL.',
      'err.unauthorized': 'Log in to continue.',
      'err.invalid_credentials': 'Incorrect email/username or password.',
      'err.invalid_email': 'Enter a valid email.',
      'err.weak_password': 'Password must have at least 8 characters.',
      'err.invalid_username': 'Invalid username. Use 3 to 20 characters: letters, numbers and _.',
      'err.username_taken': 'That username is already taken.',
      'err.email_taken': 'An account with that email already exists.',
      'err.name_required': 'Enter your name.',
      'err.terms_required': 'To create an account you must accept the Terms of Service.',
      'err.post_empty': 'Write something or add a photo before posting.',
      'err.too_many_images': 'You can attach up to 4 photos per post.',
      'err.invalid_image': "That image can't be used. Use JPG, PNG or WebP.",
      'err.images_too_large': 'The photos are too heavy. Try fewer or smaller photos.',
      'err.message_empty': 'Write a message.',
      'err.invalid_link': 'Invalid link. Use something like https://yoursite.com',
      'err.invalid_avatar': 'Invalid or too large image.',
      'err.not_found': 'Not found.',
      'err.cannot_follow_self': "You can't follow yourself.",
      'err.cannot_message_self': "You can't message yourself.",
      'err.comment_empty': 'Write something before commenting.',
      'err.cannot_repost_self': "You can't repost your own post.",
      'err.rate_limited': "Slow down! You're commenting too fast. Try again in a moment.",
      'err.invalid_post': 'Invalid post.',
      'comment.aria': 'Comment',
      'comment.title': 'Comments',
      'comment.placeholder': 'Write a comment…',
      'comment.send': 'Comment',
      'comment.emptyTitle': 'No comments yet',
      'comment.emptyText': 'Be the first to comment.',
      'comment.confirmDelete': 'Delete this comment?',
      'comment.deleted': 'Comment deleted.',
      'repost.aria': 'Repost',
      'repost.label': 'Reposted',
      'repost.done': 'Post reposted to your profile.',
      'repost.undone': 'Repost removed.',
      'repost.tab': 'Reposts',
      'repost.emptyTitle': 'Nothing reposted yet',
      'repost.emptyText': 'Reposted posts show up here.',
      'profile.postsTab': 'Posts',
      'share.aria': 'Share',
      'share.title': 'Share to story',
      'share.story': 'Share to Instagram',
      'share.download': 'Download image',
      'share.generating': 'Creating image…',
      'share.saved': 'Image saved! Open Instagram and post it to your story.',
      'share.error': 'Could not create the image.',
      'share.dark': 'Dark',
      'share.light': 'Light',
      close: 'Close',
    },
  };

  function t(key, vars) {
    let s = (I18N[state.lang] && I18N[state.lang][key]) ?? I18N.en[key] ?? key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k]);
    return s;
  }
  const errMsg = (e) => {
    const base = t(`err.${e && e.code ? e.code : 'server'}`) + (e && e.code === 'api_down' && e.status ? ` (HTTP ${e.status})` : '');
    return e && e.detail ? `${base} [${e.detail}]` : base;
  };

  function applyLang(lang, rerender = true) {
    state.lang = lang === 'en' ? 'en' : 'pt';
    store.set('bx_lang', state.lang);
    document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en';
    if (rerender) location.reload();
  }
  function applyTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    store.set('bx_theme', state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'light' ? '#ffffff' : '#000000');
    document.querySelectorAll('[data-act="theme"]').forEach((b) => b.setAttribute('aria-label', t('toggle.theme')));
    document.querySelectorAll('.seg-theme button').forEach((b) => b.classList.toggle('on', b.dataset.val === state.theme));
  }

  /* =====================================================
     API
  ===================================================== */
  async function api(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch(`/api/${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
      });
    } catch {
      const e = new Error('network');
      e.code = 'network';
      throw e;
    }
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const e = new Error(data.error || 'server');
      // resposta que não é JSON = a função da API não está rodando (deploy/rota)
      e.code = data.error || (res.status === 404 || res.status >= 500 ? 'api_down' : 'server');
      e.status = res.status;
      if (data.detail) e.detail = data.detail;
      throw e;
    }
    return data;
  }

  /* =====================================================
     Helpers de UI
  ===================================================== */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function openProfileDetails({ user = state.me, onboarding = false } = {}) {
    if (!user || document.getElementById('bx-profile-details')) return;
    if (!document.getElementById('bx-profile-details-style')) {
      const style = document.createElement('style');
      style.id = 'bx-profile-details-style';
      style.textContent = `
        .bx-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:#000b}
        .bx-modal[hidden]{display:none}.bx-modal-card{width:min(100%,520px);max-height:min(90vh,780px);overflow:auto;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:20px;padding:26px;box-shadow:0 24px 90px #0008}
        .bx-modal-card h2{font-size:22px;margin:0 0 8px}.bx-modal-card p{color:var(--fg2);font-size:14px;line-height:1.5;margin:0 0 18px}
        .bx-modal-card label{display:block;font-size:13px;margin:14px 0 6px}.bx-modal-card input,.bx-modal-card select{width:100%;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--fg);font:inherit;padding:12px}
        .bx-modal-card .bx-category-options{display:grid;gap:8px;margin-top:8px}.bx-modal-card .bx-category-option{display:flex;align-items:center;gap:10px;margin:0;padding:11px 12px;border:1px solid var(--line);border-radius:10px;cursor:pointer}.bx-modal-card .bx-category-option input{width:17px;height:17px;margin:0;accent-color:var(--fg)}
        .bx-modal-actions{display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}.bx-modal-status{min-height:20px;color:var(--fg2);font-size:13px;margin-top:10px}.bx-roblox-preview{display:flex;align-items:center;gap:12px;margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:12px}.bx-roblox-preview img{width:56px;height:56px;object-fit:cover;border-radius:50%}
        .bx-danger{color:#e5484d}.bx-modal-card .bx-modal-delete{margin-right:auto}
        @media(max-width:560px){.bx-modal-card{padding:21px}.bx-modal-actions>*{flex:1}.bx-modal-card .bx-modal-delete{margin-right:0}}
      `;
      document.head.appendChild(style);
    }
    const modal = document.createElement('div');
    modal.className = 'bx-modal';
    modal.id = 'bx-profile-details';
    modal.innerHTML = `
      <section class="bx-modal-card" role="dialog" aria-modal="true" aria-labelledby="bx-pref-title">
        <div id="bx-pref-step-details">
          <h2 id="bx-pref-title">Personalize sua experiência</h2>
          <p>Caso não queira realizar esse formulário clique em “Pular” ou, caso não tenha sua categoria, clique em “Outras Categorias”.</p>
          <form id="bx-pref-form">
            <label for="bx-pref-category">Qual sua categoria do roleplay?</label>
            <div class="bx-category-options">
              ${['Artista', 'Influenciador', 'Nenhuma das duas', 'Outras Categorias'].map((v) => `<label class="bx-category-option"><input type="radio" name="bx-pref-category" value="${esc(v)}" ${user.rp_category === v ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}
            </div>
            <label for="bx-pref-instagram">Qual seu Instagram?</label>
            <input id="bx-pref-instagram" type="text" maxlength="100" autocomplete="off" placeholder="@seuusuario" value="${esc(user.instagram || '')}" />
            <div class="bx-modal-status" id="bx-pref-status" role="status"></div>
            <div class="bx-modal-actions">
              ${onboarding ? '<button class="btn ghost" type="button" id="bx-pref-skip">Pular</button>' : '<button class="btn ghost" type="button" id="bx-pref-cancel">Cancelar</button>'}
              ${onboarding ? '' : '<button class="btn ghost bx-modal-delete" type="button" id="bx-pref-delete">Excluir informações</button>'}
              <button class="btn" type="submit">Continuar</button>
            </div>
          </form>
        </div>
        <div id="bx-pref-step-roblox" hidden>
          <h2>Vincule sua conta do Roblox?</h2>
          <p>Informe seu usuário do Roblox para buscar o perfil e a foto. Você confirma o vínculo antes de salvar.</p>
          <label for="bx-roblox-name">Usuário do Roblox</label>
          <input id="bx-roblox-name" type="text" maxlength="20" autocomplete="off" placeholder="Seu usuário no Roblox" value="${esc(user.roblox_username || '')}" />
          <div id="bx-roblox-preview"></div><div class="bx-modal-status" id="bx-roblox-status" role="status"></div>
          <div class="bx-modal-actions">
            ${onboarding ? '<button class="btn ghost" type="button" id="bx-roblox-skip">Agora não</button>' : '<button class="btn ghost" type="button" id="bx-roblox-cancel">Cancelar</button>'}
            ${!onboarding && user.roblox_username ? '<button class="btn ghost bx-modal-delete" type="button" id="bx-roblox-unlink">Desvincular</button>' : ''}
            <button class="btn ghost" type="button" id="bx-roblox-search">Buscar conta</button>
            <button class="btn" type="button" id="bx-roblox-confirm" disabled>Confirmar vínculo</button>
          </div>
        </div>
        <div id="bx-pref-delete-confirm" hidden>
          <h2>Excluir informações do perfil?</h2><p>Categoria, Instagram e vínculo com Roblox serão removidos do seu perfil.</p>
          <div class="bx-modal-status" id="bx-delete-status" role="status"></div><div class="bx-modal-actions"><button class="btn ghost" type="button" id="bx-delete-cancel">Voltar</button><button class="btn bx-danger" type="button" id="bx-delete-confirm">Excluir</button></div>
        </div>
      </section>`;
    document.body.appendChild(modal);
    const $m = (selector) => modal.querySelector(selector);
    const status = (id, text) => { const el = $m(id); if (el) el.textContent = text; };
    const close = () => modal.remove();
    const showRoblox = () => { $m('#bx-pref-step-details').hidden = true; $m('#bx-pref-step-roblox').hidden = false; $m('#bx-roblox-name').focus(); };
    const persistDone = async (extra = {}) => {
      await api('me/preferences', { method: 'PATCH', body: { ...extra, onboarding_done: true } });
      close();
      if (onboarding) location.reload();
      else location.reload();
    };
    $m('#bx-pref-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      status('#bx-pref-status', 'Salvando...');
      try {
        await api('me/preferences', { method: 'PATCH', body: { rp_category: $m('[name="bx-pref-category"]:checked')?.value || '', instagram: $m('#bx-pref-instagram').value } });
        showRoblox();
      } catch (e) { status('#bx-pref-status', e.code === 'invalid_instagram' ? 'Digite apenas o usuário do Instagram.' : 'Não foi possível salvar. Tente novamente.'); }
    });
    $m('#bx-pref-skip')?.addEventListener('click', showRoblox);
    $m('#bx-pref-cancel')?.addEventListener('click', close);
    $m('#bx-roblox-cancel')?.addEventListener('click', () => { close(); if (!onboarding) location.reload(); });
    $m('#bx-roblox-skip')?.addEventListener('click', async () => {
      status('#bx-roblox-status', 'Salvando...');
      try { await persistDone(); } catch { status('#bx-roblox-status', 'Não foi possível concluir agora. Tente novamente.'); }
    });
    $m('#bx-pref-delete')?.addEventListener('click', () => { $m('#bx-pref-step-details').hidden = true; $m('#bx-pref-delete-confirm').hidden = false; });
    $m('#bx-delete-cancel')?.addEventListener('click', () => { $m('#bx-pref-delete-confirm').hidden = true; $m('#bx-pref-step-details').hidden = false; });
    $m('#bx-delete-confirm')?.addEventListener('click', async () => {
      try { await persistDone({ rp_category: '', instagram: '', roblox_username: '' }); }
      catch { status('#bx-delete-status', 'Não foi possível excluir agora. Tente novamente.'); }
    });
    $m('#bx-roblox-search').addEventListener('click', async () => {
      const btn = $m('#bx-roblox-search');
      const name = $m('#bx-roblox-name').value.trim().replace(/^@/, '');
      btn.disabled = true; $m('#bx-roblox-confirm').disabled = true; $m('#bx-roblox-preview').innerHTML = '';
      status('#bx-roblox-status', 'Buscando conta...');
      try {
        const { roblox } = await api(`roblox/lookup?username=${encodeURIComponent(name)}`);
        modal.dataset.robloxUsername = roblox.username;
        $m('#bx-roblox-preview').innerHTML = `<div class="bx-roblox-preview">${roblox.avatar ? `<img src="${esc(roblox.avatar)}" alt="Avatar do Roblox" />` : ''}<b>@${esc(roblox.username)}</b></div>`;
        status('#bx-roblox-status', 'Confira a conta e confirme o vínculo.');
        $m('#bx-roblox-confirm').disabled = false;
      } catch (e) {
        const message = e.code === 'roblox_user_not_found' ? 'Não encontrei esse usuário no Roblox.' : e.code === 'invalid_roblox_username' ? 'Confira o usuário do Roblox.' : 'Não consegui consultar o Roblox agora. Tente novamente.';
        status('#bx-roblox-status', message);
      } finally { btn.disabled = false; }
    });
    $m('#bx-roblox-confirm').addEventListener('click', async () => {
      const btn = $m('#bx-roblox-confirm'); btn.disabled = true; status('#bx-roblox-status', 'Confirmando vínculo...');
      try { await persistDone({ roblox_username: modal.dataset.robloxUsername }); }
      catch { btn.disabled = false; status('#bx-roblox-status', 'Não foi possível salvar o vínculo. Tente novamente.'); }
    });
    $m('#bx-roblox-unlink')?.addEventListener('click', async () => {
      try { await persistDone({ roblox_username: '' }); }
      catch { status('#bx-roblox-status', 'Não foi possível desvincular agora. Tente novamente.'); }
    });
  }

  /* =====================================================
     Introdução de novos usuários (boas-vindas → recursos → foto → bio → formulário)
  ===================================================== */
  const OB_TX = {
    pt: {
      welcome: (n) => `Bem-vindo(a), ${n}.`,
      position: (n) => `Você é o <b>#${n}</b> a entrar no Bloxter.`,
      next: 'Continuar', skip: 'Pular por enquanto', back: 'Voltar',
      features: ['Converse em chats', 'Publique posts', 'Poste storys', 'Personalize seu perfil', 'Crie grupos'],
      startTitle: 'Vamos começar a personalização',
      pickPhoto: 'Colocar foto de Perfil', changePhoto: 'Trocar foto', reframe: 'Reenquadrar',
      cropTitle: 'Ajuste sua foto', cropHint: 'Arraste para mover e use o controle para dar zoom.', cropSave: 'Usar esta foto', cancel: 'Cancelar', saving: 'Salvando...',
      aboutTitle: 'Fale sobre você', aboutSub: 'Você pode editar isso depois nas configurações.',
      aboutPh: 'Conte um pouco sobre você e seu roleplay...', preview: 'Assim aparece no seu perfil', save: 'Salvar e continuar', edit: 'Editar',
      errSave: 'Não foi possível salvar. Tente novamente.', errImg: 'Não foi possível abrir essa imagem.', errBig: 'A imagem ficou grande demais. Tente outra foto.',
    },
    en: {
      welcome: (n) => `Welcome, ${n}.`,
      position: (n) => `You are <b>#${n}</b> to join Bloxter.`,
      next: 'Continue', skip: 'Skip for now', back: 'Back',
      features: ['Chat with people', 'Publish posts', 'Post stories', 'Customize your profile', 'Create groups'],
      startTitle: 'Let’s start personalizing',
      pickPhoto: 'Add profile photo', changePhoto: 'Change photo', reframe: 'Reframe',
      cropTitle: 'Adjust your photo', cropHint: 'Drag to move and use the slider to zoom.', cropSave: 'Use this photo', cancel: 'Cancel', saving: 'Saving...',
      aboutTitle: 'Tell us about you', aboutSub: 'You can edit this later in settings.',
      aboutPh: 'Tell us a bit about you and your roleplay...', preview: 'This is how it shows on your profile', save: 'Save and continue', edit: 'Edit',
      errSave: 'Could not save. Please try again.', errImg: 'Could not open that image.', errBig: 'The image is too large. Try another photo.',
    },
  };

  const OB_ICONS = [
    '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="4"/>',
    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 14.2c3 0 5.5 1.8 5.5 5"/>',
  ];

  function openOnboarding(user) {
    if (!user || document.getElementById('bx-onboarding')) return;
    const T = OB_TX[state.lang] || OB_TX.pt;
    if (!document.getElementById('bx-onboarding-style')) {
      const style = document.createElement('style');
      style.id = 'bx-onboarding-style';
      style.textContent = `
        .bx-ob{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);overflow:auto}
        .bx-ob-stage{width:min(100%,440px);text-align:center;animation:bxObIn .45s ease both}
        @keyframes bxObIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .bx-ob h1{font-size:30px;line-height:1.2;margin:0 0 12px;overflow-wrap:anywhere}
        .bx-ob h2{font-size:24px;line-height:1.25;margin:0 0 10px}
        .bx-ob p{color:var(--fg2);font-size:15px;line-height:1.5;margin:0}
        .bx-ob p b{color:var(--fg)}
        .bx-ob-feats{list-style:none;margin:0 0 30px;padding:0;display:grid;gap:10px;text-align:left}
        .bx-ob-feats li{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--card);font-weight:500;opacity:0;animation:bxObIn .45s ease forwards}
        .bx-ob-feats svg{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .bx-ob-actions{display:grid;gap:10px;margin-top:26px}
        .bx-ob-actions .btn{width:100%}
        .bx-ob-av{width:168px;height:168px;border-radius:50%;margin:26px auto 0;overflow:hidden;display:grid;place-items:center;background:var(--card);border:1px solid var(--line);font-size:64px;font-weight:600;color:var(--fg2)}
        .bx-ob-av img{width:100%;height:100%;object-fit:cover;display:block}
        .bx-ob-crop{position:relative;width:min(100%,280px);aspect-ratio:1;margin:22px auto 14px;border-radius:50%;overflow:hidden;border:1px solid var(--line);touch-action:none;cursor:grab;background:var(--card)}
        .bx-ob-crop:active{cursor:grabbing}.bx-ob-crop canvas{width:100%;height:100%;display:block}
        .bx-ob-zoom{width:min(100%,280px);accent-color:var(--fg)}
        .bx-ob textarea{width:100%;min-height:110px;resize:vertical;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--fg);font:inherit;padding:12px;margin-top:18px;text-align:left}
        .bx-ob-count{font-size:12px;color:var(--fg2);text-align:right;margin-top:4px}
        .bx-ob-prev{display:flex;gap:12px;align-items:flex-start;text-align:left;margin-top:16px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--card)}
        .bx-ob-prev .pav{width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;border:1px solid var(--line);font-weight:600}
        .bx-ob-prev .pav img{width:100%;height:100%;object-fit:cover}
        .bx-ob-prev small{display:block;color:var(--fg2);font-size:11px;margin-bottom:6px}
        .bx-ob-prev .pb{font-size:14px;line-height:1.45;overflow-wrap:anywhere;white-space:pre-wrap}
        .bx-ob-prev .pb.empty{color:var(--fg2)}
        .bx-ob-err{min-height:20px;color:#e5484d;font-size:13px;margin-top:10px}
        .bx-ob-dots{display:flex;gap:6px;justify-content:center;margin-top:30px}
        .bx-ob-dots i{width:7px;height:7px;border-radius:50%;background:var(--line)}.bx-ob-dots i.on{background:var(--fg)}
        @media (prefers-reduced-motion:reduce){.bx-ob-stage,.bx-ob-feats li{animation:none;opacity:1}}
      `;
      document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.className = 'bx-ob';
    overlay.id = 'bx-onboarding';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    document.body.appendChild(overlay);

    const cfg = { show_position: true, show_questions: true, position: 0 };
    let order = ['welcome', 'features', 'photo', 'about'];
    let idx = 0;
    let avatarData = user.avatar || '';
    let bioText = user.bio || '';
    let srcImg = null; // imagem original, para reenquadrar

    const dots = () => `<div class="bx-ob-dots" aria-hidden="true">${order.map((_, i) => `<i class="${i === idx ? 'on' : ''}"></i>`).join('')}</div>`;
    const stage = (html) => { overlay.innerHTML = `<div class="bx-ob-stage">${html}${dots()}</div>`; overlay.scrollTop = 0; };
    const nextStep = () => { idx += 1; if (idx >= order.length) return finish(); render(); };

    // Termina: abre o formulário (se a administração deixou ligado) ou conclui direto.
    async function finish() {
      if (cfg.show_questions) {
        overlay.remove();
        openProfileDetails({ user: { ...user, avatar: avatarData, bio: bioText }, onboarding: true });
        return;
      }
      try { await api('me/preferences', { method: 'PATCH', body: { onboarding_done: true } }); } catch { /* tenta de novo no próximo acesso */ }
      overlay.remove();
      location.reload();
    }

    const avatarInner = () => (avatarData ? `<img src="${esc(avatarData)}" alt="" />` : esc((user.name || user.username || '?').trim().charAt(0).toUpperCase()));

    const steps = {
      welcome() {
        const name = (user.name || user.username || '').trim();
        stage(`<h1>${esc(T.welcome(name))}</h1>
          ${cfg.show_position && cfg.position > 0 ? `<p>${T.position(cfg.position)}</p>` : ''}
          <div class="bx-ob-actions"><button class="btn" type="button" id="ob-next">${T.next}</button></div>`);
        overlay.querySelector('#ob-next').addEventListener('click', nextStep);
      },
      features() {
        stage(`<ul class="bx-ob-feats">${T.features.map((f, i) => `<li style="animation-delay:${i * 110}ms"><svg viewBox="0 0 24 24" aria-hidden="true">${OB_ICONS[i]}</svg><span>${esc(f)}</span></li>`).join('')}</ul>
          <div class="bx-ob-actions"><button class="btn" type="button" id="ob-next">${T.next}</button></div>`);
        overlay.querySelector('#ob-next').addEventListener('click', nextStep);
      },
      photo() {
        const has = !!avatarData;
        stage(`<h2>${esc(T.startTitle)}</h2>
          <div class="bx-ob-av" id="ob-av">${avatarInner()}</div>
          <div class="bx-ob-actions">
            ${has
              ? `<button class="btn" type="button" id="ob-next">${T.next}</button>
                 ${srcImg ? `<button class="btn ghost" type="button" id="ob-reframe">${T.reframe}</button>` : ''}
                 <button class="btn ghost" type="button" id="ob-pick">${T.changePhoto}</button>`
              : `<button class="btn" type="button" id="ob-pick">${T.pickPhoto}</button>
                 <button class="btn ghost" type="button" id="ob-skip">${T.skip}</button>`}
          </div>
          <div class="bx-ob-err" id="ob-err" role="alert"></div>
          <input type="file" id="ob-file" accept="image/png,image/jpeg,image/webp" hidden />`);
        const file = overlay.querySelector('#ob-file');
        overlay.querySelector('#ob-pick').addEventListener('click', () => file.click());
        overlay.querySelector('#ob-next')?.addEventListener('click', nextStep);
        overlay.querySelector('#ob-skip')?.addEventListener('click', nextStep);
        overlay.querySelector('#ob-reframe')?.addEventListener('click', () => crop(srcImg));
        file.addEventListener('change', () => {
          const f = file.files && file.files[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          const img = new Image();
          img.onload = () => { srcImg = img; crop(img); };
          img.onerror = () => { URL.revokeObjectURL(url); overlay.querySelector('#ob-err').textContent = T.errImg; };
          img.src = url;
        });
      },
      about() {
        const draw = () => {
          const holder = overlay.querySelector('#ob-prev-body');
          holder.textContent = bioText.trim() || '—';
          holder.classList.toggle('empty', !bioText.trim());
        };
        stage(`<h2>${esc(T.aboutTitle)}</h2><p>${esc(T.aboutSub)}</p>
          <textarea id="ob-bio" maxlength="160" placeholder="${esc(T.aboutPh)}">${esc(bioText)}</textarea>
          <div class="bx-ob-count" id="ob-count"></div>
          <div class="bx-ob-prev"><span class="pav">${avatarInner()}</span><div style="min-width:0"><small>${esc(T.preview)}</small><b>${esc(user.name || '')}</b> <span style="color:var(--fg2);font-size:13px">@${esc(user.username || '')}</span><div class="pb" id="ob-prev-body"></div></div></div>
          <div class="bx-ob-err" id="ob-err" role="alert"></div>
          <div class="bx-ob-actions">
            <button class="btn" type="button" id="ob-save">${T.save}</button>
            <button class="btn ghost" type="button" id="ob-skip">${T.skip}</button>
          </div>`);
        const ta = overlay.querySelector('#ob-bio');
        const count = overlay.querySelector('#ob-count');
        const sync = () => { bioText = ta.value; count.textContent = `${ta.value.length}/160`; draw(); };
        ta.addEventListener('input', sync);
        sync();
        overlay.querySelector('#ob-skip').addEventListener('click', nextStep);
        overlay.querySelector('#ob-save').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          const value = ta.value.trim();
          if (value === (user.bio || '').trim()) { nextStep(); return; }
          btn.disabled = true; btn.textContent = T.saving;
          try {
            const { user: u } = await api('me', { method: 'PATCH', body: { bio: value } });
            user = { ...user, bio: u.bio };
            state.me = u;
            nextStep();
          } catch { overlay.querySelector('#ob-err').textContent = T.errSave; btn.disabled = false; btn.textContent = T.save; }
        });
      },
    };

    // Reenquadramento: arrastar + zoom, recorte quadrado de 256px (exibido em círculo).
    function crop(img) {
      const SIZE = 256;
      stage(`<h2>${esc(T.cropTitle)}</h2><p>${esc(T.cropHint)}</p>
        <div class="bx-ob-crop" id="ob-crop"><canvas width="${SIZE}" height="${SIZE}"></canvas></div>
        <input class="bx-ob-zoom" id="ob-zoom" type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom" />
        <div class="bx-ob-err" id="ob-err" role="alert"></div>
        <div class="bx-ob-actions">
          <button class="btn" type="button" id="ob-use">${T.cropSave}</button>
          <button class="btn ghost" type="button" id="ob-cancel">${T.cancel}</button>
        </div>`);
      const box = overlay.querySelector('#ob-crop');
      const cv = box.querySelector('canvas');
      const ctx = cv.getContext('2d');
      const base = Math.max(SIZE / img.width, SIZE / img.height);
      let zoom = 1, ox = 0, oy = 0; // ox/oy = deslocamento do centro da imagem
      const clamp = () => {
        const w = img.width * base * zoom, h = img.height * base * zoom;
        ox = Math.max(-(w - SIZE) / 2, Math.min((w - SIZE) / 2, ox));
        oy = Math.max(-(h - SIZE) / 2, Math.min((h - SIZE) / 2, oy));
      };
      const draw = () => {
        clamp();
        const w = img.width * base * zoom, h = img.height * base * zoom;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.drawImage(img, (SIZE - w) / 2 + ox, (SIZE - h) / 2 + oy, w, h);
      };
      draw();
      let drag = null;
      box.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; box.setPointerCapture(e.pointerId); });
      box.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const k = SIZE / box.getBoundingClientRect().width;
        ox += (e.clientX - drag.x) * k; oy += (e.clientY - drag.y) * k;
        drag = { x: e.clientX, y: e.clientY };
        draw();
      });
      const stop = () => { drag = null; };
      box.addEventListener('pointerup', stop);
      box.addEventListener('pointercancel', stop);
      overlay.querySelector('#ob-zoom').addEventListener('input', (e) => { zoom = Number(e.target.value); draw(); });
      overlay.querySelector('#ob-cancel').addEventListener('click', render);
      overlay.querySelector('#ob-use').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const data = cv.toDataURL('image/jpeg', 0.86);
        if (data.length > 290000) { overlay.querySelector('#ob-err').textContent = T.errBig; return; }
        btn.disabled = true; btn.textContent = T.saving;
        try {
          const { user: u } = await api('me', { method: 'PATCH', body: { avatar: data } });
          avatarData = u.avatar || data;
          state.me = u;
          user = { ...user, avatar: u.avatar };
          render();
        } catch { overlay.querySelector('#ob-err').textContent = T.errSave; btn.disabled = false; btn.textContent = T.cropSave; }
      });
    }

    function render() { steps[order[idx]](); }

    (async () => {
      try { Object.assign(cfg, await api('me/onboarding')); } catch { /* usa o padrão: tudo ligado */ }
      render();
    })();
  }

  const ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    cog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 9"/></svg>',
    userplus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.1-6.5 7-6.5s7 2.5 7 6.5"/><path d="M19 8v6M16 11h6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 20.5l1.6-5A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  };

  function avatar(u, cls = '') {
    const initial = esc((u.name || u.username || '?').trim().charAt(0));
    return `<span class="av ${cls}">${u.avatar ? `<img src="${esc(u.avatar)}" alt="" loading="lazy" />` : initial}</span>`;
  }

  function ago(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return t('time.now');
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return new Date(d).toLocaleDateString(state.lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' });
  }
  const hhmm = (d) =>
    new Date(d).toLocaleTimeString(state.lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  // Páginas que quem tem PageUP pode mencionar com *chave (ex.: *home).
  const PAGEUP_PAGES = [
    { key: 'home', label: 'Home', path: '/home' },
    { key: 'search', label: 'Pesquisar', path: '/search' },
    { key: 'messages', label: 'Mensagens', path: '/messages' },
    { key: 'settings', label: 'Configurações', path: '/settings' },
    { key: 'ajuda', label: 'Ajuda', path: '/support' },
    { key: 'blog', label: 'Blog', path: '/blog' },
    { key: 'app', label: 'Aplicativo', path: '/app' },
    { key: 'developers', label: 'Bloxter for Developers', path: '/developers.html' },
    { key: 'eleicoes', label: 'Diretrizes Eleitorais', path: '/election-rules' },
    { key: 'termos', label: 'Termos de Serviço', path: '/terms' },
    { key: 'privacidade', label: 'Privacidade', path: '/privacy' },
    { key: 'parental', label: 'Termos Parentais', path: '/parental' },
    { key: 'seguranca', label: 'Segurança', path: '/safety' },
    { key: 'atendimento', label: 'Atendimento', path: '/support-terms' },
    { key: 'conduta', label: 'Conduta da Comunidade', path: '/conduct' },
    { key: 'regras', label: 'Regras da Comunidade', path: '/rules' },
  ];

  function fmt(text, opts) {
    let s = esc(text);
    if (opts && opts.pageup) {
      s = s.replace(/(^|[\s(>])\*([a-z0-9_-]{2,30})(?![\w-])/gi, (m, p, key) => {
        const pg = PAGEUP_PAGES.find((x) => x.key === key.toLowerCase());
        return pg ? `${p}<a class="pageup-link" href="${pg.path}">*${esc(pg.label)}</a>` : m;
      });
    }
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>');
    s = s.replace(/(^|[\s(])@([a-zA-Z0-9_]{3,20})\b/g, (m, p, u) => `${p}<a href="/account?u=${encodeURIComponent(u.toLowerCase())}">@${u}</a>`);
    s = s.replace(/(^|[\s(>])#([\p{L}\p{N}_]{1,50})/gu, (m, p, tag) => `${p}<a class="hashtag" href="/search?q=${encodeURIComponent('#' + tag.toLowerCase())}">#${tag}</a>`);
    return s.replace(/\n/g, '<br>');
  }

  // Use a query parameter instead of a nested static route: /account is a
  // real static alias on Vercel, while /account/:username may 404 on deploys.
  const accountPath = (u) => `/account?u=${encodeURIComponent(u)}`;

  function langToggle() {
    return `<div class="pill-toggle" role="group" aria-label="Language">
      <button data-act="lang" data-val="pt" class="${state.lang === 'pt' ? 'on' : ''}">PT</button>
      <button data-act="lang" data-val="en" class="${state.lang === 'en' ? 'on' : ''}">EN</button>
    </div>`;
  }
  function themeToggle() {
    return `<button class="icon-btn" data-act="theme" aria-label="${esc(t('toggle.theme'))}" title="${esc(t('toggle.theme'))}">${state.theme === 'dark' ? ICON.sun : ICON.moon}</button>`;
  }
  const toggles = () => `<div class="toggles">${langToggle()}${themeToggle()}</div>`;

  function setTitle(s) {
    document.title = s || 'Bloxter';
  }
  function clearTimers() {
    state.timers.forEach(clearInterval);
    state.timers = [];
  }

  /* =====================================================
     Navegação (cada página é um arquivo HTML de verdade)
  ===================================================== */
  function go(path, replace = false) {
    if (replace) location.replace(path);
    else location.href = path;
  }

  // Destino depois do login (?next=/rota). Só aceita caminhos internos.
  function safeNext() {
    const n = new URLSearchParams(location.search).get('next');
    if (!n || n[0] !== '/' || n.startsWith('//') || /^\/(login|signup)(\/|\?|$)/.test(n)) return null;
    return n;
  }

  /* =====================================================
     Shells
  ===================================================== */
  function publicShell() {
    state.shell = 'public';
    root.innerHTML = `
      <div class="pub">
        <header class="pub-head">
          <a href="/" aria-label="Bloxter"><img class="symbol-img" src="/symbol.png" alt="Bloxter" /></a>
          <span class="powered"><span data-t="poweredBy">${t('poweredBy')}</span><i class="powered-logo" role="img" aria-label="Logotipo"></i></span>
          <div class="pub-actions">
            ${state.me ? '' : `<a class="btn ghost sm" href="/login">${t('login')}</a>`}
          </div>
        </header>
        <main class="pub-main" id="view"></main>
        <footer class="pub-foot" style="flex-direction:column;align-items:center"><nav class="foot-legal" aria-label="Termos e regras"><a href="/terms">Termos de Serviço</a><a href="/privacy">Privacidade</a><a href="/parental">Termos Parentais</a><a href="/safety">Segurança</a><a href="/support-terms">Atendimento</a><a href="/conduct">Conduta</a><a href="/rules">Regras da Comunidade</a><a href="/election-rules">Diretrizes Eleitorais</a></nav><span class="powered powered-foot"><span data-t="poweredBy">${t('poweredBy')}</span><i class="powered-logo" role="img" aria-label="Logotipo"></i></span><span>${t('footer', { year: new Date().getFullYear() })} · From Ticord</span></footer>
      </div>`;
    return $('#view');
  }

  function appShell() {
    const mine = accountPath(state.me.username);
    if (state.shell === 'app' && $('#view') && $('.side')) {
      $('.side .me-card').setAttribute('href', mine);
      $('.side [data-nav="profile"]').setAttribute('href', mine);
      $('.tabbar [data-nav="profile"]').setAttribute('href', mine);
      refreshShellText();
      return;
    }
    state.shell = 'app';
    root.innerHTML = `
      <div class="topbar">
        <a href="/home" aria-label="Bloxter">${`<img class="symbol-img" src="/symbol.png" alt="Bloxter" />`}</a>
      </div>
      <div class="shell">
        <aside class="side">
          <a class="brand" href="/home" aria-label="Bloxter"><img class="symbol-img" src="/symbol.png" alt="Bloxter" /></a>
          <nav class="nav">
            <a href="/home" data-nav="home">${ICON.home}<span class="lbl" data-t="nav.home"></span></a>
            <a href="/search" data-nav="search">${ICON.search}<span class="lbl" data-t="nav.search"></span></a>
            <a href="/notifications" data-nav="notifications">${ICON.bell}<span class="lbl" data-t="nav.notifications"></span><span class="badge" data-badge-notif></span></a>
            <a href="/messages" data-nav="messages">${ICON.msg}<span class="lbl" data-t="nav.messages"></span><span class="badge" data-badge></span></a>
            <a href="${esc(mine)}" data-nav="profile">${ICON.user}<span class="lbl" data-t="nav.profile"></span></a>
            <a href="/settings" data-nav="settings">${ICON.cog}<span class="lbl" data-t="nav.settings"></span></a>
          </nav>
          <a class="btn lg block post-btn" href="/home" data-act="postnow"><span class="lbl" data-t="post"></span></a>
          <a class="me-card" href="${esc(mine)}">
            <span data-me-avatar></span>
            <span class="meta"><b data-me-name></b><span data-me-user></span></span>
          </a>
        </aside>
        <main class="main" id="view"></main>
        <aside class="right">
          <form class="search-form" data-form="sidesearch" role="search">
            <input type="search" name="q" data-ph="search.placeholder" autocomplete="off" />
          </form>
          <div class="box"><h3 data-t="who.title"></h3><div id="suggest"></div></div>
          <div class="foot">
            <button class="btn ghost sm" data-act="logout">${ICON.out}<span data-t="logout"></span></button>
          </div>
        </aside>
      </div>
      <footer class="app-footer"><span>${t('footer', { year: new Date().getFullYear() })}</span><a href="/developers.html">Bloxter for Developers</a><a href="/support">Ajuda</a><a href="/app">Aplicativo</a><a href="/settings#accessibility">Acessibilidade</a><a href="/terms">Termos de Serviço</a><a href="/privacy">Privacidade</a><a href="/parental">Termos Parentais</a><a href="/safety">Segurança</a><a href="/support-terms">Atendimento</a><a href="/conduct">Conduta</a><a href="/rules">Regras da Comunidade</a><a href="/election-rules">Diretrizes Eleitorais</a><span>From Ticord</span></footer>
      <a class="mobile-compose" href="/home" data-act="postnow" aria-label="Criar publicação"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></a>
      <nav class="tabbar">
        <a href="/home" data-nav="home" aria-label="Home">${ICON.home}</a>
        <a href="/search" data-nav="search" aria-label="Search">${ICON.search}</a>
        <button type="button" data-act="menu" data-nav="menu" aria-label="${esc(t('nav.menu'))}" aria-haspopup="true" aria-expanded="false">${ICON.menu}<span class="badge" data-badge-menu></span></button>
        <a href="${esc(mine)}" data-nav="profile" aria-label="Profile">${ICON.user}</a>
        <a href="/settings" data-nav="settings" aria-label="Settings">${ICON.cog}</a>
      </nav>
      <div class="menu-pop" id="menu-pop" hidden role="menu">
        <a href="/notifications" data-nav="notifications" role="menuitem">${ICON.bell}<span data-t="nav.notifications"></span><span class="badge" data-badge-notif></span></a>
        <a href="/messages" data-nav="messages" role="menuitem">${ICON.msg}<span data-t="nav.conversations"></span><span class="badge" data-badge></span></a>
      </div>`;
    refreshShellText();
    loadSuggestions();
    updateBadge();
  }

  function refreshShellText() {
    root.querySelectorAll('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t)));
    root.querySelectorAll('[data-ph]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.ph)));
    const av = $('[data-me-avatar]');
    if (av) av.innerHTML = avatar(state.me);
    const n = $('[data-me-name]');
    if (n) n.textContent = state.me.name;
    const u = $('[data-me-user]');
    if (u) u.textContent = `@${state.me.username}`;
  }

  function setActiveNav(name) {
    // No celular, "messages" e "notifications" ficam dentro do menu hambúrguer.
    root.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name || (a.dataset.nav === 'menu' && (name === 'messages' || name === 'notifications'))));
    root.querySelectorAll('.menu-pop a[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  }

  function updateBadge() {
    const fill = (sel, n) => document.querySelectorAll(sel).forEach((b) => {
      b.textContent = n > 99 ? '99+' : String(n);
      b.classList.toggle('show', n > 0);
    });
    const un = state.unreadNotif || 0;
    fill('[data-badge]', state.unread);
    fill('[data-badge-notif]', un);
    fill('[data-badge-menu]', state.unread + un);
  }
  async function pollUnread() {
    if (!state.me) return;
    try {
      const { count, notifications } = await api('unread');
      state.unread = count;
      state.unreadNotif = notifications || 0;
      updateBadge();
    } catch { /* ignore */ }
  }
  setInterval(pollUnread, 20000);

  async function loadSuggestions() {
    const box = $('#suggest');
    if (!box) return;
    try {
      const { users } = await api('suggestions');
      box.innerHTML = users.length
        ? users.map((u) => userRow(u, { compact: true })).join('')
        : `<p class="small" style="color:var(--fg2)">—</p>`;
    } catch { /* ignore */ }
  }

  const VERIFIED_SVG = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M22.5 12.5l-2.3-2.6.3-3.5-3.4-.8-1.8-3-3.3 1.4-3.3-1.4-1.8 3-3.4.8.3 3.5L1.5 12.5l2.3 2.6-.3 3.5 3.4.8 1.8 3 3.3-1.4 3.3 1.4 1.8-3 3.4-.8-.3-3.5z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7.8 12.4l3 3 5.6-6"/></svg>';
  function badges(u) {
    if (!u) return '';
    return (u.verified ? `<span class="vbadge" title="${esc(t('verifiedLbl'))}" aria-label="${esc(t('verifiedLbl'))}">${VERIFIED_SVG}</span>` : '')
      + (u.is_ai ? '<span class="aitag" title="IA">IA</span>' : '');
  }
  function followLabel(u) {
    return u.is_following ? t('unfollow') : (u.follows_me ? t('followBack') : t('follow'));
  }

  function userRow(u, { compact = false } = {}) {
    return `<div class="urow">
      <a href="${accountPath(u.username)}">${avatar(u)}</a>
      <div class="info"><a href="${accountPath(u.username)}"><b>${esc(u.name)}${badges(u)}</b><span>@${esc(u.username)}</span></a></div>
      ${u.is_me ? '' : `<button class="btn sm ${u.is_following ? 'ghost' : ''}" data-act="follow" data-user="${esc(u.username)}" data-fm="${u.follows_me ? 1 : ''}">${followLabel(u)}</button>`}
    </div>`;
  }


  function usernameChecker(input, hint, { selfName } = {}) {
    let seq = 0;
    const run = debounce(async () => {
      const val = input.value.trim().replace(/^@/, '').toLowerCase();
      const my = ++seq;
      if (!val) { hint.className = 'hint'; hint.textContent = t('user.hint'); return; }
      if (selfName && val === selfName) { hint.className = 'hint ok'; hint.textContent = ''; return; }
      if (!/^[a-z0-9_]{3,20}$/.test(val)) { hint.className = 'hint bad'; hint.textContent = t('user.invalid'); return; }
      hint.className = 'hint'; hint.textContent = t('user.checking');
      try {
        const r = await api(`username-available?u=${encodeURIComponent(val)}`);
        if (my !== seq) return;
        if (r.available) { hint.className = 'hint ok'; hint.textContent = `✓ ${t('user.available')}`; }
        else { hint.className = 'hint bad'; hint.textContent = r.reason === 'invalid_username' ? t('user.invalid') : t('user.taken'); }
      } catch { if (my === seq) { hint.className = 'hint'; hint.textContent = ''; } }
    }, 350);
    input.addEventListener('input', run);
  }

  const forms = {
    sidesearch(f) {
      const q = f.q.value.trim();
      go(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    },
  };

  const postCache = new Map(); // id -> post, usado pelos botões (comentar, compartilhar)

  function imagesHTML(images) {
    const list = Array.isArray(images) ? images.slice(0, 4) : [];
    if (!list.length) return '';
    return `<div class="post-imgs n${list.length}">${list.map((src, i) => `<button type="button" class="post-img" data-act="viewimg" data-src="${esc(src)}" data-i="${i}" aria-label="Ver foto ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" /></button>`).join('')}</div>`;
  }

  function postHTML(p) {
    postCache.set(p.id, p);
    return `<article class="post ${p.sponsored ? 'post-sponsored' : ''} ${p.pinned ? 'post-pinned' : ''}" data-post="${p.id}">
      ${p.pinned ? '<span class="pin-badge" role="img" aria-label="Publicação fixada"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg></span>' : ''}
      ${p.sponsored ? '<div class="sponsored-ribbon" aria-label="Publicação patrocinada"><span>Patrocinado</span></div>' : ''}
      <a href="${accountPath(p.user.username)}">${avatar(p.user)}</a>
      <div class="body">
        ${p.repost_at ? `<div class="repost-label">${ICON.repost}<span>${esc(t('repost.label'))} · ${ago(p.repost_at)}</span></div>` : ''}
        <div class="top">
          <a href="${accountPath(p.user.username)}"><b>${esc(p.user.name)}</b>${badges(p.user)}</a>
          <a class="u" href="${accountPath(p.user.username)}">@${esc(p.user.username)}</a>
          <span class="t">· ${ago(p.created_at)}</span>
          ${!p.mine && p.user && !p.user.following && document.body.dataset.page !== 'profile' ? `<button type="button" class="post-follow" data-act="follow" data-user="${esc(p.user.username)}" data-post="${p.id}">${esc(t('follow'))}</button>` : ''}
        </div>
        ${p.body ? `<div class="text">${fmt(p.body, { pageup: !!(p.user && p.user.pageup) })}</div>` : ''}
        ${imagesHTML(p.images)}
        <div class="acts">
          <button class="act" data-act="comment" data-id="${p.id}" aria-label="${esc(t('comment.aria'))}">${ICON.comment}<span>${p.comments || ''}</span></button>
          ${p.mine
            ? (p.reposts ? `<span class="act static" aria-label="${esc(t('repost.aria'))}">${ICON.repost}<span>${p.reposts}</span></span>` : '')
            : `<button class="act ${p.reposted ? 'reposted' : ''}" data-act="repost" data-id="${p.id}" aria-label="${esc(t('repost.aria'))}">${ICON.repost}<span>${p.reposts || ''}</span></button>`}
          <button class="act ${p.liked ? 'liked' : ''}" data-act="like" data-id="${p.id}" aria-label="${esc(t('like'))}">${ICON.heart}<span>${p.likes || ''}</span></button>
          <button class="act" data-act="share" data-id="${p.id}" aria-label="${esc(t('share.aria'))}">${ICON.share}</button>
          ${p.mine ? `<button class="act" data-act="del" data-id="${p.id}" aria-label="${esc(t('delete'))}">${ICON.trash}</button>` : ''}
        </div>
      </div>
    </article>`;
  }

  function loadMoreBtn(show) {
    return show ? `<div class="more"><button class="btn ghost" data-act="more">${t('loadMore')}</button></div>` : '';
  }

  const feed = { endpoint: '', cursor: null, emptyHTML: '' };

  async function loadPosts(reset) {
    const list = $('#posts');
    const more = $('#more');
    if (!list) return;
    if (reset) { feed.cursor = null; list.innerHTML = `<div class="loading">${t('loading')}</div>`; more.innerHTML = ''; }
    try {
      const sep = feed.endpoint.includes('?') ? '&' : '?';
      const data = await api(`${feed.endpoint}${feed.cursor ? `${sep}before=${feed.cursor}` : ''}`);
      if (reset) list.innerHTML = '';
      if (reset) {
        const pinned = data.pinned_posts || [];
        const promoted = data.promoted_posts || [];
        if (!data.posts.length && !promoted.length && !pinned.length) list.innerHTML = feed.emptyHTML;
        else if (pinned.length || promoted.length) list.insertAdjacentHTML('beforeend', pinned.concat(promoted).map(postHTML).join(''));
      }
      list.insertAdjacentHTML('beforeend', data.posts.map(postHTML).join(''));
      // Republicados pagina pelo id da republicação (next_cursor); os demais, pelo id do post.
      if (data.posts.length) feed.cursor = data.next_cursor != null ? data.next_cursor : data.posts[data.posts.length - 1].id;
      more.innerHTML = loadMoreBtn(data.more);
    } catch (e) {
      if (reset) list.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`;
      else toast(errMsg(e));
    }
  }

  function setFeed() {
    feed.endpoint = `feed?tab=${state.feedTab}`;
    feed.emptyHTML = `<div class="empty"><b>${t('home.emptyTitle')}</b>${state.feedTab === 'following' ? t('home.emptyFollowing') : t('home.emptyText')}</div>`;
  }

  /* =====================================================
     Comentários, republicar e compartilhar no story
  ===================================================== */
  function setCount(id, kind, n) {
    document.querySelectorAll(`[data-post="${id}"] [data-act="${kind}"] span, [data-post="${id}"] .act.static span`).forEach((el) => { el.textContent = n || ''; });
    const p = postCache.get(Number(id));
    if (p) p[kind === 'comment' ? 'comments' : 'reposts'] = n;
  }

  // Janela genérica (folha embaixo no celular, centralizada no computador).
  function openSheet(title) {
    const wrap = document.createElement('div');
    wrap.className = 'bx-sheet';
    wrap.innerHTML = `<section class="bx-sheet-card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="bx-sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-sheet-close aria-label="${esc(t('close'))}">✕</button></header>
      <div class="bx-sheet-body"></div></section>`;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    function close() {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      wrap.remove();
    }
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-sheet-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    return { wrap, body: $('.bx-sheet-body', wrap), close };
  }

  function commentHTML(c) {
    return `<div class="cm" data-cm="${c.id}">
      <a href="${accountPath(c.user.username)}">${avatar(c.user)}</a>
      <div class="cm-main">
        <div class="top"><a href="${accountPath(c.user.username)}"><b>${esc(c.user.name)}</b>${badges(c.user)}</a>
          <a class="u" href="${accountPath(c.user.username)}">@${esc(c.user.username)}</a><span class="t">· ${ago(c.created_at)}</span></div>
        <div class="text">${fmt(c.body, { pageup: !!c.user.pageup })}</div>
      </div>
      ${c.can_delete ? `<button type="button" class="act" data-cm-del="${c.id}" aria-label="${esc(t('delete'))}">${ICON.trash}</button>` : ''}
    </div>`;
  }

  function openComments(id) {
    const p = postCache.get(id);
    if (!p) return;
    const sheet = openSheet(t('comment.title'));
    sheet.body.innerHTML = `
      <div class="cm-post">${avatar(p.user)}<div><div class="top"><b>${esc(p.user.name)}</b>${badges(p.user)} <span class="u">@${esc(p.user.username)}</span></div>
        ${p.body ? `<div class="text">${fmt(p.body, { pageup: !!p.user.pageup })}</div>` : ''}${imagesHTML(p.images)}</div></div>
      <div class="cm-list" id="cm-list"><div class="loading">${t('loading')}</div></div>
      <div class="cm-more"></div>
      <form class="cm-form">
        ${avatar(state.me)}
        <div class="cm-box"><textarea rows="1" maxlength="500" placeholder="${esc(t('comment.placeholder'))}"></textarea>
          <div class="cm-row"><span class="counter">500</span><button class="btn sm" type="submit" disabled>${t('comment.send')}</button></div></div>
      </form>`;
    const list = $('#cm-list', sheet.wrap), more = $('.cm-more', sheet.wrap), form = $('.cm-form', sheet.wrap);
    const ta = $('textarea', form), btn = $('button', form), counter = $('.counter', form);
    let after = 0, total = 0;
    const emptyHTML = () => `<div class="empty"><b>${t('comment.emptyTitle')}</b>${t('comment.emptyText')}</div>`;

    async function load(first) {
      try {
        const data = await api(`posts/${id}/comments${after ? `?after=${after}` : ''}`);
        if (first) list.innerHTML = '';
        total = data.total;
        if (first && !data.comments.length) list.innerHTML = emptyHTML();
        else list.insertAdjacentHTML('beforeend', data.comments.map(commentHTML).join(''));
        if (data.comments.length) after = data.next_after;
        more.innerHTML = data.more ? `<button type="button" class="btn ghost sm" data-cm-more>${t('loadMore')}</button>` : '';
        setCount(id, 'comment', total);
      } catch (e) {
        if (first) list.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`; else toast(errMsg(e));
      }
    }
    load(true);

    sheet.wrap.addEventListener('click', async (e) => {
      if (e.target.closest('[data-cm-more]')) { load(false); return; }
      const del = e.target.closest('[data-cm-del]');
      if (!del) return;
      if (!confirm(t('comment.confirmDelete'))) return;
      try {
        const r = await api(`posts/${id}/comments/${del.dataset.cmDel}`, { method: 'DELETE' });
        del.closest('.cm').remove();
        total = r.total;
        setCount(id, 'comment', total);
        if (!list.querySelector('.cm')) list.innerHTML = emptyHTML();
        toast(t('comment.deleted'));
      } catch (err) { toast(errMsg(err)); }
    });
    ta.addEventListener('input', () => {
      const left = 500 - ta.value.length;
      counter.textContent = left;
      counter.classList.toggle('warn', left < 40);
      btn.disabled = !ta.value.trim();
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    });
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') form.requestSubmit(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = ta.value.trim();
      if (!body) return;
      btn.disabled = true;
      try {
        const r = await api(`posts/${id}/comments`, { method: 'POST', body: { body } });
        if (list.querySelector('.empty')) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', commentHTML(r.comment));
        list.lastElementChild.scrollIntoView({ block: 'nearest' });
        ta.value = ''; ta.style.height = 'auto'; counter.textContent = '500';
        total = r.total;
        setCount(id, 'comment', total);
      } catch (err) { toast(errMsg(err)); btn.disabled = !ta.value.trim(); }
    });
    setTimeout(() => ta.focus(), 60);
  }

  /* ---------- imagem do story (1080x1920) ---------- */
  const loadImg = (src) => new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Quebra o texto em linhas que cabem em maxW (respeita \n e parte palavras gigantes).
  function wrapLines(ctx, text, maxW) {
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    const chars = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
    const lines = [];
    for (const para of text.split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      let line = '';
      for (const word of para.split(/(\s+)/)) {
        if (!word) continue;
        if (ctx.measureText(line + word).width <= maxW) { line += word; continue; }
        if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
        if (/^\s+$/.test(word)) continue;
        if (ctx.measureText(word).width <= maxW) { line = word; continue; }
        for (const ch of chars(word)) {
          if (line && ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ''; }
          line += ch;
        }
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }

  async function renderStoryImage(p, theme) {
    const W = 1080, H = 1920;
    const dark = theme !== 'light';
    const C = dark
      ? { bg1: '#0b0b0b', bg2: '#000000', card: '#141414', border: '#2c2c2c', fg: '#ffffff', fg2: '#9a9a9a', shadow: false }
      : { bg1: '#ffffff', bg2: '#e8e8e8', card: '#ffffff', border: '#dcdcdc', fg: '#000000', fg2: '#6b6b6b', shadow: true };
    const FONT = "Poppins, system-ui, -apple-system, 'Segoe UI', sans-serif";
    try { await Promise.all([document.fonts.load(`700 40px ${'Poppins'}`), document.fonts.load('400 40px Poppins'), document.fonts.load('600 40px Poppins')]); } catch { /* usa a fonte padrão */ }
    const [avImg, vImg, logo] = await Promise.all([loadImg(p.user.avatar), p.user.verified ? loadImg('/verificado.png') : null, loadImg('/logo.png')]);

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bg1); bg.addColorStop(1, C.bg2);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // texto do post: reduz a fonte até caber; se ainda não couber, corta com "…"
    const cardX = 70, cardW = W - 140, pad = 60, textW = cardW - pad * 2, maxBodyH = 820;
    const text = String(p.body || '').trim();
    let size = 64, lines = [], lh = 0;
    for (const s of [64, 56, 48, 42, 36]) {
      size = s; lh = Math.round(s * 1.4);
      ctx.font = `400 ${s}px ${FONT}`;
      lines = wrapLines(ctx, text, textW);
      if (lines.length * lh <= maxBodyH) break;
    }
    const maxLines = Math.floor(maxBodyH / lh);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last && ctx.measureText(`${last}…`).width > textW) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }

    const av = 116, headerH = av, gapHeadBody = 46, gapBodyDate = 40, dateH = 34;
    const bodyH = lines.length * lh;
    const cardH = pad + headerH + gapHeadBody + bodyH + gapBodyDate + dateH + pad;
    const logoH = 70, logoW = logo ? Math.round(logo.width * (logoH / logo.height)) : 0;
    const brandGap = 96, brandH = logoH + 30 + 56;
    const total = cardH + brandGap + brandH;
    const cardY = Math.max(250, Math.round((H - total) / 2 - 30));

    // cartão
    ctx.save();
    if (C.shadow) { ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20; }
    roundRectPath(ctx, cardX, cardY, cardW, cardH, 54);
    ctx.fillStyle = C.card; ctx.fill();
    ctx.restore();
    roundRectPath(ctx, cardX, cardY, cardW, cardH, 54);
    ctx.lineWidth = 2; ctx.strokeStyle = C.border; ctx.stroke();

    // avatar redondo (ou inicial do nome)
    const ax = cardX + pad, ay = cardY + pad;
    ctx.save();
    ctx.beginPath(); ctx.arc(ax + av / 2, ay + av / 2, av / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    if (avImg) {
      const s = Math.max(av / avImg.width, av / avImg.height);
      ctx.drawImage(avImg, ax + (av - avImg.width * s) / 2, ay + (av - avImg.height * s) / 2, avImg.width * s, avImg.height * s);
    } else {
      ctx.fillStyle = dark ? '#2a2a2a' : '#e6e6e6'; ctx.fillRect(ax, ay, av, av);
      ctx.fillStyle = C.fg; ctx.font = `700 54px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.user.name || p.user.username || '?').trim().charAt(0).toUpperCase(), ax + av / 2, ay + av / 2 + 3);
    }
    ctx.restore();

    // nome, selo e @usuário
    const tx = ax + av + 30, nameMax = cardX + cardW - pad - tx - (vImg ? 56 : 0);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 44px ${FONT}`; ctx.fillStyle = C.fg;
    let name = String(p.user.name || p.user.username);
    while (name.length > 1 && ctx.measureText(name).width > nameMax) name = name.slice(0, -1);
    if (name !== p.user.name) name = `${name.trimEnd()}…`;
    ctx.fillText(name, tx, ay + 50);
    if (vImg) ctx.drawImage(vImg, tx + ctx.measureText(name).width + 14, ay + 14, 42, 42);
    ctx.font = `400 34px ${FONT}`; ctx.fillStyle = C.fg2;
    ctx.fillText(`@${p.user.username}`, tx, ay + 98);

    // corpo
    ctx.font = `400 ${size}px ${FONT}`; ctx.fillStyle = C.fg;
    let y = ay + headerH + gapHeadBody + Math.round(size * 1.05);
    for (const ln of lines) { ctx.fillText(ln, cardX + pad, y); y += lh; }

    // data
    const loc = state.lang === 'pt' ? 'pt-BR' : 'en-US';
    const when = new Date(p.created_at);
    ctx.font = `400 30px ${FONT}`; ctx.fillStyle = C.fg2;
    ctx.fillText(`${hhmm(when)} · ${when.toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })}`, cardX + pad, cardY + cardH - pad + 6);

    // marca: logo + bloxter.sbs
    const by = cardY + cardH + brandGap;
    if (logo) {
      const off = document.createElement('canvas'); off.width = logo.width; off.height = logo.height;
      const o = off.getContext('2d');
      o.drawImage(logo, 0, 0);
      o.globalCompositeOperation = 'source-in'; // pinta a logo na cor do tema
      o.fillStyle = C.fg; o.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(off, Math.round((W - logoW) / 2), by, logoW, logoH);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = `700 56px ${FONT}`;
    ctx.fillText('bloxter.sbs', W / 2, by + logoH + 30 + 46);
    return canvas;
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function openShare(id) {
    const p = postCache.get(id);
    if (!p) return;
    const sheet = openSheet(t('share.title'));
    let theme = state.theme === 'light' ? 'light' : 'dark', blob = null, seq = 0;
    sheet.body.innerHTML = `
      <div class="share-preview"><div class="loading">${t('share.generating')}</div></div>
      <div class="share-theme" role="group">
        <button type="button" data-th="dark" class="${theme === 'dark' ? 'on' : ''}">${t('share.dark')}</button>
        <button type="button" data-th="light" class="${theme === 'light' ? 'on' : ''}">${t('share.light')}</button>
      </div>
      <div class="share-actions">
        <button type="button" class="btn block" data-share-story disabled>${t('share.story')}</button>
        <button type="button" class="btn ghost block" data-share-dl disabled>${t('share.download')}</button>
      </div>`;
    const prev = $('.share-preview', sheet.wrap), bStory = $('[data-share-story]', sheet.wrap), bDl = $('[data-share-dl]', sheet.wrap);
    const fileName = `bloxter-post-${p.id}.png`;

    async function render() {
      const my = ++seq;
      blob = null; bStory.disabled = bDl.disabled = true;
      prev.innerHTML = `<div class="loading">${t('share.generating')}</div>`;
      try {
        const canvas = await renderStoryImage(p, theme);
        const b = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        if (my !== seq) return;
        if (!b) throw new Error('blob');
        blob = b;
        canvas.className = 'share-canvas';
        prev.replaceChildren(canvas);
        bStory.disabled = bDl.disabled = false;
      } catch { if (my === seq) prev.innerHTML = `<div class="empty">${esc(t('share.error'))}</div>`; }
    }
    render();

    sheet.wrap.addEventListener('click', async (e) => {
      const th = e.target.closest('[data-th]');
      if (th) {
        theme = th.dataset.th;
        sheet.wrap.querySelectorAll('[data-th]').forEach((x) => x.classList.toggle('on', x === th));
        render();
        return;
      }
      if (e.target.closest('[data-share-dl]') && blob) { downloadBlob(blob, fileName); toast(t('share.saved')); return; }
      if (e.target.closest('[data-share-story]') && blob) {
        // No celular abre a folha de compartilhar do sistema (Instagram > Stories). No computador, baixa a imagem.
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file] }); } catch (err) { if (err && err.name !== 'AbortError') { downloadBlob(blob, fileName); toast(t('share.saved')); } }
        } else { downloadBlob(blob, fileName); toast(t('share.saved')); }
      }
    });
  }

  const actions = {
    lang(el) { applyLang(el.dataset.val); },
    theme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); },
    themeset(el) { applyTheme(el.dataset.val); },
    async logout() {
      try { await api('auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      state.me = null; state.unread = 0; state.unreadNotif = 0; state.shell = null;
      go('/', true);
    },
    postnow() { setTimeout(() => $('.composer textarea')?.focus(), 80); },
    async like(el) {
      try {
        const r = await api(`posts/${el.dataset.id}/like`, { method: 'POST' });
        el.classList.toggle('liked', r.liked);
        $('span', el).textContent = r.likes || '';
      } catch (e) { toast(errMsg(e)); }
    },
    comment(el) { openComments(Number(el.dataset.id)); },
    share(el) { openShare(Number(el.dataset.id)); },
    async repost(el) {
      try {
        const r = await api(`posts/${el.dataset.id}/repost`, { method: 'POST' });
        el.classList.toggle('reposted', r.reposted);
        setCount(el.dataset.id, 'repost', r.reposts);
        toast(r.reposted ? t('repost.done') : t('repost.undone'));
        // Na minha aba "Republicados", desfazer tira o card da lista.
        if (!r.reposted && state.me && feed.endpoint === `users/${encodeURIComponent(state.me.username)}/reposts`) {
          const card = el.closest('.post');
          if (card) card.remove();
          const c = $('#c-reposts');
          if (c) c.textContent = Math.max(0, parseInt(c.textContent, 10) - 1);
          const list = $('#posts');
          if (list && !list.querySelector('.post')) list.innerHTML = feed.emptyHTML;
        }
      } catch (e) { toast(errMsg(e)); }
    },
    async del(el) {
      if (!confirm(t('post.confirmDelete'))) return;
      try {
        await api(`posts/${el.dataset.id}`, { method: 'DELETE' });
        const card = el.closest('.post');
        if (card) card.remove();
        const c = $('#c-posts');
        if (c) c.textContent = Math.max(0, parseInt(c.textContent, 10) - 1);
        toast(t('post.deleted'));
      } catch (e) { toast(errMsg(e)); }
    },
    async follow(el) {
      try {
        const r = await api(`users/${encodeURIComponent(el.dataset.user)}/follow`, { method: 'POST', body: el.dataset.post ? { post_id: Number(el.dataset.post) } : undefined });
        el.textContent = r.following ? t('unfollow') : (el.dataset.fm ? t('followBack') : t('follow'));
        el.classList.toggle('ghost', r.following);
        if (el.dataset.profile) { const c = $('#c-followers'); if (c) c.textContent = Number(r.followers).toLocaleString(state.lang === 'pt' ? 'pt-BR' : 'en-US'); }
      } catch (e) { toast(errMsg(e)); }
    },
    menu(el) {
      const pop = $('#menu-pop');
      if (!pop) return;
      const open = pop.hidden;
      pop.hidden = !open;
      el.setAttribute('aria-expanded', String(open));
    },
    viewimg(el) { openImageViewer(el.dataset.src); },
    more() { loadPosts(false); },
    tab(el) {
      state.feedTab = el.dataset.val;
      document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b === el));
      setFeed();
      loadPosts(true);
    },
    pickphoto() { $('#photo').click(); },
    rmphoto() {
      const f = $('form[data-form=profile]');
      f.dataset.avatar = 'remove';
      $('#av-prev').innerHTML = avatar({ ...state.me, avatar: null }, 's64');
    },
  };

  // Fecha o menu hambúrguer ao tocar fora ou em uma opção.
  document.addEventListener('click', (e) => {
    const pop = $('#menu-pop');
    if (!pop || pop.hidden) return;
    if (e.target.closest('[data-act="menu"]') && !e.target.closest('.menu-pop')) return;
    pop.hidden = true;
    const btn = $('[data-act="menu"]');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  function openImageViewer(src) {
    if (!src) return;
    document.getElementById('bx-lightbox')?.remove();
    const box = document.createElement('div');
    box.id = 'bx-lightbox';
    box.className = 'lightbox';
    box.innerHTML = `<button type="button" class="lightbox-close" aria-label="${esc(t('close'))}">✕</button><img src="${esc(src)}" alt="" />`;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
  }

  // Abre um post (vindo de uma notificação) direto na folha de comentários.
  async function openPost(id) {
    try {
      if (!postCache.has(id)) {
        const { post } = await api(`posts/${id}`);
        postCache.set(post.id, post);
      }
      openComments(id);
    } catch (e) { toast(errMsg(e)); }
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !actions[el.dataset.act]) return;
    if (el.dataset.act === 'postnow') {
      // Na /home só foca o campo; nas outras páginas o link leva para /home.
      if (location.pathname === '/home') { e.preventDefault(); actions.postnow(); }
      return;
    }
    e.preventDefault();
    actions[el.dataset.act](el, e);
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (f && forms[f.dataset.form]) {
      e.preventDefault();
      forms[f.dataset.form](f);
    }
  });

  document.addEventListener('input', (e) => {
    const ta = e.target;
    if (ta.matches && ta.matches('.composer textarea')) {
      const left = 500 - ta.value.length;
      const c = $('.counter', ta.closest('.composer'));
      c.textContent = left;
      c.classList.toggle('warn', left < 40);
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 260)}px`;
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && e.target.matches && e.target.matches('.composer textarea')) {
      e.target.closest('form').requestSubmit();
    }
  });

  /* =====================================================
     Início de cada página
     auth: 'required' (precisa estar logado) | 'guest' (só visitante) | 'any'
     shell: 'app' (menu lateral) | 'public' (topo simples)
  ===================================================== */
  /* =====================================================
     Pedido de notificações (popup nosso antes do do navegador)
  ===================================================== */
  const NOTIF_ASK_KEY = 'bx_notif_ask'; // guardado para sempre: quem respondeu uma vez nunca mais é perguntado

  function pushDevice() {
    const ua = navigator.userAgent || '';
    const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPad
    return (navigator.userAgentData && navigator.userAgentData.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touchMac ? 'mobile' : 'desktop';
  }

  function keyToBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  // Inscreve este aparelho para receber notificações e avisa o servidor (celular ou computador).
  async function subscribePush() {
    try {
      if (!state.me || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('sw')), 8000))]);
      const { key } = await api('push/key');
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) });
      await api('push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), device: pushDevice() } });
      return true;
    } catch { return false; }
  }

  function syncPushOncePerSession() {
    try {
      if (!state.me || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const flag = `bx_push_sync_${state.me.id}`;
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, '1');
      subscribePush();
    } catch { /* ignore */ }
  }

  function maybeAskNotifications() {
    try {
      if (!state.me || typeof Notification === 'undefined' || !window.isSecureContext) return;
      if (Notification.permission !== 'default') return;
      if (store.get(NOTIF_ASK_KEY)) return;
    } catch { return; }
    if (document.getElementById('bx-notif-ask') || document.querySelector('.bx-modal')) return;
    if (!document.getElementById('bx-notif-style')) {
      const style = document.createElement('style');
      style.id = 'bx-notif-style';
      style.textContent = `
        .bx-notif{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;padding:18px;background:#000b}
        .bx-notif-card{width:min(100%,440px);background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:20px;padding:26px;box-shadow:0 24px 90px #0008;text-align:center}
        .bx-notif-ico{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:50%;border:1px solid var(--line);margin-bottom:14px}
        .bx-notif-card h2{font-size:19px;line-height:1.35;margin:0 0 10px}
        .bx-notif-card p{color:var(--fg2);font-size:14px;line-height:1.55;margin:0 0 20px}
        .bx-notif-actions{display:grid;gap:9px}
      `;
      document.head.appendChild(style);
    }
    const box = document.createElement('div');
    box.className = 'bx-notif';
    box.id = 'bx-notif-ask';
    box.innerHTML = `
      <section class="bx-notif-card" role="dialog" aria-modal="true" aria-labelledby="bx-notif-title" aria-describedby="bx-notif-text">
        <span class="bx-notif-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span>
        <h2 id="bx-notif-title">Importante: permita notificações para anúncios importantes e notificações da sua conta</h2>
        <p id="bx-notif-text">Quer receber notificações sobre anúncios importantes, avisos, quem te seguiu e quem quer enviar mensagens para você?</p>
        <div class="bx-notif-actions">
          <button class="btn" type="button" data-notif="allow">Permito</button>
          <button class="btn ghost" type="button" data-notif="deny">Não Permito</button>
        </div>
      </section>`;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const remember = () => { try { store.set(NOTIF_ASK_KEY, String(Date.now())); } catch { /* ignore */ } };
    const onKey = (e) => { if (e.key === 'Escape') { remember(); close(); } };
    document.addEventListener('keydown', onKey);
    box.querySelector('[data-notif="deny"]').addEventListener('click', () => { remember(); close(); });
    box.querySelector('[data-notif="allow"]').addEventListener('click', async () => {
      // Precisa ser chamado direto no clique para o navegador mostrar o pedido nativo.
      let result = 'default';
      try {
        const r = Notification.requestPermission();
        result = (r && typeof r.then === 'function') ? await r : r;
      } catch { /* navegador sem suporte */ }
      remember();
      close();
      if (result === 'granted') { toast('Notificações ativadas.'); subscribePush(); }
    });
    document.body.appendChild(box);
    box.querySelector('[data-notif="allow"]').focus();
  }

  async function init({ auth = 'any', shell = 'public', active = '' } = {}) {
    const lg = store.get('bx_lang');
    applyLang(lg === 'en' || lg === 'pt' ? lg : (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en', false);
    applyTheme(store.get('bx_theme') === 'light' ? 'light' : 'dark');
    const adminPage = /^\/administracao(?:\/|$)/.test(location.pathname) || location.pathname === '/verificacao.html';
    let adminPreview = false;
    try {
      const access = await api('site/status');
      adminPreview = !access.access_open && access.admin_bypass;
      if (!access.access_open && !access.admin_bypass && location.pathname !== '/acess' && !adminPage) {
        go('/acess', true);
        return null;
      }
    } catch {
      // Mantém o site fechado se a consulta de acesso falhar; a página /acess
      // não carrega este arquivo e continua disponível para reservas.
      if (location.pathname !== '/acess' && !adminPage) {
        go('/acess', true);
        return null;
      }
    }
    try {
      const { user } = await api('me');
      state.me = user;
    } catch { state.me = null; }
    state.ready = true;
    if (adminPreview) {
      const banner = document.createElement('aside');
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;z-index:1000;top:12px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);box-shadow:0 8px 30px #0005;font:500 13px Poppins,Arial,sans-serif;max-width:calc(100vw - 24px)';
      banner.innerHTML = '<span>Prévia administrativa do site</span><button type="button" style="border:0;border-radius:8px;padding:7px 10px;background:var(--fg);color:var(--bg);font:600 12px Poppins,Arial,sans-serif;cursor:pointer">Voltar para /acess</button>';
      banner.querySelector('button').addEventListener('click', async () => {
        try {
          await api('admin/exit-site', { method: 'POST' });
          location.replace('/acess');
        } catch { toast('Não foi possível encerrar a prévia. Saia da administração e tente novamente.'); }
      });
      document.body.appendChild(banner);
    }

    if (auth === 'required' && !state.me) {
      go(`/login?next=${encodeURIComponent(location.pathname + location.search)}`, true);
      return null;
    }
    if (auth === 'guest' && state.me) {
      go(safeNext() || '/home', true);
      return null;
    }
    if (state.me) pollUnread();
    syncPushOncePerSession();
    if (shell === 'app') {
      appShell();
      setActiveNav(active);
      if (state.me && !state.me.onboarding_done) setTimeout(() => openOnboarding(state.me), 0);
      else if (state.me) setTimeout(maybeAskNotifications, 1200);
      return $('#view');
    }
    const view = publicShell();
    if (state.me && !state.me.onboarding_done) setTimeout(() => openOnboarding(state.me), 0);
    return view;
  }

  window.BX = {
    $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, PAGEUP_PAGES,
    accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText,
    setActiveNav, updateBadge, pollUnread, badges, followLabel, userRow, usernameChecker, postHTML, loadMoreBtn, feed,
    loadPosts, setFeed, forms, actions, openSheet, openPost, openImageViewer, imagesHTML, subscribePush, applyLang, applyTheme, openProfileDetails, openOnboarding, init,
  };

})();
