const http = require('http');
const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  'http://localhost:4200/products'
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
        // Click first add to cart button
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                const addBtn = document.querySelector('.btn-add-to-cart');
                if (addBtn) {
                  addBtn.click();
                  return 'clicked addBtn';
                }
                return 'no addBtn';
              })()
              `,
              returnByValue: true
            }
          }));
        }, 1000);
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === 2) {
          console.log('ADD CLICK:', msg.result.result.value);
          // Wait 500ms and check stepper
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 3,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                (() => {
                  const stepper = document.querySelector('.qty-stepper-control');
                  const badge = document.querySelector('.header-cart-badge');
                  const qty = document.querySelector('.stepper-qty');
                  return {
                    hasStepper: !!stepper,
                    qty: qty ? qty.innerText : null,
                    headerBadgeCount: badge ? badge.innerText : null
                  };
                })()
                `,
                returnByValue: true
              }
            }));
          }, 500);
        }

        if (msg.id === 3) {
          console.log('STEPPER STATE AFTER ADD:', JSON.stringify(msg.result.result.value, null, 2));

          // Now click plus button
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                const plusBtn = document.querySelector('.plus-btn');
                if (plusBtn) {
                  plusBtn.click();
                  return 'clicked plusBtn';
                }
                return 'no plusBtn';
              })()
              `,
              returnByValue: true
            }
          }));
        }

        if (msg.id === 4) {
          console.log('PLUS CLICK:', msg.result.result.value);
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 5,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                (() => {
                  const badge = document.querySelector('.header-cart-badge');
                  const qty = document.querySelector('.stepper-qty');
                  return {
                    qty: qty ? qty.innerText : null,
                    headerBadgeCount: badge ? badge.innerText : null
                  };
                })()
                `,
                returnByValue: true
              }
            }));
          }, 500);
        }

        if (msg.id === 5) {
          console.log('FINAL STATE AFTER INCREMENT:', JSON.stringify(msg.result.result.value, null, 2));
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}, 2500);
