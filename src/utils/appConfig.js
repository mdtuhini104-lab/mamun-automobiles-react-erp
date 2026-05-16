export const PRODUCTION_ORIGIN = 'https://mamun-automobiles-erp.com';

export const getApiBaseUrl = () => {
    return '/api'; // প্রোডাকশনে রিলেটিভ পাথ সবচেয়ে নিরাপদ
};

export const getAppOrigin = () => {
    if (typeof window !== 'undefined') return window.location.origin;
    return PRODUCTION_ORIGIN;
};

export const getPortalLoginUrl = () => `${getAppOrigin()}/login`;

export const getAbsoluteAssetUrl = (assetPath) => {
    if (!assetPath) return assetPath;
    if (/^https?:\/\//i.test(assetPath)) return assetPath;
    const origin = getAppOrigin();
    const normalizedPath = String(assetPath).startsWith('/') ? assetPath : `/${assetPath}`;
    return `${origin}${normalizedPath}`;
};

export const getUploadUrl = (filename) => {
    if (!filename) return null;
    if (String(filename).startsWith('http')) return filename;
    return `/uploads/${filename}`;
};
