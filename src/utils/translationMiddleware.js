/**
 * professionalPrintTranslate
 * 
 * Maps common workshop terms from Bangla to English for professional document output.
 * If no mapping exists, it returns the original text.
 */
const dictionary = {
    'ব্রেক প্যাড': 'Brake Pad',
    'ব্রেক ওয়েল': 'Brake Oil',
    'ইঞ্জিন ওয়েল': 'Engine Oil',
    'ফিল্টার': 'Filter',
    'এসি সার্ভিস': 'AC Service',
    'পলিশ': 'Polish',
    'ওয়াশ': 'Wash',
    'সাসপেনশন': 'Suspension',
    'ক্লাচ প্লেট': 'Clutch Plate',
    'গিয়ার বক্স': 'Gear Box',
    'ব্যাটারি': 'Battery',
    'টায়ার': 'Tyre',
    'ব্রেক প্যাড হাইব্রিড': 'Hybrid Brake Pad',
    'হাইব্রিড ব্রেক ওয়েল': 'Hybrid Brake Oil',
};

export const professionalPrintTranslate = (text = '') => {
    if (!text) return '';
    
    // Check for exact mapping
    const trimmed = text.trim();
    if (dictionary[trimmed]) return dictionary[trimmed];

    // Check for partial matches or common phrases
    let result = text;
    Object.keys(dictionary).forEach(bn => {
        const regex = new RegExp(bn, 'gi');
        result = result.replace(regex, dictionary[bn]);
    });

    return result;
};

export default professionalPrintTranslate;
