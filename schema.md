# Database Schema Documentation
*Generated for AI Model Context Protocol Mapping*

This document serves as the architectural map of the Engwah Leasing System database using PostgreSQL, integrated with `pgvector`, and interfaced via Drizzle ORM. Access relationships, constraints, and specific schema fields below to allow semantic navigation and precise context formulation.

## Overview
The schema supports property and commercial lease management logic natively. An AI model can read these relations and navigate the data autonomously utilizing standard SQL queries or the provided Drizzle mapped definitions.

---

### `users`
System and agent users mapping with RBAC definition.
- **`id`** (SERIAL, PK)
- **`username`** (VARCHAR 50, UNIQUE)
- **`password_hash`** (VARCHAR 255)
- **`role`** (VARCHAR 50): Restricts privileges. Allowed values: `director`, `admin`, `staff`, `agent`.

### `malls`
The canonical entity representing physical shopping malls/properties.
- **`id`** (SERIAL, PK)
- **`name`** (VARCHAR 100)
- **`slug`** (VARCHAR 100, UNIQUE)
- **`location`** (VARCHAR 255)
- **`image_url`** (VARCHAR 255)

### `units`
A granular table defining every physical retail/lease unit within a given mall. Serves as the primary operational surface for analytics and leasing status.
- **`id`** (SERIAL, PK)
- **`mall_id`** (INT, FK -> malls.id): Delete cascades when a mall drops.
- **`unit_no`** (VARCHAR 20)
- **`level`** (VARCHAR 50)
- **`level_order`** (INT): Abstract level position index.
- **`status`** (VARCHAR 50): Defines availability. Allowed: `vacant`, `occupied`, `reserved`.
- **`tenant_name`**, **`person_in_charge`**, **`contact_email`**, **`contact_phone`**: Lease-specific CRM properties.
- **`area_sqm`** (DECIMAL 10,2): Gross Floor Area representation.
- **Physical Specifications**: `water_point` (Bool), `water_pipe_diameter` (VarChar), `floor_traps` (Int), `ac_power_kw` (Decimal), `fcu_units` (Int), `electric_isolator_tpn_val` (VarChar), `emergency_lights` (Int), `exit_signage` (Int), `pa_speaker` (Int), `fibre_port` (Int), `data_ports` (Int), `gas_pipe` (Bool), `kitchen_ea`/`kitchen_fa` (Bool & Specifier), `sprinkler` (Int)
- **`unit_model`** (TEXT): Describes classification mapping.
- **`embedding`** (VECTOR 384): **Reserved for semantic search vectors generated natively by the connected LLM framework.** An MCP agent can retrieve semantically related units directly via `l2_distance` or `cosine_distance` over `pgvector`.

### `sales_kits`
File repository mappings. Links presentation collateral to particular malls.
- **`id`** (SERIAL, PK)
- **`mall_id`** (INT, FK -> malls.id)
- **`title`** (VARCHAR 100)
- **`file_url`** (VARCHAR 255)
- **`type`** (VARCHAR 50): `sales`, `ads`, `floorplan`, `others`.
- **`uploaded_at`** (TIMESTAMPTZ)

### `contacts`
Global CRM contacts.
- **`id`** (SERIAL, PK)
- **`name`**, **`email`**, **`phone`**, **`company`**
- **`type`** (VARCHAR 50): `Tenant`, `Agent`, `Vendor`.
- **`remark`** (TEXT)
- **`created_at`** (TIMESTAMPTZ)

### `announcements`
Push notifications and operational broadcasts.
- **`id`** (SERIAL, PK)
- **`title`**, **`description`**, **`author`**, **`role`**
- **`target_property`** (VARCHAR 100): Used for scoping alerts to specific `malls.name` or `General`.
- **`expiry_date`**, **`created_at`** (TIMESTAMPTZ)

### `chat_logs`
User chat histories persisted for continuous memory loop.
- **`id`** (SERIAL, PK)
- **`user_id`** (INT)
- **`message`**, **`response`** (TEXT)
- **`created_at`** (TIMESTAMPTZ)

## AI Interactions (Model Context Protocol)
MCP Agents interfacing with the system can assume:
1. `units` and `malls` hold a 1-to-many relationship. The overarching logic utilizes foreign references.
2. Embedding searches can cross-reference `units.embedding` to map natural language requirements ("I need an F&B space with 3 floor traps and high AC cooling capacity") against unit definitions natively on the database.
3. Access privileges inside chat logs can retrieve data up to a 30-day window (`created_at > NOW() - INTERVAL '30 days'`).
