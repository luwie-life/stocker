import { requireSession } from '../auth/guard.js';

import { renderShell } from '../shared/layout.js';

import {
  api,
  downloadFile
} from '../api/client.js';

import {
  formatMoney,
  toMinorUnits,
  emptyState,
  showToast,
  withButtonLoading,
  escapeHtml
} from '../shared/ui.js';


const session =
  await requireSession();

renderShell(
  session,
  'inventory.html'
);


const currency =
  session.business.currency;

const branchId =
  session.branch?.id;


const listEl =
  document.getElementById(
    'product-list'
  );

const searchInput =
  document.getElementById(
    'search-input'
  );

const productModal =
  document.getElementById(
    'product-modal'
  );

const stockModal =
  document.getElementById(
    'stock-modal'
  );

const importModal =
  document.getElementById(
    'import-modal'
  );

const importFile =
  document.getElementById(
    'import-file'
  );

const importStepUpload =
  document.getElementById(
    'import-step-upload'
  );

const importStepPreview =
  document.getElementById(
    'import-step-preview'
  );

const importSummary =
  document.getElementById(
    'import-summary'
  );

const importErrors =
  document.getElementById(
    'import-errors'
  );

const importPlanWarning =
  document.getElementById(
    'import-plan-warning'
  );


let stockByProduct = {};

let importPreview = null;


document.getElementById(
  'cost-label'
).textContent =
  `Cost price (${currency})`;

document.getElementById(
  'price-label'
).textContent =
  `Selling price (${currency})`;


function addMobileLabels(table) {
  const headers =
    Array.from(
      table.querySelectorAll(
        'thead th'
      )
    ).map((th) =>
      th.textContent.trim()
    );

  table
    .querySelectorAll(
      'tbody tr'
    )
    .forEach((row) => {
      Array.from(
        row.children
      ).forEach(
        (cell, index) => {
          if (headers[index]) {
            cell.setAttribute(
              'data-label',
              headers[index]
            );
          }
        }
      );
    });
}


async function loadStockLevels() {
  if (!branchId) return;

  const res =
    await api.get(
      `/inventory/branch/${branchId}`
    );

  stockByProduct = {};

  for (
    const row of res.data
  ) {
    if (row.product?._id) {
      stockByProduct[
        row.product._id
      ] = row.quantity;
    }
  }
}


async function loadProducts() {
  listEl.innerHTML = `
    <div class="empty-state">
      Loading products…
    </div>
  `;

  try {
    const search =
      searchInput.value.trim();

    const [
      productsRes
    ] = await Promise.all([
      api.get('/products', {
        search,
      }),

      loadStockLevels(),
    ]);

    const products =
      productsRes.data;

    if (
      products.length === 0
    ) {
      emptyState(
        listEl,
        {
          title: search
            ? 'No matching products'
            : 'No products yet',

          message: search
            ? 'Try a different search term.'
            : 'Add your first product so Stocker can start tracking your inventory.',

          actionLabel: search
            ? null
            : 'Add product',

          onAction: () =>
            openProductModal(),
        }
      );

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
                  stockByProduct[
                    product._id
                  ] ?? 0;

                const low =
                  quantity <=
                  product.minimumStock;

                return `
                  <tr>

                    <td>
                      <strong>
                        ${escapeHtml(
                          product.name
                        )}
                      </strong>
                    </td>

                    <td>
                      ${escapeHtml(
                        product.sku ||
                          '—'
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

    const table =
      listEl.querySelector(
        'table'
      );

    if (table) {
      addMobileLabels(table);
    }

    listEl
      .querySelectorAll(
        '.adjust-stock-btn'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () =>
              openStockModal(
                button.dataset.id
              )
          );
        }
      );

    listEl
      .querySelectorAll(
        '.edit-btn'
      )
      .forEach(
        (button) => {
          button.addEventListener(
            'click',
            () => {
              const product =
                products.find(
                  (item) =>
                    item._id ===
                    button.dataset
                      .id
                );

              if (product) {
                openProductModal(
                  product
                );
              }
            }
          );
        }
      );
  } catch (error) {
    emptyState(
      listEl,
      {
        title:
          'Inventory unavailable',

        message:
          error.message,

        actionLabel:
          'Try again',

        onAction:
          () => loadProducts(),
      }
    );

    showToast(
      error.message,
      'error'
    );
  }
}


/*
|--------------------------------------------------------------------------
| Product modal
|--------------------------------------------------------------------------
*/

function openProductModal(
  product
) {
  document.getElementById(
    'modal-title'
  ).textContent =
    product
      ? 'Edit product'
      : 'Add product';

  document.getElementById(
    'product-id'
  ).value =
    product?._id || '';

  document.getElementById(
    'p-name'
  ).value =
    product?.name || '';

  document.getElementById(
    'p-sku'
  ).value =
    product?.sku || '';

  document.getElementById(
    'p-barcode'
  ).value =
    product?.barcodes?.[0] ||
    '';

  document.getElementById(
    'p-cost'
  ).value =
    product
      ? product.costPriceMinor /
        100
      : '';

  document.getElementById(
    'p-price'
  ).value =
    product
      ? product.sellingPriceMinor /
        100
      : '';

  document.getElementById(
    'p-minstock'
  ).value =
    product?.minimumStock ??
    0;

  productModal.style.display =
    'flex';
}


document
  .getElementById(
    'new-product-btn'
  )
  .addEventListener(
    'click',
    () =>
      openProductModal()
  );


document
  .getElementById(
    'modal-cancel'
  )
  .addEventListener(
    'click',
    () => {
      productModal.style.display =
        'none';
    }
  );


document
  .getElementById(
    'product-form'
  )
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
          .getElementById(
            'p-name'
          )
          .value.trim(),

        sku:
          document
            .getElementById(
              'p-sku'
            )
            .value.trim() ||
          undefined,

        barcodes:
          barcode
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
          ) || 0,
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


/*
|--------------------------------------------------------------------------
| Stock modal
|--------------------------------------------------------------------------
*/

function openStockModal(
  productId
) {
  document.getElementById(
    's-product-id'
  ).value =
    productId;

  document.getElementById(
    's-quantity'
  ).value =
    '';

  document.getElementById(
    's-reason'
  ).value =
    '';

  stockModal.style.display =
    'flex';
}


document
  .getElementById(
    'stock-modal-cancel'
  )
  .addEventListener(
    'click',
    () => {
      stockModal.style.display =
        'none';
    }
  );


document
  .getElementById(
    'stock-form'
  )
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
        const result =
          await api.post(
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
                crypto.randomUUID(),
            },
            {
              queueWhenOffline:
                true,

              idempotencyKey:
                crypto.randomUUID(),
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


/*
|--------------------------------------------------------------------------
| Excel import
|--------------------------------------------------------------------------
*/

function resetImportModal() {
  importPreview =
    null;

  importFile.value =
    '';

  importStepUpload.style.display =
    'block';

  importStepPreview.style.display =
    'none';

  importSummary.innerHTML =
    '';

  importErrors.style.display =
    'none';

  importErrors.innerHTML =
    '';

  importPlanWarning.style.display =
    'none';

  importPlanWarning.textContent =
    '';
}


function openImportModal() {
  resetImportModal();

  importModal.style.display =
    'flex';
}


function closeImportModal() {
  importModal.style.display =
    'none';

  resetImportModal();
}


document
  .getElementById(
    'import-products-btn'
  )
  .addEventListener(
    'click',
    openImportModal
  );


document
  .getElementById(
    'import-cancel-btn'
  )
  .addEventListener(
    'click',
    closeImportModal
  );


document
  .getElementById(
    'download-template-btn'
  )
  .addEventListener(
    'click',
    async () => {
      try {
        await downloadFile(
          '/products/import/template',
          'stocker-inventory-template.xlsx'
        );

        showToast(
          'Template downloaded.',
          'success'
        );
      } catch (error) {
        showToast(
          error.message,
          'error'
        );
      }
    }
  );


function renderImportSummary(
  preview
) {
  importSummary.innerHTML = `
    <div
      style="
        padding:14px;
        border:1px solid var(--border);
        border-radius:12px;
        background:var(--paper);
      "
    >
      <div
        style="
          font-size:0.78rem;
          color:var(--muted);
          margin-bottom:5px;
        "
      >
        Rows found
      </div>

      <strong>
        ${preview.totalRows}
      </strong>
    </div>

    <div
      style="
        padding:14px;
        border:1px solid var(--border);
        border-radius:12px;
        background:var(--paper);
      "
    >
      <div
        style="
          font-size:0.78rem;
          color:var(--muted);
          margin-bottom:5px;
        "
      >
        Ready
      </div>

      <strong>
        ${preview.validRows}
      </strong>
    </div>

    <div
      style="
        padding:14px;
        border:1px solid var(--border);
        border-radius:12px;
        background:var(--paper);
      "
    >
      <div
        style="
          font-size:0.78rem;
          color:var(--muted);
          margin-bottom:5px;
        "
      >
        Need attention
      </div>

      <strong>
        ${preview.invalidRows}
      </strong>
    </div>
  `;
}


function renderImportErrors(
  rows
) {
  const invalidRows =
    rows.filter(
      (row) =>
        Array.isArray(
          row.errors
        ) &&
        row.errors.length
    );

  if (
    invalidRows.length === 0
  ) {
    importErrors.style.display =
      'none';

    importErrors.innerHTML =
      '';

    return;
  }

  const visible =
    invalidRows.slice(0, 30);

  importErrors.style.display =
    'block';

  importErrors.innerHTML = `
    <div
      style="
        margin-top:14px;
        border:1px solid var(--border);
        border-radius:12px;
        overflow:hidden;
      "
    >

      <div
        style="
          padding:13px 14px;
          font-weight:700;
          background:var(--paper);
        "
      >
        Fix these rows before importing
      </div>

      <div
        style="
          max-height:260px;
          overflow:auto;
        "
      >

        ${visible
          .map(
            (row) => `
              <div
                style="
                  padding:11px 14px;
                  border-top:1px solid var(--border);
                "
              >

                <strong>
                  Row ${row.rowNumber}
                </strong>

                <div
                  style="
                    margin-top:4px;
                    color:var(--muted);
                    line-height:1.5;
                  "
                >
                  ${row.errors
                    .map(
                      (error) =>
                        escapeHtml(
                          error
                        )
                    )
                    .join(
                      '<br>'
                    )}
                </div>

              </div>
            `
          )
          .join('')}

      </div>

      ${
        invalidRows.length >
        visible.length
          ? `
            <div
              style="
                padding:11px 14px;
                color:var(--muted);
                border-top:1px solid var(--border);
              "
            >
              Showing the first ${visible.length}
              errors. Fix the spreadsheet and review it again.
            </div>
          `
          : ''
      }

    </div>
  `;
}


async function previewImport() {
  if (!branchId) {
    showToast(
      'No branch is assigned to your account. Opening stock cannot be imported.',
      'error'
    );

    return;
  }

  const file =
    importFile.files?.[0];

  if (!file) {
    showToast(
      'Choose your Stocker Excel file first.',
      'error'
    );

    return;
  }

  const allowedExtensions =
    [
      '.xlsx',
      '.xls',
      '.csv',
    ];

  const extension =
    `.${file.name
      .split('.')
      .pop()
      .toLowerCase()}`;

  if (
    !allowedExtensions.includes(
      extension
    )
  ) {
    showToast(
      'Please upload an .xlsx, .xls, or .csv file.',
      'error'
    );

    return;
  }

  if (
    file.size >
    10 * 1024 * 1024
  ) {
    showToast(
      'The file is larger than 10MB.',
      'error'
    );

    return;
  }

  const button =
    document.getElementById(
      'preview-import-btn'
    );

  await withButtonLoading(
    button,
    'Reading file…',
    async () => {
      try {
        const formData =
          new FormData();

        formData.append(
          'file',
          file
        );

        const result =
          await api.post(
            '/products/import/preview',
            formData
          );

        importPreview =
          result.data;

        renderImportSummary(
          importPreview
        );

        renderImportErrors(
          importPreview.rows
        );

        if (
          importPreview.planError
        ) {
          importPlanWarning.style.display =
            'block';

          importPlanWarning.textContent =
            importPreview.planError;
        }

        document.getElementById(
          'confirm-import-btn'
        ).disabled =
          importPreview.validRows ===
            0 ||
          Boolean(
            importPreview.planError
          ) ||
          importPreview.invalidRows >
            0;

        importStepUpload.style.display =
          'none';

        importStepPreview.style.display =
          'block';
      } catch (error) {
        showToast(
          error.message,
          'error'
        );
      }
    }
  );
}


document
  .getElementById(
    'preview-import-btn'
  )
  .addEventListener(
    'click',
    previewImport
  );


document
  .getElementById(
    'back-import-btn'
  )
  .addEventListener(
    'click',
    () => {
      importStepPreview.style.display =
        'none';

      importStepUpload.style.display =
        'block';
    }
  );


async function confirmImport() {
  if (
    !importPreview ||
    !importPreview.rows
  ) {
    showToast(
      'Please review the spreadsheet first.',
      'error'
    );

    return;
  }

  if (
    importPreview.invalidRows >
    0
  ) {
    showToast(
      'Fix the spreadsheet errors before importing.',
      'error'
    );

    return;
  }

  if (
    importPreview.planError
  ) {
    showToast(
      importPreview.planError,
      'error'
    );

    return;
  }

  const button =
    document.getElementById(
      'confirm-import-btn'
    );

  await withButtonLoading(
    button,
    'Importing…',
    async () => {
      try {
        const result =
          await api.post(
            '/products/import/confirm',
            {
              branchId,
              rows:
                importPreview.rows,
            }
          );

        const imported =
          result.data
            ?.importedProducts ||
          0;

        const stock =
          result.data
            ?.importedStock ||
          0;

        closeImportModal();

        showToast(
          `${imported} products imported${stock ? ` with ${stock} opening stock units.` : '.'}`,
          'success'
        );

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


document
  .getElementById(
    'confirm-import-btn'
  )
  .addEventListener(
    'click',
    confirmImport
  );


/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
*/

let searchTimer;

searchInput.addEventListener(
  'input',
  () => {
    clearTimeout(
      searchTimer
    );

    searchTimer =
      setTimeout(
        loadProducts,
        300
      );
  }
);


await loadProducts();
