import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

export interface BarcodeLabelData {
  pickle_racket_id: string;
  barcode_value: string;
  sku_id: string;
  sku_name?: string;
  price?: number;
}

/**
 * Generates an SVG/DataURL barcode image using jsbarcode
 */
function createBarcodeDataUrl(text: string): string {
  if (typeof document === 'undefined') {
    return '';
  }
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, text, {
    format: 'CODE128',
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 14,
    font: 'monospace',
    margin: 5,
    background: '#ffffff',
    lineColor: '#000000',
  });
  return canvas.toDataURL('image/png');
}

/**
 * Generates printable PDF sticker sheet formatted for Topshot Barcode Labels
 * Supports both thermal sticker rolls and standard A4 label grid
 */
export function generateBarcodePDF(
  labels: BarcodeLabelData[],
  options: {
    format?: 'thermal_single' | 'a4_sheet';
    title?: string;
  } = {}
): jsPDF {
  const { format = 'thermal_single', title = 'Topshot Inventory Labels' } = options;

  if (format === 'thermal_single') {
    // 50mm x 35mm thermal sticker label
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [50, 35],
    });

    labels.forEach((label, index) => {
      if (index > 0) doc.addPage([50, 35], 'landscape');

      // Topshot Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 83, 45); // Forest green
      doc.text('TOPSHOT PICKLEBALL', 25, 5, { align: 'center' });

      // SKU Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(40, 40, 40);
      const skuTitle = (label.sku_name || label.sku_id).slice(0, 28);
      doc.text(skuTitle, 25, 8.5, { align: 'center' });

      // Barcode Image
      try {
        const barcodeDataUrl = createBarcodeDataUrl(label.barcode_value);
        if (barcodeDataUrl) {
          doc.addImage(barcodeDataUrl, 'PNG', 5, 9.5, 40, 16);
        }
      } catch (e) {
        // Fallback text
        doc.setFontSize(8);
        doc.text(label.barcode_value, 25, 20, { align: 'center' });
      }

      // Metadata footer
      doc.setFontSize(5);
      doc.setTextColor(90, 90, 90);
      const shortId = `ID: ${label.pickle_racket_id.slice(0, 8)}...`;
      const priceText = label.price ? `₹${label.price.toLocaleString('en-IN')}` : '';
      doc.text(`${shortId}   ${priceText}`, 25, 29.5, { align: 'center' });
      doc.text(`Official Seal - Topshot Sports`, 25, 32.5, { align: 'center' });
    });

    return doc;
  }

  // Standard A4 Sheet (3 columns x 8 rows = 24 labels per sheet)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const labelW = 63.5;
  const labelH = 33.9;
  const marginX = 7.5;
  const marginY = 13;
  const cols = 3;
  const rows = 8;
  const perPage = cols * rows;

  labels.forEach((label, index) => {
    const pageIndex = Math.floor(index / perPage);
    const itemIndexOnPage = index % perPage;

    if (itemIndexOnPage === 0 && index > 0) {
      doc.addPage('a4', 'portrait');
    }

    const col = itemIndexOnPage % cols;
    const row = Math.floor(itemIndexOnPage / cols);

    const x = marginX + col * labelW;
    const y = marginY + row * labelH;

    // Border box
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 1, y + 1, labelW - 2, labelH - 2, 2, 2);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(20, 83, 45);
    doc.text('TOPSHOT PICKLEBALL', x + labelW / 2, y + 5, { align: 'center' });

    // SKU
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(50, 50, 50);
    doc.text((label.sku_name || label.sku_id).slice(0, 30), x + labelW / 2, y + 8, { align: 'center' });

    // Barcode
    try {
      const barcodeDataUrl = createBarcodeDataUrl(label.barcode_value);
      if (barcodeDataUrl) {
        doc.addImage(barcodeDataUrl, 'PNG', x + 6, y + 9, labelW - 12, 16);
      }
    } catch {
      doc.text(label.barcode_value, x + labelW / 2, y + 20, { align: 'center' });
    }

    // Footer
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text(`ID: ${label.pickle_racket_id.slice(0, 13)}`, x + labelW / 2, y + 28, { align: 'center' });
    if (label.price) {
      doc.setFont('helvetica', 'bold');
      doc.text(`MSRP: ₹${label.price}`, x + labelW / 2, y + 31, { align: 'center' });
    }
  });

  return doc;
}
