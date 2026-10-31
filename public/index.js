const serverStatus = document.querySelector("#server-status");
const databaseStatus = document.querySelector("#database-status");
const databaseLight = document.querySelector("#db-light");
const checkButton = document.querySelector("#check-button");
const registerForm = document.querySelector("#register-form");
const registerMessage = document.querySelector("#register-message");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const accountSummary = document.querySelector("#account-summary");
const accountGreeting = document.querySelector("#account-greeting");
const logoutButton = document.querySelector("#logout-button");
const categorySelect = document.querySelector("#category-select");
const profileForm = document.querySelector("#profile-form");
const profileCategory = document.querySelector("#profile-category");
const profileMessage = document.querySelector("#profile-message");
const dashboard = document.querySelector("#shop-dashboard");
const marketSelect = document.querySelector("#market-select");
const sessionSelect = document.querySelector("#session-select");
const stallSelect = document.querySelector("#stall-select");
const reserveButton = document.querySelector("#reserve-button");
const bookingMessage = document.querySelector("#booking-message");
const marketResults = document.querySelector("#market-results");
const publicMarket = document.querySelector("#public-market");
const mapStalls = document.querySelector("#map-stalls");
const publicShopList = document.querySelector("#public-shop-list");
const shopDetail = document.querySelector("#shop-detail");
let publicToken = new URLSearchParams(location.search).get("session");
let publicMapData = null;

async function checkStatus() {
  serverStatus.textContent = "ทำงานปกติ";
  serverStatus.previousElementSibling.className = "status-light online";
  databaseStatus.textContent = "กำลังตรวจสอบ";
  databaseLight.className = "status-light";

  try {
    const response = await fetch("/api/health");
    const result = await response.json();
    const connected = response.ok && result.data?.database === "connected";
    databaseStatus.textContent = connected ? "เชื่อมต่อแล้ว" : "ไม่พร้อมใช้งาน";
    databaseLight.className = `status-light ${connected ? "online" : "offline"}`;
  } catch {
    databaseStatus.textContent = "ไม่สามารถเชื่อมต่อ";
    databaseLight.className = "status-light offline";
  }
}

async function loadCategories() {
  try {
    const response = await fetch("/api/v1/categories");
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.data)) return;
    for (const category of result.data) {
      for (const select of [categorySelect, profileCategory]) {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        select.append(option);
      }
    }
    if (sessionStorage.getItem("shopToken") && !profileForm.hidden) loadProfile();
  } catch {
    // Registration remains available without a selected category.
  }
}

function showAccount(data) {
  accountGreeting.textContent = `ยินดีต้อนรับ ${data.shop.shopName}`;
  loginForm.hidden = true;
  accountSummary.hidden = false;
  profileForm.hidden = false;
  registerForm.hidden = true;
  dashboard.hidden = false;
  loadProfile();
  loadDashboard();
}

async function loadProfile() {
  const token = sessionStorage.getItem("shopToken");
  if (!token) return;
  try {
    const response = await fetch("/api/v1/shop/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "โหลดโปรไฟล์ไม่สำเร็จ");
    const profile = result.data;
    profileForm.elements.shopName.value = profile.shopName || "";
    profileForm.elements.categoryId.value = profile.categoryId == null ? "" : String(profile.categoryId);
    profileForm.elements.description.value = profile.description || "";
    profileForm.elements.publicContact.value = profile.publicContact || "";
    profileForm.elements.isPublished.checked = profile.isPublished;
  } catch (error) {
    profileMessage.textContent = error.message || "ไม่สามารถโหลดโปรไฟล์ได้";
    profileMessage.className = "form-message error";
  }
}

async function restoreSession() {
  const token = sessionStorage.getItem("shopToken");
  if (!token) return;
  try {
    const response = await fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (response.ok) showAccount(result.data);
    else sessionStorage.removeItem("shopToken");
  } catch {
    loginMessage.textContent = "ไม่สามารถตรวจสอบเซสชันได้ กรุณาลองใหม่";
    loginMessage.classList.add("error");
  }
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerMessage.textContent = "";
  registerMessage.className = "form-message";

  const formData = new FormData(registerForm);
  const body = Object.fromEntries(formData.entries());
  body.categoryId = body.categoryId ? Number(body.categoryId) : null;
  if (!body.email) body.email = null;

  const submitButton = registerForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.textContent = "กำลังสร้างบัญชี...";

  try {
    const response = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();

    if (!response.ok) {
      const details = result.error?.details || [];
      registerMessage.textContent = details.length
        ? details.map((item) => item.message).join(" · ")
        : result.error?.message || "สมัครไม่สำเร็จ กรุณาลองอีกครั้ง";
      registerMessage.classList.add("error");
      return;
    }

    registerMessage.textContent = `สมัครสำเร็จ ยินดีต้อนรับ ${result.data.shop.shopName}`;
    registerMessage.classList.add("success");
    registerForm.reset();
  } catch {
    registerMessage.textContent = "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่ภายหลัง";
    registerMessage.classList.add("error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'สร้างบัญชีผู้ค้า <span aria-hidden="true">↗</span>';
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  loginMessage.className = "form-message";
  const body = Object.fromEntries(new FormData(loginForm).entries());
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;

  try {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      loginMessage.textContent = result.error?.message || "เข้าสู่ระบบไม่สำเร็จ";
      loginMessage.classList.add("error");
      return;
    }
    sessionStorage.setItem("shopToken", result.data.token);
    loginForm.reset();
    showAccount(result.data);
  } catch {
    loginMessage.textContent = "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่";
    loginMessage.classList.add("error");
  } finally {
    button.disabled = false;
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileMessage.textContent = "";
  profileMessage.className = "form-message";
  const formData = new FormData(profileForm);
  const body = {
    shopName: formData.get("shopName"),
    categoryId: formData.get("categoryId") ? Number(formData.get("categoryId")) : null,
    description: formData.get("description") || null,
    publicContact: formData.get("publicContact") || null,
    isPublished: formData.has("isPublished")
  };
  const button = profileForm.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const response = await fetch("/api/v1/shop/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionStorage.getItem("shopToken")}`
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.details?.map((item) => item.message).join(" · ") || result.error?.message);
    profileMessage.textContent = "บันทึกโปรไฟล์แล้ว";
    profileMessage.classList.add("success");
  } catch (error) {
    profileMessage.textContent = error.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่";
    profileMessage.classList.add("error");
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  const token = sessionStorage.getItem("shopToken");
  try {
    if (token) {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } finally {
    sessionStorage.removeItem("shopToken");
    loginForm.hidden = false;
    accountSummary.hidden = true;
    profileForm.hidden = true;
    dashboard.hidden = true;
    profileMessage.textContent = "";
    registerForm.hidden = false;
  }
});

async function loadDashboard() {
  const token = sessionStorage.getItem("shopToken");
  if (!token) return;
  try {
    const response = await fetch("/api/v1/shop/dashboard", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "โหลดแดชบอร์ดไม่สำเร็จ");
    document.querySelector("#pending-count").textContent = result.data.counts.pending || 0;
    document.querySelector("#confirmed-count").textContent = result.data.counts.confirmed || 0;
    const list = document.querySelector("#reservation-list");
    list.replaceChildren();
    if (!result.data.recent.length) { const empty = document.createElement("p"); empty.className = "empty-note"; empty.textContent = "ยังไม่มีรายการจอง"; list.append(empty); }
    for (const item of result.data.recent) {
      const card = document.createElement("article"); card.className = "reservation-card";
      const title = document.createElement("strong"); title.textContent = `${item.marketName} · ${item.stallCode}`;
      const status = document.createElement("span"); status.className = `status-badge ${item.status}`; status.textContent = ({ pending: "รอดำเนินการ", confirmed: "ยืนยันแล้ว", rejected: "ไม่อนุมัติ", cancelled: "ยกเลิก" })[item.status] || item.status;
      const details = document.createElement("p"); details.textContent = `${item.sessionTitle} · ${new Date(item.eventDate).toLocaleDateString("th-TH")} · ${Number(item.price).toLocaleString("th-TH")} บาท`;
      card.append(title, status, details);
      if (item.status === "pending") { const cancel = document.createElement("button"); cancel.textContent = "ยกเลิกคำขอ"; cancel.addEventListener("click", () => cancelReservation(item.id)); card.append(cancel); }
      list.append(card);
    }
  } catch (error) { bookingMessage.textContent = error.message; bookingMessage.className = "form-message error"; }
  loadMarkets();
}

async function loadMarkets() {
  try {
    const response = await fetch("/api/v1/markets"); const result = await response.json();
    if (!response.ok) throw new Error("โหลดตลาดไม่สำเร็จ");
    marketSelect.replaceChildren(new Option("เลือกตลาด", ""));
    for (const market of result.data) marketSelect.add(new Option(`${market.name} · ${market.openSessions} รอบเปิด`, market.id));
  } catch { marketSelect.replaceChildren(new Option("โหลดตลาดไม่สำเร็จ", "")); }
}

async function loadSessions(marketId) {
  sessionSelect.replaceChildren(new Option("กำลังโหลด…", "")); sessionSelect.disabled = true; stallSelect.replaceChildren(new Option("เลือกรอบงานก่อน", "")); stallSelect.disabled = true; reserveButton.disabled = true;
  if (!marketId) return;
  try {
    const response = await fetch(`/api/v1/markets/${encodeURIComponent(marketId)}/sessions`); const result = await response.json();
    sessionSelect.replaceChildren(new Option("เลือกรอบงาน", ""));
    for (const session of result.data.filter((item) => item.status === "open")) sessionSelect.add(new Option(`${session.title} · ${new Date(session.eventDate).toLocaleDateString("th-TH")}`, session.id));
    sessionSelect.disabled = false;
  } catch { sessionSelect.replaceChildren(new Option("โหลดรอบงานไม่สำเร็จ", "")); }
}

async function loadStalls(sessionId) {
  stallSelect.replaceChildren(new Option("กำลังโหลด…", "")); stallSelect.disabled = true; reserveButton.disabled = true;
  if (!sessionId) return;
  try {
    const response = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}/stalls`, { headers: { Authorization: `Bearer ${sessionStorage.getItem("shopToken")}` } }); const result = await response.json();
    stallSelect.replaceChildren(new Option("เลือกแผงว่าง", ""));
    for (const stall of result.data.filter((item) => item.availability === "available")) stallSelect.add(new Option(`${stall.code} · ${Number(stall.price).toLocaleString("th-TH")} บาท`, stall.id));
    if (stallSelect.options.length === 1) stallSelect.add(new Option("ไม่มีแผงว่าง", ""));
    stallSelect.disabled = false;
  } catch { stallSelect.replaceChildren(new Option("โหลดแผงไม่สำเร็จ", "")); }
}

async function cancelReservation(id) {
  try { const response = await fetch(`/api/v1/reservations/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${sessionStorage.getItem("shopToken")}` } }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "ยกเลิกไม่สำเร็จ"); await loadDashboard(); }
  catch (error) { bookingMessage.textContent = error.message; bookingMessage.className = "form-message error"; }
}

async function loadMarketsPublic(query = "") {
  marketResults.textContent = "กำลังค้นหาตลาด…";
  try {
    const response = await fetch(`/api/v1/markets?q=${encodeURIComponent(query)}`); const result = await response.json();
    marketResults.replaceChildren();
    if (!result.data.length) { marketResults.textContent = "ยังไม่พบตลาดที่เปิดให้บริการ。"; return; }
    for (const market of result.data) {
      const card = document.createElement("article"); card.className = "market-card";
      const heading = document.createElement("h3"); heading.textContent = market.name;
      const detail = document.createElement("p"); detail.textContent = `${market.address || "สถานที่ไม่ได้ระบุ"} · ${market.openSessions} รอบเปิดรับจอง`;
      const sessions = document.createElement("div"); sessions.className = "session-buttons";
      card.append(heading, detail, sessions); marketResults.append(card);
      const sessionResponse = await fetch(`/api/v1/markets/${encodeURIComponent(market.id)}/sessions`); const sessionResult = await sessionResponse.json();
      for (const session of sessionResult.data || []) {
        const button = document.createElement("button"); button.textContent = `${session.title} · ${new Date(session.eventDate).toLocaleDateString("th-TH")}`;
        button.addEventListener("click", () => openPublicMap(session.publicToken)); sessions.append(button);
      }
      if (!sessions.childElementCount) detail.textContent += " · ยังไม่มีรอบที่เผยแพร่";
    }
  } catch { marketResults.textContent = "ไม่สามารถโหลดตลาดได้ กรุณาลองใหม่"; }
}

async function openPublicMap(token) {
  publicToken = token; history.replaceState({}, "", `?session=${encodeURIComponent(token)}#market-search`);
  try {
    const response = await fetch(`/api/v1/public/sessions/${encodeURIComponent(token)}/map`); const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "ไม่พบแผนผังตลาดนี้");
    publicMapData = result.data; publicMarket.hidden = false;
    document.querySelector("#public-title").textContent = publicMapData.market.name;
    document.querySelector("#public-meta").textContent = `${publicMapData.session.title} · ${new Date(publicMapData.session.eventDate).toLocaleDateString("th-TH")} · ${publicMapData.session.startTime || ""}–${publicMapData.session.endTime || ""}`;
    document.querySelector("#qr-link").href = `${location.origin}/?session=${encodeURIComponent(token)}#market-search`;
    await loadPublicShops(); publicMarket.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { publicMarket.hidden = false; document.querySelector("#public-title").textContent = error.message; }
}

async function loadPublicShops() {
  if (!publicToken) return;
  const query = document.querySelector("#shop-query").value.trim(), category = document.querySelector("#shop-category").value;
  const params = new URLSearchParams(); if (query) params.set("q", query); if (category) params.set("categoryId", category);
  try {
    const response = await fetch(`/api/v1/public/sessions/${encodeURIComponent(publicToken)}/shops?${params}`); const result = await response.json(); if (!response.ok) throw new Error("ค้นหาร้านไม่สำเร็จ");
    const categorySelect = document.querySelector("#shop-category"), selected = categorySelect.value;
    if (!categorySelect.dataset.loaded) {
      categorySelect.replaceChildren(new Option("ทุกหมวดหมู่", ""));
      for (const item of result.data.categories) categorySelect.add(new Option(item.name, item.id));
      categorySelect.dataset.loaded = "true";
    }
    categorySelect.value = selected;
    mapStalls.replaceChildren(); publicShopList.replaceChildren();
    for (const shop of result.data.shops) {
      const pin = document.createElement("button"); pin.className = "stall-pin"; pin.style.left = `${Math.max(0, Math.min(94, Number(shop.x) || 5))}%`; pin.style.top = `${Math.max(0, Math.min(88, Number(shop.y) || 5))}%`; pin.innerHTML = "";
      const code = document.createElement("span"); code.textContent = shop.stallCode; pin.append(document.createTextNode(shop.shopName), code); pin.setAttribute("aria-label", `${shop.shopName} แผง ${shop.stallCode}`); pin.addEventListener("click", () => showShop(shop)); mapStalls.append(pin);
      const card = document.createElement("article"); card.className = "shop-card"; const title = document.createElement("h3"); title.textContent = shop.shopName; const desc = document.createElement("p"); desc.textContent = `${shop.category || "ร้านค้า"} · แผง ${shop.stallCode}${shop.description ? ` · ${shop.description}` : ""}`; const open = document.createElement("button"); open.textContent = "ดูร้านและตำแหน่ง"; open.addEventListener("click", () => showShop(shop)); card.append(title, desc, open); publicShopList.append(card);
    }
    if (!result.data.shops.length) { const emptyMap = document.createElement("p"); emptyMap.className = "map-empty"; emptyMap.textContent = "ยังไม่มีร้านที่ตรงกับการค้นหา"; mapStalls.append(emptyMap); publicShopList.textContent = "ยังไม่มีร้านที่ตรงกับการค้นหา"; }
  } catch (error) { publicShopList.textContent = error.message; }
}

function showShop(shop) {
  shopDetail.hidden = false; shopDetail.replaceChildren();
  const title = document.createElement("h3"); title.textContent = `${shop.shopName || shop.name} · แผง ${shop.stallCode || shop.code}`;
  const info = document.createElement("p"); info.textContent = [shop.category || "ร้านค้า", shop.description, shop.publicContact ? `ติดต่อ: ${shop.publicContact}` : ""].filter(Boolean).join(" · ");
  shopDetail.append(title, info); shopDetail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

marketSelect.addEventListener("change", () => loadSessions(marketSelect.value));
sessionSelect.addEventListener("change", () => loadStalls(sessionSelect.value));
stallSelect.addEventListener("change", () => { reserveButton.disabled = !stallSelect.value; });
reserveButton.addEventListener("click", async () => {
  reserveButton.disabled = true; bookingMessage.textContent = "กำลังส่งคำขอ…";
  try { const response = await fetch("/api/v1/reservations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem("shopToken")}` }, body: JSON.stringify({ sessionId: Number(sessionSelect.value), stallId: Number(stallSelect.value), shopNote: document.querySelector("#booking-note").value || null }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "ส่งคำขอไม่สำเร็จ"); bookingMessage.textContent = `ส่งคำขอแล้ว หมายเลข ${result.data.id} (รอการยืนยัน)`; bookingMessage.className = "form-message success"; await loadDashboard(); await loadStalls(sessionSelect.value); }
  catch (error) { bookingMessage.textContent = error.message; bookingMessage.className = "form-message error"; reserveButton.disabled = !stallSelect.value; }
});
document.querySelector("#refresh-dashboard").addEventListener("click", loadDashboard);
document.querySelector("#toggle-profile").addEventListener("click", () => { profileForm.hidden = !profileForm.hidden; });
document.querySelector("#market-search-form").addEventListener("submit", (event) => { event.preventDefault(); loadMarketsPublic(document.querySelector("#market-query").value); });
document.querySelector("#shop-query").addEventListener("input", () => loadPublicShops());
document.querySelector("#shop-category").addEventListener("change", loadPublicShops);
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => { const listView = button.dataset.view === "list"; document.querySelector("#market-map").hidden = listView; publicShopList.hidden = !listView; document.querySelectorAll("[data-view]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); }));
checkButton.addEventListener("click", checkStatus);
checkStatus();
loadCategories();
loadMarketsPublic();
if (publicToken) openPublicMap(publicToken);
restoreSession();
