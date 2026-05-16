# Mamun Automobiles Workshop Management System

A professional, offline-first web application engineered to manage billing, inventory, and comprehensive customer reports for automobile workshops. Designed with a focus on usability and data security, this platform provides dynamic reporting, seamless multitasking, and robust data management built specifically for Mamun Automobiles and Muntaha Motors.

---

## 🛠 Tech Stack
This project leverages a modern, scalable frontend architecture:
- **React**: Core framework for building dynamic, component-driven user interfaces.
- **Ant Design**: Enterprise-class UI framework for clean, responsive, and robust components (Tables, Modals, Forms).
- **Lucide-React**: Beautiful, consistent icon library utilized throughout the application.
- **Local Storage API**: Native browser database used for offline persistence.
- **SheetJS (xlsx)** & **Day.js**: Utility libraries for Excel exports and date/time manipulation.

---

## 🚀 Key Features

- **Multi-Tab Billing System**
  Generate, manage, and edit multiple customer invoices concurrently in distinct tabs without losing data context.
  
- **Dynamic Branding**
  Instantly toggle the invoice branding directly on the billing screen. Switch between *Mamun Automobiles* and *Muntaha Motors* headers with a single click.

- **Inventory with Stock Alerts**
  Add parts and mechanic services natively within invoices to calculate subtotals and discounts. The dashboard is prepared to show real-time Low Stock Alerts based on inventory thresholds.

- **Payment Collection & Company Ledgers**
  Automatically track cash payments against generated bills. The system calculates and displays a customer's Net Outstanding balance via dynamic ledgers.

- **LocalStorage Backup & Admin Utilities**
  Ensure your data is never lost. Seamlessly export your entire database (saved bills, customers, payments) into a `.json` file, and restore it at any time with the built-in Admin Utilities.

- **Sales Reports Dashboard & Excel Exports**
  Filter daily revenues and collections using an intuitive date-picker. Export comprehensive bill metrics into an `.xlsx` workbook with one click.

---

## ⚙️ Setup Instructions

To run this project locally on your machine, follow these steps:

1. **Prerequisites**
   Ensure you have [Node.js](https://nodejs.org/) installed on your computer.

2. **Clone and Install Dependencies**
   Open your terminal in the root directory of the project and run:
   ```bash
   npm install
   ```
   *(This will inherently install required packages: `react`, `antd`, `lucide-react`, `xlsx`, `dayjs`, etc.)*

3. **Start the Development Server**
   Boot up the application by running:
   ```bash
   npm run dev
   ```

4. **Access the Application**
   Open your browser and navigate to the local server address provided in the terminal (usually `http://localhost:5173` or `http://localhost:3000`).

---

## 🛡️ Maintenance & Admin Guidelines

The system includes a dedicated **Settings** page accessible from the sidebar. Use this exclusively for system administration and data continuity:

- **Backup Data (Recommended Daily)**: Click **"Download Backup"** to export a `.json` snapshot of your current Local Storage. Keep these files secure in case of browser clears or workstation migrations.
- **Restore Data**: If moving to a new computer or recovering from a data loss, use the **"Upload Backup File"** option to reinstate your records instantly.
- **Clear All Data**: In the Danger Zone, you can wipe the system clean. This permanently removes all bills, payments, and tracking from the current browser. Always double-check that you have a backup before initiating this action!

---
*Developed with precision for workshop management excellence.*
