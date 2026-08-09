# 📌 Disaster Relief Coordination Platform

## 📖 1. Project Overview

### 🧩 Case Study

Malaysia frequently experiences natural disasters such as floods, landslides, and severe storms, particularly during monsoon seasons. During these emergencies, multiple stakeholders — including government agencies, NGOs, volunteers, healthcare providers, and local communities — must coordinate to provide timely assistance to affected victims.

However, disaster response efforts are often inefficient due to the lack of a centralized coordination system. Victims struggle to access reliable and up-to-date information, while relief organizations face difficulties in managing resources and coordinating operations.

This project proposes a centralized web-based Disaster Relief Coordination Platform to improve communication, coordination, and resource distribution during disaster situations.

---

### ⚠️ Stated Challenges (From Case Study)

- Fragmented communication channels between stakeholders
- Delayed and inconsistent information sharing
- Lack of a centralized platform for coordinating relief efforts
- Victims unable to access accurate information on shelters, aid, and emergency services
- Outdated or inaccurate information during rapidly changing situations
- Difficulty in managing resources and tracking donations
- Inefficient volunteer coordination
- Lack of visibility on areas with the greatest need
- Duplicate aid distribution in some areas and insufficient support in others
- Manual and disconnected systems for victim registration and reporting
- Difficulty in monitoring victims, resources, and ongoing relief activities

---

### 🛠️ Tech Stack

| Component                    | Technology            |
| ---------------------------- | --------------------- |
| Frontend                     | React.js              |
| Backend                      | Node.js + Express.js  |
| Database                     | PostgreSQL            |
| Cloud Platform               | Amazon Web Services   |
| Deployment (Compute Service) | AWS Elastic Beanstalk |
| Database Hosting             | Amazon RDS            |

---

### 🏗️ System Architecture

The system follows a 2-tier client-database architecture:

```
┌──────────────────────────────────────────┐
│           REACT APPLICATION              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         UI + API + Logic           │  │
│  │     (All in One Application)       │  │
│  └─────────────────┬──────────────────┘  │
│                    │                      │
│                    ▼                      │
│  ┌────────────────────────────────────┐  │
│  │     Direct Database Access         │  │
│  └─────────────────┬──────────────────┘  │
└────────────────────┼─────────────────────┘
                     │
                     ▼
          ┌────────────────────┐
          │   AWS RDS Database │
          │  (Data Storage)    │
          └────────────────────┘

```

#### Components Explanation

**Client (Frontend)**

- Provides the user interface for all roles (Admin, Volunteer, General User, etc.), handles API requests, business logic, and system processing

**Database (RDS)**

- Stores victims, shelters, resources, volunteers, and disaster data

---

## 👥 2. Team Roles & Functionalities

| No. | Member Name | Role                | Functionalities                                                                                                                  |
| --- | ----------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Shariq      | Admin               | Register and manage victims, assign victims to shelters, manage shelters, manage disaster events, manage resources and donations |
| 2   | Shobbhan    | Relief Organization | Manage resources, track donations, monitor distribution, update aid availability                                                 |
| 3   | Shawn       | Volunteer           | View assigned tasks, update victim status, assist in relief operations                                                           |
| 4   | Zakwaan     | Public User         | View disaster announcements, view shelters and aid information, access emergency contacts                                        |

---

## 🗂️ 3. Project Structure & Explanation

### 📦 High-Level Structure

```
project-root/
│
├── core/                  # Shared configuration (database, utilities)
│
├── roles/
│   ├── admin/
│   ├── relief_organization/
│   ├── volunteer/
│   └── public_user/
│
└── README.md
```

### 🧠 Role-Based Module Separation

Each role has its own isolated module, containing:

- **Frontend** (UI for that role)
- **Backend** (APIs for that role)

This ensures:

- Clear ownership per team member
- Minimal code conflicts
- Easier collaboration

---

### ⚙️ Backend Structure

```
backend/
├── routes.js
├── controllers/
├── services/
```

#### 📍 routes.js

**Purpose:** Defines API endpoints and connects them to controllers

**Example:**

```javascript
router.post("/victims", registerVictim);
```

---

#### 🎮 controllers/

**Purpose:** Handle the request and response

They:

- Receive data from frontend (req)
- Call the business logic (service)
- Send response back (res)

> **In simple terms:** Controller = middleman between user request and system logic

---

#### 🔧 services/

**Purpose:** Handle the business logic and database operations

They:

- Process system logic (e.g., assigning victims to shelters)
- Interact with the database
- Return results to controller

> **In simple terms:** Service = actual system logic

---

### 🌐 Frontend Structure

```
frontend/
├── routes.js
├── pages/
├── components/
```

#### 📍 Frontend routes.js

**Purpose:** Handles navigation between pages

**Example:**

```javascript
{ path: "/admin/dashboard", component: AdminDashboard }
```

---

### 🔄 System Flow (Code-Level Understanding)

This explains how different parts of the system interact:

```
User → Frontend Route → API Call → Backend Route → Controller → Service → Database → Response → UI Update
```

#### Step-by-step:

1. User interacts with UI
2. Frontend loads page via route
3. Frontend sends API request
4. Backend route receives request
5. Controller handles request
6. Service processes logic
7. Database is queried
8. Response is returned
9. UI updates

---

## 🚀 4. Setup Guide

### 📥 Clone Repository

```bash
git clone https://github.com/Legendary-Phoenix/RescueNet-Disaster-Relief-Management-System.git
cd RescueNet-Disaster-Relief-Management-System
```

### 📦 Install Dependencies

```bash
npm install
```

### ⚙️ Environment Configuration

Create `.env` file:

```
DB_HOST=rds-endpoint
DB_USER=username
DB_PASSWORD=password
DB_NAME=database
PORT=port number
```

### ▶️ Run Application

```bash
npm start
```

---

## 🔄 5. Git Workflow

### Daily Workflow

1. **Make your changes**
   - Edit files as needed
   - Test your changes locally

2. **Stage and commit changes**

   ```bash
   git add .
   git commit -m "Your commit message here..."
   ```

3. **Push to your branch**
   ```bash
   git push origin <your-branch-name>
   ```

### Important Rules

> ⚠️ **DO NOT push directly to the `main` branch.**

- Members should only push to their own branches
- All updates will be reviewed and merged to `main` later
- Always pull from `main` before starting new work to avoid conflicts
