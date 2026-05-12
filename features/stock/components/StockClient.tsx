"use client";

import { useI18n } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
} from "react";
import {
  Boxes,
  Package,
  Truck,
  ArrowRightLeft,
  AlertTriangle,
  Search,
  Pencil,
  Trash2,
  X,
  Tags,
  Factory,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Plus,
  History,
  Filter,
  ShoppingBasket,
  CheckCircle2,
  PackagePlus,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  code?: string | null;
};

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
};

type Cantina = {
  id: string;
  name: string;
  code: string;
};

type Product = {
  id: string;
  name: string;
  internalCode: string;
  barcode: string | null;
  unit: string;
  purchasePrice: string;
  salePrice: string;
  minStock: number;
  status: "ACTIVE" | "INACTIVE";
  category?: Category | null;
  supplier?: Supplier | null;
  centralStock?: {
    quantity: number;
    avgCost: string;
  } | null;
};

type StockTransaction = {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
  product?: {
    name: string;
    internalCode: string;
    barcode: string | null;
  };
  user?: {
    name: string;
    identifier: string;
  } | null;
};

type ProductFormState = {
  name: string;
  internalCode: string;
  barcode: string;
  unit: string;
  categoryId: string;
  supplierId: string;
  purchasePrice: string;
  salePrice: string;
  minStock: string;
  initialQuantity: string;
};

type PurchaseItem = {
  productId: string;
  productName: string;
  productCode: string;
  quantity: string;
  unitCost: string;
};

type TransferItem = {
  productId: string;
  productName: string;
  productCode: string;
  availableQuantity: number;
  quantity: string;
};

type Tab = "products" | "purchase" | "transfer";

const ITEMS_PER_PAGE = 5;
const TRANSACTIONS_PER_PAGE = 7;
const SIDE_LIST_PER_PAGE = 5;

export default function StockClient() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();

  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: "",
    invoiceNumber: "",
    transportCost: "",
    otherCosts: "",
    notes: "",
    receiveNow: "true",
  });

  const initialTab =
    searchParams.get("tab") === "purchase"
      ? "purchase"
      : searchParams.get("tab") === "transfer"
      ? "transfer"
      : "products";

  const [tab, setTab] = useState<Tab>(initialTab);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cantinas, setCantinas] = useState<Cantina[]>([]);

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [error, setError] = useState("");

  const [productPage, setProductPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const [purchaseListPage, setPurchaseListPage] = useState(1);
  const [transferListPage, setTransferListPage] = useState(1);

  const [productFormOpen, setProductFormOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    code: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    taxId: "",
  });

  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    internalCode: "",
    barcode: "",
    unit: "UN",
    categoryId: "",
    supplierId: "",
    purchasePrice: "",
    salePrice: "",
    minStock: "",
    initialQuantity: "",
  });

  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchaseSelectedIds, setPurchaseSelectedIds] = useState<string[]>([]);
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseUnitCost, setPurchaseUnitCost] = useState("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  const [transferDestinationId, setTransferDestinationId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferSelectedIds, setTransferSelectedIds] = useState<string[]>([]);
  const [transferProductQuantity, setTransferProductQuantity] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  const [transactionFilters, setTransactionFilters] = useState({
    start: "",
    end: "",
    cantinaId: "",
    productCode: "",
  });

  function locale() {
    if (lang === "fr") return "fr-FR";
    if (lang === "en") return "en-GB";
    return "pt-PT";
  }

  async function loadCompanyCurrency() {
  try {
    const res = await fetch("/api/company/currency", {
      cache: "no-store",
    });

    const data = await res.json();

    if (res.ok && data.currency) {
      setCurrency(data.currency);
    }
  } catch {
    // mantém moeda padrão
  }
}

  async function loadStock() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stock");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("stockLoadError"));
        return;
      }

      setProducts(data.products || []);
      setCategories(data.categories || []);
      setSuppliers(data.suppliers || []);
      setCantinas(data.cantinas || []);
    } catch {
      setError(t("stockLoadError"));
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    setTransactionsLoading(true);
    setError("");

    const params = new URLSearchParams();

    if (transactionFilters.start) params.set("start", transactionFilters.start);
    if (transactionFilters.end) params.set("end", transactionFilters.end);
    if (transactionFilters.cantinaId)
      params.set("cantinaId", transactionFilters.cantinaId);
    if (transactionFilters.productCode)
      params.set("productCode", transactionFilters.productCode);

    try {
      const res = await fetch(`/api/stock/transactions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("transactionLoadError"));
        return;
      }

      setTransactions(data.transactions || []);
      if (data.cantinas) setCantinas(data.cantinas);
      setTransactionPage(1);
    } catch {
      setError(t("transactionLoadError"));
    } finally {
      setTransactionsLoading(false);
    }
  }

 useEffect(() => {
  const timeout = setTimeout(() => {
    void loadStock();
    void loadCompanyCurrency();
  }, 0);

  return () => clearTimeout(timeout);
}, []);
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const b = barcodeSearch.toLowerCase().trim();

    return products.filter((product) => {
      const matchText =
        product.name.toLowerCase().includes(q) ||
        product.internalCode.toLowerCase().includes(q) ||
        (product.barcode || "").toLowerCase().includes(q);

      const matchBarcode = b
        ? product.internalCode.toLowerCase() === b ||
          (product.barcode || "").toLowerCase() === b
        : true;

      return matchText && matchBarcode;
    });
  }, [products, search, barcodeSearch]);

  const purchaseMatches = useMemo(() => {
    const q = purchaseSearch.toLowerCase().trim();
    if (!q) return [];

    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          product.internalCode.toLowerCase().includes(q) ||
          (product.barcode || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, purchaseSearch]);

  const transferMatches = useMemo(() => {
    const q = transferSearch.toLowerCase().trim();
    if (!q) return [];

    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          product.internalCode.toLowerCase().includes(q) ||
          (product.barcode || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, transferSearch]);

  const productTotalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  );

  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * ITEMS_PER_PAGE,
    productPage * ITEMS_PER_PAGE
  );

  const categoryTotalPages = Math.max(
    1,
    Math.ceil(categories.length / ITEMS_PER_PAGE)
  );

  const paginatedCategories = categories.slice(
    (categoryPage - 1) * ITEMS_PER_PAGE,
    categoryPage * ITEMS_PER_PAGE
  );

  const supplierTotalPages = Math.max(
    1,
    Math.ceil(suppliers.length / ITEMS_PER_PAGE)
  );

  const paginatedSuppliers = suppliers.slice(
    (supplierPage - 1) * ITEMS_PER_PAGE,
    supplierPage * ITEMS_PER_PAGE
  );

  const transactionTotalPages = Math.max(
    1,
    Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE)
  );

  const paginatedTransactions = transactions.slice(
    (transactionPage - 1) * TRANSACTIONS_PER_PAGE,
    transactionPage * TRANSACTIONS_PER_PAGE
  );

  const purchaseListTotalPages = Math.max(
    1,
    Math.ceil(purchaseItems.length / SIDE_LIST_PER_PAGE)
  );

  const paginatedPurchaseItems = purchaseItems.slice(
    (purchaseListPage - 1) * SIDE_LIST_PER_PAGE,
    purchaseListPage * SIDE_LIST_PER_PAGE
  );

  const transferListTotalPages = Math.max(
    1,
    Math.ceil(transferItems.length / SIDE_LIST_PER_PAGE)
  );

  const paginatedTransferItems = transferItems.slice(
    (transferListPage - 1) * SIDE_LIST_PER_PAGE,
    transferListPage * SIDE_LIST_PER_PAGE
  );

  const stockStats = useMemo(() => {
    const totalProducts = products.length;

    const lowStock = products.filter(
      (p) => (p.centralStock?.quantity || 0) <= p.minStock
    ).length;

    const totalQuantity = products.reduce(
      (sum, p) => sum + (p.centralStock?.quantity || 0),
      0
    );

    const stockValue = products.reduce(
      (sum, p) =>
        sum + (p.centralStock?.quantity || 0) * Number(p.purchasePrice || 0),
      0
    );

    return {
      totalProducts,
      lowStock,
      totalQuantity,
      stockValue,
    };
  }, [products]);

  function formatMoney(value: number | string) {
  const amount = Number(value || 0);

  if (currency === "AOA") {
    return `${new Intl.NumberFormat(locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)} Kz`;
  }

  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

  function resetProductForm() {
    setProductForm({
      name: "",
      internalCode: "",
      barcode: "",
      unit: "UN",
      categoryId: "",
      supplierId: "",
      purchasePrice: "",
      salePrice: "",
      minStock: "",
      initialQuantity: "",
    });
  }

  function handleBarcodeEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const code = barcodeSearch.trim();
    if (!code) return;

    const found = products.find(
      (product) => product.barcode === code || product.internalCode === code
    );

    if (!found) {
      setError(t("productNotFoundForBarcode"));
      return;
    }

    setSearch(found.name);
    setProductPage(1);
    setError("");
  }function openEditProduct(product: Product) {
    setEditingProduct(product);

    setProductForm({
      name: product.name,
      internalCode: product.internalCode,
      barcode: product.barcode || "",
      unit: product.unit,
      categoryId: product.category?.id || "",
      supplierId: product.supplier?.id || "",
      purchasePrice: String(product.purchasePrice || ""),
      salePrice: String(product.salePrice || ""),
      minStock: String(product.minStock || ""),
      initialQuantity: "",
    });
  }

  async function createProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("productCreateError"));
        return;
      }

      resetProductForm();
      setProductFormOpen(false);

      await loadStock();
    } catch {
      setError(t("productCreateError"));
    } finally {
      setSaving(false);
    }
  }

  async function updateProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editingProduct) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/stock/${editingProduct.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("productEditError"));
        return;
      }

      setEditingProduct(null);

      resetProductForm();

      await loadStock();
    } catch {
      setError(t("productEditError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!deletingProduct) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/stock/${deletingProduct.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("productDeleteError"));
        return;
      }

      setDeletingProduct(null);

      await loadStock();
    } catch {
      setError(t("productDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const url = editingCategory
      ? `/api/stock/categories/${editingCategory.id}`
      : "/api/stock/categories";

    const method = editingCategory ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || t("categorySaveError"));
        return;
      }

      setCategoryForm({
        name: "",
        code: "",
      });

      setEditingCategory(null);

      await loadStock();
    } catch {
      setError(t("categorySaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: Category) {
    const ok = window.confirm(
      `${t("deleteCategoryQuestion")} ${category.name}?`
    );

    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        `/api/stock/categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || t("categoryDeleteError"));
        return;
      }

      await loadStock();
    } catch {
      setError(t("categoryDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  async function saveSupplier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const url = editingSupplier
      ? `/api/stock/suppliers/${editingSupplier.id}`
      : "/api/stock/suppliers";

    const method = editingSupplier ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplierForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || t("supplierSaveError"));
        return;
      }

      setSupplierForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        taxId: "",
      });

      setEditingSupplier(null);

      await loadStock();
    } catch {
      setError(t("supplierSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(supplier: Supplier) {
    const ok = window.confirm(
      `${t("deleteSupplierQuestion")} ${supplier.name}?`
    );

    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        `/api/stock/suppliers/${supplier.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.message || t("supplierDeleteError"));
        return;
      }

      await loadStock();
    } catch {
      setError(t("supplierDeleteError"));
    } finally {
      setSaving(false);
    }
  }

  function togglePurchaseSelection(productId: string) {
    setPurchaseSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function addPurchaseProducts() {
    if (purchaseSelectedIds.length === 0) {
      setError(t("selectAtLeastOneProduct"));
      return;
    }

    if (!purchaseQuantity || Number(purchaseQuantity) <= 0) {
      setError(t("invalidQuantity"));
      return;
    }

    const newItems = purchaseSelectedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .filter(
        (product) =>
          !purchaseItems.some(
            (item) => item.productId === product.id
          )
      )
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        productCode: product.internalCode,
        quantity: purchaseQuantity,
        unitCost:
          purchaseUnitCost ||
          String(product.purchasePrice || ""),
      }));

    if (newItems.length === 0) {
      setError(t("productsAlreadyInList"));
      return;
    }

    setPurchaseItems((prev) => [...prev, ...newItems]);

    setPurchaseSelectedIds([]);
    setPurchaseQuantity("");
    setPurchaseUnitCost("");
    setPurchaseSearch("");
    setPurchaseListPage(1);

    setError("");
  }

  async function registerPurchase(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const items = purchaseItems
        .filter(
          (item) =>
            item.productId &&
            Number(item.quantity) > 0
        )
        .map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost || 0),
        }));

      if (items.length === 0) {
        setError(t("addAtLeastOnePurchaseProduct"));
        return;
      }

      const res = await fetch("/api/stock/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...purchaseForm,
          items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("purchaseRegisterError"));
        return;
      }

      setPurchaseItems([]);

      setPurchaseForm({
        supplierId: "",
        invoiceNumber: "",
        transportCost: "",
        otherCosts: "",
        notes: "",
        receiveNow: "true",
      });

      await loadStock();

      setTab("products");
    } catch {
      setError(t("purchaseRegisterError"));
    } finally {
      setSaving(false);
    }
  }

  function toggleTransferSelection(productId: string) {
    setTransferSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function addTransferProducts() {
    if (transferSelectedIds.length === 0) {
      setError(t("selectAtLeastOneProduct"));
      return;
    }

    if (
      !transferProductQuantity ||
      Number(transferProductQuantity) <= 0
    ) {
      setError(t("invalidQuantity"));
      return;
    }

    const newItems = transferSelectedIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .filter(
        (product) =>
          !transferItems.some(
            (item) => item.productId === product.id
          )
      )
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        productCode: product.internalCode,
        availableQuantity:
          product.centralStock?.quantity || 0,
        quantity: transferProductQuantity,
      }));

    if (newItems.length === 0) {
      setError(t("productsAlreadyInList"));
      return;
    }

    setTransferItems((prev) => [...prev, ...newItems]);

    setTransferSelectedIds([]);
    setTransferSearch("");
    setTransferProductQuantity("");
    setTransferListPage(1);

    setError("");
  }

  async function transferStock(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const items = transferItems
        .filter(
          (item) =>
            item.productId &&
            Number(item.quantity) > 0
        )
        .map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        }));

      if (!transferDestinationId) {
        setError(t("chooseDestinationCantina"));
        return;
      }

      if (items.length === 0) {
        setError(t("addAtLeastOneTransferProduct"));
        return;
      }

      const res = await fetch("/api/stock/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationId: transferDestinationId,
          notes: transferNotes,
          items,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || t("transferError"));
        return;
      }

      setTransferDestinationId("");
      setTransferNotes("");
      setTransferItems([]);
      setTransferSearch("");
      setTransferProductQuantity("");

      await loadStock();

      setTab("products");
    } catch {
      setError(t("transferError"));
    } finally {
      setSaving(false);
    }
  }

  function isStockIn(type: string) {
    return [
      "PURCHASE_IN",
      "TRANSFER_IN",
      "ADJUSTMENT_IN",
      "RETURN",
    ].includes(type);
  }

  function getMovementLabel(type: string) {
    return isStockIn(type)
      ? t("entry")
      : t("exit");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-gradient-to-r from-[#123A5C] via-[#174B73] to-[#F5C982] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t("stockManagement")}
            </h1>

            <p className="text-sm text-white/80 mt-1">
              {t("stockManagementDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton
              active={tab === "products"}
              onClick={() => setTab("products")}
              icon={<Boxes size={15} />}
              label={t("products")}
            />

            <TabButton
              active={tab === "purchase"}
              onClick={() => setTab("purchase")}
              icon={<Truck size={15} />}
              label={t("entry")}
            />

            <TabButton
              active={tab === "transfer"}
              onClick={() => setTab("transfer")}
              icon={<ArrowRightLeft size={15} />}
              label={t("transfer")}
            />

            <TabButton
              active={false}
              onClick={() => {
                setTransactionsOpen(true);
                void loadTransactions();
              }}
              icon={<History size={15} />}
              label={t("transactions")}
            />

            <TabButton
              active={false}
              onClick={() => setCategoriesOpen(true)}
              icon={<Tags size={15} />}
              label={t("categories")}
            />

            <TabButton
              active={false}
              onClick={() => setSuppliersOpen(true)}
              icon={<Factory size={15} />}
              label={t("suppliers")}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[16px] bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}{tab === "products" && (
        <>
          {!productFormOpen && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                title={t("products")}
                value={stockStats.totalProducts}
                color="blue"
              />

              <StatCard
                title={t("totalQuantity")}
                value={stockStats.totalQuantity}
                color="green"
              />

              <StatCard
                title={t("stockValue")}
                value={formatMoney(stockStats.stockValue)}
                color="yellow"
              />

              <StatCard
                title={t("lowStock")}
                value={stockStats.lowStock}
                color="red"
                danger={stockStats.lowStock > 0}
              />
            </div>
          )}

          <div
            className={`grid grid-cols-1 ${
              productFormOpen ? "xl:grid-cols-3" : ""
            } gap-4`}
          >
            <div
              className={`${
                productFormOpen ? "xl:col-span-2" : ""
              } bg-white rounded-[22px] shadow-sm overflow-hidden border border-slate-100`}
            >
              <div className="p-4 flex flex-col md:flex-row gap-3 border-b bg-slate-50/70">
                <div className="relative flex-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setProductPage(1);
                    }}
                    placeholder={t("searchProductCodeBarcode")}
                    className="w-full border rounded-[14px] pl-10 pr-4 py-3 text-sm bg-white"
                  />
                </div>

                <div className="relative flex-1">
                  <Barcode
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={barcodeSearch}
                    onChange={(e) => setBarcodeSearch(e.target.value)}
                    onKeyDown={handleBarcodeEnter}
                    placeholder={t("scanBarcodeEnter")}
                    className="w-full border rounded-[14px] pl-10 pr-4 py-3 text-sm bg-white"
                  />
                </div>

                <button
                  onClick={() => setProductFormOpen((v) => !v)}
                  className="rounded-[14px] bg-[#123A5C] px-4 py-3 text-sm font-semibold text-white inline-flex items-center justify-center gap-2"
                >
                  {productFormOpen ? <X size={17} /> : <Plus size={17} />}
                  {productFormOpen ? t("close") : t("addProduct")}
                </button>
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-500">
                  {t("loadingStock")}
                </div>
              ) : paginatedProducts.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  {t("noProductFound")}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-5 py-3">{t("product")}</th>
                          <th className="px-5 py-3">{t("category")}</th>
                          <th className="px-5 py-3">{t("supplier")}</th>
                          <th className="px-5 py-3">{t("qty")}</th>
                          <th className="px-5 py-3">{t("min")}</th>
                          <th className="px-5 py-3">{t("purchase")}</th>
                          <th className="px-5 py-3">{t("sale")}</th>
                          <th className="px-5 py-3">{t("status")}</th>
                          <th className="px-5 py-3 text-right">
                            {t("actions")}
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {paginatedProducts.map((product) => {
                          const quantity = product.centralStock?.quantity || 0;
                          const low = quantity <= product.minStock;

                          return (
                            <tr key={product.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-800">
                                  {product.name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {product.internalCode} ·{" "}
                                  {product.barcode || t("noBarcode")}
                                </p>
                              </td>

                              <td className="px-5 py-3">
                                {product.category?.name || "-"}
                              </td>

                              <td className="px-5 py-3">
                                {product.supplier?.name || "-"}
                              </td>

                              <td className="px-5 py-3 font-semibold">
                                {quantity} {product.unit}
                              </td>

                              <td className="px-5 py-3">
                                {product.minStock}
                              </td>

                              <td className="px-5 py-3">
                                {formatMoney(product.purchasePrice)}
                              </td>

                              <td className="px-5 py-3">
                                {formatMoney(product.salePrice)}
                              </td>

                              <td className="px-5 py-3">
                                {low ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                                    <AlertTriangle size={13} />
                                    {t("low")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                    <CheckCircle2 size={13} />
                                    OK
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEditProduct(product)}
                                    className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                                    title={t("edit")}
                                  >
                                    <Pencil size={17} />
                                  </button>

                                  <button
                                    onClick={() => setDeletingProduct(product)}
                                    className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                                    title={t("delete")}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    page={productPage}
                    totalPages={productTotalPages}
                    t={t}
                    onPrev={() => setProductPage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setProductPage((p) =>
                        Math.min(productTotalPages, p + 1)
                      )
                    }
                  />
                </>
              )}
            </div>

            {productFormOpen && (
              <Panel title={t("newProduct")} color="blue">
                <ProductForm
                  form={productForm}
                  setForm={setProductForm}
                  categories={categories}
                  suppliers={suppliers}
                  onSubmit={createProduct}
                  saving={saving}
                  submitLabel={t("createProduct")}
                  t={t}
                />
              </Panel>
            )}
          </div>
        </>
      )}

      {tab === "purchase" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel
            title={t("goodsEntry")}
            color="green"
            className="xl:col-span-2"
          >
            <form onSubmit={registerPurchase} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  value={purchaseForm.supplierId}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      supplierId: e.target.value,
                    })
                  }
                  className="border rounded-[14px] px-4 py-3 text-sm"
                >
                  <option value="">{t("supplier")}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>

                <select
                  value={purchaseForm.receiveNow}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      receiveNow: e.target.value,
                    })
                  }
                  className="border rounded-[14px] px-4 py-3 text-sm"
                >
                  <option value="true">{t("receiveNow")}</option>
                  <option value="false">{t("receiveLater")}</option>
                </select>

                <input
                  placeholder={t("invoiceNumber")}
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      invoiceNumber: e.target.value,
                    })
                  }
                  className="border rounded-[14px] px-4 py-3 text-sm"
                />

                <input
                  type="number"
                  placeholder={t("transport")}
                  value={purchaseForm.transportCost}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      transportCost: e.target.value,
                    })
                  }
                  className="border rounded-[14px] px-4 py-3 text-sm"
                />

                <input
                  type="number"
                  placeholder={t("otherCosts")}
                  value={purchaseForm.otherCosts}
                  onChange={(e) =>
                    setPurchaseForm({
                      ...purchaseForm,
                      otherCosts: e.target.value,
                    })
                  }
                  className="border rounded-[14px] px-4 py-3 text-sm"
                />
              </div>

              <div className="rounded-[18px] bg-green-50/60 border border-green-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    placeholder={t("writeProductNameCode")}
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    className="border rounded-[14px] px-4 py-3 text-sm md:col-span-2"
                  />

                  <input
                    type="number"
                    placeholder={t("quantity")}
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(e.target.value)}
                    className="border rounded-[14px] px-4 py-3 text-sm"
                  />

                  <input
                    type="number"
                    placeholder={t("unitCost")}
                    value={purchaseUnitCost}
                    onChange={(e) => setPurchaseUnitCost(e.target.value)}
                    className="border rounded-[14px] px-4 py-3 text-sm"
                  />
                </div>

                {purchaseSearch && (
                  <div className="mt-3 rounded-[16px] bg-white border overflow-hidden">
                    {purchaseMatches.length === 0 ? (
                      <div className="p-4 text-sm text-red-600">
                        {t("productNotFound")}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {purchaseMatches.map((product) => (
                          <label
                            key={product.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={purchaseSelectedIds.includes(
                                  product.id
                                )}
                                onChange={() =>
                                  togglePurchaseSelection(product.id)
                                }
                              />

                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {product.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {product.internalCode} · {t("stock")}:{" "}
                                  {product.centralStock?.quantity || 0}
                                </p>
                              </div>
                            </div>

                            <span className="text-xs text-slate-500">
                              {formatMoney(product.purchasePrice)}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={addPurchaseProducts}
                    className="rounded-[14px] bg-[#123A5C] px-5 py-3 text-sm font-semibold text-white inline-flex items-center gap-2"
                  >
                    <PackagePlus size={17} />
                    {t("addToList")}
                  </button>
                </div>
              </div>

              <textarea
                placeholder={t("notes")}
                value={purchaseForm.notes}
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    notes: e.target.value,
                  })
                }
                className="w-full border rounded-[14px] px-4 py-3 text-sm"
              />

              <div className="flex justify-end">
                <button
                  disabled={saving}
                  className="rounded-[16px] bg-[#123A5C] px-6 py-3 text-white font-semibold disabled:opacity-50"
                >
                  {saving ? t("registering") : t("registerEntry")}
                </button>
              </div>
            </form>
          </Panel>

          <SideList title={t("entryProducts")} icon={<Truck size={18} />}>
            {purchaseItems.length === 0 ? (
              <EmptyList text={t("noEntryProductAdded")} />
            ) : (
              <>
                <div className="divide-y">
                  {paginatedPurchaseItems.map((item) => (
                    <div key={item.productId} className="p-4">
                      <p className="font-semibold text-slate-800">
                        {item.productName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("code")}: {item.productCode}
                      </p><div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            setPurchaseItems((prev) =>
                              prev.map((current) =>
                                current.productId === item.productId
                                  ? { ...current, quantity: e.target.value }
                                  : current
                              )
                            )
                          }
                          className="border rounded-[12px] px-3 py-2 text-sm"
                        />

                        <input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) =>
                            setPurchaseItems((prev) =>
                              prev.map((current) =>
                                current.productId === item.productId
                                  ? { ...current, unitCost: e.target.value }
                                  : current
                              )
                            )
                          }
                          className="border rounded-[12px] px-3 py-2 text-sm"
                        />

                        <button
                          onClick={() =>
                            setPurchaseItems((prev) =>
                              prev.filter(
                                (current) =>
                                  current.productId !== item.productId
                              )
                            )
                          }
                          className="p-2 rounded-xl bg-red-50 text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  page={purchaseListPage}
                  totalPages={purchaseListTotalPages}
                  t={t}
                  onPrev={() =>
                    setPurchaseListPage((p) => Math.max(1, p - 1))
                  }
                  onNext={() =>
                    setPurchaseListPage((p) =>
                      Math.min(purchaseListTotalPages, p + 1)
                    )
                  }
                />
              </>
            )}
          </SideList>
        </div>
      )}

      {tab === "transfer" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <SideList
            title={t("transferList")}
            icon={<ShoppingBasket size={18} />}
          >
            {transferItems.length === 0 ? (
              <EmptyList text={t("noProductAdded")} />
            ) : (
              <>
                <div className="divide-y">
                  {paginatedTransferItems.map((item) => (
                    <div key={item.productId} className="p-4">
                      <p className="font-semibold text-slate-800">
                        {item.productName}
                      </p>

                      <p className="text-xs text-slate-500">
                        {t("code")}: {item.productCode} · {t("stock")}:{" "}
                        {item.availableQuantity}
                      </p>

                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            setTransferItems((prev) =>
                              prev.map((current) =>
                                current.productId === item.productId
                                  ? { ...current, quantity: e.target.value }
                                  : current
                              )
                            )
                          }
                          className="w-full border rounded-[12px] px-3 py-2 text-sm"
                        />

                        <button
                          onClick={() =>
                            setTransferItems((prev) =>
                              prev.filter(
                                (current) =>
                                  current.productId !== item.productId
                              )
                            )
                          }
                          className="p-2 rounded-xl bg-red-50 text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  page={transferListPage}
                  totalPages={transferListTotalPages}
                  t={t}
                  onPrev={() =>
                    setTransferListPage((p) => Math.max(1, p - 1))
                  }
                  onNext={() =>
                    setTransferListPage((p) =>
                      Math.min(transferListTotalPages, p + 1)
                    )
                  }
                />
              </>
            )}
          </SideList>

          <Panel
            title={t("transferStockToCantina")}
            color="yellow"
            className="xl:col-span-2"
          >
            <form onSubmit={transferStock} className="space-y-4">
              <select
                required
                value={transferDestinationId}
                onChange={(e) => setTransferDestinationId(e.target.value)}
                className="w-full border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="">{t("chooseCantina")}</option>

                {cantinas.map((cantina) => (
                  <option key={cantina.id} value={cantina.id}>
                    {cantina.name} — {cantina.code}
                  </option>
                ))}
              </select>

              <div className="rounded-[18px] bg-yellow-50/60 border border-yellow-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    placeholder={t("writeProductName")}
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="border rounded-[14px] px-4 py-3 text-sm md:col-span-2"
                  />

                  <input
                    type="number"
                    placeholder={t("quantity")}
                    value={transferProductQuantity}
                    onChange={(e) =>
                      setTransferProductQuantity(e.target.value)
                    }
                    className="border rounded-[14px] px-4 py-3 text-sm"
                  />
                </div>

                {transferSearch && (
                  <div className="mt-3 rounded-[16px] bg-white border overflow-hidden">
                    {transferMatches.length === 0 ? (
                      <div className="p-4 text-sm text-red-600">
                        {t("productNotFound")}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {transferMatches.map((product) => (
                          <label
                            key={product.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={transferSelectedIds.includes(
                                  product.id
                                )}
                                onChange={() =>
                                  toggleTransferSelection(product.id)
                                }
                              />

                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  {product.name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {product.internalCode} · {t("stock")}:{" "}
                                  {product.centralStock?.quantity || 0}
                                </p>
                              </div>
                            </div>

                            <span className="text-xs text-slate-500">
                              {product.barcode || t("noBarcode")}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    onClick={addTransferProducts}
                    className="rounded-[14px] bg-[#123A5C] px-5 py-3 text-sm font-semibold text-white inline-flex items-center gap-2"
                  >
                    <PackagePlus size={17} />
                    {t("addToList")}
                  </button>
                </div>
              </div>

              <textarea
                placeholder={t("notes")}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full border rounded-[14px] px-4 py-3 text-sm"
              />

              <div className="flex justify-end">
                <button
                  disabled={saving}
                  className="rounded-[16px] bg-[#123A5C] px-6 py-3 text-white font-semibold disabled:opacity-50"
                >
                  {saving ? t("transferring") : t("transferStock")}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      )}

      {transactionsOpen && (
        <FullOverlay
          title={t("stockTransactions")}
          onClose={() => setTransactionsOpen(false)}
        >
          <div className="rounded-[20px] bg-slate-50 border p-4 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                type="date"
                value={transactionFilters.start}
                onChange={(e) =>
                  setTransactionFilters({
                    ...transactionFilters,
                    start: e.target.value,
                  })
                }
                className="border rounded-[14px] px-4 py-3 text-sm"
              />

              <input
                type="date"
                value={transactionFilters.end}
                onChange={(e) =>
                  setTransactionFilters({
                    ...transactionFilters,
                    end: e.target.value,
                  })
                }
                className="border rounded-[14px] px-4 py-3 text-sm"
              />

              <select
                value={transactionFilters.cantinaId}
                onChange={(e) =>
                  setTransactionFilters({
                    ...transactionFilters,
                    cantinaId: e.target.value,
                  })
                }
                className="border rounded-[14px] px-4 py-3 text-sm"
              >
                <option value="">{t("allCantinas")}</option>

                {cantinas.map((cantina) => (
                  <option key={cantina.id} value={cantina.id}>
                    {cantina.name}
                  </option>
                ))}
              </select>

              <input
                placeholder={t("productCode")}
                value={transactionFilters.productCode}
                onChange={(e) =>
                  setTransactionFilters({
                    ...transactionFilters,
                    productCode: e.target.value,
                  })
                }
                className="border rounded-[14px] px-4 py-3 text-sm"
              />

              <button
                onClick={loadTransactions}
                className="rounded-[14px] bg-[#123A5C] text-white font-semibold inline-flex items-center justify-center gap-2"
              >
                <Filter size={16} />
                {t("filter")}
              </button>
            </div>
          </div>

          {transactionsLoading ? (
            <div className="p-10 text-center text-slate-500">
              {t("loadingTransactions")}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-[20px]">
              {t("noTransactionFound")}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-[18px] border">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">{t("date")}</th>
                      <th className="px-4 py-3">{t("hour")}</th>
                      <th className="px-4 py-3">{t("product")}</th>
                      <th className="px-4 py-3">{t("code")}</th>
                      <th className="px-4 py-3">{t("type")}</th>
                      <th className="px-4 py-3">{t("qty")}</th>
                      <th className="px-4 py-3">{t("reason")}</th>
                      <th className="px-4 py-3">{t("user")}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {paginatedTransactions.map((tx) => {
                      const date = new Date(tx.createdAt);
                      const entrada = isStockIn(tx.type);

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {date.toISOString().slice(0, 10)}
                          </td>

                          <td className="px-4 py-3">
                            {date.toLocaleTimeString(locale(), {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {tx.product?.name || "-"}
                          </td>

                          <td className="px-4 py-3">
                            {tx.product?.internalCode || "-"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                entrada
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {getMovementLabel(tx.type)}
                            </span>
                          </td>

                          <td
                            className={`px-4 py-3 font-bold ${
                              entrada ? "text-green-700" : "text-red-600"
                            }`}
                          >
                            {entrada ? "+" : "-"}
                            {tx.quantity}
                          </td>

                          <td className="px-4 py-3">{tx.reason || "-"}</td>

                          <td className="px-4 py-3">
                            {tx.user?.name || tx.user?.identifier || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={transactionPage}
                totalPages={transactionTotalPages}
                t={t}
                onPrev={() =>
                  setTransactionPage((p) => Math.max(1, p - 1))
                }
                onNext={() =>
                  setTransactionPage((p) =>
                    Math.min(transactionTotalPages, p + 1)
                  )
                }
              />
            </>
          )}
        </FullOverlay>
      )}

      {categoriesOpen && (
        <FullOverlay
          title={t("categories")}
          onClose={() => setCategoriesOpen(false)}
        >
          <form
            onSubmit={saveCategory}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5"
          >
            <input
              required
              placeholder={t("categoryName")}
              value={categoryForm.name}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  name: e.target.value,
                })
              }
              className="border rounded-[14px] px-4 py-3 text-sm"
            />

            <input
              placeholder={t("code")}
              value={categoryForm.code}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  code: e.target.value,
                })
              }
              className="border rounded-[14px] px-4 py-3 text-sm"
            />

            <button
              disabled={saving}
              className="rounded-[14px] bg-[#123A5C] text-white font-semibold disabled:opacity-50"
            >
              {editingCategory ? t("saveCategory") : t("createCategory")}
            </button>
          </form>

          <SimpleTable
            columns={[t("name"), t("code"), t("actions")]}
            rows={paginatedCategories}
            render={(category) => (
              <tr key={category.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{category.name}</td>
                <td className="px-4 py-3">{category.code || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingCategory(category);
                      setCategoryForm({
                        name: category.name,
                        code: category.code || "",
                      });
                    }}
                    className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    onClick={() => deleteCategory(category)}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            )}
          />

          <Pagination
            page={categoryPage}
            totalPages={categoryTotalPages}
            t={t}
            onPrev={() => setCategoryPage((p) => Math.max(1, p - 1))}
            onNext={() =>
              setCategoryPage((p) => Math.min(categoryTotalPages, p + 1))
            }
          />
        </FullOverlay>
      )}

      {suppliersOpen && (
        <FullOverlay
          title={t("suppliers")}
          onClose={() => setSuppliersOpen(false)}
        >
          <form
            onSubmit={saveSupplier}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5"
          >
            <input
              required
              placeholder={t("name")}
              value={supplierForm.name}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  name: e.target.value,
                })
              }
              className="border rounded-[14px] px-4 py-3 text-sm"
            />

            <input
              placeholder={t("phone")}
              value={supplierForm.phone}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  phone: e.target.value,
                })
              }
              className="border rounded-[14px] px-4 py-3 text-sm"
            />

            <input
              placeholder={t("email")}
              value={supplierForm.email}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  email: e.target.value,
                })
              }
              className="border rounded-[14px] px-4 py-3 text-sm"
            />

            <input
              placeholder={t("taxId")}
              value={supplierForm.taxId}
              onChange={(e) =>
                setSupplierForm({
                  ...supplierForm,
                  taxId: e.target.value,
                })
              }
              className="border rounded-[14px] px-4 py-3 text-sm"
            />

            <button
              disabled={saving}
              className="rounded-[14px] bg-[#123A5C] text-white font-semibold disabled:opacity-50"
            >
              {editingSupplier ? t("save") : t("create")}
            </button>
          </form>

          <SimpleTable
            columns={[
              t("name"),
              t("phone"),
              t("email"),
              t("taxId"),
              t("actions"),
            ]}
            rows={paginatedSuppliers}
            render={(supplier) => (
              <tr key={supplier.id} className="border-t">
                <td className="px-4 py-3 font-semibold">{supplier.name}</td>
                <td className="px-4 py-3">{supplier.phone || "-"}</td>
                <td className="px-4 py-3">{supplier.email || "-"}</td>
                <td className="px-4 py-3">{supplier.taxId || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingSupplier(supplier);
                      setSupplierForm({
                        name: supplier.name,
                        phone: supplier.phone || "",
                        email: supplier.email || "",
                        address: supplier.address || "",
                        taxId: supplier.taxId || "",
                      });
                    }}
                    className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    onClick={() => deleteSupplier(supplier)}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            )}
          />

          <Pagination
            page={supplierPage}
            totalPages={supplierTotalPages}
            t={t}
            onPrev={() => setSupplierPage((p) => Math.max(1, p - 1))}
            onNext={() =>
              setSupplierPage((p) => Math.min(supplierTotalPages, p + 1))
            }
          />
        </FullOverlay>
      )}

      {editingProduct && (
        <Modal title={t("editProduct")} onClose={() => setEditingProduct(null)}>
          <ProductForm
            form={productForm}
            setForm={setProductForm}
            categories={categories}
            suppliers={suppliers}
            onSubmit={updateProduct}
            saving={saving}
            submitLabel={t("saveChanges")}
            t={t}
          />
        </Modal>
      )}

      {deletingProduct && (
        <Modal
          title={t("deleteProduct")}
          onClose={() => setDeletingProduct(null)}
        >
          <p className="text-slate-600">
            {t("deleteProductConfirm")}{" "}
            <strong>{deletingProduct.name}</strong>?
          </p>

          <div className="rounded-[16px] bg-yellow-50 border border-yellow-100 text-yellow-800 p-4 mt-4 text-sm">
            {t("deleteProductWarning")}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeletingProduct(null)}
              className="px-5 py-3 rounded-[14px] border"
            >
              {t("cancel")}
            </button>

            <button
              onClick={deleteProduct}
              disabled={saving}
              className="px-5 py-3 rounded-[14px] bg-red-600 text-white font-semibold disabled:opacity-50"
            >
              {saving ? t("deleting") : t("delete")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}function ProductForm({
  form,
  setForm,
  categories,
  suppliers,
  onSubmit,
  saving,
  submitLabel,
  t,
}: {
  form: ProductFormState;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
  categories: Category[];
  suppliers: Supplier[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  submitLabel: string;
  t: (key: string) => string;
}) {
  const isEdit = submitLabel.toLowerCase().includes("guardar") ||
    submitLabel.toLowerCase().includes("save") ||
    submitLabel.toLowerCase().includes("enregistrer");

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        required
        placeholder={t("name")}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full border rounded-[14px] px-4 py-3 text-sm"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          required
          placeholder={t("internalCode")}
          value={form.internalCode}
          onChange={(e) =>
            setForm({ ...form, internalCode: e.target.value })
          }
          className="border rounded-[14px] px-4 py-3 text-sm"
        />

        <input
          placeholder={t("barcode")}
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          className="border rounded-[14px] px-4 py-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder={t("unit")}
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          className="border rounded-[14px] px-4 py-3 text-sm"
        />

        <input
          type="number"
          placeholder={t("minimumStock")}
          value={form.minStock}
          onChange={(e) => setForm({ ...form, minStock: e.target.value })}
          className="border rounded-[14px] px-4 py-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="w-full border rounded-[14px] px-4 py-3 text-sm"
        >
          <option value="">{t("category")}</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
          className="w-full border rounded-[14px] px-4 py-3 text-sm"
        >
          <option value="">{t("supplier")}</option>

          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder={t("purchasePrice")}
          value={form.purchasePrice}
          onChange={(e) =>
            setForm({ ...form, purchasePrice: e.target.value })
          }
          className="border rounded-[14px] px-4 py-3 text-sm"
        />

        <input
          type="number"
          placeholder={t("salePrice")}
          value={form.salePrice}
          onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
          className="border rounded-[14px] px-4 py-3 text-sm"
        />
      </div>

      {!isEdit && (
        <input
          type="number"
          placeholder={t("initialQuantity")}
          value={form.initialQuantity}
          onChange={(e) =>
            setForm({ ...form, initialQuantity: e.target.value })
          }
          className="w-full border rounded-[14px] px-4 py-3 text-sm"
        />
      )}

      <button
        disabled={saving}
        className="w-full rounded-[16px] bg-[#123A5C] text-white py-3 font-semibold disabled:opacity-50"
      >
        {saving ? t("pleaseWait") : submitLabel}
      </button>
    </form>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[14px] px-3 py-2 text-xs font-semibold flex items-center gap-2 border ${
        active
          ? "bg-white text-[#123A5C] border-white"
          : "bg-white/10 text-white border-white/20 hover:bg-white/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  title,
  value,
  danger,
  color,
}: {
  title: string;
  value: number | string;
  danger?: boolean;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const styles = {
    blue: "from-blue-50 to-white text-blue-700 border-blue-100",
    green: "from-green-50 to-white text-green-700 border-green-100",
    yellow: "from-yellow-50 to-white text-yellow-700 border-yellow-100",
    red: "from-red-50 to-white text-red-700 border-red-100",
  };

  return (
    <div
      className={`bg-gradient-to-br ${styles[color]} rounded-[18px] p-4 shadow-sm border`}
    >
      <p className="text-xs text-slate-500">{title}</p>
      <h2 className={`text-xl font-bold ${danger ? "text-red-600" : ""}`}>
        {value}
      </h2>
    </div>
  );
}

function Panel({
  title,
  children,
  color = "blue",
  className = "",
}: {
  title: string;
  children: ReactNode;
  color?: "blue" | "green" | "yellow";
  className?: string;
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div
      className={`bg-white rounded-[22px] p-5 shadow-sm border border-slate-100 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-9 h-9 rounded-[14px] flex items-center justify-center ${styles[color]}`}
        >
          <Package size={18} />
        </div>
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
      </div>

      {children}
    </div>
  );
}

function SideList({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-[22px] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-[#123A5C] text-white">
        <h2 className="font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}

function EmptyList({ text }: { text: string }) {
  return <div className="p-8 text-center text-slate-500 text-sm">{text}</div>;
}

function FullOverlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-[200px] top-[110px] right-0 bottom-0 z-40 bg-[#F4F7FA] p-5 overflow-hidden">
      <div className="h-full bg-white rounded-[24px] shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#123A5C] to-[#174B73] text-white">
          <h2 className="text-2xl font-bold">{title}</h2>

          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-[24px] shadow-xl p-6 w-full max-w-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>

          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function SimpleTable<T>({
  rows,
  columns,
  render,
}: {
  rows: T[];
  columns: string[];
  render: (row: T) => ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-[18px] border">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>{rows.map(render)}</tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  t,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
      <p className="text-sm text-slate-500">
        {t("page")} {page} {t("of")} {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="p-2 rounded-xl border disabled:opacity-40"
        >
          <ChevronLeft size={17} />
        </button>

        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="p-2 rounded-xl border disabled:opacity-40"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}