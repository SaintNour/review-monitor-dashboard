# 📊 Review Monitor Dashboard

A modern **React + TypeScript dashboard** for tracking customer feedback, reviews, and resolution workflows across multiple platforms such as Amazon, eBay, and social media channels.

This project is a production-style enterprise dashboard used for managing customer feedback workflows, built with a focus on scalability, performance, and real-world operational structure.

---

# 🌐 Overview

Review Monitor Dashboard is designed to simulate and support real operational workflows used in customer support and e-commerce environments, including:

- Tracking customer feedback across multiple platforms
- Managing review resolution pipelines
- Categorizing issues and sentiment trends
- Monitoring KPIs and operational performance
- Supporting internal support and QA workflows

---

# 🏢 Enterprise Usage

This system is used on a daily operational basis within a live business environment at **Detroit Axle**, supporting customer feedback tracking and internal resolution workflows.

It is actively used as part of internal processes for handling, organizing, and resolving customer review data and support cases.

---

# ✨ Features

## 📊 Analytics Dashboard
- KPI overview cards
- Platform distribution (Amazon, eBay, Social, etc.)
- Star rating analytics
- Error categorization system
- Aging/time-to-resolution tracking

## 🧾 Entry Management
- Create and edit feedback entries
- Full entry detail view
- Comment and activity history tracking
- Status-based workflow management

## 📂 Workflow System
- 🟡 Ongoing cases queue
- 🟢 Resolved cases queue
- 🌐 Social media feedback queue
- Filtering, sorting, pagination

## 👥 Admin Simulation
- Mock admin users
- Team structure simulation
- Role-based UI behavior (frontend-only)

## ⚙️ Settings
- Theme presets
- UI configuration options
- Local session cache controls

---

# ⚙️ Tech Stack

- React 18
- TypeScript
- Vite

### UI & Visualization
- Tailwind CSS
- Recharts
- Framer Motion

### Routing & Forms
- React Router
- React Hook Form
- Zod

---

# 🚀 Quick Start

```bash
npm install
npm run dev
```

Open:

```
http://localhost:5173
```

The application loads directly into the dashboard (no authentication required).

---

# 📜 Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

# 🧠 Architecture Overview

## 📦 UI Layer
- Modular React component system
- Reusable dashboard widgets
- Responsive layout structure

## 📊 Data Layer
- Fully mock-based dataset system
- In-memory state simulation
- Sample data located in `src/data/mockStore.ts`

## 🔄 State Management
- React hooks-based state handling
- Form management via React Hook Form
- Schema validation using Zod

---

# 📂 Project Structure

```text
src/
├── components/
├── pages/
├── data/
├── hooks/
├── lib/
├── services/
├── types/
└── App.tsx
```

---

# 📊 Data Behavior

- No backend or external APIs
- Mock dataset-driven system
- Session-based state (resets on refresh)
- Designed to simulate real operational workloads

---

# 🔐 What Was Removed

This repository is frontend-only and safe for public/portfolio use:

- ❌ Firebase integration
- ❌ Backend services
- ❌ Database layer (PostgreSQL/Prisma)
- ❌ Environment secrets
- ❌ Production builds

---

# 🎯 Purpose

This project demonstrates:

- Enterprise dashboard UI design
- Real-world workflow simulation
- Scalable frontend architecture
- Data visualization systems
- Operational feedback management systems

---

# 📄 License

## 🔒 Proprietary Portfolio License

Copyright © 2026. All rights reserved.

This project is proprietary and confidential.

No part of this repository may be copied, modified, distributed, sublicensed, or used for commercial purposes without explicit written permission from the author.

Permission is granted only for:
- Portfolio review
- Technical evaluation
- Recruiter assessment

Unauthorized use is strictly prohibited.

---

# 👨‍💻 Author

Saed Nour

Specialized in:
- Frontend architecture (React / TypeScript)
- Enterprise dashboard systems
- Workflow simulation tools
- Data visualization interfaces

---

# 🚀 Project Goal

This dashboard is actively used in a real operational environment for customer feedback tracking and internal review workflows, demonstrating production-level frontend architecture and enterprise UI patterns.