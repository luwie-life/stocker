import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import {
  formatMoney,
  toMinorUnits,
  showToast,
  withButtonLoading,
  escapeHtml
} from '../shared/ui.js';

const session = await requireSession();

renderShell(session, 'sales.html');

const currency = session.business.currency;
const branchId = session.branch?.id;

const scanInput = document.getElementById('scan-input');
const searchResults = document.getElementById('search-results');
const searchProductBtn = document.getElementById('search-product-btn');
const cartLinesEl = document.getElementById('cart-lines');
const cartTotalEl = document.getElementById('cart-total');
const amountReceivedInput = document.getElementById('amount-received');
const salesHistoryEl = document.getElementById('sales-history');

document.getElementById('amount-received-label').textContent =
  `Amount received (${currency})`;

let cart = [];

const productCacheKey = 'stocker_pos_products';

function readProductCache() {
  try {
    return JSON.parse(
      localStorage.getItem(productCacheKey) || '{}'
    );
  } catch {
    return {};
  }
}

function cacheProducts(products) {
  const cache = readProductCache();

  products.forEach((product) => {
    cache[product._id] = {
      product,
      cachedAt: Date.now(),
    };
  });

  localStorage.setItem(
    productCacheKey,
    JSON.stringify(cache)
  );
}

function cachedProducts(search) {
  const cache = readProductCache();
  const term = search.toLowerCase();

  return Object.values(cache)
    .map((entry) => entry.product)
    .filter(
      (product) =>
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.barcodes?.includes(search)
    );
}

function cartTotalMinor() {
  return cart.reduce(
    (sum, line) =>
      sum + line.unitPriceMinor * line.quantity,
    0
  );
}

function renderCart() {
  if (cart.length === 0) {
    cartLinesEl.innerHTML = `
      <p style="color:var(--muted);font-size:0.85rem">
        Cart is empty. Scan or search a product to begin.
      </p>
    `;
  } else {
    cartLinesEl.innerHTML = cart
      .map(
        (line, i) => `
          <div class="cart-line">
            <div>
              <div>${escapeHtml(line.name)}</div>

              <div style="color:var(--muted);font-size:0.78rem">
                ${formatMoney(
                  line.unitPriceMinor,
                  currency
                )} each
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px">
              <div
                class="qty-controls"
                style="display:flex;align-items:center;gap:4px"
              >
                <button
                  data-i="${i}"
                  data-op="dec"
                  type="button"
                >
                  −
                </button>

                <span>${line.quantity}</span>

                <button
                  data-i="${i}"
                  data-op="inc"
                  type="button"
                >
                  +
                </button>
              </div>

              <div style="width:80px;text-align:right">
                ${formatMoney(
                  line.unitPriceMinor * line.quantity,
                  currency
                )}
              </div>

              <button
                data-i="${i}"
                data-op="remove"
                type="button"
                style="border:none;background:none;color:var(--danger);cursor:pointer"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          </div>
        `
      )
      .join('');
  }

  cartTotalEl.textContent =
    `Total: ${formatMoney(cartTotalMinor(), currency)}`;

  amountReceivedInput.value =
    (cartTotalMinor() / 100).toFixed(2);
}

cartLinesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-op]');

  if (!btn) return;

  const i = Number(btn.dataset.i);

  if (btn.dataset.op === 'inc') {
    cart[i].quantity += 1;
  }

  if (btn.dataset.op === 'dec') {
    cart[i].quantity = Math.max(
      1,
      cart[i].quantity - 1
    );
  }

  if (btn.dataset.op === 'remove') {
    cart.splice(i, 1);
  }

  renderCart();
});

function addToCart(product) {
  if (!product) return;

  const existing = cart.find(
    (line) => line.productId === product._id
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      productId: product._id,
      name: product.name,
      unitPriceMinor: product.sellingPriceMinor,
      quantity: 1,
    });
  }

  renderCart();

  searchResults.innerHTML = '';
  scanInput.value = '';
  scanInput.focus();
}

async function handleScanOrSearch() {
  const value = scanInput.value.trim();

  if (!value) {
    scanInput.focus();
    return;
  }

  searchResults.innerHTML =
    '<div class="search-status">Searching catalogue…</div>';

  try {
    const byBarcode = await api.get(
      `/products/barcode/${encodeURIComponent(value)}`
    );

    cacheProducts([byBarcode.data]);

    addToCart(byBarcode.data);

    return;
  } catch (err) {
    if (err.code !== 'PRODUCT_NOT_FOUND') {
      showToast(err.message, 'error');
      return;
    }
  }

  try {
    const res = await api.get('/products', {
      search: value,
      limit: 8,
    });

    cacheProducts(res.data);

    if (res.data.length === 0) {
      searchResults.innerHTML = `
        <p class="search-status">
          No products match "${escapeHtml(value)}".
        </p>
      `;

      return;
    }

    searchResults.innerHTML = res.data
      .map(
        (p) => `
          <button
            class="product-result"
            type="button"
            data-id="${p._id}"
          >
            <span>${escapeHtml(p.name)}</span>
            <strong>
              ${formatMoney(
                p.sellingPriceMinor,
                currency
              )}
            </strong>
          </button>
        `
      )
      .join('');

    searchResults
      .querySelectorAll('[data-id]')
      .forEach((el) => {
        el.addEventListener('click', () => {
          const product = res.data.find(
            (p) => p._id === el.dataset.id
          );

          addToCart(product);
        });
      });
  } catch (err) {
    const fallback = cachedProducts(value).slice(0, 8);

    if (fallback.length) {
      searchResults.innerHTML =
        '<p class="search-status">Offline catalogue results. Confirm checkout when connection returns.</p>' +
        fallback
          .map(
            (p) => `
              <button
                class="product-result"
                type="button"
                data-id="${p._id}"
              >
                <span>${escapeHtml(p.name)}</span>
                <strong>
                  ${formatMoney(
                    p.sellingPriceMinor,
                    currency
                  )}
                </strong>
              </button>
            `
          )
          .join('');

      searchResults
        .querySelectorAll('[data-id]')
        .forEach((el) => {
          el.addEventListener('click', () => {
            const product = fallback.find(
              (p) => p._id === el.dataset.id
            );

            addToCart(product);
          });
        });
    } else {
      searchResults.innerHTML = `
        <p class="search-status search-status-error">
          Catalogue search is temporarily unavailable.
          Try again when the connection returns.
        </p>
      `;
    }

    showToast(err.message, 'error');
  }
}

/*
 * Search button.
 */
searchProductBtn.addEventListener(
  'click',
  handleScanOrSearch
);

/*
 * Keep Enter support for barcode scanners
 * and keyboard users.
 */
scanInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleScanOrSearch();
  }
});

document
  .getElementById('checkout-btn')
  .addEventListener('click', async (e) => {
    if (cart.length === 0) {
      showToast('Cart is empty.', 'error');
      return;
    }

    if (!branchId) {
      showToast(
        'No branch assigned to your account.',
        'error'
      );

      return;
    }

    const total = cartTotalMinor();

    const amountPaidMinor = toMinorUnits(
      amountReceivedInput.value || 0
    );

    const method =
      document.getElementById('payment-method').value;

    await withButtonLoading(
      e.target,
      'Processing…',
      async () => {
        try {
          const res = await api.post(
            '/sales',
            {
              branchId,

              cart: cart.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
              })),

              payments: [
                {
                  method,
                  amountMinor: Math.min(
                    amountPaidMinor,
                    total
                  ),
                },
              ],
            },
            {
              queueWhenOffline: true,
              idempotencyKey: crypto.randomUUID(),
            }
          );

          if (res.data.queued) {
            showToast(
              'Sale saved on this device and will sync when the connection returns.',
              'success'
            );
          } else {
            showReceipt(res.data);
          }

          cart = [];
          renderCart();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  });

function showReceipt(sale) {
  const modal =
    document.getElementById('receipt-modal');

  const body =
    document.getElementById('receipt-body');

  const paymentLines =
    sale.payments
      ?.map(
        (payment) => `
          <div class="receipt-summary-row">
            <span>
              ${escapeHtml(
                payment.method.replace('_', ' ')
              )}
            </span>

            <strong>
              ${formatMoney(
                payment.amountMinor,
                sale.currency
              )}
            </strong>
          </div>
        `
      )
      .join('') || '';

  const discountMinor =
    sale.discountMinor || 0;

  body.innerHTML = `
    <div class="receipt-header">
      <div class="receipt-brand">
        ${escapeHtml(session.business.name)}
      </div>

      <div class="receipt-contact">
        ${escapeHtml(
          session.branch?.name || 'Main branch'
        )}
      </div>

      <div class="receipt-contact">
        ${escapeHtml(sale.saleNumber)}
        ·
        ${escapeHtml(
          new Date(sale.createdAt).toLocaleString()
        )}
      </div>
    </div>

    <table class="receipt-items">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${sale.items
          .map(
            (i) => `
              <tr>
                <td>
                  ${escapeHtml(i.name)}
                  <small>
                    ${formatMoney(
                      i.unitPriceMinor,
                      sale.currency
                    )} each
                  </small>
                </td>

                <td>${i.quantity}</td>

                <td>
                  ${formatMoney(
                    i.subtotalMinor,
                    sale.currency
                  )}
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>

    <div class="receipt-summary">
      <div class="receipt-summary-row">
        <span>Subtotal</span>
        <strong>
          ${formatMoney(
            sale.subtotalMinor,
            sale.currency
          )}
        </strong>
      </div>

      ${
        discountMinor
          ? `
            <div class="receipt-summary-row">
              <span>Discount</span>
              <strong>
                -${formatMoney(
                  discountMinor,
                  sale.currency
                )}
              </strong>
            </div>
          `
          : ''
      }

      <div class="receipt-total">
        <span>Total</span>
        <strong>
          ${formatMoney(
            sale.totalMinor,
            sale.currency
          )}
        </strong>
      </div>

      ${paymentLines}

      ${
        sale.balanceMinor > 0
          ? `
            <div class="receipt-summary-row receipt-balance">
              <span>Balance due</span>
              <strong>
                ${formatMoney(
                  sale.balanceMinor,
                  sale.currency
                )}
              </strong>
            </div>
          `
          : `
            <div class="receipt-summary-row">
              <span>Payment status</span>
              <strong>Paid</strong>
            </div>
          `
      }
    </div>

    <div class="receipt-footer">
      Thank you for your business.<br>
      Served by ${escapeHtml(session.user.fullName)}
    </div>
  `;

  modal.style.display = 'flex';
}

async function loadSalesHistory() {
  salesHistoryEl.innerHTML =
    '<div class="empty-state">Loading sales history…</div>';

  try {
    const res = await api.get('/sales', {
      page: 1,
      limit: 8,
    });

    if (res.data.length === 0) {
      emptyState(salesHistoryEl, {
        title: 'No sales yet',
        message:
          'Completed transactions will appear here for review and refunds.',
      });

      return;
    }

    salesHistoryEl.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sale number</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th>When</th>
            </tr>
          </thead>

          <tbody>
            ${res.data
              .map(
                (sale) => `
                  <tr>
                    <td>
                      ${escapeHtml(
                        sale.saleNumber
                      )}
                    </td>

                    <td>
                      ${formatMoney(
                        sale.totalMinor,
                        sale.currency
                      )}
                    </td>

                    <td>
                      ${formatMoney(
                        sale.amountPaidMinor,
                        sale.currency
                      )}
                    </td>

                    <td>
                      <span
                        class="badge ${
                          sale.paymentStatus === 'PAID'
                            ? 'badge-success'
                            : 'badge-warning'
                        }"
                      >
                        ${escapeHtml(
                          sale.paymentStatus
                        )}
                      </span>
                    </td>

                    <td>
                      ${escapeHtml(
                        new Date(
                          sale.createdAt
                        ).toLocaleString()
                      )}
                    </td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    salesHistoryEl.innerHTML = `
      <div class="empty-state">
        <h3>Sales history unavailable</h3>
        <p>
          We could not load recent transactions.
          Try again.
        </p>
      </div>
    `;

    showToast(err.message, 'error');
  }
}

document
  .getElementById('new-sale-btn')
  .addEventListener('click', () => {
    document.getElementById(
      'receipt-modal'
    ).style.display = 'none';

    scanInput.focus();
  });

document
  .getElementById('refresh-sales-btn')
  .addEventListener(
    'click',
    loadSalesHistory
  );

renderCart();
loadSalesHistory();
