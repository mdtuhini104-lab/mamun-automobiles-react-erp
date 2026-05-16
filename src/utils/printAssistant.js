/**
 * Antigravity Autopilot v5.0 — Nuclear Production Standard
 * Centralized Print Asset Synchronization Engine
 */

const TARGET_PAGE_HEIGHT = '100%'; // Scales to parent container height
const PORTAL_STABILIZATION_MS = 400;
const SCALING_CALIBRATION_MS = 800; // Combined 1.2s buffer

export const waitForAllAssets = async (area) => {
    const scope = area || document;
    const images = Array.from(scope.querySelectorAll ? scope.querySelectorAll('img') : document.images);
    
    const fontPromise = (typeof document !== 'undefined' && document.fonts)
        ? document.fonts.ready
        : Promise.resolve();

    const imgPromises = images.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; 
        });
    });

    await Promise.all([...imgPromises, fontPromise]);
    await new Promise(r => setTimeout(r, 200)); // Render settling
};

export const applyAntiGravityFix = async () => {
    const areas = document.querySelectorAll('.alive-print-area');
    if (!areas.length) return;

    for (const area of areas) {
        await waitForAllAssets(area);
        
        // Final Physical Lockdown — v5.1 Flexible Height
        area.style.setProperty('height', 'auto', 'important');
        area.style.setProperty('min-height', TARGET_PAGE_HEIGHT, 'important');
        area.style.setProperty('overflow', 'visible', 'important');
        area.style.setProperty('background-color', 'white', 'important');
    }
};

export const bufferedPrint = async (onComplete) => {
    try {
        console.log("Antigravity: Initializing Production Print Sequence...");
        
        // Cache original document title to restore post-print
        const originalTitle = document.title;
        
        // Step 1: Portal Stabilization
        await new Promise(r => setTimeout(r, PORTAL_STABILIZATION_MS));

        // Step 2: Asset + Scaling Calibration
        await applyAntiGravityFix();

        // Step 3: Trigger Print using native event synchronization to prevent blank preview race-conditions
        setTimeout(() => {
            // Temporarily set document title to a single space so Chrome/Edge standard print headers render clean/empty text
            document.title = " ";

            let isCleanedUp = false;
            const performCleanup = () => {
                if (!isCleanedUp) {
                    isCleanedUp = true;
                    // Restore original document title immediately
                    if (originalTitle && typeof document !== 'undefined') {
                        document.title = originalTitle;
                    }
                    window.removeEventListener('afterprint', performCleanup);
                    if (typeof onComplete === 'function') onComplete();
                }
            };

            // Listen for native print dialog closure before unmounting printable DOM nodes
            window.addEventListener('afterprint', performCleanup);

            // Execute print dialog launch
            window.print();

            // Maximum safety fallback: automatically clean up if left open for an extended duration or dropped events
            setTimeout(performCleanup, 300000); // 5 minutes fallback
        }, SCALING_CALIBRATION_MS);
    } catch (error) {
        console.error("Antigravity Print Error:", error);
        if (typeof document !== 'undefined' && document.title === " ") {
            document.title = "Mamun Automobiles";
        }
    }
};

export const initOnePagePrintAssistant = () => {
    console.log("Antigravity: One-Page Print Assistant Initialized.");
    
    const handleAfterPrint = () => {
        // Any cleanup or post-print logic
    };

    window.addEventListener('afterprint', handleAfterPrint);
    
    return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
    };
};

if (typeof window !== 'undefined') {
    window.bufferedPrint = bufferedPrint;
}
