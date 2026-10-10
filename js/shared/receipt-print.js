const printButton = document.getElementById('print-receipt-btn');
const receiptBody = document.getElementById('receipt-body');
const paperSizeSelect = document.getElementById('receipt-paper-size');

if (printButton && receiptBody && paperSizeSelect) {
  printButton.addEventListener('click', function () {
    const paperWidth =
      paperSizeSelect.value === '58mm'
        ? '58mm'
        : '80mm';

    const receiptMarkup = receiptBody.innerHTML;

    const businessTitle = (
      document.getElementById('topbar-business')?.textContent ||
      'Receipt'
    ).trim();

    const printWindow = window.open(
      '',
      '_blank',
      'width=420,height=700'
    );

    if (!printWindow) {
      window.alert(
        'Please allow pop-ups for stocker to print receipts.'
      );
      return;
    }

    const safeTitle = businessTitle.replace(
      /[&<>"]/g,
      function (character) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;'
        }[character];
      }
    );

    printWindow.document.open();

    printWindow.document.write(
      '<!doctype html>' +
      '<html lang="en">' +
      '<head>' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + safeTitle + ' receipt</title>' +

      '<style>' +

      '*{box-sizing:border-box}' +

      'html,body{' +
        'margin:0;' +
        'padding:0;' +
        'background:#fff;' +
        'color:#111;' +
        'font-family:Arial,Helvetica,sans-serif;' +
        'font-size:10px;' +
        'line-height:1.4;' +
      '}' +

      'body{' +
        'width:' + paperWidth + ';' +
        'max-width:' + paperWidth + ';' +
        'margin:0 auto;' +
        'padding:2.5mm;' +
      '}' +

      '.receipt-header{' +
        'text-align:center;' +
        'border-bottom:1px dashed #777;' +
        'padding-bottom:9px;' +
        'margin-bottom:8px;' +
        'overflow-wrap:anywhere;' +
      '}' +

      '.receipt-brand{' +
        'font-size:16px;' +
        'font-weight:800;' +
        'line-height:1.25;' +
        'overflow-wrap:anywhere;' +
      '}' +

      '.receipt-contact{' +
        'font-size:9px;' +
        'margin-top:3px;' +
        'overflow-wrap:anywhere;' +
      '}' +

      '.receipt-items{' +
        'width:100%;' +
        'border-collapse:collapse;' +
        'margin-top:7px;' +
        'table-layout:fixed;' +
        'font-size:9px;' +
      '}' +

      '.receipt-items th{' +
        'font-size:8px;' +
        'text-transform:uppercase;' +
        'text-align:left;' +
        'border-bottom:1px solid #777;' +
        'padding:4px 1px;' +
      '}' +

      '.receipt-items td{' +
        'padding:5px 1px;' +
        'vertical-align:top;' +
        'overflow-wrap:anywhere;' +
        'border-bottom:1px dotted #ddd;' +
      '}' +

      '.receipt-items th:first-child,' +
      '.receipt-items td:first-child{' +
        'width:54%;' +
        'text-align:left;' +
      '}' +

      '.receipt-items th:nth-child(2),' +
      '.receipt-items td:nth-child(2){' +
        'width:12%;' +
        'text-align:center;' +
      '}' +

      '.receipt-items th:last-child,' +
      '.receipt-items td:last-child{' +
        'width:34%;' +
        'text-align:right;' +
        'white-space:normal;' +
        'overflow-wrap:anywhere;' +
      '}' +

      '.receipt-items small{' +
        'display:block;' +
        'font-size:8px;' +
        'color:#444;' +
        'margin-top:2px;' +
      '}' +

      '.receipt-summary{' +
        'margin-top:8px;' +
        'padding-top:6px;' +
        'border-top:1px dashed #777;' +
      '}' +

      '.receipt-summary-row,.receipt-total{' +
        'display:flex;' +
        'justify-content:space-between;' +
        'align-items:flex-start;' +
        'gap:6px;' +
        'padding:3px 0;' +
        'font-size:9px;' +
      '}' +

      '.receipt-summary-row span,' +
      '.receipt-summary-row strong,' +
      '.receipt-total span,' +
      '.receipt-total strong{' +
        'min-width:0;' +
        'overflow-wrap:anywhere;' +
      '}' +

      '.receipt-summary-row strong,' +
      '.receipt-total strong{' +
        'text-align:right;' +
      '}' +

      '.receipt-total{' +
        'border-top:1px solid #222;' +
        'margin-top:4px;' +
        'padding-top:7px;' +
        'font-size:12px;' +
        'font-weight:800;' +
      '}' +

      '.receipt-balance{font-weight:700}' +

      '.receipt-footer{' +
        'text-align:center;' +
        'border-top:1px dashed #777;' +
        'padding-top:8px;' +
        'margin-top:10px;' +
        'font-size:9px;' +
        'overflow-wrap:anywhere;' +
      '}' +

      '@page{' +
        'size:' + paperWidth + ' auto;' +
        'margin:0;' +
      '}' +

      '@media print{' +
        'html,body{' +
          'width:' + paperWidth + ';' +
          'max-width:' + paperWidth + ';' +
          'margin:0;' +
          'padding:0;' +
          '-webkit-print-color-adjust:exact;' +
          'print-color-adjust:exact;' +
        '}' +
      '}' +

      '</style>' +
      '</head>' +
      '<body>' +
      receiptMarkup +
      '</body>' +
      '</html>'
    );

    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(function () {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        window.alert(
          'Printing could not start. Please try again.'
        );
      }
    }, 350);
  });
}
