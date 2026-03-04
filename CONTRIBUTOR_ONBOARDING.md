# Contributor Onboarding & Training

Welcome to the Engwah Leasing Portal (v3.0)! This repository is an advanced, AI-driven Property Management System. To get you started, we've prepared a quick study guide and self-assessment quiz based on the system's architecture and rules.

---

## 📚 Study Guide: Core Concepts

1.  **Eva (AI Analyst)**:
    *   **Role**: Senior Commercial Leasing Analyst.
    *   **Capabilities**: Reads technical specs, enforces security protocols, retrieves documents (Sales Kits/Floor Plans).
    *   **Limits**: 50 requests per hour per user (rate limiting).
2.  **Role-Based Access Control (RBAC)**:
    *   `Sudo`: Full control, DB mutations, emergency access.
    *   `Admin`: User/Property management.
    *   `Staff`: Operational tasks (edit units, upload docs).
    *   `Agent`: Read-only access to specs and availability.
3.  **Architecture**:
    *   React.js frontend, Node.js + Express backend.
    *   PostgreSQL database (with `pgvector`).
    *   Drizzle ORM for queries.
    *   Docker Compose + Tailscale for deployment.
4.  **Security Rule**:
    *   **Fail-Fast**: The backend immediately crashes if critical environment variables (like `JWT_SECRET`) are missing.

---

## 📝 Self-Assessment Quiz

Test your knowledge before making your first commit. *(Answers are at the bottom)*

**Q1: What is the maximum number of AI requests a user can make per hour to Eva?**
A) 100
B) 50
C) Unlimited
D) 10

**Q2: Which user role is required to perform critical system changes and emergency database mutations?**
A) Admin
B) Staff
C) Agent
D) Sudo

**Q3: If the `JWT_SECRET` environment variable is missing when the backend starts, what happens?**
A) The backend uses a default "dev_secret" and continues.
B) The backend logs a warning but stays online.
C) The backend fails immediately (Fail-Fast validation).
D) The frontend handles the missing token.

**Q4: Which ORM (Object-Relational Mapping) tool is strictly used in this project?**
A) Prisma
B) Sequelize
C) TypeORM
D) Drizzle

---
*Answers: Q1: B, Q2: D, Q3: C, Q4: D*
