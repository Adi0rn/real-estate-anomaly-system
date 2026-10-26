# Visual & Responsive QA Audit Report
**Project:** Real Estate Anomaly Detection System (PropAudit)  
**Date:** October 26, 2026  
**Auditor:** Senior Frontend QA Engineer & Responsive Design Specialist  
**Test Stack:** Puppeteer Core Headless Chrome, Node.js v22, Next.js 16.4.0 (Turbopack), Tailwind CSS v4, TypeScript 5  

---

## 1. Executive Summary

A comprehensive visual, responsive, and functional audit was executed across all major routes of the Real Estate Anomaly Detection System in both **Light** and **Dark** themes across 7 target viewports:
- **320px × 640px** (Narrow Mobile / iPhone SE 1st gen)
- **375px × 667px** (Classic Mobile / iPhone SE 2nd/3rd gen)
- **390px × 844px** (Modern Mobile / iPhone 12/13/14)
- **768px × 1024px** (Tablet Portrait / iPad Mini)
- **1024px × 768px** (Small Desktop / Tablet Landscape)
- **1280px × 800px** (Standard Desktop / MacBook Air)
- **1440px × 900px** (Wide Desktop / Pro Monitor)

Audited routes:
1. `/` — Marketplace Listings & Semantic Vector Search
2. `/properties/1` — Property Architectural Details & Benchmark Breakdown
3. `/admin` — Statistical Anomaly Audit Queue & Decision Console
4. `/login` — User & Auditor Authentication Portal
5. `/register` — Account Registration Portal

---

## 2. Horizontal Overflow & Layout Conformance Matrix

Every route was audited across all viewports to detect document-level horizontal scrolling (`document.documentElement.scrollWidth > window.innerWidth`).

| Route | 320px | 375px | 390px | 768px | 1024px | 1280px | 1440px | Theme Parity |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` | PASS (320px) | PASS (375px) | PASS (390px) | PASS (768px) | PASS (1024px) | PASS (1280px) | PASS (1440px) | Light & Dark Identical |
| `/properties/1` | PASS (320px) | PASS (375px) | PASS (390px) | PASS (768px) | PASS (1024px) | PASS (1280px) | PASS (1440px) | Light & Dark Identical |
| `/admin` | PASS (320px) | PASS (375px) | PASS (390px) | PASS (768px) | PASS (1024px) | PASS (1280px) | PASS (1440px) | Light & Dark Identical |
| `/login` | PASS (320px) | PASS (375px) | PASS (390px) | PASS (768px) | PASS (1024px) | PASS (1280px) | PASS (1440px) | Light & Dark Identical |
| `/register` | PASS (320px) | PASS (375px) | PASS (390px) | PASS (768px) | PASS (1024px) | PASS (1280px) | PASS (1440px) | Light & Dark Identical |

---

## 3. Confirmed Defects & Resolutions

### Defect 1: Audit Queue Table Column Collapse on Mobile/Tablet Viewports
- **ID:** QA-RESP-001
- **Severity:** Medium
- **Page:** `/admin`
- **Themes Affected:** Light & Dark
- **Viewports Affected:** 320px, 375px, 390px, 768px
- **Issue:** The 7-column statistical anomaly audit queue table inside `<div className="overflow-x-auto">` lacked a minimum width (`min-w-[720px]`). On narrow screens, columns compressed tightly, wrapping table headers and multi-button action cells vertically, hindering readability.
- **Root Cause:** Table relied solely on `w-full` without enforcing minimum table column widths.
- **Location:** [components/AnomalyRadar.tsx](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/components/AnomalyRadar.tsx#L195-L207)
- **Fix Applied:** Added `min-w-[720px]` to `<table>`, `whitespace-nowrap` to each `<th>` header cell, and `whitespace-nowrap` to the action button table cell.
- **Status:** **VERIFIED FIXED**

---

### Defect 2: Modal Card Vertical Clipping on Short Viewports & Mobile Landscape
- **ID:** QA-RESP-002
- **Severity:** Medium
- **Page:** `/` (Quick Spec Modal) and `/admin` (Algorithmic Justification Breakdown)
- **Themes Affected:** Light & Dark
- **Viewports Affected:** Mobile landscape (e.g., 667px × 375px) and short screens (height < 640px)
- **Issue:** The Quick Spec dialog and Anomaly Reason drawer lacked maximum height bounds with vertical overflow auto. On compact screen heights, footer action buttons ("Close", "Full Profile") were pushed below the visible viewport fold.
- **Root Cause:** Modal card wrapper container lacked `max-h-[calc(100vh-2.5rem)] overflow-y-auto`.
- **Location:**
  - [components/PropertyDetailModal.tsx](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/components/PropertyDetailModal.tsx#L79)
  - [components/AnomalyRadar.tsx](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/components/AnomalyRadar.tsx#L367)
- **Fix Applied:** Added `max-h-[calc(100vh-2.5rem)] overflow-y-auto` to both modal dialog card containers.
- **Status:** **VERIFIED FIXED**

---

### Defect 3: Top Badge Overlay Collision on Narrow Listing Cards
- **ID:** QA-RESP-003
- **Severity:** Low/Medium
- **Page:** `/`
- **Themes Affected:** Light & Dark
- **Viewports Affected:** 320px – 360px
- **Issue:** When a property card displayed property type + listing type on the left overlay, and similarity match percentage + anomaly alert badge on the right overlay, the badges collided and overlapped on narrow cards (~280px inner card width).
- **Root Cause:** Badge overlay container used `flex items-center justify-between` without `flex-wrap` and gap spacing.
- **Location:** [components/PropertyCard.tsx](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/components/PropertyCard.tsx#L68-L83)
- **Fix Applied:** Changed overlay container to `flex flex-wrap items-start justify-between gap-1.5 p-2.5 sm:p-3` and the right badge container to `flex flex-wrap items-center justify-end gap-1.5`.
- **Status:** **VERIFIED FIXED**

---

### Defect 4: Mobile Drawer Theme Toggle Navigation Visibility
- **ID:** QA-UI-004
- **Severity:** Low
- **Page:** Global Navigation Header (`/`, `/properties/[id]`, `/admin`, `/login`, `/register`)
- **Themes Affected:** Light & Dark
- **Viewports Affected:** < 768px (Mobile & Tablet)
- **Issue:** While the theme toggle was accessible on the top navigation bar, the expanded slide-out mobile drawer menu did not provide an integrated theme status or toggle row for users interacting within the mobile menu drawer.
- **Root Cause:** Mobile drawer list only included page links and logout without a dedicated Theme row.
- **Location:** [components/Navbar.tsx](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/components/Navbar.tsx#L265-L272)
- **Fix Applied:** Added a dedicated mobile drawer theme row with descriptive label and `ThemeToggle` component styled with subtle card borders.
- **Status:** **VERIFIED FIXED**

---

### Defect 5: Specification Grid Typography Wrapping on 320px
- **ID:** QA-RESP-005
- **Severity:** Low
- **Page:** `/properties/[id]`
- **Themes Affected:** Light & Dark
- **Viewports Affected:** 320px
- **Issue:** On 320px screens with 2-column specifications grid (~130px column width), text values such as `4 Bedrooms (BHK)` wrapped onto three lines.
- **Root Cause:** Specification metric values used fixed `text-sm font-bold` (14px).
- **Location:** [app/properties/[id]/page.tsx](file:///c:/Users/abhyu/Documents/DBMS/miniproj/real-estate-anomaly-system/app/properties/%5Bid%5D/page.tsx#L218-L245)
- **Fix Applied:** Updated specification values to responsive typography `text-xs sm:text-sm font-bold`.
- **Status:** **VERIFIED FIXED**

---

## 4. Verification & Regression Testing Results

All automated checks passed with zero errors:

| Check | Tool / Runner | Result |
| :--- | :--- | :--- |
| **Type Check** | `npx tsc --noEmit` | **0 errors** (Clean exit code 0) |
| **Code Quality & Linter** | `npm run lint` | **0 errors, 0 warnings** |
| **Auth & Security Unit Tests** | `npm test` (`tests/auth.test.ts`) | **8 of 8 passed** |
| **API Route Security Tests** | `npx tsx tests/api-security.test.ts` | **9 of 9 passed** |
| **Production Build** | `npm run build` | **All 15 routes compiled & static pages prerendered** |
| **Automated Visual Regression** | Puppeteer Headless Chrome | **0 horizontal overflow defects across all 7 viewports** |
| **Theme Switching & Persistence** | Puppeteer `localStorage` test | **Verified instant switch & persistence on page reload** |
| **Quick Spec Modal Test** | Puppeteer click trigger | **Modal opens, displays details, and dismisses cleanly** |
| **Mobile Drawer Test** | Puppeteer click trigger | **Drawer opens smoothly with theme toggle row** |
