const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const Branch = require('../models/Branch');
const AppError = require('../utils/AppError');
const { getPlanLimits } = require('../utils/planLimits');
const XLSX = require('xlsx');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const IMPORT_HEADERS = [
  'Product Name',
  'SKU',
  'Barcode',
  'Cost Price',
  'Selling Price',
  'Wholesale Price',
  'Opening Stock',
  'Minimum Stock',
  'Tracks Batches',
];

const REQUIRED_IMPORT_HEADERS = [
  'product name',
  'cost price',
  'selling price',
];

const normalizeHeader = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parseNonNegativeNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const parseNonNegativeInteger = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const parseBatchValue = (value) => {
  if (value === '' || value === null || value === undefined) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['yes', 'y', 'true', '1'].includes(normalized)) {
    return true;
  }

  if (['no', 'n', 'false', '0'].includes(normalized)) {
    return false;
  }

  return null;
};

const normalizeImportRows = (rows) => {
  return rows.map((row, index) => {
    const rowNumber = index + 2;

    const name = normalizeText(row['Product Name']);
    const sku = normalizeText(row.SKU);
    const barcode = normalizeText(row.Barcode);

    const costPrice = parseNonNegativeNumber(row['Cost Price']);
    const sellingPrice = parseNonNegativeNumber(row['Selling Price']);
    const wholesalePrice = parseNonNegativeNumber(row['Wholesale Price']);

    const openingStock =
      row['Opening Stock'] === '' ||
      row['Opening Stock'] === undefined ||
      row['Opening Stock'] === null
        ? 0
        : parseNonNegativeInteger(row['Opening Stock']);

    const minimumStock =
      row['Minimum Stock'] === '' ||
      row['Minimum Stock'] === undefined ||
      row['Minimum Stock'] === null
        ? 0
        : parseNonNegativeInteger(row['Minimum Stock']);

    const tracksBatches = parseBatchValue(row['Tracks Batches']);

    const errors = [];

    if (!name) {
      errors.push('Product Name is required.');
    }

    if (costPrice === null) {
      errors.push('Cost Price must be a valid number.');
    }

    if (sellingPrice === null) {
      errors.push('Selling Price must be a valid number.');
    }

    if (openingStock === null) {
      errors.push('Opening Stock must be a whole number of 0 or more.');
    }

    if (minimumStock === null) {
      errors.push('Minimum Stock must be a whole number of 0 or more.');
    }

    if (tracksBatches === null) {
      errors.push('Tracks Batches must be Yes or No.');
    }

    return {
      rowNumber,
      name,
      sku: sku || undefined,
      barcode: barcode || undefined,
      costPriceMinor:
        costPrice === null ? null : Math.round(costPrice * 100),
      sellingPriceMinor:
        sellingPrice === null ? null : Math.round(sellingPrice * 100),
      wholesalePriceMinor:
        wholesalePrice === null
          ? undefined
          : Math.round(wholesalePrice * 100),
      openingStock,
      minimumStock,
      tracksBatches:
        tracksBatches === null ? false : tracksBatches,
      errors,
    };
  });
};

const validateImportRows = async ({
  business,
  rows,
}) => {
  const normalizedRows = normalizeImportRows(rows);

  const validRows = normalizedRows.filter(
    (row) => row.errors.length === 0
  );

  const invalidRows = normalizedRows.filter(
    (row) => row.errors.length > 0
  );

  const skuValues = validRows
    .map((row) => row.sku)
    .filter(Boolean);

  const duplicateSkus = new Set();

  for (const sku of skuValues) {
    const count = skuValues.filter(
      (value) => value === sku
    ).length;

    if (count > 1) {
      duplicateSkus.add(sku);
    }
  }

  for (const row of validRows) {
    if (row.sku && duplicateSkus.has(row.sku)) {
      row.errors.push(
        `SKU "${row.sku}" appears more than once in this file.`
      );
    }
  }

  const uniqueSkus = [
    ...new Set(
      validRows
        .map((row) => row.sku)
        .filter(Boolean)
    ),
  ];

  if (uniqueSkus.length > 0) {
    const existingProducts = await Product.find({
      business: business._id,
      sku: { $in: uniqueSkus },
    })
      .select('sku name')
      .lean();

    const existingSkuMap = new Map(
      existingProducts.map((product) => [
        product.sku,
        product.name,
      ])
    );

    for (const row of validRows) {
      if (
        row.sku &&
        existingSkuMap.has(row.sku)
      ) {
        row.errors.push(
          `SKU "${row.sku}" already exists for "${existingSkuMap.get(
            row.sku
          )}".`
        );
      }
    }
  }

  const finalValidRows = normalizedRows.filter(
    (row) => row.errors.length === 0
  );

  const finalInvalidRows = normalizedRows.filter(
    (row) => row.errors.length > 0
  );

  const currentProductCount =
    await Product.countDocuments({
      business: business._id,
      status: 'ACTIVE',
    });

  const planLimit =
    getPlanLimits(business).products;

  const projectedCount =
    currentProductCount + finalValidRows.length;

  let planError = null;

  if (
    Number.isFinite(planLimit) &&
    projectedCount > planLimit
  ) {
    planError =
      `This import would bring your inventory to ${projectedCount} active products, ` +
      `but your plan allows ${planLimit}. ` +
      `Upgrade your plan or reduce the import.`;
  }

  return {
    rows: normalizedRows,
    validRows: finalValidRows,
    invalidRows: finalInvalidRows,
    currentProductCount,
    planLimit,
    projectedCount,
    planError,
  };
};

const list = asyncHandler(async (req, res) => {
  const {
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {
    business: req.business._id,
    status: 'ACTIVE',
  };

  if (search) {
    const safeSearch = escapeRegex(search);

    filter.$or = [
      {
        name: {
          $regex: safeSearch,
          $options: 'i',
        },
      },
      {
        sku: {
          $regex: safeSearch,
          $options: 'i',
        },
      },
      {
        barcodes: search,
      },
    ];
  }

  const skip =
    (Number(page) - 1) *
    Number(limit);

  const [
    items,
    total,
  ] = await Promise.all([
    Product.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),

    Product.countDocuments(filter),
  ]);

  return ok(
    res,
    items,
    {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(
        total / Number(limit)
      ),
    }
  );
});

const findByBarcode = asyncHandler(
  async (req, res) => {
    const product =
      await Product.findOne({
        business: req.business._id,
        barcodes: req.params.barcode,
        status: 'ACTIVE',
      });

    if (!product) {
      throw new AppError(
        'Product not found for this barcode.',
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    return ok(res, product);
  }
);

const create = asyncHandler(async (req, res) => {
  const limit =
    getPlanLimits(req.business).products;

  if (
    Number.isFinite(limit) &&
    (await Product.countDocuments({
      business: req.business._id,
      status: 'ACTIVE',
    })) >= limit
  ) {
    throw new AppError(
      `Your plan allows up to ${limit} active products. Upgrade to add more.`,
      403,
      'PLAN_LIMIT_REACHED'
    );
  }

  const product = await Product.create({
    ...req.body,
    business: req.business._id,
  });

  return created(res, product);
});

const update = asyncHandler(async (req, res) => {
  const {
    name,
    sku,
    barcodes,
    category,
    department,
    supplier,
    imageUrl,
    costPriceMinor,
    sellingPriceMinor,
    wholesalePriceMinor,
    minimumStock,
    tracksBatches,
    status,
  } = req.body;

  const product =
    await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        business: req.business._id,
      },
      {
        name,
        sku,
        barcodes,
        category,
        department,
        supplier,
        imageUrl,
        costPriceMinor,
        sellingPriceMinor,
        wholesalePriceMinor,
        minimumStock,
        tracksBatches,
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    );

  if (!product) {
    throw new AppError(
      'Product not found.',
      404,
      'PRODUCT_NOT_FOUND'
    );
  }

  return ok(res, product);
});

const remove = asyncHandler(async (req, res) => {
  const product =
    await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        business: req.business._id,
      },
      {
        status: 'ARCHIVED',
      },
      {
        new: true,
      }
    );

  if (!product) {
    throw new AppError(
      'Product not found.',
      404,
      'PRODUCT_NOT_FOUND'
    );
  }

  return ok(res, product);
});

/*
|--------------------------------------------------------------------------
| Excel Import
|--------------------------------------------------------------------------
*/

const template = asyncHandler(
  async (req, res) => {
    const workbook =
      XLSX.utils.book_new();

    const products = [
      IMPORT_HEADERS,

      [
        'Coca Cola 50cl',
        'COKE-50',
        '5449000000996',
        250,
        350,
        320,
        100,
        20,
        'No',
      ],

      [
        'HP Wireless Mouse',
        'HP-MOUSE-01',
        '',
        4000,
        5500,
        5000,
        25,
        5,
        'No',
      ],
    ];

    const productSheet =
      XLSX.utils.aoa_to_sheet(
        products
      );

    productSheet['!cols'] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
      { wch: 15 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      productSheet,
      'Products'
    );

    const instructions = [
      [
        'STOCKER INVENTORY IMPORT TEMPLATE',
        '',
      ],
      [
        'Field',
        'What to enter',
      ],
      [
        'Product Name',
        'Required. The name customers and staff will see.',
      ],
      [
        'SKU',
        'Optional. Your unique product code.',
      ],
      [
        'Barcode',
        'Optional. Enter one barcode if the product has one.',
      ],
      [
        'Cost Price',
        'Required. Enter numbers only. Do not include currency symbols.',
      ],
      [
        'Selling Price',
        'Required. Enter numbers only. Do not include currency symbols.',
      ],
      [
        'Wholesale Price',
        'Optional. Leave blank if not used.',
      ],
      [
        'Opening Stock',
        'Optional. The quantity currently available at your selected branch.',
      ],
      [
        'Minimum Stock',
        'Optional. Stocker uses this to flag low stock.',
      ],
      [
        'Tracks Batches',
        'Enter Yes or No.',
      ],
      [
        '',
        '',
      ],
      [
        'IMPORTANT',
        'Do not rename or delete the column headers on the Products sheet.',
      ],
      [
        'IMPORTANT',
        'Do not enter currency symbols inside price cells.',
      ],
      [
        'IMPORTANT',
        'Stocker validates the file before importing anything.',
      ],
    ];

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet(
        instructions
      );

    instructionsSheet['!cols'] = [
      { wch: 25 },
      { wch: 90 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      'Instructions'
    );

    const buffer =
      XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
      });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="stocker-inventory-template.xlsx"'
    );

    return res.send(buffer);
  }
);

const previewImport = asyncHandler(
  async (req, res) => {
    if (!req.file) {
      throw new AppError(
        'Please upload an Excel file.',
        400,
        'IMPORT_FILE_REQUIRED'
      );
    }

    const extension =
      req.file.originalname
        .split('.')
        .pop()
        .toLowerCase();

    if (
      !['xlsx', 'xls', 'csv'].includes(
        extension
      )
    ) {
      throw new AppError(
        'Only .xlsx, .xls, and .csv files are supported.',
        400,
        'IMPORT_FILE_TYPE'
      );
    }

    let workbook;

    try {
      workbook = XLSX.read(
        req.file.buffer,
        {
          type: 'buffer',
          cellDates: false,
        }
      );
    } catch {
      throw new AppError(
        'Stocker could not read this spreadsheet. Please use the Stocker template.',
        400,
        'IMPORT_FILE_INVALID'
      );
    }

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new AppError(
        'The spreadsheet does not contain a Products sheet.',
        400,
        'IMPORT_SHEET_MISSING'
      );
    }

    const sheet =
      workbook.Sheets[
        firstSheetName
      ];

    const rawRows =
      XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: true,
      });

    if (!rawRows.length) {
      throw new AppError(
        'The spreadsheet does not contain any products.',
        400,
        'IMPORT_EMPTY'
      );
    }

    if (rawRows.length > 25000) {
      throw new AppError(
        'This file contains more than 25,000 product rows. Please split the import into smaller files.',
        400,
        'IMPORT_TOO_LARGE'
      );
    }

    const firstRow =
      rawRows[0] || {};

    const headers =
      Object.keys(firstRow).map(
        normalizeHeader
      );

    const missingRequired =
      REQUIRED_IMPORT_HEADERS.filter(
        (header) =>
          !headers.includes(header)
      );

    if (missingRequired.length) {
      throw new AppError(
        `This does not look like a Stocker inventory template. Missing: ${missingRequired.join(
          ', '
        )}.`,
        400,
        'IMPORT_HEADERS_INVALID'
      );
    }

    const normalizedInput =
      rawRows.map((row) => {
        const mapped = {};

        for (const key of Object.keys(
          row
        )) {
          const normalized =
            normalizeHeader(key);

          const matchingHeader =
            IMPORT_HEADERS.find(
              (header) =>
                normalizeHeader(
                  header
                ) === normalized
            );

          if (matchingHeader) {
            mapped[matchingHeader] =
              row[key];
          }
        }

        return mapped;
      });

    const result =
      await validateImportRows({
        business: req.business,
        rows: normalizedInput,
      });

    return ok(res, {
      totalRows: result.rows.length,
      validRows: result.validRows.length,
      invalidRows:
        result.invalidRows.length,
      currentProductCount:
        result.currentProductCount,
      planLimit: result.planLimit,
      projectedCount:
        result.projectedCount,
      planError: result.planError,
      rows: result.rows,
    });
  }
);

const confirmImport = asyncHandler(
  async (req, res) => {
    const {
      rows,
      branchId,
    } = req.body || {};

    if (
      !Array.isArray(rows) ||
      rows.length === 0
    ) {
      throw new AppError(
        'There are no products to import.',
        400,
        'IMPORT_ROWS_REQUIRED'
      );
    }

    if (rows.length > 25000) {
      throw new AppError(
        'This import contains too many rows.',
        400,
        'IMPORT_TOO_LARGE'
      );
    }

    const branch =
      await Branch.findOne({
        _id: branchId,
        business: req.business._id,
      });

    if (!branch) {
      throw new AppError(
        'The selected branch could not be found.',
        404,
        'BRANCH_NOT_FOUND'
      );
    }

    const result =
      await validateImportRows({
        business: req.business,
        rows,
      });

    if (
      result.invalidRows.length > 0
    ) {
      throw new AppError(
        'Some products are no longer valid. Please review the import again.',
        400,
        'IMPORT_REQUIRES_REVIEW'
      );
    }

    if (result.planError) {
      throw new AppError(
        result.planError,
        403,
        'PLAN_LIMIT_REACHED'
      );
    }

    const session =
      await Product.startSession();

    let importedProducts = 0;
    let importedStock = 0;

    try {
      await session.withTransaction(
        async () => {
          const documents =
            result.validRows.map(
              (row) => ({
                business:
                  req.business._id,
                name: row.name,
                sku: row.sku,
                barcodes:
                  row.barcode
                    ? [row.barcode]
                    : [],
                costPriceMinor:
                  row.costPriceMinor,
                sellingPriceMinor:
                  row.sellingPriceMinor,
                wholesalePriceMinor:
                  row.wholesalePriceMinor,
                minimumStock:
                  row.minimumStock,
                tracksBatches:
                  row.tracksBatches,
                status: 'ACTIVE',
              })
            );

          const products =
            await Product.insertMany(
              documents,
              {
                session,
                ordered: true,
              }
            );

          importedProducts =
            products.length;

          const inventoryOperations =
            [];

          const movementDocuments =
            [];

          products.forEach(
            (product, index) => {
              const row =
                result.validRows[
                  index
                ];

              if (
                row.openingStock > 0
              ) {
                inventoryOperations.push(
                  {
                    updateOne: {
                      filter: {
                        business:
                          req.business
                            ._id,
                        branch:
                          branch._id,
                        product:
                          product._id,
                      },
                      update: {
                        $set: {
                          quantity:
                            row.openingStock,
                        },
                      },
                      upsert: true,
                    },
                  }
                );

                movementDocuments.push({
                  business:
                    req.business._id,
                  branch:
                    branch._id,
                  product:
                    product._id,
                  type: 'OPENING_STOCK',
                  quantityChange:
                    row.openingStock,
                  previousQuantity: 0,
                  newQuantity:
                    row.openingStock,
                  reason:
                    'Imported from Stocker Excel inventory template.',
                  performedBy:
                    req.user._id,
                });

                importedStock +=
                  row.openingStock;
              }
            }
          );

          if (
            inventoryOperations.length
          ) {
            await Inventory.bulkWrite(
              inventoryOperations,
              { session }
            );
          }

          if (
            movementDocuments.length
          ) {
            await InventoryMovement.insertMany(
              movementDocuments,
              {
                session,
                ordered: true,
              }
            );
          }
        }
      );
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError(
          'The import could not be completed because one or more SKUs already exist. Please preview the file again.',
          409,
          'IMPORT_DUPLICATE_SKU'
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }

    return created(res, {
      importedProducts,
      importedStock,
      branchId: branch._id,
    });
  }
);

module.exports = {
  list,
  findByBarcode,
  create,
  update,
  remove,
  template,
  previewImport,
  confirmImport,
};
