# UOB-Landscape

The official Landscape Website for the University of Bahrain (UOB)—a collaborative initiative between the College of Information Technology, the College of Science, and the College of Engineering.

## Table of Contents
- [Overview](#uob-landscape)
- [Copyright & Usage Restrictions](#copyright--usage-restrictions)
- [System Architecture & Important Notes](#system-architecture--important-notes)
- [Live Demo & Contributors](#live-demo--contributors)
- [Tech Stack & Frameworks](#tech-stack--frameworks)
- [Website Features](#website-features)
- [Repository Structure](#repository-structure)

---

## Copyright & Usage Restrictions
Copyright © 2026 University of Bahrain. All rights reserved. 

This repository is public for viewing purposes only. Unauthorized downloading, copying, modification, distribution, or commercial use of any code or content herein, via any medium, is strictly prohibited.

---

## System Architecture & Important Notes

1. **Modernized Architecture:** Developed entirely from scratch, this modern dynamic version supersedes earlier static prototypes. It incorporates an advanced security architecture, optimized workflows, and a fully overhauled user experience.
2. **Deployment Code Structure:** The code in this repository includes specific deployment configurations tailored for hosting on Render. The base source code without deployment modifications can be found in the [Original UOB Landscape Repository](https://github.com/Taqwa-Abdulla/UOB-Landscape-Code-Backup.git). 
3. **Render Hosting Limitations:** Due to the limitations of Render's free tier, database storage and performance may vary. Full-scale production deployment requires a paid tier to ensure optimal functionality for all features.

---

*Note: The code here includes deployment changes to host it specifically on Render. Access to the original repository is restricted to authorized personnel for managing and modifying the core source code. Attempting to download or reconstruct the core source code directly from this public repository is not only prohibited under our usage restrictions, but will result in an incomplete local environment.*

---

## Live Demo & Contributors
- **Live Website Demo:** [UOB Landscape v1.0.0](https://uob-landscape.onrender.com/site/guest/home.html)
- **Contributors & Acknowledgments:** [View the About Page](https://uob-landscape.onrender.com/site/guest/about.html)

---

## Tech Stack & Frameworks

### Core Stack
- **Frontend:** HTML, JavaScript
- **Backend:** PHP (REST APIs)
- **Database:** PostgreSQL (PgAdmin)
- **Deployment:** Cloud hosting via Render (Docker, YAML Blueprint, Apache `.htaccess`)

### Frameworks & Libraries Versions
-**HTML:** HTML5
- **CSS / UI:** Vanilla CSS & Tailwind CSS (v4.3.3) Compiled via CLI, MapLibre GL CSS (v4.1.2), Bootstrap Icons (v1.11.3)
- **JavaScript:** Vanilla JavaScript (ES6+) **&** **JavaScript Libraries:** Chart.js (v4.5.1), MapLibre GL JS (v4.1.2)
- **PHP:** (v8.4.27) **&** **PHP Libraries (via Composer):** Endroid QR Code (v6.1.3), mPDF (v8.3.1), fPDF (v1.9.0)
---

## Website Features

- **FAQ Chatbot (Aspen):** An interactive conversational assistant equipped with mitigation against Cross-Site Scripting (XSS) attacks.
- **Advanced Report Generator:** Generates reports for individual tables, statistics, and comprehensive summaries in both PDF and CSV formats.
- **Notifications & Scheduling:** Manage personal and institutional events with options for PDF export and email notifications.
- **Role-Based Audit Tracking:** Full activity logging mapped to user roles, with export capabilities (PDF/CSV).
- **Interactive 3D Campus Map:** Built using MapLibre GL for campus navigation and spatial visualization.
- **Secure Authentication:** Robust login/logout workflows featuring input sanitization and role-based access control (RBAC).

---

## Repository Structure
```
UOB-Landscape/
├── api/
│   ├── admin/
│   │   ├── admin_activity_logs.php
│   │   ├── admin.php
│   │   ├── manage_locations.php
│   │   ├── manage_news.php
│   │   ├── reports_generator.php
│   │   └── users_management.php
│   ├── auth/
│   ├── chatbot/
│   │   └── chatbot.php
│   ├── creator/
│   │   ├── creator_activity_logs.php
│   │   ├── creator.php
│   │   ├── manage_projects.php
│   │   ├── plants_management.php
│   │   └── qr_code_generator.php
│   ├── improvments/
│   │   ├── improvments.php
│   │   └── youtube.php
│   ├── language/
│   │   └── arabic.php
│   ├── locations/
│   │   ├── location.php
│   │   └── map.php
│   ├── news/
│   │   └── sdg_news.php
│   ├── plants/
│   │   └── plant.php
│   ├── stats/
│   │   └── stats.php
│   └── users/
│       ├── messages.php
│       ├── notifications.php
│       ├── schedule.php
│       └── team.php
├── config/
│   ├── developer’s backup/
│   │   ├── empty database/
│   │   │   └── landscape.sql
│   │   └── testing database/
│   │       └── landscape.sql
│   └── db.php
├── js/
│   ├── admin/
│   │   ├── admin_activity_logs.js
│   │   ├── admin.js
│   │   ├── locations.js
│   │   ├── manage_users.js
│   │   ├── news_db.js
│   │   └── reports.js
│   ├── chatbot/
│   │   └── chatbot.js
│   ├── creator/
│   │   ├── creator_activity_logs.js
│   │   ├── creator.js
│   │   ├── plants.js
│   │   └── projects.js
│   ├── improvments/
│   │   ├── improvments.js
│   │   └── youtube.js
│   ├── language/
│   │   └── arabic.js
│   ├── locations/
│   │   ├── location.js
│   │   └── map.js
│   ├── news/
│   │   └── news.js
│   ├── plants/
│   │   ├── indoor_outdoor.js
│   │   ├── location-plants.js
│   │   ├── plant.js
│   │   └── qrcode.js
│   ├── stats/
│   │   └── stats.js
│   └── users/
│       ├── login.js
│       └── team.js
├── json/
│   └── news/
│       └── news_cache.json
├── login/
│   └── login.html
├── public/
│   ├── css/
│   │   ├── aspen.css
│   │   └── landscape.css
│   ├── images/
│   └── videos/
├── site/
│   ├── admin/
│   │   ├── management/
│   │   │   ├── manage_activity.html
│   │   │   ├── manage_locations.html
│   │   │   ├── manage_news.html
│   │   │   ├── manage_reports.html
│   │   │   └── manage_users.html
│   │   ├── view/
│   │   │   ├── plants/
│   │   │   ├── projects/
│   │   │   ├── about.html
│   │   │   ├── home.html
│   │   │   ├── location-plants.html
│   │   │   ├── locations.html
│   │   │   └── uob_3d_map.html
│   │   └── admin.html
│   ├── creator/
│   │   ├── management/
│   │   │   ├── manage_activity.html
│   │   │   ├── manage_plants_qrcode.html
│   │   │   ├── manage_plants.html
│   │   │   └── manage_projects.html
│   │   ├── view/
│   │   │   ├── plants/
│   │   │   ├── projects/
│   │   │   ├── about.html
│   │   │   ├── home.html
│   │   │   ├── location-plants.html
│   │   │   ├── locations.html
│   │   │   └── uob_3d_map.html
│   │   └── creator.html
│   └── guest/
│       ├── locations/
│       │   ├── location-plants.html
│       │   ├── locations.html
│       │   └── uob_3d_map.html
│       ├── plants/
│       │   ├── indoor.html
│       │   ├── outdoor.html
│       │   └── plant.html
│       ├── projects/
│       │   ├── before and after.html
│       │   ├── statistics and reports.html
│       │   └── youtube.html
│       ├── about.html
│       └── home.html
├── uploads/
│   ├── locations/
│   └── plants/
│       ├── indoor/
│       ├── outdoor/
│       └── pdf/
│   └── projects/
│       ├── after/
│       ├── before/
│       ├── pdf/
│       ├── proposal/
│       └── records/
└── README.md
```
---
© 2026 University of Bahrain. All rights reserved.