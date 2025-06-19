(function () {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const clientId = currentScript.getAttribute('data-client-id');
  const apiKey = currentScript.getAttribute('data-api-key');
  const appUrl = currentScript.getAttribute('data-app-url') || window.location.origin;

  if (!clientId || !apiKey) {
    console.error('Kommander.ai widget: data-client-id and data-api-key are required.');
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    .kommander-widget-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #1a56db;
      color: white;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      cursor: pointer;
      z-index: 9999;
    }
    .kommander-widget-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 320px;
      height: 420px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 9998;
    }
    .kommander-widget-container.open {
      display: flex;
    }
    .kommander-widget-header {
      padding: 8px;
      background: #1a56db;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kommander-widget-messages {
      flex: 1;
      padding: 8px;
      overflow-y: auto;
      font-size: 14px;
    }
    .kommander-widget-form {
      display: flex;
      border-top: 1px solid #e0e0e0;
    }
    .kommander-widget-form input {
      flex: 1;
      border: none;
      padding: 8px;
      font-size: 14px;
    }
    .kommander-widget-form button {
      background: #1a56db;
      color: white;
      border: none;
      padding: 0 12px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.className = 'kommander-widget-button';
  button.textContent = '💬';

  const container = document.createElement('div');
  container.className = 'kommander-widget-container';
  container.innerHTML = `
    <div class="kommander-widget-header">
      <span>Chat</span>
      <button type="button" class="kommander-widget-close" style="background:none;border:none;color:white;font-size:20px;cursor:pointer">&times;</button>
    </div>
    <div class="kommander-widget-messages"></div>
    <form class="kommander-widget-form">
      <input type="text" placeholder="Type a message" />
      <button type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(button);
  document.body.appendChild(container);

  const closeBtn = container.querySelector('.kommander-widget-close');
  const messagesEl = container.querySelector('.kommander-widget-messages');
  const form = container.querySelector('.kommander-widget-form');
  const input = form.querySelector('input');
  const history = [];

  function addMessage(role, text) {
    history.push({ role, content: text });
    const div = document.createElement('div');
    div.textContent = text;
    div.style.margin = '4px 0';
    div.style.textAlign = role === 'user' ? 'right' : 'left';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  button.addEventListener('click', () => {
    container.classList.add('open');
    button.style.display = 'none';
  });

  closeBtn.addEventListener('click', () => {
    container.classList.remove('open');
    button.style.display = 'flex';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    try {
      const res = await fetch(`${appUrl}/api/widget-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, clientId, apiKey })
      });
      const data = await res.json();
      if (data.response) {
        addMessage('assistant', data.response);
      } else if (data.error) {
        addMessage('system', data.error);
      }
    } catch (err) {
      addMessage('system', 'Error sending message');
    }
  });
})();
