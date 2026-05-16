// src/utils/cloudinaryUtils.js

/**
 * Optimizes a Cloudinary URL by injecting 'f_auto,q_auto' for automatic format and quality optimization.
 * This ensures lightning fast load times on the frontend, especially for large inventory images.
 * If the URL is not a valid Cloudinary URL, it returns the original URL.
 * 
 * @param {string} url - The original image URL.
 * @returns {string} - The optimized Cloudinary URL or original URL.
 */
export const optimizeCloudinaryUrl = (url) => {
    if (!url) return url;
    
    // Check if it's already a Cloudinary URL and doesn't already have f_auto/q_auto
    if (url.includes('res.cloudinary.com') && !url.includes('f_auto') && !url.includes('q_auto')) {
        // Cloudinary URLs usually follow this pattern:
        // https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>
        // We want to insert 'f_auto,q_auto' right after 'upload/'
        
        const uploadIndex = url.indexOf('/upload/');
        if (uploadIndex !== -1) {
            const beforeUpload = url.substring(0, uploadIndex + 8); // includes '/upload/'
            const afterUpload = url.substring(uploadIndex + 8);
            return `${beforeUpload}f_auto,q_auto/${afterUpload}`;
        }
    }
    
    // In case it already has optimization or isn't a cloudinary URL, return as is.
    return url;
};
