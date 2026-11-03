const API = "/api/streetspot";

let currentRole = null;
let currentUser = null;
let map = null;
let userMarker = null;
let vendorMarkers = [];
let vendors = [];
let items = [];
let ownVendor = null;
let userLocation = {
    lat: 11.0168,
    lng: 76.9558
};
let selectedCategory = "All";
let editingItemId = null;

// -----------------------------
// DOM HELPERS
// -----------------------------

const $ = (id) => document.getElementById(id);

function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}

function showView(view) {
    $("role-selection").classList.add("hidden");
    $("consumer-view").classList.add("hidden");
    $("vendor-view").classList.add("hidden");

    if (view === "role") {
        $("role-selection").classList.remove("hidden");
    } else if (view === "consumer") {
        $("consumer-view").classList.remove("hidden");
    } else if (view === "vendor") {
        $("vendor-view").classList.remove("hidden");
    }

    $("explore-tab").classList.toggle("active", view === "consumer");
    $("vendor-tab").classList.toggle("active", view === "vendor");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function requestAPI(action, data = {}) {
    const response = await fetch(API, {
        method: action ? "POST" : "GET",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: action ? JSON.stringify({
            action,
            ...data
        }) : undefined
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Request failed.");
    }

    return result;
}

// -----------------------------
// LOAD APPLICATION DATA
// -----------------------------

async function loadData() {
    try {
        const data = await requestAPI();

        vendors = data.vendors || [];
        items = data.items || [];
        ownVendor = data.ownVendor || null;

        if (data.profile) {
            currentRole = data.profile.role;
            showView(currentRole === "vendor" ? "vendor" : "consumer");
        } else {
            currentRole = null;
            showView("role");
        }

        if (currentRole === "consumer") {
            renderVendors();
            initializeMap();
        }

        if (currentRole === "vendor") {
            renderVendorDashboard();
        }

    } catch (error) {
        console.error(error);
        showToast(error.message);
    }
}

// -----------------------------
// ROLE SELECTION
// -----------------------------

async function chooseRole(role) {
    try {
        await requestAPI("role", { role });

        currentRole = role;

        await loadData();

        showToast(
            role === "vendor"
                ? "Vendor mode activated!"
                : "Welcome to StreetSpot!"
        );

    } catch (error) {
        showToast(error.message);
    }
}

// -----------------------------
// LOCATION
// -----------------------------

function getUserLocation() {
    if (!navigator.geolocation) {
        $("location-status").textContent = "Location unavailable";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            $("location-status").textContent = "Location found";

            if (map) {
                map.setView(
                    [userLocation.lat, userLocation.lng],
                    15
                );

                updateUserMarker();
                renderMapMarkers();
            }
        },
        () => {
            $("location-status").textContent = "Using sample location";
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function updateUserMarker() {
    if (!map || !window.L) return;

    if (userMarker) {
        userMarker.setLatLng([
            userLocation.lat,
            userLocation.lng
        ]);
    } else {
        userMarker = L.marker([
            userLocation.lat,
            userLocation.lng
        ]).addTo(map);

        userMarker.bindPopup("Your location");
    }
}

// -----------------------------
// MAP
// -----------------------------

function initializeMap() {
    if (!window.L) {
        showToast("Map library could not load.");
        return;
    }

    if (map) {
        map.invalidateSize();
        renderMapMarkers();
        return;
    }

    map = L.map("map").setView(
        [userLocation.lat, userLocation.lng],
        14
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
        }
    ).addTo(map);

    updateUserMarker();
    renderMapMarkers();
}

function renderMapMarkers() {
    if (!map) return;

    vendorMarkers.forEach(marker => map.removeLayer(marker));
    vendorMarkers = [];

    vendors.forEach(vendor => {
        const marker = L.marker([
            Number(vendor.lat),
            Number(vendor.lng)
        ]).addTo(map);

        marker.bindPopup(`
            <strong>${escapeHTML(vendor.name)}</strong><br>
            ${escapeHTML(vendor.category)}
        `);

        vendorMarkers.push(marker);
    });
}

// -----------------------------
// CUSTOMER DISCOVERY
// -----------------------------

function getVendorItems(vendorId) {
    return items.filter(item => item.vendor_id === vendorId);
}

function renderVendors() {
    const search = $("search-input").value.toLowerCase();

    const filtered = vendors.filter(vendor => {
        const matchesCategory =
            selectedCategory === "All" ||
            vendor.category === selectedCategory;

        const vendorItems = getVendorItems(vendor.id);

        const matchesSearch =
            vendor.name.toLowerCase().includes(search) ||
            vendor.category.toLowerCase().includes(search) ||
            vendorItems.some(item =>
                item.name.toLowerCase().includes(search)
            );

        return matchesCategory && matchesSearch;
    });

    $("vendor-count").textContent =
        `${filtered.length} vendors`;

    const list = $("vendor-list");

    if (!filtered.length) {
        list.innerHTML = `
            <div class="empty-state">
                <span>🔎</span>
                <h3>No vendors found</h3>
                <p>Try another search or category.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(vendor => {
        const vendorItems = getVendorItems(vendor.id);

        return `
            <article class="vendor-card">
                <div class="vendor-card-top">
                    <div class="vendor-avatar">
                        ${escapeHTML(vendor.avatar || "🛍️")}
                    </div>

                    <div>
                        <h3>${escapeHTML(vendor.name)}</h3>
                        <p>${escapeHTML(vendor.category)}</p>
                    </div>
                </div>

                <p class="live-indicator">● LIVE NOW</p>

                <div class="product-list">
                    ${
                        vendorItems.length
                        ? vendorItems.map(item => `
                            <div class="product-row">
                                <span>${escapeHTML(item.name)}</span>
                                <strong>₹${Number(item.price).toFixed(0)}</strong>
                            </div>
                        `).join("")
                        : "<p>No products listed yet.</p>"
                    }
                </div>
            </article>
        `;
    }).join("");
}

// -----------------------------
// VENDOR DASHBOARD
// -----------------------------

function renderVendorDashboard() {
    if (!ownVendor) return;

    $("stall-name").value = ownVendor.name || "";
    $("stall-category").value = ownVendor.category || "Street Food";

    const status = $("vendor-status");
    const live = Boolean(ownVendor.is_live);

    status.textContent = live ? "● Live" : "● Offline";
    status.className = `status-pill ${live ? "online" : "offline"}`;

    $("go-live-button").textContent =
        live ? "Go Offline" : "Go Live";

    renderMyItems();
}

function renderMyItems() {
    const list = $("my-items");

    if (!ownVendor) {
        list.innerHTML = "";
        return;
    }

    const ownItems = getVendorItems(ownVendor.id);

    if (!ownItems.length) {
        list.innerHTML = "<p>No products added yet.</p>";
        return;
    }

    list.innerHTML = ownItems.map(item => `
        <div class="my-item">
            <div>
                <strong>${escapeHTML(item.name)}</strong>
                <br>
                <small>₹${Number(item.price).toFixed(0)}</small>
            </div>

            <div>
                <button
                    class="secondary-button edit-item"
                    data-id="${escapeHTML(item.id)}"
                >Edit</button>

                <button
                    class="delete-item"
                    data-id="${escapeHTML(item.id)}"
                >Delete</button>
            </div>
        </div>
    `).join("");
}

// -----------------------------
// SAVE VENDOR PROFILE
// -----------------------------

async function saveProfile() {
    try {
        await requestAPI("profile", {
            name: $("stall-name").value,
            category: $("stall-category").value
        });

        await loadData();
        showToast("Stall details saved!");

    } catch (error) {
        showToast(error.message);
    }
}

// -----------------------------
// GO LIVE / OFFLINE
// -----------------------------

async function toggleLive() {
    if (!ownVendor) return;

    const goingLive = !ownVendor.is_live;

    let location = userLocation;

    if (goingLive) {
        if (!navigator.geolocation) {
            showToast("Your browser does not support location.");
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 12000
                    }
                );
            });

            location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

        } catch {
            showToast("Allow location access to go live.");
            return;
        }
    }

    try {
        await requestAPI("live", {
            live: goingLive,
            lat: location.lat,
            lng: location.lng
        });

        await loadData();

        showToast(
            goingLive
                ? "Your stall is now live!"
                : "Your stall is offline."
        );

    } catch (error) {
        showToast(error.message);
    }
}

// -----------------------------
// ADD / EDIT PRODUCT
// -----------------------------

async function saveItem() {
    const name = $("item-name").value.trim();
    const price = Number($("item-price").value);

    if (!name || $("item-price").value === "" || !Number.isFinite(price) || price < 0) {
        showToast("Enter a product name and valid price.");
        return;
    }

    try {
        await requestAPI("save", {
            name,
            price,
            id: editingItemId || undefined
        });

        editingItemId = null;

        $("item-name").value = "";
        $("item-price").value = "";

        await loadData();

        showToast("Product saved!");

    } catch (error) {
        showToast(error.message);
    }
}

// -----------------------------
// EDIT / DELETE PRODUCT
// -----------------------------

async function handleItemAction(event) {
    const editButton = event.target.closest(".edit-item");
    const deleteButton = event.target.closest(".delete-item");

    if (editButton) {
        const item = items.find(
            entry => entry.id === editButton.dataset.id
        );

        if (!item) return;

        editingItemId = item.id;
        $("item-name").value = item.name;
        $("item-price").value = item.price;

        $("item-name").focus();
    }

    if (deleteButton) {
        const confirmed = confirm("Delete this product?");

        if (!confirmed) return;

        try {
            await requestAPI("delete", {
                id: deleteButton.dataset.id
            });

            await loadData();
            showToast("Product deleted!");

        } catch (error) {
            showToast(error.message);
        }
    }
}

// -----------------------------
// CATEGORY FILTERS
// -----------------------------

function setupFilters() {
    $("category-filters").addEventListener("click", event => {
        const button = event.target.closest(".filter-chip");

        if (!button) return;

        document.querySelectorAll(".filter-chip").forEach(chip => {
            chip.classList.remove("active");
        });

        button.classList.add("active");
        selectedCategory = button.dataset.category;

        renderVendors();
    });
}

// -----------------------------
// NAVIGATION
// -----------------------------

function setupNavigation() {
    $("explore-tab").addEventListener("click", () => {
        if (currentRole === "consumer") {
            showView("consumer");
        } else {
            showView("role");
        }
    });

    $("vendor-tab").addEventListener("click", () => {
        if (currentRole === "vendor") {
            showView("vendor");
        } else {
            showView("role");
        }
    });

    $("switch-role").addEventListener("click", () => {
        showView("role");
    });
}

// -----------------------------
// REALTIME UPDATES
// -----------------------------

async function connectRealtime() {
    if (!window.hatchable?.events) return;

    try {
        const response = await fetch("/api/events-token", {
            credentials: "include"
        });

        if (!response.ok) return;

        const tokenData = await response.json();

        const connection = await window.hatchable.events.connect({
            token: tokenData.token
        });

        connection
            .channel("streetspot")
            .on("changed", async () => {
                await loadData();
            });

    } catch (error) {
        console.error("Realtime connection error:", error);
    }
}

// -----------------------------
// EVENT LISTENERS
// -----------------------------

function setupEvents() {
    document.querySelectorAll(".role-card").forEach(button => {
        button.addEventListener("click", () => {
            chooseRole(button.dataset.role);
        });
    });

    $("search-input").addEventListener("input", renderVendors);

    $("refresh-button").addEventListener("click", loadData);

    $("save-profile").addEventListener("click", saveProfile);

    $("go-live-button").addEventListener("click", toggleLive);

    $("add-item-button").addEventListener("click", saveItem);

    $("my-items").addEventListener("click", handleItemAction);

    $("account-button").addEventListener("click", () => {
        showToast("Use Switch to change your StreetSpot role.");
    });

    setupFilters();
    setupNavigation();
}

// -----------------------------
// APPLICATION START
// -----------------------------

async function startApp() {
    setupEvents();
    getUserLocation();

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    await loadData();
    await connectRealtime();
}

document.addEventListener("DOMContentLoaded", startApp);
