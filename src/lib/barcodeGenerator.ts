import { v4 as uuidv4 } from 'uuid';

/**
 * Generates an ISO-compatible unique barcode string for Topshot inventory
 * Format: TS-{SKU_CODE}-{HEX_TIMESTAMP}-{SHORT_RANDOM}
 * Example: TS-PRO-LM7Z89-A4F2
 */
export function generateBarcodeValue(skuId: string): string {
  const cleanSku = skuId.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  const timeHex = Date.now().toString(36).toUpperCase().slice(-5);
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TS-${cleanSku}-${timeHex}-${randomHex}`;
}

/**
 * Generates a batch of unique Item records ready for insertion
 */
export function generateInboundBatch(skuId: string, quantity: number, batchId?: string) {
  const currentBatchId = batchId || `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const items = [];

  for (let i = 0; i < quantity; i++) {
    const racketId = uuidv4();
    const barcode = generateBarcodeValue(skuId);
    items.push({
      pickle_racket_id: racketId,
      sku_id: skuId,
      barcode_value: barcode,
      status: 'In-Stock' as const,
      batch_id: currentBatchId,
      history: [
        {
          action: 'ACQUIRED' as const,
          timestamp: new Date(),
          note: `Initial acquisition in batch ${currentBatchId}`,
        },
      ],
    });
  }

  return { batchId: currentBatchId, items };
}
