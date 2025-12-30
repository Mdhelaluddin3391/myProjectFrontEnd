// frontend/assets/js/layout/main-layout.js

(function () {
    "use strict";

    const STORAGE_KEYS = window.APP_CONFIG?.STORAGE_KEYS || {};
    const EVENTS = window.APP_CONFIG?.EVENTS || {};

    /**
     * Render location text in navbar based on priority:
     * 1) Delivery Address
     * 2) Service Location
     * 3) Default placeholder
     */
    function renderNavbarLocation() {
        const el = document.getElementById("navbar-location-text");
        const box = document.getElementById("navbar-location-box");
        if (!el || !box) return;

        const deliveryCtx = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.DELIVERY_CONTEXT) || "null"
        );
        const serviceCtx = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.SERVICE_CONTEXT) || "null"
        );

        box.classList.remove("delivery-active");

        if (deliveryCtx && deliveryCtx.label) {
            el.textContent = `${deliveryCtx.label} • ${deliveryCtx.area || deliveryCtx.city || ""}`;
            box.classList.add("delivery-active");
            return;
        }

        if (serviceCtx && serviceCtx.area) {
            el.textContent = `${serviceCtx.area}${serviceCtx.city ? ", " + serviceCtx.city : ""}`;
            return;
        }

        el.textContent = "Select Location";
    }

    /**
     * Attach navbar click handler (ONLY ONCE)
     */
    function bindNavbarLocationClick() {
        const box = document.getElementById("navbar-location-box");
        if (!box) return;

        // 🔐 Guard: prevent duplicate binding
        if (box.dataset.bound === "1") return;
        box.dataset.bound = "1";

        box.addEventListener("click", async () => {
            const isLoggedIn = !!localStorage.getItem(STORAGE_KEYS.TOKEN);

            if (isLoggedIn) {
                // Logged-in → address selector (delivery + service)
                if (window.openAddressSelector) {
                    await window.openAddressSelector();
                } else if (window.LocationPicker) {
                    // fallback (should rarely happen)
                    window.LocationPicker.open("SERVICE");
                }
            } else {
                // Guest → service location only
                if (window.LocationPicker) {
                    window.LocationPicker.open("SERVICE");
                }
            }
        });
    }

    /**
     * Global event listeners
     */
    function initializeGlobalEvents() {
        // Re-render navbar when location changes
        window.addEventListener(EVENTS.LOCATION_CHANGED, renderNavbarLocation);

        bindNavbarLocationClick();
        renderNavbarLocation();
    }

    /**
     * Init on DOM ready
     */
    document.addEventListener("DOMContentLoaded", () => {
        initializeGlobalEvents();
    });

})();
    