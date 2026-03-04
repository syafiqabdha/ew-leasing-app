# 🏢 Engwah Leasing Portal
![Static Badge](https://img.shields.io/badge/Status%3A-Ready%20to%20Deploy-softgreen?style=plastic)
![Static Badge](https://img.shields.io/badge/Version%3A-v1-blue?style=plastic)

* **Zero-Maintenance Deployment:** The entire application stack is fully containerized.
* **Local Deployment:** No Cloud charges.
* **Own the Codebase:** Codebase dedicated for Engwah and easy to integrate with the next project.
* **Easy Update:** Simply push and pull to any deployed host to get the latest update.
_______
### 🛠️ Prerequisites

Before you dive in, make sure you have these two power tools installed:

- [**Docker**](https://docs.docker.com/get-docker/)
- [**Docker Compose**](https://docs.docker.com/compose/install/)


<<<<<<< HEAD
*   **Centralized Truth & Document Intelligence**: A single source of truth for all Malls, Units, Tenants, and Contracts. Integrates uploaded Sales Kits and Floor Plans.
*   **Expert AI Analysis (Eva)**: Context-augmented AI providing detailed technical breakdowns in rich-text format.
*   **Enhanced Security & Governance**: Role-Based Access Control (Director, Admin, Staff, Agent), rate limiting for AI (50 req/hr), and chat audit logs.
*   **Zero-Maintenance Infrastructure**: Built on Docker containerization with secure networking via Tailscale.
=======
### 🚀 Installation & Execution
>>>>>>> de8150effd73939eafc3fa43c6eeb42550d66dad

Follow these simple steps to get the portal up and running in minutes:

1. **Clone the repository**
Grab the project files and navigate to the project root.
2. **Start the engines**
Fire up the entire stack with a single command:
```
docker-compose up --build
```

**What’s happening under the hood?**
*   🐘 **`db`**: A PostgreSQL instance pre-loaded with `pgvector` via `init.sql`.
*   ⚙️ **`backend`**: Our Node.js API server running on [port 5000](http://localhost:5000).
*   🎨 **`frontend`**: The Vite + React interface waiting for you on [port 5173](http://localhost:5173).
*   🧠 **`ollama`**: Local LLM provider on [port 11434](http://localhost:11434). *(Note: The backend will auto-pull the required model if it's missing!)*

3. **Access the Portal**
*   Point your browser to: `http://localhost:5173` and install to to your phone (PWA feature). Support IOS and Android.

<<<<<<< HEAD
### Logging In
1. Enter assigned **Username** and **Password**.
2. **Director**: `admin@pancatz.com` (For system changes/executive oversight)
3. **Default Admin**: `admin` / `admin` (Change immediately)
=======
### 📂 Project Structure
>>>>>>> de8150effd73939eafc3fa43c6eeb42550d66dad

Here is a bird's-eye view of how the project is organized:

<<<<<<< HEAD
*   **Director (Board Member)**: Full system control, Database mutations, Executive access.
*   **Admin**: User management, Property management.
*   **Staff**: Operational access (Edit units, Upload docs).
*   **Agent**: Read-only access to availability and specs.
=======
```
text.
├── 🖥️ backend/                # Node.js REST API & AI Integration
│   ├── src/
│   │   ├── db/                # Drizzle ORM schema, migrations, connection
│   │   └── utils/             # Environment validation
│   ├── server.ts              # Main Express server and route handlers
│   └── package.json           # Backend dependencies
├── ⚛️ frontend/               # React UI
│   ├── src/
│   │   ├── components/        # UI components (Dashboard, Chatbot, etc.)
│   │   ├── App.jsx            # Main routing and global state
│   │   └── main.jsx           # Entry point
│   └── package.json           # Frontend dependencies
├── 🐳 docker-compose.yml      # Orchestration configuration
├── 📜 init.sql                # Database initialization script (pgvector)
├── 🤖 AGENTS.md               # System instructions & coding conventions
└── 📖 schema.md               # Database schema documentation
```
>>>>>>> de8150effd73939eafc3fa43c6eeb42550d66dad

### 🗺️ Future Roadmap

We’re just getting started! Here’s what’s cooking for future updates:

- **📦 Inventory System Integration**  
A real-time inventory tracker for each property, allowing the team to push live updates instantly.

- **💬 Team Chat Integration**  
Dedicated communication channels to keep every team member in the loop without leaving the app.

- **☁️ Cloud File Integration**  
A centralized hub to share the latest documentation and files securely with the whole team.

<div align="center">
Built with ❤️ for the EW

</div>

