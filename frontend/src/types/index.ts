export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  locationId?: string;
  locationName?: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: UserProfile;
}

export interface Product {
  id: string;
  sku: string;
  nameEn: string;
  nameSi: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  categoryNameSi?: string;
  unitId: string;
  unitCode: string;
  unitNameEn: string;
  isWeightBased: boolean;
  scaleItemCode?: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  status: number;
  allowNegativeStock: boolean;
  barcodes: { id: string; barcode: string; barcodeType: number; isPrimary: boolean }[];
  stockOnHand?: number;
}

export interface Category {
  id: string;
  code: string;
  nameEn: string;
  nameSi: string;
  description?: string;
}

export interface Unit {
  id: string;
  code: string;
  nameEn: string;
  nameSi: string;
  unitType: number;
  isBaseUnit: boolean;
  conversionFactorToBase: number;
  decimalPlaces: number;
}

export interface CartItem {
  product: Product;
  scannedBarcode?: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  lineTotal: number;
  isWeightBased: boolean;
}

export interface PaymentItem {
  paymentMethod: number; // 1=Cash, 2=Card, 3=BankTransfer, 4=Credit
  amount: number;
  tenderAmount: number;
  referenceNumber?: string;
}

export interface Receipt {
  saleId: string;
  invoiceNumber: string;
  dateUtc: string;
  storeName: string;
  storeNameSi: string;
  storeAddress: string;
  storePhone: string;
  cashierName: string;
  customerName?: string;
  terminalId: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  currencySymbol: string;
  headerNotes: string;
  footerNotes: string;
  barcodeSvg: string;
  items: {
    sku: string;
    nameEn: string;
    nameSi: string;
    quantity: number;
    unitCode: string;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
    isWeightBased: boolean;
  }[];
  payments: {
    method: string;
    amount: number;
    tenderAmount: number;
    changeAmount: number;
    referenceNumber?: string;
  }[];
}

export interface StockBalance {
  id: string;
  locationId: string;
  locationName: string;
  productId: string;
  sku: string;
  nameEn: string;
  nameSi: string;
  categoryName: string;
  unitCode: string;
  quantityOnHand: number;
  reorderLevel: number;
  isLowStock: boolean;
  averageCostPrice: number;
  totalValue: number;
  batchNumber: string;
  expiryDate?: string;
}

export interface StockTransaction {
  id: string;
  createdAtUtc: string;
  sku: string;
  productNameEn: string;
  transactionType: string;
  quantityChange: number;
  resultingBalance: number;
  unitCost: number;
  totalCost: number;
  referenceType: string;
  referenceNumber?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  code: string;
  companyName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  currentBalance: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierInvoiceNumber?: string;
  supplierId: string;
  supplier?: Supplier;
  invoiceDate: string;
  receivedDateUtc?: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  status: number;
  notes?: string;
  items: {
    id: string;
    productId: string;
    product?: Product;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    lineTotal: number;
    batchNumber: string;
    expiryDate?: string;
  }[];
}

export interface CashSession {
  id: string;
  sessionNumber: string;
  cashierId: string;
  cashier?: { fullName: string };
  terminalId: string;
  openedAtUtc: string;
  closedAtUtc?: string;
  openingCash: number;
  totalCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedCash: number;
  closingCashDeclared?: number;
  cashDifference?: number;
  status: number; // 1=Open, 2=Closed
  notes?: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayBills: number;
  todayProductsSold: number;
  totalStockValue: number;
  todayGrossProfit: number;
  lowStockAlertsCount: number;
  recentSalesTrend: {
    label: string;
    salesAmount: number;
    profitAmount: number;
    billCount: number;
  }[];
  categorySalesShare: {
    categoryName: string;
    totalSales: number;
    percentage: number;
  }[];
  topSellingProducts: {
    sku: string;
    nameEn: string;
    nameSi: string;
    quantitySold: number;
    totalRevenue: number;
  }[];
}

export interface BillItemDetail {
  productId: string;
  sku: string;
  nameEn: string;
  nameSi: string;
  categoryName: string;
  unitCode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  isWeightBased: boolean;
}

export interface BillListItem {
  id: string;
  invoiceNumber: string;
  createdAtUtc: string;
  cashierName: string;
  customerName?: string;
  terminalId: string;
  itemCount: number;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  status: string;
  paymentMethods: string[];
  items: BillItemDetail[];
}

export interface SoldProductItem {
  productId: string;
  sku: string;
  nameEn: string;
  nameSi: string;
  categoryName: string;
  unitCode: string;
  quantitySold: number;
  totalRevenue: number;
  billsCount: number;
}

export interface CategoryProductSold {
  productId: string;
  sku: string;
  nameEn: string;
  nameSi: string;
  unitCode: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface CategorySalesBreakdown {
  categoryId?: string;
  categoryName: string;
  categoryNameSi: string;
  totalQuantitySold: number;
  totalRevenue: number;
  billsCount: number;
  products: CategoryProductSold[];
}

export interface BillsSummary {
  totalBills: number;
  totalRevenue: number;
  totalItemsSold: number;
  totalDiscounts: number;
  cashCollected: number;
  cardCollected: number;
  otherCollected: number;
}

export interface BillsResponse {
  summary: BillsSummary;
  bills: BillListItem[];
  soldProducts: SoldProductItem[];
  categorySales: CategorySalesBreakdown[];
}
