const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless',
  '--remote-debugging-port=9227',
  '--window-size=1280,950',
  '--disable-gpu',
  'http://localhost:4200/recipes'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9227/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const list = JSON.parse(data);
      const target = list.find(p => p.url.includes('localhost:4200'));
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

        setTimeout(() => {
          // Click recipe 5 (Spaghetti)
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                document.querySelectorAll('.recipe-card')[8].click();
                setTimeout(() => {
                  const list = document.querySelector('.products-list-wrap');
                  if (list) list.scrollTop = 0;
                }, 300);
              })()
              `
            }
          }));

          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 4,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 1000);
        }, 1500);
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === 4) {
          const buffer = Buffer.from(msg.result.data, 'base64');
          fs.writeFileSync('C:/Users/lffau/.gemini/antigravity-ide/brain/68d91194-1620-448c-91e5-b62d9b68f2f9/recipe_modal_products.png', buffer);
          console.log('Saved modal products screenshot');
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}, 1500);
