(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const steps = ['account','card'];
  let account = null;
  function show(step) { for (const s of steps) $(`#step-${s}`).hidden = s !== step; }
  function message(id, text='') { $(id).textContent = text; }
  function errText(code) {
    const pt = {
      invalid_email:'Digite um e-mail válido.',
      email_taken:'Este e-mail já tem uma conta.',
      username_taken:'Esse nome de usuário já está ocupado ou reservado. Escolha outro.', invalid_username:'Use de 3 a 20 letras, números ou _.', name_required:'Digite seu nome.', weak_password:'A senha precisa ter pelo menos 8 caracteres.',
      site_closed:'O site será inaugurado em 25/10 às 20:00.', server:'O servidor não conseguiu criar a conta. Confira a configuração da API e do banco de dados.', network:'Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.', config_db:'Banco de dados não configurado.', config_jwt:'Sessão do servidor não configurada.'
    };
    return pt[code] || 'Não foi possível continuar. Tente novamente.';
  }
  async function api(path, method='GET', body) {
    let res;
    try { res=await fetch(`/api/${path}`,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin'}); }
    catch { const e=new Error('network');e.code='network';throw e; }
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const e=new Error(data.error||'server');e.code=data.error;e.status=res.status;throw e;} return data;
  }
  async function initialize() {
    try {
      const status=await api('site/status');
      if(status.access_open){location.replace('/');return;}
    } catch { /* A página de reserva também é usada para mostrar indisponibilidade da API. */ }
  }
  $('#account-form').addEventListener('submit',async e=>{
    e.preventDefault();message('#account-error');const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;
    const name=$('#name').value.trim(), username=$('#username').value.trim().replace(/^@/,'').toLowerCase(), email=$('#email').value.trim().toLowerCase(), password=$('#password').value;
    try{
      await api('auth/register','POST',{name,username,email,password});
      account={name,username,email,password};
      $('#credential-preview').innerHTML=`<small>SEU USUÁRIO</small><strong>@${escapeHtml(username)}</strong><small>E-MAIL</small><strong>${escapeHtml(email)}</strong><small>SENHA</small><strong>${escapeHtml(password)}</strong>`;
      show('card');
    }catch(x){message('#account-error',errText(x.code));btn.disabled=false;}
  });
  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  $('#download-card').addEventListener('click',()=>{
    if(!account)return;
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const c=canvas.getContext('2d');c.fillStyle='#050505';c.fillRect(0,0,1080,1350);
    c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(54,54,972,1242);
    c.fillStyle='#fff';c.font='600 56px Poppins,Arial';c.fillText('Bloxter',96,165);
    c.fillStyle='#aaa';c.font='400 22px Poppins,Arial';c.fillText('CARTÃO DE ACESSO · GUARDE EM LOCAL SEGURO',96,220);
    c.fillStyle='#fff';c.font='600 36px Poppins,Arial';c.fillText('Seu nome está reservado',96,360);
    c.fillStyle='#aaa';c.font='500 22px Poppins,Arial';c.fillText('NOME DE USUÁRIO',96,475);
    c.fillStyle='#fff';c.font='600 40px Poppins,Arial';c.fillText('@'+account.username,96,535);
    c.fillStyle='#aaa';c.font='500 22px Poppins,Arial';c.fillText('E-MAIL',96,645);
    const wrapped=(text,maxWidth,fontSpec,x,y,lineHeight,color)=>{
      c.font=fontSpec;c.fillStyle=color;let line='';
      for(const word of String(text).split(' ')){
        const next=line?`${line} ${word}`:word;
        if(c.measureText(next).width>maxWidth&&line){c.fillText(line,x,y);y+=lineHeight;line=word;}else line=next;
      }
      if(line)c.fillText(line,x,y);
      return y+lineHeight;
    };
    let y=wrapped(account.email,880,'400 29px Poppins,Arial',96,700,40,'#fff');
    y+=30;c.fillStyle='#aaa';c.font='500 22px Poppins,Arial';c.fillText('SENHA',96,y);y+=60;
    y=wrapped(account.password,880,'600 34px Poppins,Arial',96,y,46,'#fff');
    y+=24;c.strokeStyle='#333';c.beginPath();c.moveTo(96,y);c.lineTo(984,y);c.stroke();y+=54;
    wrapped('Não compartilhe este cartão. A senha não pode ser recuperada por imagem.',880,'400 20px Poppins,Arial',96,y,30,'#bbb');
    c.fillStyle='#777';c.font='400 18px Poppins,Arial';c.fillText('Inauguração: 25/10 às 20:00',96,1215);
    const a=document.createElement('a');a.download=`bloxter-acesso-${account.username}.png`;a.href=canvas.toDataURL('image/png');a.click();
    message('#download-status','Imagem salva. Apague este arquivo se não quiser manter a senha em uma imagem.');
    
  });
  initialize();
})();
