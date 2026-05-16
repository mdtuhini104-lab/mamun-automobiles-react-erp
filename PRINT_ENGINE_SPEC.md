# 'Alive Anti-Gravity' Print Engine Specification

This document defines the core principles and technical standards for all professional print exports within the Mamun Automobiles ERP system. All future reports, invoices, and documents MUST adhere to these rules.

## Core Principles

### 1. A4 Frame Lock (Rigid Canvas)
All printable content must be wrapped in a container that is strictly locked to A4 dimensions to prevent unpredictable browser layout shifts.
- **Rules**:
  - `height: 297mm !important`
  - `width: 210mm !important`
  - `overflow: hidden !important`
  - `background: white`
  - Class: `.alive-print-area`

### 2. Flex-Column Architecture
Use a flexbox-based column layout to allow for dynamic positioning and magnetized elements.
- **Rules**:
  - `display: flex !important`
  - `flex-direction: column !important`
  - This allows the header, body, and footer to stack vertically while maintaining control over spacing.

### 3. Magnet Footer (Magnetic Bottom-Lock)
Footers must be vertically "pushed" to the very bottom of the A4 frame, regardless of how much content is in the body.
- **Rules**:
  - `margin-top: auto !important` applied to the footer container (e.g., `.alive-footer-lock`).
  - This ensures signatures and bottom-branding always appear at the base of the A4 page.

### 4. Smart Scale (Self-Healing / Anti-Gravity)
The system must automatically handle content overflow without breaking onto a second page.
- **Threshold**: **1080px** (Standard A4 pixel equivalent at 96DPI).
- **Engine**: `printAssistant.js` monitor.
- **Logic**: If `scrollHeight > 1080px`, apply `transform: scale(1080 / scrollHeight)` with `transform-origin: top center`.

---

## Technical Implementation Guide

### Global CSS (`index.css`)
```css
@media print {
  .alive-print-area {
    display: flex !important;
    flex-direction: column !important;
    height: 297mm !important;
    width: 210mm !important;
    /* ... additional premium styles ... */
  }
  .alive-footer-lock {
    margin-top: auto !important;
  }
}
```

### Javascript Assistant (`printAssistant.js`)
Initialized in `App.jsx`, this assistant intercepts the `beforeprint` event to perform the "Smart Shrink" calculation.

---
*Created on 2026-04-11 by Antigravity AI*
