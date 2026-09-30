const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  'http://localhost:4200/home'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const list = JSON.parse(data);
      const target = list.find(p => p.url.includes('localhost:4200'));
      if (!target) {
        edge.kill();
        process.exit(1);
      }

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `
            (() => {
              const protagonist = document.querySelector('.protagonist-card')?.getBoundingClientRect();
              const shortcuts = Array.from(document.querySelectorAll('.shortcut-card')).map(b => ({
                title: b.querySelector('.shortcut-title')?.innerText,
                width: Math.round(b.getBoundingClientRect().width),
                height: Math.round(b.getBoundingClientRect().height)
              }));
              const tools = Array.from(document.querySelectorAll('.tool-btn')).map(t => ({
                name: t.querySelector('.tool-name')?.innerText,
                width: Math.round(t.getBoundingClientRect().width),
                height: Math.round(t.getBoundingClientRect().height)
              }));
              return {
                protagonistSize: protagonist ? { width: Math.round(protagonist.width), height: Math.round(protagonist.height) } : null,
                shortcutsCount: shortcuts.length,
                shortcuts,
                toolsCount: tools.length,
                tools
              };
            })()
            `,
            returnByValue: true
          }
        }));
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === 2) {
          console.log('TABLET LAYOUT MEASUREMENTS:', JSON.stringify(msg.result.result.value, null, 2));
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}, 2500);
