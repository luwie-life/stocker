import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import {
  formatMoney,
  toMinorUnits,
  emptyState,
  showToast,
  withButtonLoading,
  escapeHtml
} from '../shared/ui.js';

const session = await requireSession();

renderShell(session, 'inventory.html');

const currency = session.business.currency;
const branchId = session.branch?.id;

const listEl = document.getElementById('product-list');
const searchInput = document.getElementById('search-input');
const productModal = document.getElementById('product-modal');
const stockModal = document.getElementById('stock-modal');

let stockByProduct = {};

document.getElementById(
  'cost-label'
).textContent = `Cost price (${currency})`;

document.getElementById(
  'price-label'
).textContent = `Selling price (${currency})`;

function addMobileLabels(table) {
  const headers = Array.from(
    table.querySelectorAll('thead th')
  ).map((th) => th.textContent.trim());

  table.querySelectorAll('tbody tr').forEach((row) => {
    Array.from(row.children).forEach((cell, index) => {
      if (headers[index]) {
        cell.setAttribute('data-label', headers[index]);
      }
    });
  });
}

async function loadStockLevels() {
  if (!branchId) return;

  const res = await api.get(
    `/inventory/branch/${branchId}`
  );

  stockByProduct = {};

  for (const row of res.data) {
    stockByProduct[row.product._id] = row.quantity;
  }
}

async function loadProducts() {
  listEl.innerHTML = `
    <div class="empty-state">
      Loading products…
    </div>
  `;

  try {
    const search = searchInput.value.trim();

    const [productsRes] = await Promise.all([
      api.get('/products', { search }),
      loadStockLevels()
    ]);

    const products = productsRes.data;

    if (products.length === 0) {
      emptyState(listEl, {
        title: search
          ? 'No matching products'
          : 'No products yet',

        message: search
          ? 'Try a different search term.'
          : 'Add your first product so stocker can start tracking your inventory.',

        actionLabel: search
          ? null
          : 'Add product',

        onAction: () => openProductModal()
      });

      return;
    }

    listEl.innerHTML = `
      <div class="table-wrap mobile-cards">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${products
              .map((product) => {
                const quantity =
                  stockByProduct[product._id] ?? 0;

                const low =
                  quantity <= product.minimumStock;

                return `
                  <tr>
                    <td>
                      <strong>
                        ${escapeHtml(product.name)}
                      </strong>
                    </td>

                    <td>
                      ${escapeHtml(
                        product.sku || '—'
                      )}
                    </td>

                    <td>
                      <span class="badge ${
                        low
                          ? 'badge-danger'
                          : 'badge-success'
                      }">
                        ${quantity}
                      </span>
                    </td>

                    <td>
                      ${formatMoney(
                        product.costPriceMinor,
                        currency
                      )}
                    </td>

                    <td>
                      ${formatMoney(
                        product.sellingPriceMinor,
                        currency
                      )}
                    </td>

                    <td>
                      <div class="table-actions">
                        <button
                          class="btn btn-secondary adjust-stock-btn"
                          data-id="${product._id}"
                          type="button"
                        >
                          Adjust stock
                        </button>

                        <button
                          class="btn btn-secondary edit-btn"
                          data-id="${product._id}"
                          type="button"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    const table = listEl.querySelector('table');

    if (table) {
      addMobileLabels(table);
    }

    listEl
      .querySelectorAll('.adjust-stock-btn')
      .forEach((button) => {
        button.addEventListener(
          'click',
          () => openStockModal(button.dataset.id)
        );
      });

    listEl
      .querySelectorAll('.edit-btn')
      .forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            const product = products.find(
              (item) =>
                item._id === button.dataset.id
            );

            if (product) {
              openProductModal(product);
            }
          }
        );
      });
  } catch (error) {
    emptyState(listEl, {
      title: 'Inventory unavailable',
      message: error.message,
      actionLabel: 'Try again',
      onAction: () => loadProducts()
    });

    showToast(
      error.message,
      'error'
    );
  }
}

function openProductModal(product) {
  document.getElementById(
    'modal-title'
  ).textContent = product
    ? 'Edit product'
    : 'Add product';

  document.getElementById(
    'product-id'
  ).value = product?._id || '';

  document.getElementById(
    'p-name'
  ).value = product?.name || '';

  document.getElementById(
    'p-sku'
  ).value = product?.sku || '';

  document.getElementById(
    'p-barcode'
  ).value = product?.barcodes?.[0] || '';

  document.getElementById(
    'p-cost'
  ).value = product
    ? product.costPriceMinor / 100
    : '';

  document.getElementById(
    'p-price'
  ).value = product
    ? product.sellingPriceMinor / 100
    : '';

  document.getElementById(
    'p-minstock'
  ).value = product?.minimumStock ?? 0;

  productModal.style.display = 'flex';
}

document
  .getElementById('new-product-btn')
  .addEventListener(
    'click',
    () => openProductModal()
  );

document
  .getElementById('modal-cancel')
  .addEventListener(
    'click',
    () => {
      productModal.style.display = 'none';
    }
  );

document
  .getElementById('product-form')
  .addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      const id =
        document.getElementById(
          'product-id'
        ).value;

      const barcode =
        document.getElementById(
          'p-barcode'
        ).value.trim();

      const payload = {
        name: document
          .getElementById('p-name')
          .value.trim(),

        sku:
          document
            .getElementById('p-sku')
            .value.trim() || undefined,

        barcodes: barcode
          ? [barcode]
          : [],

        costPriceMinor:
          toMinorUnits(
            document.getElementById(
              'p-cost'
            ).value
          ),

        sellingPriceMinor:
          toMinorUnits(
            document.getElementById(
              'p-price'
            ).value
          ),

        minimumStock:
          Number(
            document.getElementById(
              'p-minstock'
            ).value
          ) || 0
      };

      const saveButton =
        document.getElementById(
          'modal-save'
        );

      await withButtonLoading(
        saveButton,
        'Saving…',
        async () => {
          try {
            if (id) {
              await api.patch(
                `/products/${id}`,
                payload
              );

              showToast(
                'Product updated.',
                'success'
              );
            } else {
              await api.post(
                '/products',
                payload
              );

              showToast(
                'Product added.',
                'success'
              );
            }

            productModal.style.display =
              'none';

            await loadProducts();
          } catch (error) {
            showToast(
              error.message,
              'error'
            );
          }
        }
      );
    }
  );

function openStockModal(productId) {
  document.getElementById(
    's-product-id'
  ).value = productId;

  document.getElementById(
    's-quantity'
  ).value = '';

  document.getElementById(
    's-reason'
  ).value = '';

  stockModal.style.display = 'flex';
}

document
  .getElementById('stock-modal-cancel')
  .addEventListener(
    'click',
    () => {
      stockModal.style.display = 'none';
    }
  );

document
  .getElementById('stock-form')
  .addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();

      if (!branchId) {
        showToast(
          'No branch assigned to your account.',
          'error'
        );

        return;
      }

      try {
        const result = await api.post(
          '/inventory/adjust',
          {
            branchId,

            productId:
              document.getElementById(
                's-product-id'
              ).value,

            quantity:
              Number(
                document.getElementById(
                  's-quantity'
                ).value
              ),

            type:
              document.getElementById(
                's-type'
              ).value,

            reason:
              document
                .getElementById(
                  's-reason'
                )
                .value.trim() ||
              undefined,

            clientRequestId:
              crypto.randomUUID()
          },
          {
            queueWhenOffline: true,
            idempotencyKey:
              crypto.randomUUID()
          }
        );

        showToast(
          result.data.queued
            ? 'Stock change saved and will sync when online.'
            : 'Stock updated.',
          'success'
        );

        stockModal.style.display =
          'none';

        await loadProducts();
      } catch (error) {
        showToast(
          error.message,
          'error'
        );
      }
    }
  );

let searchTimer;

searchInput.addEventListener(
  'input',
  () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(
      loadProducts,
      300
    );
  }
);

await loadProducts();
