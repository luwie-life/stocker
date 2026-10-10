import { requireSession } from '../auth/guard.js';
import { renderShell } from '../shared/layout.js';
import { api } from '../api/client.js';
import {
  emptyState,
  escapeHtml,
  formatMoney,
  showToast,
  withButtonLoading,
  toMinorUnits
} from '../shared/ui.js';

const session = await requireSession();

renderShell(session, 'invoices.html');

const branchSelect = document.getElementById('invoice-branch');
const list = document.getElementById('invoice-list');

const invoiceCache = new Map();
const branchNames = new Map();

function safeDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString();
}

function printDocument(title, content) {
  const printWindow = window.open(
    '',
    '_blank',
    'width=900,height=700'
  );

  if (!printWindow) {
    showToast(
      'Allow pop-ups for stocker to print invoices.',
      'error'
    );
    return;
  }

  printWindow.document.open();

  printWindow.document.write(
    '<!doctype html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(title) + '</title>' +

    '<style>' +
    '*{box-sizing:border-box}' +

    'body{' +
      'margin:0;' +
      'background:#fff;' +
      'color:#191716;' +
      'font:12px/1.5 Arial,Helvetica,sans-serif;' +
    '}' +

    '.sheet{' +
      'width:100%;' +
      'max-width:800px;' +
      'margin:0 auto;' +
      'padding:36px;' +
    '}' +

    '.top{' +
      'display:flex;' +
      'justify-content:space-between;' +
      'gap:24px;' +
      'border-bottom:2px solid #6b4f3a;' +
      'padding-bottom:22px;' +
      'margin-bottom:24px;' +
    '}' +

    '.brand{' +
      'font-size:23px;' +
      'font-weight:700;' +
      'overflow-wrap:anywhere;' +
    '}' +

    '.muted{color:#716a64}' +
    '.small{font-size:11px}' +

    '.doc-label{' +
      'font-size:27px;' +
      'font-weight:700;' +
      'letter-spacing:.08em;' +
      'color:#6b4f3a;' +
      'text-align:right;' +
    '}' +

    '.meta{' +
      'text-align:right;' +
      'margin-top:8px;' +
    '}' +

    '.parties{' +
      'display:grid;' +
      'grid-template-columns:1fr 1fr;' +
      'gap:24px;' +
      'margin:24px 0;' +
    '}' +

    '.label{' +
      'font-size:10px;' +
      'font-weight:700;' +
      'letter-spacing:.1em;' +
      'text-transform:uppercase;' +
      'color:#716a64;' +
      'margin-bottom:5px;' +
    '}' +

    'table{' +
      'width:100%;' +
      'border-collapse:collapse;' +
      'margin-top:20px;' +
    '}' +

    'th{' +
      'background:#f5f2ee;' +
      'text-align:left;' +
      'font-size:10px;' +
      'text-transform:uppercase;' +
      'letter-spacing:.05em;' +
    '}' +

    'th,td{' +
      'padding:11px 9px;' +
      'border-bottom:1px solid #e7e1db;' +
      'vertical-align:top;' +
      'overflow-wrap:anywhere;' +
    '}' +

    'td.num,th.num{' +
      'text-align:right;' +
      'white-space:nowrap;' +
    '}' +

    '.totals{' +
      'width:300px;' +
      'max-width:100%;' +
      'margin:18px 0 0 auto;' +
    '}' +

    '.total-row{' +
      'display:flex;' +
      'justify-content:space-between;' +
      'gap:16px;' +
      'padding:6px 0;' +
    '}' +

    '.grand{' +
      'border-top:2px solid #6b4f3a;' +
      'margin-top:6px;' +
      'padding-top:12px;' +
      'font-size:16px;' +
      'font-weight:700;' +
    '}' +

    '.notes{' +
      'margin-top:28px;' +
      'padding:14px;' +
      'background:#f8f6f3;' +
      'white-space:pre-wrap;' +
      'overflow-wrap:anywhere;' +
    '}' +

    '.footer{' +
      'margin-top:36px;' +
      'padding-top:14px;' +
      'border-top:1px solid #e7e1db;' +
      'text-align:center;' +
      'color:#716a64;' +
      'font-size:10px;' +
    '}' +

    '.print-bar{' +
      'display:flex;' +
      'justify-content:center;' +
      'padding:16px;' +
      'background:#f7f5f1;' +
    '}' +

    '.print-bar button{' +
      'border:0;' +
      'border-radius:8px;' +
      'background:#6b4f3a;' +
      'color:#fff;' +
      'padding:10px 18px;' +
      'font-weight:700;' +
      'cursor:pointer;' +
    '}' +

    '@page{size:A4;margin:12mm}' +

    '@media print{' +
      '.sheet{max-width:none;padding:0}' +
      '.print-bar{display:none}' +
      'body{' +
        'print-color-adjust:exact;' +
        '-webkit-print-color-adjust:exact;' +
      '}' +
    '}' +

    '@media(max-width:600px){' +
      '.sheet{padding:18px}' +
      '.top{gap:12px}' +
      '.brand{font-size:19px}' +
      '.doc-label{font-size:21px}' +
      '.parties{gap:12px}' +
    '}' +

    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="print-bar">' +
      '<button onclick="window.print()">Print invoice</button>' +
    '</div>' +
    content +
    '</body>' +
    '</html>'
  );

  printWindow.document.close();
  printWindow.focus();
}

function invoiceMarkup(invoice) {
  const branding =
    session.business.receiptBranding || {};

  const branchName =
    branchNames.get(String(invoice.branch)) ||
    session.branch?.name ||
    'Business branch';

  const lines = Array.isArray(invoice.lines)
    ? invoice.lines
    : [];

  const lineRows = lines.map(function (line) {
    const quantity = Number(line.quantity) || 0;

    const unitPrice =
      Number(line.unitPriceMinor) || 0;

    const subtotal = Number(
      line.subtotalMinor ?? quantity * unitPrice
    ) || 0;

    return (
      '<tr>' +
        '<td>' +
          escapeHtml(line.description || 'Item or service') +
        '</td>' +
        '<td class="num">' + quantity + '</td>' +
        '<td class="num">' +
          formatMoney(unitPrice, session.business.currency) +
        '</td>' +
        '<td class="num">' +
          formatMoney(subtotal, session.business.currency) +
        '</td>' +
      '</tr>'
    );
  }).join('');

  const subtotalMinor =
    Number(invoice.subtotalMinor) || 0;

  const discountMinor =
    Number(invoice.discountMinor) || 0;

  const taxMinor =
    Number(invoice.taxMinor) || 0;

  const totalMinor =
    Number(invoice.totalMinor) || 0;

  const notes = invoice.notes
    ? (
      '<div class="notes">' +
        '<div class="label">Notes</div>' +
        escapeHtml(invoice.notes) +
      '</div>'
    )
    : '';

  return (
    '<main class="sheet">' +

      '<header class="top">' +

        '<div>' +
          '<div class="brand">' +
            escapeHtml(session.business.name || 'Business') +
          '</div>' +

          '<div class="muted">' +
            escapeHtml(branchName) +
          '</div>' +

          (
            branding.address
              ? '<div class="muted small">' +
                  escapeHtml(branding.address) +
                '</div>'
              : ''
          ) +

          (
            branding.phone
              ? '<div class="muted small">' +
                  escapeHtml(branding.phone) +
                '</div>'
              : ''
          ) +

          (
            branding.email
              ? '<div class="muted small">' +
                  escapeHtml(branding.email) +
                '</div>'
              : ''
          ) +

        '</div>' +

        '<div>' +
          '<div class="doc-label">INVOICE</div>' +

          '<div class="meta">' +
            '<strong>' +
              escapeHtml(invoice.invoiceNumber || 'Invoice') +
            '</strong><br>' +

            '<span class="muted">Issued: ' +
              escapeHtml(safeDate(invoice.createdAt)) +
            '</span><br>' +

            '<span class="muted">Status: ' +
              escapeHtml(invoice.status || 'ISSUED') +
            '</span>' +

            (
              invoice.dueDate
                ? '<br><span class="muted">Due: ' +
                    escapeHtml(safeDate(invoice.dueDate)) +
                  '</span>'
                : ''
            ) +

          '</div>' +
        '</div>' +

      '</header>' +

      '<section class="parties">' +
        '<div>' +
          '<div class="label">Bill to</div>' +
          '<strong>' +
            escapeHtml(
              invoice.customerName ||
              invoice.customer?.name ||
              'Customer'
            ) +
          '</strong>' +
        '</div>' +

        '<div>' +
          '<div class="label">Branch</div>' +
          '<strong>' + escapeHtml(branchName) + '</strong>' +
        '</div>' +
      '</section>' +

      '<table>' +
        '<thead>' +
          '<tr>' +
            '<th>Description</th>' +
            '<th class="num">Qty</th>' +
            '<th class="num">Unit price</th>' +
            '<th class="num">Amount</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + lineRows + '</tbody>' +
      '</table>' +

      '<section class="totals">' +

        '<div class="total-row">' +
          '<span class="muted">Subtotal</span>' +
          '<strong>' +
            formatMoney(subtotalMinor, session.business.currency) +
          '</strong>' +
        '</div>' +

        (
          discountMinor
            ? '<div class="total-row">' +
                '<span class="muted">Discount</span>' +
                '<strong>−' +
                  formatMoney(discountMinor, session.business.currency) +
                '</strong>' +
              '</div>'
            : ''
        ) +

        (
          taxMinor
            ? '<div class="total-row">' +
                '<span class="muted">Tax</span>' +
                '<strong>' +
                  formatMoney(taxMinor, session.business.currency) +
                '</strong>' +
              '</div>'
            : ''
        ) +

        '<div class="total-row grand">' +
          '<span>Total due</span>' +
          '<strong>' +
            formatMoney(totalMinor, session.business.currency) +
          '</strong>' +
        '</div>' +

      '</section>' +

      notes +

      '<footer class="footer">' +
        'Thank you for your business.' +
      '</footer>' +

    '</main>'
  );
}

function printInvoice(invoice) {
  printDocument(
    'Invoice ' + (invoice.invoiceNumber || ''),
    invoiceMarkup(invoice)
  );
}

async function load() {
  list.setAttribute('aria-busy', 'true');

  list.innerHTML =
    '<div class="empty-state">Loading invoices…</div>';

  try {
    const result = await api.get('/invoices', {
      page: 1,
      limit: 20
    });

    invoiceCache.clear();

    if (!result.data.length) {
      emptyState(list, {
        title: 'No invoices yet',
        message:
          'Create an invoice when a customer needs a formal payment record.'
      });

      return;
    }

    result.data.forEach(function (invoice) {
      invoiceCache.set(String(invoice._id), invoice);
    });

    list.innerHTML =
      '<div class="table-wrap mobile-cards">' +
        '<table>' +
          '<thead>' +
            '<tr>' +
              '<th>Invoice</th>' +
              '<th>Total</th>' +
              '<th>Status</th>' +
              '<th>Created</th>' +
              '<th>Actions</th>' +
            '</tr>' +
          '</thead>' +

          '<tbody>' +

            result.data.map(function (invoice) {
              return (
                '<tr>' +

                  '<td>' +
                    escapeHtml(invoice.invoiceNumber) +
                  '</td>' +

                  '<td>' +
                    formatMoney(
                      invoice.totalMinor,
                      session.business.currency
                    ) +
                  '</td>' +

                  '<td>' +
                    '<span class="badge badge-muted">' +
                      escapeHtml(invoice.status) +
                    '</span>' +
                  '</td>' +

                  '<td>' +
                    escapeHtml(safeDate(invoice.createdAt)) +
                  '</td>' +

                  '<td>' +
                    '<button class="btn btn-secondary" ' +
                      'type="button" ' +
                      'data-print-invoice="' +
                        escapeHtml(invoice._id) +
                      '">' +
                      'Print' +
                    '</button>' +
                  '</td>' +

                '</tr>'
              );
            }).join('') +

          '</tbody>' +
        '</table>' +
      '</div>';

    const table = list.querySelector('table');

    if (table) {
      const headers = Array.from(
        table.querySelectorAll('thead th')
      ).map(function (th) {
        return th.textContent.trim();
      });

      table.querySelectorAll('tbody tr').forEach(function (row) {
        Array.from(row.children).forEach(function (cell, index) {
          if (headers[index]) {
            cell.dataset.label = headers[index];
          }
        });
      });
    }

  } catch (error) {
    list.innerHTML =
      '<div class="empty-state">' +
        '<h3>Invoices unavailable</h3>' +
        '<p>Try again in a moment.</p>' +
      '</div>';

    showToast(error.message, 'error');

  } finally {
    list.removeAttribute('aria-busy');
  }
}

async function loadBranches() {
  const branches = await api.get('/branches');

  branchSelect.innerHTML = '';

  branches.data.forEach(function (branch) {
    branchNames.set(String(branch._id), branch.name);

    const option = document.createElement('option');
    option.value = branch._id;
    option.textContent = branch.name;

    branchSelect.appendChild(option);
  });

  if (!branches.data.length) {
    branchSelect.innerHTML =
      '<option value="">No active branches available</option>';

    document.getElementById('invoice-submit').disabled = true;
  }
}

list.addEventListener('click', function (event) {
  const button = event.target.closest('[data-print-invoice]');

  if (!button) return;

  const invoice = invoiceCache.get(
    button.dataset.printInvoice
  );

  if (!invoice) {
    showToast(
      'Refresh the invoice list and try again.',
      'error'
    );
    return;
  }

  printInvoice(invoice);
});

document.getElementById('invoice-form').addEventListener(
  'submit',
  async function (event) {
    event.preventDefault();

    await withButtonLoading(
      document.getElementById('invoice-submit'),
      'Creating…',
      async function () {
        try {
          await api.post('/invoices', {
            branchId: branchSelect.value,

            lines: [{
              description:
                document.getElementById('invoice-description').value.trim(),

              quantity:
                Number(document.getElementById('invoice-quantity').value),

              unitPriceMinor:
                toMinorUnits(
                  document.getElementById('invoice-price').value
                )
            }],

            notes:
              document.getElementById('invoice-notes').value.trim(),

            status: 'ISSUED'
          });

          event.target.reset();

          document.getElementById('invoice-quantity').value = '1';

          showToast(
            'Invoice created. You can print it from Recent invoices.',
            'success'
          );

          await load();

        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    );
  }
);

document.getElementById('refresh-invoices').addEventListener(
  'click',
  load
);

try {
  await loadBranches();
  await load();
} catch (error) {
  showToast(error.message, 'error');
}
