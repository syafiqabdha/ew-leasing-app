# Engwah Leasing Portal: System Proposal & User Guide

**Date:** 2026-03-03
**Version:** 4.0 (DeepSeek Intelligence & PWA Update)
**Status:** Production-Ready

---

# Part 1: Executive Proposal

## 1.1 Executive Summary
The **Engwah Leasing Portal (v4.0)** is an enterprise-grade Property Management System that has evolved beyond a simple inventory tool into an intelligent business assistant. This release introduces **Eva 4.0**, powered by the massive **DeepSeek-v3.1 (671B Cloud)** engine, capable of understanding complex technical specifications (M&E, HVAC, Connectivity) and enforcing strict security protocols. With the addition of **Director-level access**, Progressive Web App (PWA) installability, proactive insights, robust rate limiting, and rich text communication, the system now meets rigorous operational standards for reliability and data protection.

## 1.2 Key Value Propositions
*   **Centralized Truth & Document Intelligence**: A single source of truth for all Malls, Units, Tenants, and Contracts. Eva now indexes and provides direct links to uploaded **Sales Kits** and **Floor Plans**.
*   **Expert AI Analysis**: Eva understands industry-standard terminology (e.g., "60A TPN", "Floor Traps", "FCU Count") and provides detailed technical breakdowns in rich-text format (tables, lists, bold emphasis).
*   **Enhanced Security & Governance**:
    *   **Rate Limiting**: AI usage is capped (50 req/hr) to prevent abuse and manage costs.
    *   **Role-Based Access (Director/Admin)**: Strict hierarchy ensures only authorized personnel can request data mutations.
    *   **Audit Trails**: All AI conversations are logged for compliance and review (30-day retention).
*   **Zero-Maintenance Infrastructure**: Built on Docker containerization with self-healing capabilities (e.g., automatic network tunnel restart).

## 1.3 Technology Stack
The application utilizes a modern, future-proof stack:
*   **Frontend**: React.js (Vite) + Tailwind CSS (High-Contrast Neumorphism) + **Markdown Rendering** + **Progressive Web App (PWA)** implementation.
*   **Backend**: Node.js (Express) REST API with **Event-Driven Architecture**.
*   **Database**: PostgreSQL (pgvector & Drizzle ORM) for Relational Data Integrity and semantic vector capabilities.
*   **AI Engine**: **DeepSeek-v3.1 (671b-cloud)** connected via API, featuring Context-Augmented Generation (RAG) and proactive notification reading.
*   **Infrastructure**: Docker Compose + Tailscale (Secure Networking) + **Persistent Funnel Scripts**.

---

# Part 2: Technical Architecture Analysis

## 2.1 System Components
1.  **Presentation Layer (Frontend)**:
    *   Responsive "Glassmorphism" UI with Markdown support (Tables, Links, Code Blocks).
    *   Real-time Notification System (Announcements).
    *   **Dashboard Enhancements**: Collapsible widgets to manage cognitive load and streamline user tracking.
    *   Secure JWT-based Authentication.
2.  **Logic Layer (Backend API)**:
    *   **Manual/Event-Driven Context**: AI memory refreshes efficiently on demand or through triggers.
    *   **Rate Limiter & Moderation**: Protects the AI endpoint from spam and offensive content.
    *   **Chat Logger**: Archives conversations to PostgreSQL for 30 days.
3.  **Data Layer (PostgreSQL)**:
    *   Structured tables for `malls`, `units`, `users`, `documents`, `contacts`, `announcements`, `dashboard_notes`, and **`chat_logs`**.
    *   Default **Director User** generation for recovery access.
4.  **AI Layer (Eva)**:
    *   **Persona**: "Senior Commercial Leasing Analyst".
    *   **Knowledge Graph**: Deep integration with Units, Documents, Notifications, and Contacts directory.

## 2.2 Security Features
*   **Role-Based Access Control (RBAC)**:
    *   `Director` (Board member): Full system control, Database mutations, Executive oversight.
    *   `Admin`: User management, Property management.
    *   `Staff`: Operational access (Edit units, Upload docs).
    *   `Agent`: Read-only access to availability and specs.
*   **Data Protection**:
    *   **Password Redaction**: AI context strictly excludes user credentials.
    *   **Input Sanitization**: Prevents injection attacks and offensive language.
*   **Network Security**:
    *   No public port exposure required; relies on secure Tunnels (Tailscale).

---

# Part 3: Comprehensive User Guide

## 3.1 Getting Started

### Accessing the System
*   **Local Office**: Open your browser and navigate to `http://localhost:5173`.
*   **Remote / Mobile**: Use the provided secure link (e.g., `https://syafiq-nb.tail5e6f37.ts.net`).
*   **App Installation (PWA)**: Look for the installation icon in your browser's address bar or the "Add to Home Screen" option on mobile to install the portal as a native-feeling app.

### Logging In
1.  Enter your assigned **Username** and **Password**.
2.  Click **Secure Login**.
    *   **Director**: `admin@pancatz.com` (Use for executive dashboard and system changes).
    *   *Default Admin*: `admin` / `admin` (Please change immediately).

## 3.2 For Administrators & Staff

### Managing Properties (Malls)
1.  Navigate to the **Properties** tab.
2.  **Add Property**: Click "Manage Properties" -> "Add New".
3.  **Edit/Delete**: Use the Pencil or Trash icon on existing cards.

### Managing Units & Documents
1.  Click on any Property Card to enter the **Mall Detail View**.
2.  **Add Unit**: Click the "+" button. Fill in details like Unit No, Area, Price, and Status.
3.  **Technical Specs**: Input Power (KW), FCU counts, Floor Traps, etc. **Eva reads this instantly.**
4.  **Documents**: Upload Sales Kits or Floor Plans. Eva will provide links to these files in chat.

### Notification System
*   Click the **Bell Icon** to view announcements.
*   **Post Announcement**: Click "Post Announcement" in the panel. Select a target property or "General". This will alert all logged-in users.

## 3.3 For Agents (Read-Only)

### Checking Availability
1.  Log in and select a Property.
2.  Use the **Availability Filter** buttons (All / Vacant / Occupied) to quickly find open units.
3.  Click "View Specs" on any unit to see detailed engineering data (Power, Water, Gas).
4.  **Copy Info**: Click "Click to Copy" in the unit modal to instantly grab a formatted summary for WhatsApp/Email.

### Using Eva (AI Assistant)
Eva is your 24/7 expert. Click the **"Ask Eva"** floating action button in the bottom right.
*   **Rich Text**: Eva now responds with formatted tables, lists, and bold text. Note: Eva cannot send files directly in chat; she will point you to the Documents tab.
*   **Proactive Insights**: Radomly, Eva might remind you of upcoming board meetings or active notifications from the Dashboard.
*   **Technical Queries**: "How many FCU units are in #01-05?" or "List units with >60A power."
*   **Commands**:
    *   `\refresh` - Force Eva to fetch the absolute latest changes from the PostgreSQL database in real-time.
    *   `\add`, `\remove`, `\change` - Eva is strictly read-only to protect data. Issuing these commands will prompt her to guide you to the correct Dashboard menu (Admin/Director only).
*   **Contacts**: "Who is the contact for HVAC maintenance?"
*   **Logout**: Type "logout" or "close" to securely sign out via chat.

## 3.4 Troubleshooting

**"Rate limit exceeded"?**
*   You have sent more than 50 messages in an hour. Please wait or contact an Admin.

**"Network Error" on Mobile?**
*   Ensure you are using the HTTPS Tailscale link, not the Localhost link.
*   Refresh the page.

**Eva not answering accurately?**
*   Ensure the unit data is entered correctly in the "Technical Specifications" section. Eva reads directly from the live database.
