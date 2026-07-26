import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { PosCartPanel } from "../components/PosCartPanel.jsx";
import { InvoicePrint } from "../components/InvoicePrint.jsx";
import {
  PAYMENT_METHOD_IDS,
  PaymentMethodIconGroup,
  PaymentSectionHeading,
  SPLIT_PAYMENT_METHOD_IDS,
  SplitPaymentToggle,
} from "../components/PaymentMethodControls.jsx";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner.js";
import { useCartStore } from "../store/cartStore.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useActiveBranchId, useActiveBranchLabel } from "../context/BranchContext.jsx";
import { useOffline } from "../context/OfflineContext.jsx";
import { useI18n } from "../context/LanguageContext.jsx";
import { usePrintSettings } from "../context/PrintSettingsContext.jsx";
import {
  applyOfflineSaleToInventory,
  hydrateInventoryFromProducts,
  loadProductsForBranch,
  saveCustomers,
  saveProductsForBranch,
  loadCustomers,
} from "../offline/cache.js";
import { getOrCreateDeviceId, SYNC_TYPES } from "../offline/db.js";
import { enqueue } from "../offline/syncQueue.js";
import { buildOfflineSalePreview } from "../offline/offlineSale.js";
import { buildReceiptPlainText } from "../utils/receiptText.js";
import { isUnitPriceAtOrBelowCost } from "../utils/saleCostWarning.js";
import { productDisplayName } from "../utils/productName.js";
import { ProductImagePreview } from "../components/ProductImagePreview.jsx";
import { isVerticalFeatureEnabled } from "../lib/verticalFeatures.js";

function round2(n) {
  return Math.round(n * 100) / 100;
}

function productHasModifiers(p) {
  return Array.isArray(p?.modifiers) && p.modifiers.length > 0;
}

export default function POS() {
  const { classFor } = usePrintSettings();
  const { user, can } = useAuth();
  const { refreshPending } = useOffline();
  const { t, locale } = useI18n();
  const branchId = useActiveBranchId();
  const branchName = useActiveBranchLabel(locale);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitRows, setSplitRows] = useState([
    { method: "CASH", amount: "" },
    { method: "CARD", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [msg, setMsg] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [holdLabel, setHoldLabel] = useState("");
  const [heldList, setHeldList] = useState([]);
  const [copyDone, setCopyDone] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState("");
  const [guestPhoneInput, setGuestPhoneInput] = useState("");
  /** مبلغ يُدفع الآن عند البيع الجزئي بالآجل (يُترك فارغاً للدفع الكامل) */
  const [payNowInput, setPayNowInput] = useState("");
  const [openCashSession, setOpenCashSession] = useState(null);
  const [tableNumber, setTableNumber] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [modifierProduct, setModifierProduct] = useState(null);
  const [modifierKeys, setModifierKeys] = useState([]);
  const searchWrapRef = useRef(null);
  const searchInputRef = useRef(null);

  const showCafeExtras = isVerticalFeatureEnabled("cafePosExtras", user?.businessVertical);

  const items = useCartStore((s) => s.items);
  const useWholesalePricing = useCartStore((s) => s.useWholesalePricing);
  const setUseWholesalePricing = useCartStore((s) => s.setUseWholesalePricing);
  const syncLinePricesFromProducts = useCartStore((s) => s.syncLinePricesFromProducts);

  const hasWholesaleCatalog = useMemo(
    () =>
      products.some(
        (p) => p.wholesalePrice != null && p.wholesalePrice !== "" && !Number.isNaN(Number(p.wholesalePrice))
      ),
    [products]
  );
  const showWholesaleToggle =
    hasWholesaleCatalog &&
    can("wholesale") &&
    isVerticalFeatureEnabled("wholesale", user?.businessVertical);
  const addProduct = useCartStore((s) => s.addProduct);
  const setQty = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const total = useCartStore((s) => s.total());
  const cartSubtotal = total;
  const discountNum = Math.min(
    Math.max(0, Number.parseFloat(String(discountInput).replace(",", ".")) || 0),
    cartSubtotal
  );
  const afterDisc = Math.max(0, cartSubtotal - discountNum);
  const taxPctNum = Math.min(100, Math.max(0, Number.parseFloat(String(taxPercent).replace(",", ".")) || 0));
  const taxPreview = afterDisc * (taxPctNum / 100);
  const amountDue = round2(afterDisc + taxPreview);
  const clearCart = useCartStore((s) => s.clear);
  const setBranchCart = useCartStore((s) => s.setBranchId);
  const replaceAll = useCartStore((s) => s.replaceAll);

  useEffect(() => {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      loadCustomers()
        .then(setCustomers)
        .catch(() => setCustomers([]));
      return;
    }
    api("/api/customers")
      .then(async (list) => {
        setCustomers(list);
        await saveCustomers(list);
      })
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (branchId) setBranchCart(branchId);
  }, [branchId, setBranchCart]);

  useEffect(() => {
    if (!branchId || typeof navigator === "undefined" || !navigator.onLine) {
      setOpenCashSession(null);
      return;
    }
    const loadSession = () => {
      const q = new URLSearchParams();
      q.set("branchId", branchId);
      api(`/api/cash-sessions/open?${q.toString()}`)
        .then((s) => setOpenCashSession(s || null))
        .catch(() => setOpenCashSession(null));
    };
    loadSession();
    const onFocus = () => loadSession();
    const onAlerts = () => loadSession();
    window.addEventListener("focus", onFocus);
    window.addEventListener("alerts-changed", onAlerts);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("alerts-changed", onAlerts);
    };
  }, [branchId]);

  const needsCashSessionWarning = useMemo(() => {
    if (openCashSession) return false;
    if (splitEnabled) {
      return splitRows.some((r) => String(r.method || "").toUpperCase() === "CASH" && Number(r.amount) > 0);
    }
    return paymentMethod === "CASH";
  }, [openCashSession, splitEnabled, splitRows, paymentMethod]);

  useEffect(() => {
    api("/api/catalog")
      .then((data) => setCategories(Array.isArray(data?.categories) ? data.categories : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!showWholesaleToggle) setUseWholesalePricing(false);
  }, [showWholesaleToggle, setUseWholesalePricing]);

  const catalogLabel = (row) => {
    if (!row) return "";
    if (locale === "en" && row.nameEn?.trim()) return row.nameEn.trim();
    return row.name || row.nameEn || "";
  };

  const [loyaltyFlags, setLoyaltyFlags] = useState({
    loyaltyProgramEnabled: Boolean(user?.loyaltyProgramEnabled),
    loyaltyRedemptionEnabled: Boolean(user?.loyaltyRedemptionEnabled),
  });

  useEffect(() => {
    const load = () => {
      api("/api/loyalty-settings/status")
        .then((s) =>
          setLoyaltyFlags({
            loyaltyProgramEnabled: Boolean(s?.loyaltyProgramEnabled),
            loyaltyRedemptionEnabled: Boolean(s?.loyaltyRedemptionEnabled),
          })
        )
        .catch(() =>
          setLoyaltyFlags({ loyaltyProgramEnabled: false, loyaltyRedemptionEnabled: false })
        );
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener("loyalty-settings-changed", load);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("loyalty-settings-changed", load);
    };
  }, []);

  useEffect(() => {
    if (!loyaltyFlags.loyaltyRedemptionEnabled) setLoyaltyPointsInput("");
  }, [loyaltyFlags.loyaltyRedemptionEnabled]);

  const loadProducts = useCallback(async () => {
    const bid = branchId;
    const q = new URLSearchParams();
    if (bid) q.set("branchId", bid);
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const list = await loadProductsForBranch(bid);
      setProducts(list);
      return;
    }
    try {
      const list = await api(`/api/products?${q.toString()}`);
      const arr = Array.isArray(list) ? list : list?.items || [];
      setProducts(arr);
      if (bid) {
        await saveProductsForBranch(bid, arr);
        await hydrateInventoryFromProducts(bid, arr);
      }
    } catch {
      const list = await loadProductsForBranch(bid);
      setProducts(list);
    }
  }, [branchId]);

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        if (!p?.isActive && p?.isActive !== undefined) return false;
        if (categoryId && p.categoryId !== categoryId) return false;
        // Wholesale mode: only products that have a wholesale price
        if (useWholesalePricing) {
          if (p.wholesalePrice == null || p.wholesalePrice === "") return false;
          if (Number.isNaN(Number(p.wholesalePrice))) return false;
        }
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          (p.sku && String(p.sku).toLowerCase().includes(q)) ||
          (p.barcode && String(p.barcode).toLowerCase().includes(q))
        );
      })
      .slice(0, 14);
  }, [search, products, categoryId, useWholesalePricing]);

  const pickSearchProduct = useCallback(
    (p) => {
      if (!p) return;
      if (showCafeExtras && productHasModifiers(p)) {
        setModifierProduct(p);
        setModifierKeys([]);
      } else {
        addProduct(p, 1);
      }
      setSearch("");
      setSearchOpen(false);
      setSearchHighlight(0);
      setMsg("");
      searchInputRef.current?.focus();
    },
    [addProduct, showCafeExtras]
  );

  const confirmModifiers = () => {
    if (!modifierProduct) return;
    const catalog = Array.isArray(modifierProduct.modifiers) ? modifierProduct.modifiers : [];
    const selected = catalog.filter((m) => modifierKeys.includes(m.key));
    addProduct(modifierProduct, 1, { modifiers: selected });
    setModifierProduct(null);
    setModifierKeys([]);
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (!searchWrapRef.current?.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setSearchHighlight(0);
  }, [search]);

  const loadHeldCarts = useCallback(async () => {
    const bid = branchId;
    if (!bid) {
      setHeldList([]);
      return;
    }
    try {
      const q = new URLSearchParams();
      q.set("branchId", bid);
      const list = await api(`/api/held-carts?${q.toString()}`);
      setHeldList(list);
    } catch {
      setHeldList([]);
    }
  }, [branchId]);

  useEffect(() => {
    loadProducts().catch(() => setProducts([]));
  }, [loadProducts]);

  useEffect(() => {
    if (products.length > 0) syncLinePricesFromProducts(products);
  }, [products, useWholesalePricing, syncLinePricesFromProducts]);

  useEffect(() => {
    loadHeldCarts();
  }, [loadHeldCarts]);

  /** أجهزة متعددة: القائمة لا تُحدَّث تلقائياً من السيرفر إلا عند إعادة الجلب — نحدّث عند العودة للتبويب + دورياً */
  const lastSoftRefreshRef = useRef(0);
  const softRefreshCatalog = useCallback(() => {
    const now = Date.now();
    if (now - lastSoftRefreshRef.current < 2500) return;
    lastSoftRefreshRef.current = now;
    loadProducts().catch(() => {});
    loadHeldCarts().catch(() => {});
  }, [loadProducts, loadHeldCarts]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      softRefreshCatalog();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", softRefreshCatalog);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", softRefreshCatalog);
    };
  }, [softRefreshCatalog]);

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (document.visibilityState !== "visible") return;
      softRefreshCatalog();
    }, 40000);
    return () => clearInterval(id);
  }, [softRefreshCatalog]);

  const onScan = useCallback(
    (code) => {
      const p = products.find((x) => x.barcode === code || x.sku === code);
      if (p) pickSearchProduct(p);
      else setMsg(t("pos.barcodeMiss", { code }));
    },
    [products, pickSearchProduct, t]
  );

  useBarcodeScanner(onScan, true);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  const paymentMethodIds = useMemo(
    () => (customerId ? PAYMENT_METHOD_IDS : PAYMENT_METHOD_IDS.filter((m) => m !== "ON_ACCOUNT")),
    [customerId]
  );

  useEffect(() => {
    if (!customerId && paymentMethod === "ON_ACCOUNT") {
      setPaymentMethod("CASH");
    }
  }, [customerId, paymentMethod]);

  const hasBelowCostWarning = useMemo(
    () => items.some((line) => isUnitPriceAtOrBelowCost(line.unitPrice, line.cost)),
    [items]
  );

  const fillRemainder = (idx) => {
    const due = amountDue;
    const others = splitRows.reduce((s, r, j) => {
      if (j === idx) return s;
      return s + round2(Number.parseFloat(String(r.amount).replace(",", ".")) || 0);
    }, 0);
    const rem = Math.max(0, round2(due - others));
    setSplitRows((rows) => rows.map((r, j) => (j === idx ? { ...r, amount: rem > 0 ? String(rem) : "" } : r)));
  };

  const splitSum = useMemo(
    () =>
      round2(
        splitRows.reduce(
          (s, r) => s + (round2(Number.parseFloat(String(r.amount).replace(",", ".")) || 0)),
          0,
        ),
      ),
    [splitRows],
  );
  const splitRemaining = round2(amountDue - splitSum);

  const addSplitRow = () => {
    setSplitRows((rows) => [...rows, { method: "ONLINE", amount: "" }]);
  };

  const holdCart = async () => {
    setMsg("");
    if (!items.length) {
      setMsg(t("pos.holdNeedItems"));
      return;
    }
    const bid = branchId;
    if (!bid) return;
    setLoading(true);
    try {
      await api("/api/held-carts", {
        method: "POST",
        body: {
          branchId: bid,
          label: holdLabel.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            ...(i.modifiers?.length
              ? { modifiers: i.modifiers.map((m) => ({ key: m.key })) }
              : {}),
          })),
          useWholesalePricing,
          customerId: customerId || undefined,
          discountInput,
          taxPercent,
        },
      });
      setHoldLabel("");
      clearCart();
      setCustomerId("");
      setDiscountInput("");
      setTaxPercent("0");
      setTableNumber("");
      setOrderNote("");
      setSplitEnabled(false);
      await loadHeldCarts();
      await loadProducts();
    } catch (e) {
      setMsg(e.message || t("pos.saleFailed"));
    } finally {
      setLoading(false);
    }
  };

  const restoreHeld = async (row) => {
    const p = row.payload;
    if (!p?.items?.length) return;
    setMsg("");
    setUseWholesalePricing(Boolean(p.useWholesalePricing));
    replaceAll(p.items);
    setCustomerId(typeof p.customerId === "string" ? p.customerId : "");
    setDiscountInput(p.discountInput != null ? String(p.discountInput) : "");
    setTaxPercent(p.taxPercent != null ? String(p.taxPercent) : "0");
    setSplitEnabled(false);
    await loadProducts();
  };

  const deleteHeld = async (id) => {
    setMsg("");
    try {
      await api(`/api/held-carts/${id}`, { method: "DELETE" });
      await loadHeldCarts();
    } catch (e) {
      setMsg(e.message || t("pos.saleFailed"));
    }
  };

  const copyLastReceipt = async () => {
    if (!lastSale) return;
    const text = buildReceiptPlainText(lastSale, branchName, locale);
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setMsg(t("pos.saleFailed"));
    }
  };

  const checkout = async () => {
    setMsg("");
    if (!items.length) return;
    const bid = branchId;

    const tenderNeedsCashSession = (() => {
      if (splitEnabled) {
        return splitRows.some(
          (r) =>
            String(r.method || "").toUpperCase() === "CASH" &&
            round2(Number.parseFloat(String(r.amount).replace(",", ".")) || 0) > 0,
        );
      }
      if (paymentMethod !== "CASH") return false;
      if (payNowInput.trim() === "") return true;
      return round2(Number.parseFloat(String(payNowInput).replace(",", ".")) || 0) > 0;
    })();

    if (tenderNeedsCashSession && !openCashSession) {
      setMsg(t("pos.cashSessionRequired"));
      return;
    }

    let paymentSplits = undefined;
    if (splitEnabled) {
      const parsed = splitRows
        .map((r) => ({
          method: String(r.method || "CASH").toUpperCase(),
          amount: round2(Number.parseFloat(String(r.amount).replace(",", ".")) || 0),
        }))
        .filter((r) => r.amount > 0);
      if (parsed.length < 2) {
        setMsg(t("pos.splitMismatch"));
        return;
      }
      const sum = round2(parsed.reduce((s, x) => s + x.amount, 0));
      if (Math.abs(sum - amountDue) > 0.02) {
        setMsg(t("pos.splitMismatch"));
        return;
      }
      const badSplit = parsed.some((r) => !["CASH", "CARD", "ONLINE"].includes(r.method));
      if (badSplit) {
        setMsg(t("pos.splitMethodsOnly"));
        return;
      }
      paymentSplits = parsed;
    }

    if (
      !paymentSplits &&
      ["CASH", "CARD", "ONLINE"].includes(paymentMethod) &&
      payNowInput.trim() !== ""
    ) {
      const paidNow = round2(Number.parseFloat(String(payNowInput).replace(",", ".")) || 0);
      if (Number.isNaN(paidNow) || paidNow < 0) {
        setMsg(t("pos.payNowInvalid"));
        return;
      }
      if (paidNow - amountDue > 0.02) {
        setMsg(t("pos.payNowExceeds"));
        return;
      }
      if (amountDue - paidNow > 0.02 && !customerId) {
        setMsg(t("pos.payNowNeedCustomer"));
        return;
      }
    }

    const body = {
      branchId: bid,
      customerId: customerId || undefined,
      discountAmount: discountNum > 0 ? discountNum : undefined,
      taxPercent: taxPctNum > 0 ? taxPctNum : undefined,
      useWholesalePricing,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        ...(i.modifiers?.length
          ? { modifiers: i.modifiers.map((m) => ({ key: m.key })) }
          : {}),
      })),
    };
    if (showCafeExtras) {
      if (tableNumber.trim()) body.tableNumber = tableNumber.trim();
      if (orderNote.trim()) body.orderNote = orderNote.trim();
    }
    const cTrim = couponInput.trim();
    if (cTrim) body.couponCode = cTrim;
    const lp = Math.max(0, Math.floor(Number.parseFloat(String(loyaltyPointsInput).replace(",", ".")) || 0));
    if (lp > 0) body.loyaltyPointsToRedeem = lp;
    const gp = guestPhoneInput.trim();
    if (gp) body.guestPhone = gp;
    if (paymentSplits) {
      body.paymentSplits = paymentSplits;
    } else {
      body.paymentMethod = paymentMethod;
      if (
        !paymentSplits &&
        ["CASH", "CARD", "ONLINE"].includes(paymentMethod) &&
        payNowInput.trim() !== ""
      ) {
        body.amountPaid = round2(Number.parseFloat(String(payNowInput).replace(",", ".")) || 0);
      }
    }

    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline) {
      const cached = await loadProductsForBranch(bid);
      if (cached.length === 0) {
        setMsg(t("offline.needCache"));
        return;
      }
      setLoading(true);
      try {
        const clientMutationId = crypto.randomUUID();
        const deviceId = await getOrCreateDeviceId();
        const payload = {
          ...body,
          clientMutationId,
          deviceId,
        };
        await enqueue(SYNC_TYPES.SALE, clientMutationId, payload);
        await applyOfflineSaleToInventory(
          bid,
          items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
        );
        const cust = customerId ? customers.find((c) => c.id === customerId) : null;
        const preview = buildOfflineSalePreview({
          clientMutationId,
          branchName,
          cashierName: user?.name || "—",
          cartItems: items,
          total: round2(amountDue),
          discountAmount: discountNum,
          taxAmount: round2(taxPreview),
          paymentMethod,
          paymentSplits,
          amountPaid: body.amountPaid,
          customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone || undefined } : null,
          tableNumber: showCafeExtras && tableNumber.trim() ? tableNumber.trim() : null,
          orderNote: showCafeExtras && orderNote.trim() ? orderNote.trim() : null,
        });
        setLastSale(preview);
        setCopyDone(false);
        clearCart();
        setCustomerId("");
        setDiscountInput("");
        setTaxPercent("0");
        setTableNumber("");
        setOrderNote("");
        setSplitEnabled(false);
        setSplitRows([
          { method: "CASH", amount: "" },
          { method: "CARD", amount: "" },
        ]);
        setMsg(t("offline.savedLocal"));
        setPayNowInput("");
        await refreshPending();
        await loadProducts();
        setTimeout(() => window.print(), 200);
      } catch (e) {
        setMsg(e.message || t("pos.saleFailed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const sale = await api("/api/sales/checkout", {
        method: "POST",
        body,
      });
      setLastSale(sale);
      setCopyDone(false);
      clearCart();
      setCustomerId("");
      setDiscountInput("");
      setTaxPercent("0");
      setTableNumber("");
      setOrderNote("");
      setSplitEnabled(false);
      setSplitRows([
        { method: "CASH", amount: "" },
        { method: "CARD", amount: "" },
      ]);
      setCouponInput("");
      setLoyaltyPointsInput("");
      setGuestPhoneInput("");
      setPayNowInput("");
      await loadProducts();
      await loadHeldCarts();
      api("/api/customers")
        .then(setCustomers)
        .catch(() => {});
      setTimeout(() => window.print(), 200);
    } catch (e) {
      setMsg(e.message || t("pos.saleFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-page-root">
      <div className="pos-top-bar">
        <h1 className="pos-top-bar__title">{t("pos.title")}</h1>
        <div className="pos-search" ref={searchWrapRef}>
          <input
            ref={searchInputRef}
            className="pos-search__input"
            placeholder={t("pos.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (!searchOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
                setSearchOpen(true);
              }
              if (e.key === "Escape") {
                setSearchOpen(false);
                return;
              }
              if (!searchHits.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSearchHighlight((i) => Math.min(i + 1, searchHits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSearchHighlight((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                pickSearchProduct(searchHits[searchHighlight] || searchHits[0]);
              }
            }}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={searchOpen && search.trim().length > 0}
          />
          {searchOpen && search.trim() ? (
            <div className="pos-search__menu" role="listbox">
              {searchHits.length === 0 ? (
                <div className="pos-search__empty">{t("pos.searchNoResults")}</div>
              ) : (
                searchHits.map((p, idx) => {
                  const stock = p.inventories?.[0]?.quantity ?? 0;
                  const price = useWholesalePricing && p.wholesalePrice != null
                    ? Number(p.wholesalePrice)
                    : Number(p.price);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={idx === searchHighlight}
                      className={`pos-search__option${idx === searchHighlight ? " is-active" : ""}`}
                      onMouseEnter={() => setSearchHighlight(idx)}
                      onClick={() => pickSearchProduct(p)}
                    >
                      <ProductImagePreview url={p.imageUrl} alt="" width={44} height={44} />
                      <span className="pos-search__option-main">
                        <span className="pos-search__option-name">
                          {productDisplayName(p, locale)}
                        </span>
                        <span className="pos-search__option-meta">
                          {p.sku ? `SKU ${p.sku}` : p.barcode || "—"}
                          {" · "}
                          {t("pos.inStock", { n: stock })}
                        </span>
                      </span>
                      <span className="pos-search__option-price">
                        {price.toFixed(2)} {t("common.currency")}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
        {categories.length > 0 ? (
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="pos-top-bar__select"
            aria-label={t("products.category")}
          >
            <option value="">{t("pos.categoryAll")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {catalogLabel(c)}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" className="btn-touch" onClick={() => loadProducts()} style={{ background: "var(--surface2)" }}>
          {t("pos.refresh")}
        </button>
        {showWholesaleToggle ? (
          <div className="pos-price-mode" role="group" aria-label={t("pos.wholesaleHint")} title={t("pos.wholesaleHint")}>
            <button
              type="button"
              className={`pos-price-mode__btn${!useWholesalePricing ? " is-active" : ""}`}
              aria-pressed={!useWholesalePricing}
              onClick={() => setUseWholesalePricing(false)}
            >
              {t("pos.priceRetail")}
            </button>
            <button
              type="button"
              className={`pos-price-mode__btn${useWholesalePricing ? " is-active" : ""}`}
              aria-pressed={useWholesalePricing}
              onClick={() => setUseWholesalePricing(true)}
            >
              {t("pos.priceWholesale")}
            </button>
          </div>
        ) : null}
      </div>

      {needsCashSessionWarning ? (
        <div
          className="card"
          role="alert"
          style={{
            margin: "0 0 8px",
            padding: "10px 14px",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            background: "color-mix(in srgb, var(--danger, #c62828) 12%, var(--surface))",
            borderColor: "var(--danger, #c62828)",
          }}
        >
          <span style={{ flex: 1, fontSize: 13 }}>{t("pos.cashSessionRequired")}</span>
          <Link to="/cash" className="btn-touch" style={{ background: "var(--accent)", color: "#fff", textDecoration: "none" }}>
            {t("nav.funds")}
          </Link>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}
        className="pos-grid"
      >
        <style>{`
          @media (min-width: 960px) {
            .pos-grid { grid-template-columns: minmax(0, 1fr) minmax(300px, 400px) !important; align-items: stretch !important; }
          }
        `}</style>
        <div className="pos-products-frame pos-products-frame--cart">
          {hasBelowCostWarning ? (
            <div className="pos-cart-banner" role="status">
              {t("pos.belowCostBanner")}
            </div>
          ) : null}
          <PosCartPanel
            lines={items}
            onChangeQty={(id, v) => setQty(id, Number(v))}
            onRemove={removeLine}
            total={cartSubtotal}
          />
        </div>
        <div className="pos-checkout-column">
          <div className="pos-column-scroll">
          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("pos.heldList")}</div>
            {heldList.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>{t("pos.heldEmpty")}</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {heldList.map((h) => (
                  <li
                    key={h.id}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ flex: "1 1 140px", fontSize: 14 }}>
                      {h.label || `#${h.id.slice(0, 8)}`}
                      <span style={{ color: "var(--muted)", marginInlineStart: 8 }}>
                        {Number(h.subtotal).toFixed(2)} {t("common.currency")} · {h.lineCount}{" "}
                        {locale === "en" ? "lines" : "سطر"}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{h.user?.name || "—"}</span>
                    <button type="button" className="btn-touch" style={{ background: "var(--accent)", color: "#fff" }} onClick={() => restoreHeld(h)}>
                      {t("pos.heldRestore")}
                    </button>
                    <button type="button" className="btn-touch" style={{ background: "var(--danger)", color: "#fff" }} onClick={() => deleteHeld(h.id)}>
                      {t("pos.heldDelete")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                placeholder={t("pos.holdLabel")}
                value={holdLabel}
                onChange={(e) => setHoldLabel(e.target.value)}
                style={{
                  minHeight: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              <button
                type="button"
                className="btn-touch"
                disabled={loading || !items.length}
                onClick={holdCart}
                style={{ background: "var(--surface2)", maxWidth: 280 }}
              >
                {t("pos.holdCart")} / {t("pos.holdSave")}
              </button>
            </div>
          </div>

          {showCafeExtras ? (
            <div className="card">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("pos.cafeOrder")}</div>
              <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{t("pos.tableNumber")}</span>
                <input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder={t("pos.tableNumberPh")}
                  style={{
                    minHeight: 44,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{t("pos.orderNote")}</span>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder={t("pos.orderNotePh")}
                  rows={2}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    resize: "vertical",
                  }}
                />
              </label>
            </div>
          ) : null}

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("pos.customer")}</div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              style={{
                width: "100%",
                minHeight: 44,
                marginBottom: 10,
                padding: "8px 12px",
                borderRadius: 12,
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              <option value="">{t("pos.walkIn")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ""}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <input
                placeholder={t("pos.quickCustomer")}
                value={quickCustomerName}
                onChange={(e) => setQuickCustomerName(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 140,
                  minHeight: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              <button
                type="button"
                className="btn-touch"
                disabled={!quickCustomerName.trim()}
                onClick={async () => {
                  const name = quickCustomerName.trim();
                  if (!name) return;
                  setMsg("");
                  try {
                    const c = await api("/api/customers", { method: "POST", body: { name } });
                    setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
                    setCustomerId(c.id);
                    setQuickCustomerName("");
                  } catch (e) {
                    setMsg(e.message || t("pos.saleFailed"));
                  }
                }}
                style={{ background: "var(--surface2)" }}
              >
                {t("pos.quickCustomerBtn")}
              </button>
            </div>
            {loyaltyFlags.loyaltyProgramEnabled &&
            selectedCustomer &&
            typeof selectedCustomer.loyaltyPoints === "number" ? (
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                {t("pos.loyaltyBalance")}: <strong>{selectedCustomer.loyaltyPoints}</strong>
              </div>
            ) : null}
            {selectedCustomer && selectedCustomer.accountBalance != null ? (
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                {t("receivable.balance")}:{" "}
                <strong>{Number(selectedCustomer.accountBalance).toFixed(2)}</strong> {t("common.currency")}
              </div>
            ) : null}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("pos.guestPhone")}</span>
              <input
                value={guestPhoneInput}
                onChange={(e) => setGuestPhoneInput(e.target.value)}
                placeholder="05xxxxxxxx"
                style={{
                  minHeight: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("pos.couponCode")}</span>
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                style={{
                  minHeight: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
            </label>
            {loyaltyFlags.loyaltyRedemptionEnabled ? (
              <>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("pos.loyaltyRedeem")}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={loyaltyPointsInput}
                    onChange={(e) => setLoyaltyPointsInput(e.target.value)}
                    placeholder="0"
                    style={{
                      minHeight: 44,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                  />
                </label>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)" }}>
                  {t("pos.loyaltyPreviewHint")}
                </p>
              </>
            ) : loyaltyFlags.loyaltyProgramEnabled ? (
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)" }}>
                {t("pos.loyaltyRedeemDisabled")}
              </p>
            ) : null}
            <PaymentSectionHeading t={t} />
            <SplitPaymentToggle
              enabled={splitEnabled}
              onChange={(v) => {
                setSplitEnabled(v);
                setPayNowInput("");
                setMsg("");
              }}
              t={t}
            />
            {!splitEnabled ? (
              <>
                <PaymentMethodIconGroup
                  value={paymentMethod}
                  onChange={(m) => {
                    setPaymentMethod(m);
                    setPayNowInput("");
                    setMsg("");
                  }}
                  t={t}
                  methodIds={paymentMethodIds}
                />
                {customerId && ["CASH", "CARD", "ONLINE"].includes(paymentMethod) ? (
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("pos.payNowPartial")}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={payNowInput}
                      onChange={(e) => setPayNowInput(e.target.value)}
                      placeholder={String(amountDue)}
                      style={{
                        minHeight: 44,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {t("pos.payNowHint", { total: amountDue.toFixed(2) })}
                    </span>
                  </label>
                ) : null}
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                {splitRows.map((row, idx) => (
                  <div key={idx} className="pos-split-row">
                    <PaymentMethodIconGroup
                      compact
                      methodIds={SPLIT_PAYMENT_METHOD_IDS}
                      value={row.method}
                      onChange={(m) => {
                        setSplitRows((rows) => rows.map((r, j) => (j === idx ? { ...r, method: m } : r)));
                      }}
                      t={t}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={t("pos.splitAmount")}
                      value={row.amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSplitRows((rows) => rows.map((r, j) => (j === idx ? { ...r, amount: v } : r)));
                      }}
                      style={{
                        minHeight: 44,
                        minWidth: 100,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        color: "var(--text)",
                      }}
                    />
                    <button type="button" className="btn-touch" style={{ background: "var(--surface2)" }} onClick={() => fillRemainder(idx)}>
                      {t("pos.splitRemainder")}
                    </button>
                    {splitRows.length > 2 ? (
                      <button
                        type="button"
                        className="btn-touch"
                        style={{ background: "var(--danger)", color: "#fff" }}
                        onClick={() => setSplitRows((rows) => rows.filter((_, j) => j !== idx))}
                      >
                        {t("common.delete")}
                      </button>
                    ) : null}
                  </div>
                ))}
                <button type="button" className="btn-touch" style={{ background: "var(--surface2)", maxWidth: 220 }} onClick={addSplitRow}>
                  {t("pos.splitAdd")}
                </button>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  {t("pos.afterDiscount")}: {amountDue.toFixed(2)} {t("common.currency")}
                  {" · "}
                  {t("pos.splitSum")}: {splitSum.toFixed(2)}
                  {Math.abs(splitRemaining) > 0.009 ? (
                    <span style={{ color: splitRemaining > 0 ? "var(--warn, #b45309)" : "var(--danger)" }}>
                      {" · "}
                      {splitRemaining > 0
                        ? t("pos.splitLeft", { n: splitRemaining.toFixed(2) })
                        : t("pos.splitOver", { n: Math.abs(splitRemaining).toFixed(2) })}
                    </span>
                  ) : (
                    <span style={{ color: "var(--success, #15803d)" }}>
                      {" · "}
                      {t("pos.splitBalanced")}
                    </span>
                  )}
                </div>
              </div>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("pos.discountLabel")}</span>
              <input
                type="text"
                inputMode="decimal"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
                style={{
                  minHeight: 44,
                  padding: "0 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
              <span>{t("pos.subtotal")}</span>
              <span>
                {cartSubtotal.toFixed(2)} {t("common.currency")}
              </span>
            </div>
            {discountNum > 0 ? (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14, color: "var(--muted)" }}>
                <span>{t("invoice.discount")}</span>
                <span>
                  −{discountNum.toFixed(2)} {t("common.currency")}
                </span>
              </div>
            ) : null}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {t("pos.taxPercent")} — {t("pos.taxHint")}
              </span>
              <select
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                style={{
                  minHeight: 44,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: "var(--surface)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="15">15%</option>
              </select>
            </label>
            {taxPreview > 0 ? (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                <span>{t("invoice.tax")}</span>
                <span>
                  {taxPreview.toFixed(2)} {t("common.currency")}
                </span>
              </div>
            ) : null}
          </div>

          {lastSale ? (
            <div className="card pos-last-sale-actions">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{t("invoice.copyHint")}</div>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)" }}>{t("pos.thermalHint")}</p>
              <button type="button" className="btn-touch" style={{ background: "var(--surface2)", maxWidth: 320 }} onClick={copyLastReceipt}>
                {copyDone ? t("pos.receiptCopied") : t("pos.copyReceipt")}
              </button>
            </div>
          ) : null}
          </div>

          <div className="pos-checkout-dock" aria-label={t("pos.checkout")}>
            <div className="pos-checkout-dock__total">
              <span>{t("pos.afterDiscount")}</span>
              <span>
                {amountDue.toFixed(2)} {t("common.currency")}
              </span>
            </div>
            {items.length > 0 ? (
              <div className="pos-checkout-dock__hint">
                {items.length} {locale === "en" ? "lines" : "سطر"} · {t("pos.subtotal")}{" "}
                {cartSubtotal.toFixed(2)} {t("common.currency")}
              </div>
            ) : null}
            {msg ? <div className="pos-checkout-dock__msg">{msg}</div> : null}
            <button
              type="button"
              className="btn-touch pos-checkout-dock__btn"
              disabled={loading || !items.length}
              onClick={checkout}
            >
              {loading ? t("pos.processing") : t("pos.checkout")}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`print-invoice ${classFor("retail")}`}
        style={{ position: "fixed", left: -99999, top: 0, width: 400 }}
      >
        <InvoicePrint sale={lastSale} branchName={branchName} />
      </div>

      {modifierProduct ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 80,
            padding: 16,
          }}
          onClick={() => {
            setModifierProduct(null);
            setModifierKeys([]);
          }}
        >
          <div
            className="card"
            style={{ width: "min(420px, 100%)", display: "grid", gap: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <strong>{t("pos.modifiersTitle")}</strong>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              {productDisplayName(modifierProduct, locale)}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {(modifierProduct.modifiers || []).map((m) => {
                const checked = modifierKeys.includes(m.key);
                const label =
                  locale === "en" ? m.label || m.key : m.labelAr || m.label || m.key;
                const delta = Number(m.priceDelta) || 0;
                return (
                  <label
                    key={m.key}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setModifierKeys((prev) =>
                          checked ? prev.filter((k) => k !== m.key) : [...prev, m.key]
                        );
                      }}
                    />
                    <span style={{ flex: 1 }}>{label}</span>
                    <span style={{ color: "var(--muted)", fontSize: 13 }}>
                      {delta === 0
                        ? "—"
                        : `${delta > 0 ? "+" : ""}${delta.toFixed(2)} ${t("common.currency")}`}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-touch"
                onClick={() => {
                  setModifierProduct(null);
                  setModifierKeys([]);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn-touch"
                style={{ background: "var(--accent)", color: "#fff" }}
                onClick={confirmModifiers}
              >
                {t("pos.addWithModifiers")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
