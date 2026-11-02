Umuntu Ngabantu Alliance

A responsive, multi-page web application dedicated to bridging the gap between potential donors, volunteers, and orphanages in need across South Africa.

Project Type: Student Website Project

Author: Asakhe Zozi

Institution: IIE Rosebank Campus

Year: 2026

📌 Table of Contents

Overview

Features

Website Structure

Technologies Used

Directory Structure

Getting Started

JavaScript Modules

SEO & Accessibility

License

ℹ️ Overview

South Africa is home to over 2.7 million orphaned children, with many orphanages struggling primarily due to a lack of funding and resources rather than physical space. Umuntu Ngabantu Alliance exists as an online connecting platform to display orphanages in urgent need, allow supporters to filter locations and urgent needs, and submit involvement enquiries.

✨ Features

Responsive Mobile Menu: Accessible, keyboard-friendly navigation with pure CSS toggle fallback and JavaScript enhancements.

Urgent Needs Carousel (index.html): Custom interactive slider displaying orphanages in critical need, complete with auto-play, manual navigation controls, touch swipe support, and reduced-motion compliance.

Dynamic Orphanage Directory (orphanages.html): Client-side live search and multi-filter system (filter by province or specific need like Food, Infant Care, or School Fees) driven entirely from HTML DOM elements.

Accessible Form Validation (enquiry.html & contact.html): Instant user input validation (real-time and on-blur) using custom error messages and screen-reader accessibility (aria-invalid, aria-describedby), replacing browser-default popups.

Smooth Animations & Scroll Reveal: Non-intrusive IntersectionObserver animations for elements fading into view as the user scrolls.

Back to Top Button: Smooth floating action button appearing on scroll for improved UX.

SEO Ready: Includes valid XML sitemap (sitemap.xml) and search engine crawler instructions (robots.txt).

📁 Website Structure

Home (index.html) — Mission statement, key statistics on orphaned children in SA, and featured urgent-need carousel.

About (about.html) — The organization's story, vision, mission, core values, principles, and future expansion goals.

Orphanages (orphanages.html) — Complete directory of partner orphanages across South African provinces with live search and filtering.

Lend A Hand (enquiry.html) — Interactive volunteer, donation, sponsorship, and corporate partnership enquiry form.

Contact Us (contact.html) — Regional office addresses across 9 provinces with interactive contact form.

🛠️ Technologies Used

HTML5: Semantic elements (<header>, <nav>, <main>, <section>, <footer>).

CSS3: Custom properties (CSS variables), CSS Grid, Flexbox, media queries for responsive typography and layout adjustments.

Vanilla JavaScript (ES6+): Pure JavaScript with no external dependencies or third-party JS libraries.

Google Fonts: Quicksand (Headings) and Poppins (Body copy).

Font Awesome 6.5.2: Vector icons for UI elements and location indicators.

📂 Directory Structure

├── index.html              # Home page with carousel

├── about.html              # About Us page

├── orphanages.html         # Interactive directory page

├── enquiry.html            # "Lend A Hand" form page

├── contact.html            # Office locations & general contact form

├── robots.txt              # Search engine crawler instructions


├── sitemap.xml             # Site architecture map for search engines
├── css/
│   └── style.css           # Global stylesheet and UI enhancements

├── js/
│   └── script.js           # Core interactive JavaScript features
└── media/                  # Project images and assets


🚀 Getting Started

No build tools or backend server are required to run this static website.

Clone or Download the repository to your local machine.

Open index.html directly in any web browser (Chrome, Firefox, Safari, Edge).

(Optional) Run via a local web server extension (e.g., VS Code Live Server) to review deep-linking capabilities with URL parameters.

⚡ JavaScript Modules

All scripts reside in js/script.js and execute conditionally based on DOM elements present on the page:

initNavigation(): Accessible mobile toggle navigation using aria-expanded states.

initBackToTop(): Debounced scroll handler to toggle floating button.

initCarousel(): Modular multi-card image carousel built around CSS flex tracks.

initDirectory(): Live DOM reader converting card tags into filterable drop-downs and URL search parameters.

initForms(): Unified form validation framework for standardizing form inputs.

initRevealOnScroll(): IntersectionObserver scroll animations respecting user's prefers-reduced-motion settings.

♿ SEO & Accessibility

Semantic Tags: Form labels, input descriptors, button roles, and appropriate heading hierarchies (h1–h3).

Reduced Motion Support: Respects system setting prefers-reduced-motion: reduce by disabling scroll animations and auto-sliding carousels.

Keyboard Navigation: Full tab ring focus support across interactive elements, custom controls, and mobile menu toggles.
