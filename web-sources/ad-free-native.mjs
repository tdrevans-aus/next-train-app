import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";

export { PURCHASE_TYPE };

export async function isBillingSupported() {
  try {
    const { isBillingSupported: supported } = await NativePurchases.isBillingSupported();
    return Boolean(supported);
  } catch {
    return false;
  }
}

export async function getInAppProduct(productId) {
  try {
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [productId],
      productType: PURCHASE_TYPE.INAPP,
    });
    return products?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function purchaseInAppProduct(productId) {
  return NativePurchases.purchaseProduct({
    productIdentifier: productId,
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
  });
}

export async function getInAppPurchases() {
  try {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.INAPP,
    });
    return purchases ?? [];
  } catch {
    return [];
  }
}

export async function restoreInAppPurchases() {
  try {
    await NativePurchases.restorePurchases();
  } catch {
    // Fall through to re-query; empty list if plugin still unavailable.
  }
  return getInAppPurchases();
}

export function purchaseIncludesProduct(purchases, productId) {
  return purchases.some(
    (purchase) =>
      purchase.productIdentifier === productId &&
      purchase.isActive !== false &&
      purchase.isRevoked !== true
  );
}
