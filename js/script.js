/* ==========================================================================
   Umuntu Ngabantu Alliance  |  js/script.js
   --------------------------------------------------------------------------
   Plain JavaScript only (no libraries, no jQuery).

   ONE file is shared by every page. Each feature first checks that the
   elements it needs actually exist on the current page, so a page only runs
   the code that applies to it (e.g. the carousel code does nothing on
   contact.html).

   WHAT IS IN HERE
     1. Helpers .................. small functions reused by every feature
     2. Mobile navigation ........ keyboard + screen-reader support for the menu
     3. Back-to-top button ....... appears once you scroll down
     4. Urgent-needs carousel .... index.html
     5. Orphanage directory ...... orphanages.html (search + province/need filters)
     6. Form validation .......... enquiry.html and contact.html
     7. Reveal on scroll ......... cards fade in as they enter the screen
     8. Start-up ................. runs everything once the page is ready
   ========================================================================== */

(function () {
  "use strict";

  // Tells style.css that JavaScript is running. Effects that depend on the
  // script (like the reveal animation) are only switched on when this class
  // exists, so the page never ends up with content stuck hidden.
  document.documentElement.classList.add("js");

  /* ========================================================================
     1. HELPERS
     ======================================================================== */

  // Shorthand for document.querySelector / querySelectorAll.
  // $$ returns a real Array so we can use .map(), .filter(), .forEach() etc.
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));

  // True when the visitor has asked their device to reduce animation.
  // We respect that by skipping auto-play and fade-in effects.
  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Builds an element safely:
  //   make("p", { class: "note" }, "Hello")
  // Strings are added as plain TEXT (never as HTML), which means anything a
  // visitor types into a form can never inject markup into the page.
  function make(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([name, value]) => {
      if (value === false || value === null || value === undefined) return;
      element.setAttribute(name, value === true ? "" : value);
    });
    element.append(...[].concat(children));
    return element;
  }

  // Font Awesome icon (decorative, so it is hidden from screen readers).
  const icon = (classes) =>
    make("i", { class: classes, "aria-hidden": "true" });

  // "KwaZulu-Natal" -> "kwazulu-natal"; "Beds & bedding" -> "beds-bedding".
  // Used to compare things like province names without worrying about
  // capital letters, spaces or punctuation.
  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // "1 orphanage" / "3 orphanages"
  const plural = (count, word) => (count === 1 ? word : `${word}s`);

  /* ========================================================================
     2. MOBILE NAVIGATION
     The menu already opens with pure CSS (a hidden checkbox + a <label>).
     This adds the extras CSS cannot do:
       - the burger button can be reached and used with the keyboard
       - screen readers are told whether the menu is open or closed
       - Escape, clicking a link, clicking outside, or widening the window
         all close the menu
     ======================================================================== */
  function initNavigation() {
    const checkbox = $("#nav-toggle-input");
    const toggle = $(".nav-toggle");
    const menu = $(".nav-links");
    if (!checkbox || !toggle || !menu) return;

    menu.id = menu.id || "primary-menu";

    // The checkbox is invisible, so take it out of the Tab order and let the
    // visible burger icon be the keyboard-focusable "button" instead.
    checkbox.tabIndex = -1;
    checkbox.setAttribute("aria-hidden", "true");
    toggle.setAttribute("role", "button");
    toggle.tabIndex = 0;
    toggle.setAttribute("aria-controls", menu.id);

    // Keep the aria-expanded attribute in step with the checkbox.
    const syncAria = () =>
      toggle.setAttribute("aria-expanded", String(checkbox.checked));
    const closeMenu = () => {
      if (checkbox.checked) {
        checkbox.checked = false;
        syncAria();
      }
    };
    syncAria();

    checkbox.addEventListener("change", syncAria);

    // A <label> does nothing when you press Enter/Space, so add that.
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        checkbox.checked = !checkbox.checked;
        syncAria();
      }
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && checkbox.checked) {
        closeMenu();
        toggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 600) closeMenu();
    });
  }

  /* ========================================================================
     3. BACK-TO-TOP BUTTON
     Creates a round button in the bottom-right corner. It stays hidden until
     the visitor has scrolled down a little (class "visible" is added).
     ======================================================================== */
  function initBackToTop() {
    const button = make(
      "button",
      { type: "button", class: "back-to-top", "aria-label": "Back to top" },
      [icon("fa-solid fa-chevron-up")],
    );
    document.body.append(button);

    // requestAnimationFrame stops us doing work on every single scroll event
    // (scroll fires dozens of times a second); we update at most once a frame.
    let waiting = false;
    const update = () => {
      button.classList.toggle("visible", window.scrollY > 400);
      waiting = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!waiting) {
          waiting = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true },
    );

    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    update();
  }

  /* ========================================================================
     4. URGENT-NEEDS CAROUSEL  (index.html)
     Turns the three "Orphanages Currently In Urgent Need" cards into a
     slider. It works on the HTML that is already there - no markup changes
     needed - by wrapping each card in a "slide" and adding the controls.

     - 1 card per view on phones, 2 per view on wider screens
     - previous / next buttons, clickable dots, left/right arrow keys, swipe
     - auto-plays every 5 s, pauses on hover/focus, and has a pause button
     - never auto-plays if the visitor prefers reduced motion
     ======================================================================== */
  function initCarousel() {
    // Use an element marked data-carousel if there is one; otherwise, on the
    // home page only, use the grid inside the alternate-coloured section.
    const grid =
      $("[data-carousel]") || ($(".home") ? $(".isection.alt .grid-3") : null);
    if (!grid) return;

    const cards = Array.from(grid.children);
    if (cards.length < 2) return;

    const heading = $(".heading2", grid.parentElement);

    // ---- Build the structure -------------------------------------------
    const root = make("div", {
      class: "carousel",
      role: "region",
      "aria-roledescription": "carousel",
      "aria-label": heading
        ? heading.textContent.trim()
        : "Featured orphanages",
    });
    const viewport = make("div", { class: "carousel-viewport" });

    // The old grid becomes the sliding "track"; each card gets its own slide.
    grid.classList.remove("grid-3");
    grid.classList.add("carousel-track");
    const slides = cards.map((card, i) => {
      const slide = make("div", {
        class: "carousel-slide",
        role: "group",
        "aria-roledescription": "slide",
        "aria-label": `${i + 1} of ${cards.length}`,
      });
      grid.insertBefore(slide, card);
      slide.append(card);
      return slide;
    });

    const prevButton = make(
      "button",
      {
        type: "button",
        class: "carousel-btn",
        "aria-label": "Previous orphanage",
      },
      [icon("fa-solid fa-chevron-left")],
    );
    const nextButton = make(
      "button",
      { type: "button", class: "carousel-btn", "aria-label": "Next orphanage" },
      [icon("fa-solid fa-chevron-right")],
    );
    const dots = make("div", { class: "carousel-dots" });
    const playButton = make(
      "button",
      {
        type: "button",
        class: "carousel-toggle",
        "aria-label": "Pause automatic sliding",
      },
      [icon("fa-solid fa-pause")],
    );

    grid.before(root);
    viewport.append(grid);
    root.append(
      viewport,
      make("div", { class: "carousel-controls" }, [
        prevButton,
        dots,
        nextButton,
        playButton,
      ]),
    );

    // ---- State -----------------------------------------------------------
    let index = 0; // position of the first visible slide
    let perView = 1; // how many slides are visible at once
    let timer = null; // the auto-play timer
    let autoplayWanted = !prefersReducedMotion; // the visitor's pause/play choice
    let hoverPaused = false; // temporary pause while hovering / focused

    const getPerView = () => (window.innerWidth >= 700 ? 2 : 1);
    const lastIndex = () => Math.max(0, slides.length - perView);

    // Draws the current state: slides in position, dots highlighted, etc.
    function render() {
      root.style.setProperty("--per-view", perView);
      // Each slide is (100 / perView)% wide, so moving by index * that
      // percentage lines the wanted slide up at the left edge.
      grid.style.transform = `translateX(${-index * (100 / perView)}%)`;

      slides.forEach((slide, i) => {
        const visible = i >= index && i < index + perView;
        slide.setAttribute("aria-hidden", String(!visible));
      });

      $$("button", dots).forEach((dot, i) => {
        dot.classList.toggle("active", i === index);
        if (i === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });

      // If everything already fits on screen there is nothing to slide.
      root.classList.toggle("is-static", lastIndex() === 0);
    }

    // One dot for every position the carousel can stop at.
    function buildDots() {
      dots.replaceChildren();
      for (let i = 0; i <= lastIndex(); i++) {
        const dot = make("button", {
          type: "button",
          class: "carousel-dot",
          "aria-label": `Go to slide ${i + 1}`,
        });
        dot.addEventListener("click", () => {
          goTo(i);
          startAutoplay();
        });
        dots.append(dot);
      }
    }

    // Moves to a slide. Going past the end wraps round to the start.
    function goTo(target) {
      const last = lastIndex();
      index = target > last ? 0 : target < 0 ? last : target;
      render();
    }

    function stopAutoplay() {
      clearInterval(timer);
      timer = null;
      grid.setAttribute("aria-live", "polite");
    }
    function startAutoplay() {
      stopAutoplay();
      if (autoplayWanted && !hoverPaused && lastIndex() > 0) {
        timer = setInterval(() => goTo(index + 1), 5000);
        grid.setAttribute("aria-live", "off"); // don't announce every auto-slide
      }
    }

    function updatePlayButton() {
      playButton.setAttribute(
        "aria-label",
        autoplayWanted ? "Pause automatic sliding" : "Start automatic sliding",
      );
      playButton.replaceChildren(
        icon(autoplayWanted ? "fa-solid fa-pause" : "fa-solid fa-play"),
      );
    }

    // ---- Events ----------------------------------------------------------
    prevButton.addEventListener("click", () => {
      goTo(index - 1);
      startAutoplay();
    });
    nextButton.addEventListener("click", () => {
      goTo(index + 1);
      startAutoplay();
    });
    playButton.addEventListener("click", () => {
      autoplayWanted = !autoplayWanted;
      updatePlayButton();
      startAutoplay();
    });

    // Arrow keys work while focus is anywhere inside the carousel.
    root.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        goTo(index - 1);
        startAutoplay();
      } else if (event.key === "ArrowRight") {
        goTo(index + 1);
        startAutoplay();
      }
    });

    // Pause while the mouse is over it or keyboard focus is inside it.
    root.addEventListener("mouseenter", () => {
      hoverPaused = true;
      stopAutoplay();
    });
    root.addEventListener("mouseleave", () => {
      hoverPaused = false;
      startAutoplay();
    });
    root.addEventListener("focusin", () => {
      hoverPaused = true;
      stopAutoplay();
    });
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget)) {
        hoverPaused = false;
        startAutoplay();
      }
    });

    // Swipe / drag: compare where the pointer went down and where it came up.
    let startX = null;
    viewport.addEventListener("pointerdown", (event) => {
      startX = event.clientX;
    });
    viewport.addEventListener("pointerup", (event) => {
      if (startX === null) return;
      const distance = event.clientX - startX;
      startX = null;
      if (Math.abs(distance) > 50) {
        goTo(index + (distance < 0 ? 1 : -1));
        startAutoplay();
      }
    });
    viewport.addEventListener("pointercancel", () => {
      startX = null;
    });
    // Stops the browser "dragging" the photo ghost-image instead of swiping.
    viewport.addEventListener("dragstart", (event) => event.preventDefault());

    // If the screen size changes, recalculate how many slides fit.
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const wanted = getPerView();
        if (wanted === perView) return;
        perView = wanted;
        index = Math.min(index, lastIndex());
        buildDots();
        render();
        startAutoplay();
      }, 150);
    });

    // Don't keep sliding in a background tab.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    // ---- Go! -------------------------------------------------------------
    perView = getPerView();
    buildDots();
    updatePlayButton();
    render();
    startAutoplay();
  }

  /* ========================================================================
     5. ORPHANAGE DIRECTORY  (orphanages.html)
     Adds a live search box plus Province and Current-need drop-downs above
     the list of orphanage cards, and hides the cards that do not match.

     The script READS its data from the cards already in the HTML:
       - province = the text after the "·" in the location line
       - current need = the FIRST tag on the card (e.g. "Food", "School fees")
       - search = every word on the card (name, town, tags, description)
     So when you add a new orphanage card, it is automatically searchable.

     The chosen filters are also written into the web address
     (?province=gauteng&need=food&q=durban) so a filtered view can be shared,
     and the "Lend A Hand" form links here with ?province=... pre-set.
     ======================================================================== */
  function initDirectory() {
    const directory = $("#orphanageDirectory");
    if (!directory) return;

    // ---- Read the cards --------------------------------------------------
    const listings = $$(".listing-card", directory).map((card) => {
      const meta = $(".meta", card);
      const province = meta
        ? meta.textContent.split("·").pop().replace(/\s+/g, " ").trim()
        : "";
      const tags = $$(".tag", card).map((tag) => tag.textContent.trim());
      return {
        card,
        province,
        provinceSlug: slugify(province),
        need: tags[0] || "",
        needSlug: slugify(tags[0] || ""),
        text: card.textContent.replace(/\s+/g, " ").toLowerCase(),
      };
    });
    if (listings.length === 0) return;

    // Unique, alphabetical lists for the two drop-downs: Map(slug -> label).
    const uniqueOptions = (labelKey, slugKey) =>
      Array.from(
        new Map(listings.map((item) => [item[slugKey], item[labelKey]])),
      )
        .filter(([slug]) => slug !== "")
        .sort((a, b) => a[1].localeCompare(b[1]));

    // ---- Build the controls ---------------------------------------------
    const searchInput = make("input", {
      type: "search",
      id: "directory-search",
      placeholder: "Name, town or keyword...",
      autocomplete: "off",
    });
    const provinceSelect = make("select", { id: "directory-province" }, [
      make("option", { value: "" }, "All provinces"),
      ...uniqueOptions("province", "provinceSlug").map(([slug, label]) =>
        make("option", { value: slug }, label),
      ),
    ]);
    const needSelect = make("select", { id: "directory-need" }, [
      make("option", { value: "" }, "Any need"),
      ...uniqueOptions("need", "needSlug").map(([slug, label]) =>
        make("option", { value: slug }, label),
      ),
    ]);
    const clearButton = make(
      "button",
      { type: "button", class: "btn btn-outline" },
      [icon("fa-solid fa-rotate-left"), " Clear filters"],
    );

    const field = (labelText, control, extraClass = "") =>
      make("div", { class: `filter-group ${extraClass}`.trim() }, [
        make("label", { for: control.id }, labelText),
        control,
      ]);

    const filterForm = make(
      "form",
      {
        class: "directory-filters",
        role: "search",
        "aria-label": "Search and filter orphanages",
      },
      [
        field("Search", searchInput, "filter-search"),
        field("Province", provinceSelect),
        field("Current need", needSelect),
        clearButton,
      ],
    );

    // Spoken/seen summary, e.g. "Showing 3 of 9 orphanages."
    const status = make("p", {
      class: "directory-status",
      role: "status",
      "aria-live": "polite",
    });

    // Shown only when nothing matches.
    const showAllButton = make("button", { type: "button", class: "btn" }, [
      icon("fa-solid fa-list"),
      " Show all orphanages",
    ]);
    const emptyMessage = make("div", { class: "no-results", hidden: true }, [
      icon("fa-solid fa-magnifying-glass"),
      make("h3", { class: "heading3" }, "No orphanages match your search"),
      make(
        "p",
        { class: "para" },
        "Try a different keyword, or clear the filters to see every orphanage.",
      ),
      showAllButton,
    ]);

    directory.before(filterForm, status);
    directory.after(emptyMessage);

    // ---- Filtering -------------------------------------------------------
    function applyFilters() {
      // Every typed word must appear somewhere on the card ("durban food").
      const words = searchInput.value
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      let shown = 0;

      listings.forEach((item) => {
        const matches =
          (!provinceSelect.value ||
            item.provinceSlug === provinceSelect.value) &&
          (!needSelect.value || item.needSlug === needSelect.value) &&
          words.every((word) => item.text.includes(word));

        item.card.hidden = !matches; // the "hidden" attribute removes it from view
        if (matches) shown++;
      });

      const filtering = Boolean(
        words.length || provinceSelect.value || needSelect.value,
      );
      status.textContent = filtering
        ? `Showing ${shown} of ${listings.length} ${plural(listings.length, "orphanage")}.`
        : `Showing all ${listings.length} orphanages.`;
      emptyMessage.hidden = shown > 0;
      clearButton.disabled = !filtering;

      updateAddressBar();
    }

    function clearFilters() {
      searchInput.value = "";
      provinceSelect.value = "";
      needSelect.value = "";
      applyFilters();
      searchInput.focus();
    }

    // Writes the current filters into the address bar without reloading.
    function updateAddressBar() {
      const params = new URLSearchParams();
      if (searchInput.value.trim()) params.set("q", searchInput.value.trim());
      if (provinceSelect.value) params.set("province", provinceSelect.value);
      if (needSelect.value) params.set("need", needSelect.value);
      const query = params.toString();
      try {
        window.history.replaceState(
          null,
          "",
          query ? `?${query}` : window.location.pathname.split("/").pop(),
        );
      } catch (error) {
        /* Some browsers block this on local files - not a problem. */
      }
    }

    // ---- Events ----------------------------------------------------------
    filterForm.addEventListener("submit", (event) => event.preventDefault());
    ["input", "change"].forEach((type) =>
      filterForm.addEventListener(type, applyFilters),
    );
    clearButton.addEventListener("click", clearFilters);
    showAllButton.addEventListener("click", clearFilters);

    // ---- Start-up: apply anything already in the web address -------------
    const params = new URLSearchParams(window.location.search);
    const setIfOptionExists = (select, value) => {
      const slug = slugify(value || "");
      if (Array.from(select.options).some((option) => option.value === slug)) {
        select.value = slug;
      }
    };
    searchInput.value = params.get("q") || "";
    setIfOptionExists(provinceSelect, params.get("province"));
    setIfOptionExists(needSelect, params.get("need"));
    applyFilters();
  }

  /* ========================================================================
     6. FORM VALIDATION  (enquiry.html and contact.html)
     Both forms use the "novalidate" attribute, so the browser's own pop-up
     bubbles are off and THIS code does the checking instead.

     How it behaves:
       - Fields are checked when you leave them (blur), and re-checked as you
         type once an error is showing, so the message disappears the moment
         you fix the problem.
       - Pressing Submit checks everything. If anything is wrong, the first
         bad field gets focus and every problem is explained next to its field.
       - If everything is fine the form is swapped for a thank-you message.
         (There is no server, so nothing is really sent or saved.)
     ======================================================================== */

  // ---- Reusable checks ---------------------------------------------------
  // Each rule is { test: (value) => true/false, message: "..." }.
  // Rules run in order and the FIRST one that fails supplies the message.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'’.-]*$/;

  const nameRules = [
    { test: (v) => v.trim() !== "", message: "Please enter your full name." },
    {
      test: (v) => v.trim().length >= 2,
      message: "Your name needs at least 2 characters.",
    },
    {
      test: (v) => NAME_PATTERN.test(v.trim()),
      message:
        "Names can only contain letters, spaces, hyphens and apostrophes.",
    },
  ];

  const emailRules = [
    {
      test: (v) => v.trim() !== "",
      message: "Please enter your email address.",
    },
    {
      test: (v) => EMAIL_PATTERN.test(v.trim()),
      message: "Please enter a valid email address, e.g. name@example.com.",
    },
  ];

  const contactMessageRules = [
    { test: (v) => v.trim() !== "", message: "Please write a message." },
    {
      test: (v) => v.trim().length >= 10,
      message: "Your message needs at least 10 characters.",
    },
  ];

  const involvementRules = [
    {
      test: (v) => v !== "",
      message: "Please choose how you would like to help.",
    },
  ];

  // What each choice in the "How would you like to help?" list means in a
  // sentence, for the thank-you message.
  const INVOLVEMENT_TEXT = {
    donate: "make a donation",
    sponsor: "sponsor a child",
    volunteer: "volunteer",
    corporate: "explore a corporate partnership",
  };

  const firstName = (fullName) => fullName.trim().split(/\s+/)[0];

  // ---- One entry per form ------------------------------------------------
  // rules ........ which fields are checked and by which rules (key = field id)
  // autocomplete . lets browsers pre-fill the right thing
  // success ...... builds the wording of the thank-you message
  const FORM_CONFIGS = [
    {
      // contact.html
      rules: {
        "contact-name": nameRules,
        "contact-email": emailRules,
        "contact-message": contactMessageRules,
      },
      autocomplete: { "contact-name": "name", "contact-email": "email" },
      success: (data) => ({
        title: `Thank you, ${firstName(data["contact-name"])}!`,
        message: `Your message has been received. We'll reply to ${data["contact-email"].trim()} as soon as we can.`,
        againLabel: "Send another message",
      }),
    },
    {
      // enquiry.html ("Lend A Hand")
      rules: {
        "full-name": nameRules,
        "involvement-type": involvementRules,
        email: emailRules,
      },
      autocomplete: { "full-name": "name", email: "email" },
      success: (data, form) => {
        const provinceSelect = $("#preferred-province", form);
        const provinceSlug = data["preferred-province"];
        const provinceName = provinceSlug
          ? provinceSelect.options[provinceSelect.selectedIndex].text
          : "";
        const wants =
          INVOLVEMENT_TEXT[data["involvement-type"]] || "get involved";

        return {
          title: `Thank you, ${firstName(data["full-name"])}!`,
          message: `We've noted that you'd like to ${wants}${provinceName ? ` in ${provinceName}` : ""}. We'll use ${data.email.trim()} to connect you with a suitable orphanage.`,
          // Opens the directory already filtered to the chosen province.
          link: {
            href: provinceSlug
              ? `orphanages.html?province=${encodeURIComponent(provinceSlug)}`
              : "orphanages.html",
            icon: "fa-solid fa-magnifying-glass",
            text: provinceName
              ? `See orphanages in ${provinceName}`
              : "Browse all orphanages",
          },
          againLabel: "Submit another enquiry",
        };
      },
    },
  ];

  // Builds the thank-you box that replaces the form.
  function buildSuccessPanel({ title, message, link, againLabel }, onAgain) {
    const children = [
      icon("fa-solid fa-circle-check"),
      make("h3", { class: "heading3" }, title),
      make("p", {}, message),
    ];
    if (link) {
      children.push(
        make("a", { class: "btn", href: link.href }, [
          icon(link.icon),
          ` ${link.text}`,
        ]),
      );
    }
    const againButton = make(
      "button",
      { type: "button", class: "btn btn-outline" },
      againLabel,
    );
    againButton.addEventListener("click", onAgain);
    children.push(
      againButton,
      make(
        "p",
        { class: "form-success-note" },
        "This is a student project, so nothing has actually been sent or stored.",
      ),
    );

    // tabindex -1 lets us move keyboard/screen-reader focus to the box.
    return make(
      "div",
      { class: "form-success", role: "status", tabindex: "-1" },
      children,
    );
  }

  function setupForm(form, config) {
    const ids = Object.keys(config.rules);
    const fields = ids.map((id) => $(`#${id}`, form));
    if (fields.some((f) => !f)) return; // markup changed - do nothing rather than break

    const wrapper = form.closest(".form-wrapper") || form.parentElement;
    const note = $(".form-note", wrapper);
    const submitButton = $('button[type="submit"]', form);
    let submitted = false; // has the visitor pressed Submit yet?

    // Shows (or clears) the error message belonging to one field and marks
    // the field for screen readers (aria-invalid / aria-describedby).
    function showResult(field, message) {
      const group = field.closest(".form-group");
      let error = $(".error-message", group);
      if (!error) {
        error = make("span", { class: "error-message" });
        group.append(error);
      }
      error.id = error.id || `${field.id}-error`;
      error.textContent = message;

      group.classList.toggle("has-error", message !== "");
      group.classList.toggle(
        "is-valid",
        message === "" && field.value.trim() !== "",
      );
      if (message) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
      field.setAttribute("aria-describedby", error.id);
    }

    // Runs a field's rules; returns true when the field is OK.
    function validateField(field) {
      const failed = config.rules[field.id].find(
        (rule) => !rule.test(field.value),
      );
      showResult(field, failed ? failed.message : "");
      return !failed;
    }

    // Puts every field back to its neutral, un-checked look.
    function clearAll() {
      submitted = false;
      fields.forEach((field) => {
        const group = field.closest(".form-group");
        const error = $(".error-message", group);
        if (error) error.textContent = "";
        group.classList.remove("has-error", "is-valid");
        field.removeAttribute("aria-invalid");
      });
    }

    // ---- One-time set-up for each field ---------------------------------
    fields.forEach((field) => {
      // Red asterisk on the label of every required field.
      const label = $(`label[for="${field.id}"]`, form);
      if (label && field.required && !$(".required-mark", label)) {
        label.append(
          " ",
          make("span", { class: "required-mark", "aria-hidden": "true" }, "*"),
        );
      }
      if (config.autocomplete[field.id]) {
        field.setAttribute("autocomplete", config.autocomplete[field.id]);
      }

      // Re-check while typing, but only once there is something to correct
      // (or after the first Submit) - nobody likes errors before they start.
      const liveEvent = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(liveEvent, () => {
        const hasError = field
          .closest(".form-group")
          .classList.contains("has-error");
        if (hasError || submitted) validateField(field);
      });

      // Check when the visitor leaves a field they have filled in.
      field.addEventListener("blur", () => {
        if (submitted || field.value.trim() !== "") validateField(field);
      });
    });
    clearAll(); // also wipes the message that enquiry.html has in its HTML

    // ---- Submitting ------------------------------------------------------
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // stop the page reloading
      submitted = true;

      const invalidFields = fields.filter((field) => !validateField(field));
      if (invalidFields.length > 0) {
        invalidFields[0].focus();
        return;
      }

      // Everything is valid. Briefly show "Sending..." so it feels real.
      const originalLabel = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.replaceChildren(
        icon("fa-solid fa-spinner fa-spin"),
        " Sending...",
      );

      setTimeout(() => {
        const data = Object.fromEntries(new FormData(form));
        const options = config.success(data, form); // read BEFORE resetting
        form.reset();
        clearAll();
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;

        const panel = buildSuccessPanel(options, () => {
          panel.remove();
          form.hidden = false;
          if (note) note.hidden = false;
          fields[0].focus();
        });
        form.hidden = true;
        if (note) note.hidden = true;
        wrapper.append(panel);
        panel.focus();
      }, 700);
    });
  }

  function initForms() {
    FORM_CONFIGS.forEach((config) => {
      const firstField = $(`#${Object.keys(config.rules)[0]}`);
      const form = firstField ? firstField.closest("form") : null;
      if (form) setupForm(form, config);
    });
  }

  /* ========================================================================
     7. REVEAL ON SCROLL
     Cards fade up the first time they scroll into view. Uses the browser's
     IntersectionObserver, which tells us when an element becomes visible.
     Skipped entirely for visitors who prefer reduced motion.
     ======================================================================== */
  function initRevealOnScroll() {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

    const targets = $$(
      ".card, .vision, .mission, .values, .core-principles, .impact, " +
        ".future-goals, .listing-card, .location-card",
    ).filter((element) => !element.closest(".carousel")); // carousel slides move on their own
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let position = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // Cards that appear together arrive one after another (0, 90, 180 ms).
          entry.target.style.animationDelay = `${(position++ % 3) * 90}ms`;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // only animate once
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((element) => {
      element.classList.add("reveal");
      observer.observe(element);
    });
  }

  /* ========================================================================
     8. START-UP
     Each feature runs inside try/catch so that if one ever fails, the others
     still work and the error is shown in the browser console (F12).
     The order matters: the carousel and directory build their markup first,
     so that "reveal on scroll" sees the final cards.
     ======================================================================== */
  function init() {
    [
      initNavigation,
      initBackToTop,
      initCarousel,
      initDirectory,
      initForms,
      initRevealOnScroll,
    ].forEach((feature) => {
      try {
        feature();
      } catch (error) {
        console.error(`[script.js] ${feature.name} failed:`, error);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
