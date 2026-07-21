/**
 * يبني كائن فاتورة يتوافق مع واجهة InvoicePrint عند البيع دون اتصال.
 * @param {object} p
 * @param {string} p.clientMutationId
 * @param {string} p.branchName
 * @param {string} p.cashierName
 * @param {Array<{ productId: string, name: string, nameEn?: string|null, unitPrice: number, quantity: number }>} p.cartItems
 * @param {number} p.total
 * @param {number} p.discountAmount
 * @param {number} p.taxAmount
 * @param {string} p.paymentMethod
 * @param {Array<{ method: string, amount: number }>|undefined} p.paymentSplits
 * @param {{ id: string, name: string, phone?: string } | null} p.customer
 * @param {"RETAIL"|"WHOLESALE"} [p.saleChannel]
 * @param {string|null} [p.tableNumber]
 * @param {string|null} [p.orderNote]
 */
export function buildOfflineSalePreview(p) {
  const {
    clientMutationId,
    branchName,
    cashierName,
    cartItems,
    total,
    discountAmount,
    taxAmount,
    paymentMethod,
    paymentSplits,
    customer,
    saleChannel,
    tableNumber,
    orderNote,
  } = p;
  const pm = paymentSplits ? "SPLIT" : String(paymentMethod || "CASH").toUpperCase();
  const items = cartItems.map((i) => {
    const subtotal = i.unitPrice * i.quantity;
    return {
      id: `local-line-${i.lineKey || i.productId}`,
      quantity: i.quantity,
      subtotal,
      modifiers: Array.isArray(i.modifiers) && i.modifiers.length ? i.modifiers : null,
      product: {
        name: i.name,
        nameEn: i.nameEn ?? null,
        sku: null,
      },
    };
  });
  return {
    id: `offline-${clientMutationId}`,
    createdAt: new Date().toISOString(),
    total,
    discountAmount,
    taxAmount,
    paymentMethod: pm,
    paymentSplits: paymentSplits || undefined,
    branch: { name: branchName },
    user: { name: cashierName },
    customer: customer || null,
    tableNumber: tableNumber || null,
    orderNote: orderNote || null,
    items,
    channel: saleChannel === "WHOLESALE" ? "WHOLESALE" : "RETAIL",
    _offlinePending: true,
    _clientMutationId: clientMutationId,
  };
}
