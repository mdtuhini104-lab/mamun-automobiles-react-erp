import { getAppOrigin } from './appConfig';

const normalizePhone = (phone) => String(phone || '').replace(/[^\d]/g, '');

export const buildShareableDocumentLink = (type, id) => {
    const origin = getAppOrigin();
    return `${origin}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
};

export const openWhatsAppShare = ({ phone, message }) => {
    const normalizedPhone = normalizePhone(phone);
    const shareUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
    return shareUrl;
};

export const createBillingWhatsAppMessage = ({ customerName, id, amount, link, vehicleNo }) => {
    const lines = [
        `*MAMUN AUTOMOBILES*`,
        `Premium Workshop & Service Center`,
        `--------------------------------`,
        `Hello ${customerName || 'Customer'},`,
        '',
        `Your document *#${id}* is ready.`,
        `*Total Amount:* ৳${Number(amount || 0).toLocaleString()}`,
    ];

    if (vehicleNo) lines.push(`*Vehicle No:* ${vehicleNo}`);
    
    lines.push(
        '',
        `View/Download here:`,
        link,
        '',
        `Thank you for choosing Mamun Automobiles!`
    );

    return lines.join('\n');
};

export const createPurchaseWhatsAppMessage = ({ supplierName, id, amount, link, itemsCount }) => {
    const lines = [
        `*MAMUN AUTOMOBILES PROCUREMENT*`,
        `Inventory & Supply Management`,
        `--------------------------------`,
        `Purchase Order / Receipt *#${id}*`,
        '',
        `Hello ${supplierName || 'Supplier'},`,
        '',
        `A new purchase record has been created:`,
        `*Total Items:* ${itemsCount || 0}`,
        `*Total Amount:* ৳${Number(amount || 0).toLocaleString()}`,
        '',
        `View Digital Receipt:`,
        link,
        '',
        `Mamun Automobiles - Logistics Department`
    ];

    return lines.join('\n');
};
