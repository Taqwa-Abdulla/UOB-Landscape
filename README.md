# UOB-Landscape
The Landscape Website for University Of Bahrain (UOB)
# UOB-Landscape 
Landscape Website for University Of Bahrain (UOB)
# Languages Used:
- HTML + JS (Frontend)
- PHP (Backend: Rest APIs)
# Frameworks Used:
- CSS: Tailwind v4.3.3, maplibre-gl CSS v4.1.2
- JS: Chart.js v4.5.1 and MapLibre GL JS v4.1.2
- QR Code Library (PHP): Endroid QR Code v6.1.3 - composer
- Bootstrap Icons v1.11.3 
- MPDF (PDF PHP library) v8.3.1 - composer
# Website Features
- FAQ Chatbot / Virtual Assistant (Aspen): An interactive, conversational chat window for FAQ with mitigation against Cross-Site Scripting (XSS) attacks.
- Report generator: Generate Reports for single tables, stats and full report including tables and stats in both PDF and CSV formats.
- Notifications, schedule personal and non-personal events with option to print them as PDF, and email users.
- Full audit tracking based on role with option to export it as PDF or CSV formats.
- 3D campus locations map
- Authentication: login & logout with Sanitization & basic Security (cleaning input and role-based access)
# Website Structure
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
│.  │   │   └── uob_3d_map.html
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
#
© 2026 University of Bahrain. All rights reserved.
