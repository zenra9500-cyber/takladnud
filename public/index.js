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
  loadProfile();
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
    profileMessage.textContent = "";
    registerForm.hidden = false;
  }
});

checkButton.addEventListener("click", checkStatus);
checkStatus();
loadCategories();
restoreSession();
