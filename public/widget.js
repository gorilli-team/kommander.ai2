(function() {
  const script = document.currentScript;
  const clientId = script?.dataset.clientId || '';
  const apiKey = script?.dataset.apiKey || '';

  // Create floating chat button
  const button = document.createElement('button');
  button.textContent = 'Chat';
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '9999',
    padding: '10px 16px',
    borderRadius: '9999px',
    background: '#1a56db',
    color: '#fff',
    border: 'none',
    cursor: 'pointer'
  });

  // Create iframe for chat UI
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    position: 'fixed',
    bottom: '80px',
    right: '20px',
    width: '350px',
    height: '500px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    display: 'none',
    zIndex: '9999',
    background: '#fff'
  });

  // Inline chat HTML
  iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; font-family: sans-serif; display: flex; flex-direction: column; height: 100%; }
    #messages { flex: 1; overflow-y: auto; padding: 8px; }
    #form { display: flex; border-top: 1px solid #eee; }
    #input { flex: 1; padding: 8px; border: none; border-right: 1px solid #eee; }
    #send { padding: 8px; }
  </style>
</head>
<body>
  <div id="messages"></div>
  <form id="form">
    <input id="input" autocomplete="off" placeholder="Type a message..." />
    <button id="send" type="submit">Send</button>
  </form>
  <script>
    const clientId = ${JSON.stringify(clientId)};
    const apiKey = ${JSON.stringify(apiKey)};
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messagesEl = document.getElementById('messages');

    function addMessage(role, text) {
      const div = document.createElement('div');
      div.textContent = (role === 'user' ? 'You: ' : 'Bot: ') + text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      addMessage('user', text);
      input.value = '';
      try {
        const res = await fetch('/api/widget-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, apiKey, message: text })
        });
        const data = await res.json();
        if (data.reply) {
          addMessage('bot', data.reply);
        } else if (data.error) {
          addMessage('bot', 'Error: ' + data.error);
        }
      } catch (err) {
        addMessage('bot', 'Error: ' + err.message);
      }
    });
  </script>
</body>
</html>`;

  button.addEventListener('click', () => {
    iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
  });

  document.body.appendChild(button);
  document.body.appendChild(iframe);
})();
