(() => {
  const { $, esc, state, api, toast, setTitle } = window.BX;
  (async () => {
    const view = await BX.init({ auth: 'required', shell: 'app', active: 'settings' });
    if (!view) return;
    setTitle('LIA');
    const history = [];
    view.innerHTML = `
      <div class="page-head"><h1>LIA</h1><small>Assistente do Bloxter</small></div>
      <section class="lia-page">
        <header class="lia-intro"><span class="lia-mark" aria-hidden="true">L</span><div><h2>Oi${state.me?.name ? `, ${esc(state.me.name.split(' ')[0])}` : ''}! Eu sou a LIA.</h2><p>Posso ajudar você a usar o Bloxter. O que você gostaria de saber?</p></div></header>
        <div class="lia-suggestions"><button type="button">Como publicar um story?</button><button type="button">Onde mudo meu tema?</button><button type="button">Como edito meu perfil?</button></div>
        <div class="lia-messages" id="lia-messages" aria-live="polite" aria-label="Conversa com a LIA"></div>
        <form class="lia-form" id="lia-form"><textarea id="lia-input" rows="1" maxlength="1200" placeholder="Pergunte algo para a LIA…" aria-label="Mensagem para a LIA"></textarea><button class="btn" type="submit">Enviar</button></form>
        <p class="lia-note">A LIA pode cometer erros. Não envie senhas nem dados pessoais sensíveis.</p>
      </section>`;
    const list = $('#lia-messages', view);
    const input = $('#lia-input', view);
    const form = $('#lia-form', view);
    const addMessage = (role, content, pending = false) => {
      const item = document.createElement('div');
      item.className = `lia-message ${role === 'user' ? 'lia-user' : 'lia-assistant'}${pending ? ' lia-pending' : ''}`;
      item.textContent = content;
      list.appendChild(item);
      list.scrollTop = list.scrollHeight;
      return item;
    };
    view.querySelectorAll('.lia-suggestions button').forEach((button) => button.addEventListener('click', () => { input.value = button.textContent; form.requestSubmit(); }));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content || form.dataset.busy) return;
      history.push({ role: 'user', content });
      addMessage('user', content);
      input.value = '';
      form.dataset.busy = '1';
      form.querySelector('button').disabled = true;
      const pending = addMessage('assistant', 'A LIA está respondendo…', true);
      try {
        const result = await api('lia/chat', { method: 'POST', body: { messages: history } });
        pending.remove();
        history.push({ role: 'assistant', content: result.answer });
        addMessage('assistant', result.answer);
      } catch (error) {
        pending.remove();
        const message = error.status === 429 ? 'Você enviou várias mensagens em pouco tempo. Aguarde um minuto e tente novamente.' : error.status === 503 ? 'A LIA está temporariamente indisponível. Tente novamente mais tarde.' : 'Não consegui responder agora. Confira sua conexão e tente de novo.';
        addMessage('assistant', message);
        history.pop();
        toast(message);
      } finally {
        delete form.dataset.busy;
        form.querySelector('button').disabled = false;
        input.focus();
      }
    });
  })();
})();
