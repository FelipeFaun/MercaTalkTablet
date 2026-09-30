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

        // Test 1: Check Header elements
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `
            (() => {
              const headerNavBtns = Array.from(document.querySelectorAll('.header-controls-group a, .header-nav-btn')).map(a => a.innerText);
              return {
                headerNavBtns
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
          console.log('HEADER BUTTONS TEST:', JSON.stringify(msg.result.result.value, null, 2));

          // Test 2: Click "Lista Express / QR" modal button
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                const qrBtn = document.querySelector('.qr-tool');
                if (qrBtn) {
                  qrBtn.click();
                  return 'clicked .qr-tool';
                }
                return 'no .qr-tool';
              })()
              `,
              returnByValue: true
            }
          }));
        }

        if (msg.id === 3) {
          console.log('QR BUTTON CLICK:', msg.result.result.value);
          setTimeout(() => {
            // Test 3: Inspect Express QR Modal content with empty cart
            ws.send(JSON.stringify({
              id: 4,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                (() => {
                  const modal = document.querySelector('app-express-qr-modal');
                  if (!modal) return { open: false };
                  const subtitle = modal.querySelector('.modal-subtitle')?.innerText;
                  const itemsCountBadge = modal.querySelector('.items-badge')?.innerText;
                  const itemRows = Array.from(modal.querySelectorAll('.qr-item-row')).map(r => r.innerText);
                  const emptyTitle = modal.querySelector('.empty-msg-title')?.innerText;
                  const totalBar = modal.querySelector('.total-bar')?.innerText;
                  return {
                    open: true,
                    subtitle,
                    itemsCountBadge,
                    itemRowsCount: itemRows.length,
                    itemRows,
                    emptyTitle,
                    hasTotalBar: !!totalBar
                  };
                })()
                `,
                returnByValue: true
              }
            }));
          }, 600);
        }

        if (msg.id === 4) {
          console.log('EXPRESS QR MODAL INSPECTION (EMPTY CART):', JSON.stringify(msg.result.result.value, null, 2));
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}, 2500);
