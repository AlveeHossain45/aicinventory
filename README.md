# Inventory Management System

A responsive inventory management application for tracking products, sales, purchases, customers, suppliers and payments — with Google Sign-In and Google Sheets as the data layer.

---

## Overview

This application covers the day-to-day operations of a small business: stock levels, sales and purchase records, customer and supplier directories, payments and receipts, plus a reporting view over it all. Data is stored in a Google Sheet, so records are shared across devices without running a dedicated server, and authentication is handled through Google Sign-In.

---

## Features

- **Dashboard** — key metrics and activity overview
- **Inventory** — product catalog with stock tracking
- **Sales & Purchases** — record and review transactions
- **Customers & Suppliers** — contact and business partner directories
- **Payments & Receipts** — payment records tied to transactions
- **Reports** — summarized views of business data
- **Users & Settings** — account and application preferences
- **Google Sign-In** — authentication via Google OAuth
- **Google Sheets backend** — CRUD operations against a shared spreadsheet
- **Responsive layout** — works on desktop and mobile

---

## Tech Stack

| Layer | Technologies |
|:------|:-------------|
| Frontend | React 18, Vite, React Router |
| Styling | CSS |
| Charts | ApexCharts |
| Forms & UI | React Select, React Flatpickr |
| Authentication | Google OAuth (`@react-oauth/google`) |
| Data | Google Sheets API v4 |
| Deployment | GitHub Pages |

---

## Screenshots

> **Placeholder** — capture the app and save images under `screenshots/`, then replace the paths below.

```md
![Dashboard](screenshots/dashboard.png)
![Inventory](screenshots/inventory.png)
![Reports](screenshots/reports.png)
```

---

## Live Demo

**https://alveehossain45.github.io/aicinventory/**

---

## Installation

```bash
git clone https://github.com/AlveeHossain45/aicinventory.git
cd aicinventory
npm install
```

Create a `.env` file in the project root (see below), then:

```bash
npm run dev        # start development server
npm run build      # production build
npm run preview    # preview the build
```

---

## Environment Variables

Create a `.env` file — never commit it (it is already covered by `.gitignore`):

```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_SPREADSHEET_ID=your-google-spreadsheet-id
```

| Variable | Description |
|:---------|:------------|
| `VITE_GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console (used for Google Sign-In) |
| `VITE_SPREADSHEET_ID` | ID of the Google Sheet that stores application data |

Setup steps:

1. Create an OAuth client ID (type: **Web application**) in Google Cloud Console and restrict it to your dev/deploy URLs.
2. Create a Google Sheet, share it with the service account or yourself as the authenticated user, and copy its ID from the URL.
3. Enable the **Google Sheets API** and **Google OAuth** consent screen for your project.

> The OAuth client ID and spreadsheet ID are public identifiers, not secrets — but keep them in `.env` so configuration stays out of the code. Never commit API keys or service-account JSON files.

---

## Project Structure

```text
src/
├── api/
│   └── googleSheetsService.js   # Google Sheets API read/write helpers
├── components/
│   ├── common/                  # Modal, Spinner
│   └── layout/                  # Layout, Sidebar, Topbar
├── context/
│   ├── AuthContext.jsx          # Google OAuth session
│   └── DataContext.jsx          # shared data loading + refresh
├── pages/
│   ├── Auth/                    # Login
│   ├── Dashboard/               # Metrics overview
│   ├── Inventory/               # Product catalog
│   ├── Sales/  Purchases/       # Transactions
│   ├── Customers/  Suppliers/   # Directories
│   ├── Payments/  Receipts/     # Payment records
│   ├── Reports/  Users/  Settings/
├── utils/
└── main.jsx                     # HashRouter (GitHub Pages compatible)
```

---

## Future Improvements

- Offline-first local cache with background sync
- CSV / Excel export for reports
- Barcode scanning for stock entry
- Role-based access control for multi-user teams

---

## License

See [PRIVACY.md](PRIVACY.md) for data handling details.
