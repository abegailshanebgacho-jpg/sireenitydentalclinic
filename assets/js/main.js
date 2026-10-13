(function () {
  "use strict";

  const CLINIC = {
    name: "Sireenity Dental Clinic",
    phoneDisplay: "0947-159-1378",
    phoneIntl: "+639471591378",
    coords: [10.60334135741877, 122.58800680113455],
    addressHtml:
      "MAVIKKS BLDG., Upper Watson, 2nd Floor,<br>San Miguel, Jordan, Guimaras",
  };

  /*
   * Web app URL of the clinic's Google Apps Script (see README.md). Requests
   * are saved to the clinic's Google Sheet and emailed to the clinic. While
   * this is empty, the booking form hands the request off to the patient's
   * SMS app instead, so the clinic still receives it.
   */
  const BOOKING_ENDPOINT = "";

  document.addEventListener("DOMContentLoaded", function () {
    initNavbar();
    initSearch();
    initBooking();
    initMap();
  });

  /* ================= NAVBAR ================= */
  function closeMobileNav() {
    const navCollapse = document.getElementById("navbarNav");
    if (navCollapse && navCollapse.classList.contains("show")) {
      bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
    }
  }

  function initNavbar() {
    document
      .querySelectorAll("#mainNav .nav-link, #mainNav .navbar-brand, #mainNav .nav-cta")
      .forEach((link) => link.addEventListener("click", closeMobileNav));
  }

  /* ================= SERVICES ================= */
  function showTab(tabButton) {
    // A service tab sits inside a category pane (Dental / Skinsense), so the
    // category has to be shown first for the service pane to be visible.
    const categoryPane = tabButton.closest(".tab-pane");
    if (categoryPane) {
      const categoryTab = document.querySelector(
        `[data-bs-target="#${categoryPane.id}"]`
      );
      if (categoryTab) bootstrap.Tab.getOrCreateInstance(categoryTab).show();
    }
    bootstrap.Tab.getOrCreateInstance(tabButton).show();
  }

  /* ================= SEARCH ================= */
  function initSearch() {
    const form = document.getElementById("siteSearchForm");
    const input = document.getElementById("siteSearchInput");
    const status = document.getElementById("searchStatus");
    const suggestions = document.getElementById("serviceSuggestions");
    if (!form || !input || !status) return;

    const index = [...document.querySelectorAll("#services [role='tab']")].map(
      (tab) => {
        const pane = document.querySelector(tab.dataset.bsTarget);
        return {
          tab,
          label: tab.textContent.trim(),
          labelText: tab.textContent.trim().toLowerCase(),
          paneText: pane ? pane.textContent.toLowerCase() : "",
          isCategory: tab.closest("#mainTab") !== null,
        };
      }
    );

    if (suggestions) {
      index
        .filter((entry) => !entry.isCategory)
        .forEach((entry) => {
          const option = document.createElement("option");
          option.value = entry.label;
          suggestions.appendChild(option);
        });
    }

    let statusTimer;
    function setStatus(message, type) {
      status.textContent = message;
      status.className = `search-status ${type}`;
      clearTimeout(statusTimer);
      if (message) statusTimer = setTimeout(() => setStatus("", ""), 5000);
    }

    input.addEventListener("input", () => setStatus("", ""));

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const query = input.value.trim().toLowerCase();

      if (!query) {
        setStatus("Please enter a treatment or keyword to search.", "error");
        input.focus();
        return;
      }

      // Prefer a match on the service name, then fall back to its description.
      const services = index.filter((entry) => !entry.isCategory);
      const match =
        index.find((entry) => entry.labelText.includes(query)) ||
        services.find((entry) => entry.paneText.includes(query));

      if (!match) {
        setStatus(
          "No matching treatment found. Try “braces”, “cleaning”, “facial”, or “laser”.",
          "error"
        );
        return;
      }

      showTab(match.tab);
      setStatus(`Showing “${match.label}”.`, "success");
      closeMobileNav();
      document.getElementById("services").scrollIntoView({ block: "start" });
    });
  }

  /* ================= BOOKING ================= */
  function initBooking() {
    const form = document.getElementById("appointmentForm");
    const status = document.getElementById("bookingStatus");
    const result = document.getElementById("bookingResult");
    if (!form || !status || !result) return;

    const phoneInput = form.elements.phone;
    const dateInput = form.elements.date;
    const serviceSelect = form.elements.service;
    const submitBtn = form.querySelector("[type='submit']");
    const summary = document.getElementById("bookingSummary");
    const smsLink = document.getElementById("bookingSms");
    const copyBtn = document.getElementById("bookingCopy");
    const editBtn = document.getElementById("bookingEdit");

    function setStatus(message, type) {
      status.textContent = message;
      status.className = `booking-status ${type}`;
    }

    // Appointments can't be requested for a date that has already passed.
    const today = new Date();
    dateInput.min = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    function validatePhone() {
      const digits = phoneInput.value.replace(/[\s().-]/g, "");
      const valid = /^(?:\+63|0)9\d{9}$/.test(digits);
      phoneInput.setCustomValidity(valid ? "" : "Invalid mobile number");
      return valid;
    }
    phoneInput.addEventListener("input", validatePhone);

    // "Book this service" buttons preselect the service in the form.
    document.querySelectorAll("[data-service]").forEach((button) => {
      button.addEventListener("click", () => {
        serviceSelect.value = button.dataset.service;
        showForm();
      });
    });

    function formatDate(isoDate) {
      const [year, month, day] = isoDate.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    function buildMessage(request) {
      const lines = [
        `Appointment request - ${CLINIC.name}`,
        `Name: ${request.name}`,
        `Phone: ${request.phone}`,
        `Service: ${request.service}`,
        `Preferred date: ${formatDate(request.date)}`,
        `Preferred time: ${request.time}`,
      ];
      if (request.message) lines.push(`Message: ${request.message}`);
      return lines.join("\n");
    }

    function showForm() {
      result.hidden = true;
      form.hidden = false;
    }

    function showHandoff(message) {
      summary.value = message;
      smsLink.href = `sms:${CLINIC.phoneIntl}?&body=${encodeURIComponent(message)}`;
      form.hidden = true;
      result.hidden = false;
      result.querySelector("h3").focus();
    }

    async function sendToEndpoint(request) {
      // Sent as text/plain on purpose: Apps Script web apps can't answer the
      // CORS preflight that an application/json request would trigger.
      const response = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`Booking request failed: ${response.status}`);
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Booking request was rejected");
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      validatePhone();
      form.classList.add("was-validated");

      if (!form.checkValidity()) {
        setStatus("Please correct the highlighted fields.", "error");
        form.querySelector(":invalid").focus();
        return;
      }

      const data = new FormData(form);
      const request = {
        name: data.get("name").trim(),
        phone: data.get("phone").trim(),
        service: data.get("service"),
        date: data.get("date"),
        time: data.get("time"),
        message: data.get("message").trim(),
        hp_field: data.get("hp_field"),
      };
      const message = buildMessage(request);

      if (!BOOKING_ENDPOINT) {
        setStatus("", "");
        showHandoff(message);
        return;
      }

      submitBtn.disabled = true;
      setStatus("Sending your request…", "");
      try {
        await sendToEndpoint(request);
        form.reset();
        form.classList.remove("was-validated");
        setStatus(
          `Thank you, ${request.name}! We received your request for ${formatDate(request.date)}. ` +
            `We'll text or call you at ${request.phone} to confirm your schedule.`,
          "success"
        );
      } catch (error) {
        console.error(error);
        setStatus(
          "We couldn't send your request online. Please send it to the clinic using one of the options below.",
          "error"
        );
        showHandoff(message);
      } finally {
        submitBtn.disabled = false;
      }
    });

    copyBtn.addEventListener("click", async function () {
      try {
        await navigator.clipboard.writeText(summary.value);
      } catch (error) {
        // Clipboard API is unavailable on insecure origins; fall back to selection.
        summary.select();
        document.execCommand("copy");
      }
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy details"), 2000);
    });

    editBtn.addEventListener("click", function () {
      showForm();
      form.elements.name.focus();
    });
  }

  /* ================= MAP ================= */
  function initMap() {
    const mapEl = document.getElementById("leafletMap");
    const mapSection = document.getElementById("mapSection");
    const directionsBtn = document.getElementById("floatingDirections");
    if (!mapEl) return;

    if (window.L) {
      const map = L.map(mapEl, { scrollWheelZoom: false }).setView(CLINIC.coords, 17);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker(CLINIC.coords)
        .addTo(map)
        .bindPopup(`<b>${CLINIC.name}</b><br>${CLINIC.addressHtml}`)
        .openPopup();
    } else {
      mapEl.classList.add("map-fallback");
      mapEl.textContent =
        "The map could not be loaded. Use “Get directions” to open the location in Google Maps.";
    }

    // The floating shortcut only appears while the map is on screen.
    if (mapSection && directionsBtn && "IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            directionsBtn.classList.toggle("show", entry.isIntersecting);
          });
        },
        { threshold: 0.4 }
      ).observe(mapSection);
    }
  }
})();
