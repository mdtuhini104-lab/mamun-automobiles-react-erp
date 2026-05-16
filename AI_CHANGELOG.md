# AI Changelog - Mamun Automobiles

## [2024-05-22] - Enterprise Workflow Expansion

### Added
- **Quotation System (v2/v3)**:
    - Dedicated Quotation module with version tracking (v1, v2, v3 history).
    - Logic to save history on edit and restoration functionality.
    - "Print Quotation" identical to Bill but with proper labels.
- **Financial & Loan Management**:
    - `Loan` model and controller for tracking EMIs and installments.
    - Automation for monthly installment recording.
    - `Supplier` ledger system with mandatory selection for inventory items.
- **Client & Corporate Portal**:
    - `CustomerPortalPage.jsx` for individual and company clients.
    - Monthly Statement generation for corporate clients.
    - Real-time balance and invoice tracking.
- **RBAC & Security**:
    - `SuperAdmin` role with restriction logic (max 2 entries).
    - Manager restrictions (cannot view Admins).
    - Admin Approval required for editing bills already printed.

### Modified
- **Job Card Workflow**:
    - Parallel department assignment support.
    - "HOLD" status logic: Job remains on HOLD until all departments mark completed.
- **User Management**:
    - Intelligent auto-fill for customer role creation.
    - Department heads restricted from billing data.
- **Inventory module**:
    - Required `supplierId` for all new/updated parts.

### Fixed
- Sequential Invoice ID generation logic.
- Billing UI tab persistence in sessionStorage.
- Restored `handleGenerateBill` logic in Job Cards.

## [2026-03-07] - Authentication & Login Fixes

### Fixed
- **Vercel API & Routing (Final Revision)**:
    - Updated `vercel.json` with the full rewrite rules including SPA fallback (`/api/(.*)` and `/(.*)`).
    - Removed all hardcoded `localhost:5000` fallbacks in frontend services (`databaseBridge.js`, `AuthContext.jsx`, etc.) to ensure reliable production API discovery.
    - Verified `api/index.js` as the serverless entry point.
- **Bootstrap & Stability**:
    - Added comprehensive defensive null checks and optional chaining in `databaseBridge.js` and `GlobalStateContext.jsx` to resolve the `supportsCollection` crash.
