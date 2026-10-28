(async () => {
  const { $, esc, state, t, errMsg, api, toast, avatar, ago, accountPath, setTitle, go, updateBadge } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'messages' });
  if (!v) return;

  async function conversationsView(view) {
    setTitle(t('msg.title'));
    view.innerHTML = `<div class="page-head"><div><h1>${t('msg.title')}</h1><small>Conversas privadas e grupos</small></div></div>
      <section class="group-create"><details><summary><span class="group-create-icon" aria-hidden="true">＋</span><span><b>Criar um grupo</b><small>Convide pessoas para conversar juntas</small></span></summary>
        <form id="create-group-form"><label for="new-group-name">Nome do grupo</label><input id="new-group-name" name="name" maxlength="60" required placeholder="Ex.: Nosso roleplay"><label for="new-group-users">Adicionar pessoas</label><input id="new-group-users" name="usernames" placeholder="@usuario1, @usuario2"><small>Quem não permite adição direta recebe um convite para aceitar.</small><button class="btn sm" type="submit">Criar grupo</button></form></details></section>
      <section class="group-inbox-section"><h2>Convites para grupos</h2><div id="group-invites"><div class="loading">Carregando…</div></div></section>
      <section class="messages-section"><h2>Seus grupos</h2><div id="group-list"><div class="loading">Carregando…</div></div></section>
      <section class="messages-section"><h2>Mensagens diretas</h2><div id="convs"><div class="loading">${t('loading')}</div></div></section>`;

    const refresh = async () => {
      try {
        const [groupsData, inviteData, directData] = await Promise.all([api('groups'), api('group-invites'), api('conversations')]);
        const groups = groupsData.groups || [];
        $('#group-list').innerHTML = groups.length ? groups.map((group) => `<a class="conv group-conv" href="/chat.html?group=${encodeURIComponent(group.id)}"><span class="group-avatar" aria-hidden="true">${GROUP_ICON}</span><div class="info"><b>${esc(group.name)} <small>${Number(group.member_count)} pessoas</small></b><span>${esc(group.last || 'Comece a conversa')}</span></div><span class="conv-date">${ago(group.activity_at)}</span></a>`).join('') : '<div class="empty compact-empty">Seus grupos aparecem aqui depois que você criar ou aceitar um convite.</div>';
        const invites = inviteData.invites || [];
        $('#group-invites').innerHTML = invites.length ? invites.map((invite) => `<article class="group-invite" data-group-invite="${invite.id}"><span class="group-avatar small-group-avatar" aria-hidden="true">${GROUP_ICON}</span><div class="group-invite-info"><b>${esc(invite.group_name)}</b><span>Convite de <a href="${accountPath(invite.inviter.username)}">${esc(invite.inviter.name)} · @${esc(invite.inviter.username)}</a></span></div><div class="group-invite-actions"><button class="btn sm" type="button" data-invite-action="accept" data-invite-id="${invite.id}">Aceitar</button><button class="btn ghost sm" type="button" data-invite-action="decline" data-invite-id="${invite.id}">Recusar</button></div></article>`).join('') : '<div class="empty compact-empty">Você não tem convites pendentes.</div>';
        const conversations = directData.conversations || [];
        $('#convs').innerHTML = conversations.length ? conversations.map((conversation) => `<a class="conv" href="/chat?u=${encodeURIComponent(conversation.user.username)}">${avatar(conversation.user)}<div class="info"><b>${esc(conversation.user.name)}${BX.badges(conversation.user)} <span style="display:inline;font-weight:400">@${esc(conversation.user.username)} · ${ago(conversation.created_at)}</span></b><span>${conversation.mine ? t('msg.you') : ''}${esc(conversation.last)}</span></div>${conversation.unread ? '<span class="dot"></span>' : ''}</a>`).join('') : `<div class="empty compact-empty">${t('msg.empty')}</div>`;
      } catch (error) {
        const message = `<div class="empty">${esc(errMsg(error))}</div>`;
        $('#group-list').innerHTML = message;
        $('#group-invites').innerHTML = message;
        $('#convs').innerHTML = message;
      }
    };

    $('#create-group-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      const usernames = form.usernames.value.split(/[\s,;]+/).map((name) => name.replace(/^@/, '')).filter(Boolean);
      try {
        const { group, invited, added } = await api('groups', { method: 'POST', body: { name: form.name.value, usernames } });
        toast(invited ? `Grupo criado. ${invited} convite(s) enviado(s).` : `Grupo criado${added ? ` com ${added} pessoa(s)` : ''}.`);
        form.reset();
        form.closest('details').open = false;
        await refresh();
        if (group?.id) go(`/chat.html?group=${encodeURIComponent(group.id)}`);
      } catch (error) { toast(error.code === 'group_user_not_found' ? 'Confira os nomes de usuário informados.' : errMsg(error)); }
      finally { button.disabled = false; }
    });

    $('#group-invites').addEventListener('click', async (event) => {
      const button = event.target.closest('[data-invite-action]');
      if (!button) return;
      button.disabled = true;
      try {
        const response = await api(`group-invites/${button.dataset.inviteId}`, { method: 'POST', body: { action: button.dataset.inviteAction } });
        toast(response.accepted ? 'Convite aceito.' : 'Convite recusado.');
        await refresh();
      } catch (error) { toast(errMsg(error)); button.disabled = false; }
    });
    await refresh();
  }

  const GROUP_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 19v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4v1"/></svg>';
  conversationsView(v);
})();

