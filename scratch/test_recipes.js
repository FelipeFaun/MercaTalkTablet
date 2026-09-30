const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless',
  '--remote-debugging-port=9224',
  '--window-size=1280,800',
  '--disable-gpu',
  'http://localhost:4200/recipes'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9224/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const list = JSON.parse(data);
      const target = list.find(p => p.url.includes('localhost:4200'));
      if (!target) {
        console.error('Target not found');
        edge.kill();
        process.exit(1);
      }

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        // Wait 1.5s for page render
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                const cards = Array.from(document.querySelectorAll('.recipe-card')).map(c => ({
                  title: c.querySelector('.recipe-title')?.innerText,
                  category: c.querySelector('.recipe-category-tag')?.innerText,
                  time: c.querySelector('.recipe-pill-time')?.innerText?.trim(),
                  difficulty: c.querySelector('.recipe-pill-difficulty')?.innerText?.trim()
                }));
                return {
                  count: cards.length,
                  recipes: cards
                };
              })()
              `,
              returnByValue: true
            }
          }));
        }, 1500);
      };

      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === 3) {
          console.log('RECIPES IN GRID:', JSON.stringify(msg.result.result.value, null, 2));

          // Now click on recipe 6 (Spaghetti a la Boloñesa) or card 0
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                const cards = document.querySelectorAll('.recipe-card');
                if (cards.length > 5) {
                  // Click on card 5 (index 5: Spaghetti a la Boloñesa)
                  cards[5].click();
                  return 'Clicked card 5: ' + cards[5].querySelector('.recipe-title')?.innerText;
                } else if (cards.length > 0) {
                  cards[0].click();
                  return 'Clicked card 0: ' + cards[0].querySelector('.recipe-title')?.innerText;
                }
                return 'No cards to click';
              })()
              `,
              returnByValue: true
            }
          }));
        }

        if (msg.id === 4) {
          console.log('CLICK RESULT:', msg.result.result.value);

          // Wait 600ms for modal to render
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 5,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                (() => {
                  const modal = document.querySelector('.recipe-modal');
                  if (!modal) return { modalFound: false };
                  const title = modal.querySelector('.modal-title')?.innerText;
                  const ingredients = Array.from(modal.querySelectorAll('.recipe-ingredients-list li')).map(li => li.innerText?.trim());
                  const steps = Array.from(modal.querySelectorAll('.recipe-steps-list li')).map(li => li.innerText?.trim());
                  const products = Array.from(modal.querySelectorAll('.supermarket-product-row')).map(row => ({
                    brand: row.querySelector('.product-brand-line')?.innerText,
                    name: row.querySelector('.product-title-line')?.innerText,
                    aisle: row.querySelector('.product-aisle-badge')?.innerText?.trim(),
                    price: row.querySelector('.price-val')?.innerText,
                    hasOffer: !!row.querySelector('.offer-pill')
                  }));
                  const total = modal.querySelector('.pricing-total')?.innerText;
                  const savings = modal.querySelector('.savings-tag')?.innerText;
                  return {
                    modalFound: true,
                    title,
                    ingredientsCount: ingredients.length,
                    stepsCount: steps.length,
                    productsCount: products.length,
                    products,
                    total,
                    savings
                  };
                })()
                `,
                returnByValue: true
              }
            }));
          }, 600);
        }

        if (msg.id === 5) {
          console.log('MODAL EVALUATION:', JSON.stringify(msg.result.result.value, null, 2));

          // Now capture screenshot of modal
          ws.send(JSON.stringify({
            id: 6,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }

        if (msg.id === 6) {
          const buffer = Buffer.from(msg.result.data, 'base64');
          fs.writeFileSync('scratch/recipe_modal.png', buffer);
          console.log('SCREENSHOT SAVED to scratch/recipe_modal.png (size:', buffer.length, 'bytes)');

          // Test adding a product to cart from modal
          ws.send(JSON.stringify({
            id: 7,
            method: 'Runtime.evaluate',
            params: {
              expression: `
              (() => {
                const addBtn = document.querySelector('.btn-add-single');
                if (addBtn) {
                  addBtn.click();
                  return 'Clicked add single product';
                }
                return 'No add button found';
              })()
              `,
              returnByValue: true
            }
          }));
        }

        if (msg.id === 7) {
          console.log('ADD PRODUCT RESULT:', msg.result.result.value);

          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 8,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                (() => {
                  const toast = document.querySelector('ion-toast');
                  const inCartBadge = document.querySelector('.cart-status-pill');
                  return {
                    toastMessage: toast?.getAttribute('message') || toast?.shadowRoot?.querySelector('.toast-message')?.innerText || 'toast found: ' + !!toast,
                    inCartBadge: inCartBadge?.innerText
                  };
                })()
                `,
                returnByValue: true
              }
            }));
          }, 400);
        }

        if (msg.id === 8) {
          console.log('POST-ADD RESULT:', JSON.stringify(msg.result.result.value, null, 2));
          ws.close();
          edge.kill();
          process.exit(0);
        }
      };
    });
  });
}, 1500);
