// Thay bằng URL Apps Script của bạn
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzO0YNnGfB_E7D73wXrBpr_AyJAvmmuipp68SyuApnhA2t-RpABYobh6RrMEZTYY_7hNg/exec";

function sendOrderToGoogleSheet(order) {
  fetch(GOOGLE_SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  })
  .then(res => res.ok ? res.text() : Promise.reject(res.status))
  .then(msg => console.log("Đã gửi đơn lên Google Sheets:", msg))
  .catch(err => console.error("Lỗi gửi đơn lên Google Sheets:", err));
}
// Dữ liệu từ cf.py
const sizeOptions = ["Size M (chuẩn)", "Size L (+5.000đ)"];
const drinkOptions = [
  // Cafe
  { group: "Cà phê", items: [
    { name: "Cà phê đen đá/nóng", price: 18000 },
    { name: "Cà phê sữa đá/nóng", price: 20000 },
    { name: "Bạc xỉu", price: 22000 },
    { name: "Cold Brew", price: 30000 }
  ]},
  // Trà & Trà sữa
  { group: "Trà & Trà sữa", items: [
    { name: "Trà đào cam sả", price: 28000 },
    { name: "Trà chanh mật ong", price: 22000 },
    { name: "Trà tắc xí muội", price: 20000 },
    { name: "Trà sữa trân châu", price: 28000 },
    { name: "Matcha Latte", price: 32000 }
  ]},
  // Nước giải khát
  { group: "Nước giải khát", items: [
    { name: "Soda chanh", price: 22000 },
    { name: "Soda việt quất", price: 25000 },
    { name: "Nước suối", price: 10000 },
    { name: "Sting/Pepsi/7Up", price: 15000 }
  ]},
  // Sinh tố – Nước ép
  { group: "Sinh tố – Nước ép", items: [
    { name: "Sinh tố bơ", price: 30000 },
    { name: "Sinh tố xoài", price: 28000 },
    { name: "Sinh tố dâu", price: 28000 },
    { name: "Nước ép cam", price: 28000 },
    { name: "Nước ép cà rốt", price: 25000 }
  ]}
];
const snackOptions = [
  { name: "Khoai tây chiên", price: 25000 },
  { name: "Xúc xích chiên", price: 25000 },
  { name: "Bánh tráng trộn", price: 20000 },
  { name: "Khô gà lá chanh", price: 30000 },
  { name: "Mì xào bò", price: 35000 }
];
const toppingOptions = ["Trân châu đen", "Trân châu trắng", "Thạch phô mai", "Thạch cà phê", "Flan", "Pudding trứng"];

const priceTable = {
  size: {"Size M (chuẩn)": 0, "Size L (+5.000đ)": 5000},
  topping: {"Trân châu đen": 5000, "Trân châu trắng": 5000, "Thạch phô mai": 5000, "Thạch cà phê": 5000, "Flan": 5000, "Pudding trứng": 5000},
};

// Giỏ hàng lưu nhiều đơn
let orders = [];

// Helper function to show/hide modals with animations
function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
    // For QR section, explicitly hide it after closing modal
    if (modalId === "paymentModal") {
      document.getElementById("qrSection").style.display = "none";
    }
  }
}

// Khởi tạo select + checkbox
window.onload = () => {
  // Khởi tạo select nước (có nhóm)
  let drinkSel = document.getElementById("drink");
  drinkOptions.forEach(group => {
    let optgroup = document.createElement("optgroup");
    optgroup.label = group.group;
    group.items.forEach(item => {
      let opt = document.createElement("option");
      opt.value = item.name;
      opt.textContent = `${item.name} (${item.price.toLocaleString()}đ)`;
      optgroup.appendChild(opt);
    });
    drinkSel.appendChild(optgroup);
  });

  // Khởi tạo select size
  let sizeSel = document.getElementById("size");
  sizeOptions.forEach(s => sizeSel.add(new Option(s, s)));

  // Khởi tạo topping
  let toppingDiv = document.getElementById("topping");
  toppingOptions.forEach(t => {
    let label = document.createElement("label");
    let cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = t;
    cb.name = "topping";
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + t));
    toppingDiv.appendChild(label);
  });

  // Khởi tạo select ăn vặt
  let snackSel = document.getElementById("snack");
  snackOptions.forEach(snack => {
    let opt = document.createElement("option");
    opt.value = snack.name;
    opt.textContent = `${snack.name} (${snack.price.toLocaleString()}đ)`;
    snackSel.appendChild(opt);
  });

  // Thêm sự kiện cho nút Thanh toán
  const payBtn = document.getElementById("payBtn");
  if (payBtn) {
    payBtn.onclick = () => {
      if (!orders.length) {
        alert("Chưa có đơn hàng nào để thanh toán!");
        return;
      }
      // Hiển thị modal chọn phương thức thanh toán
      toggleModal("paymentModal", true);
    };
  }

  // Xử lý nút trong modal
  document.getElementById("cashBtn").onclick = () => handlePayment("Tiền mặt");
  document.getElementById("bankBtn").onclick = () => {
    // Hiện QR
    document.getElementById("qrSection").style.display = "block";
  };
  document.getElementById("confirmBankBtn").onclick = () => handlePayment("Chuyển khoản");
  document.getElementById("closeModalBtn").onclick = () => {
    toggleModal("paymentModal", false);
  };

  // Đóng modal cảm ơn
  document.getElementById("closeThankBtn").onclick = () => {
    toggleModal("thankModal", false);
    // Xóa thông tin tổng tiền vừa thêm
    let modalContent = document.querySelector("#thankModal .modal-content");
    let extra = modalContent.querySelector(".modal-total-info"); // Use a specific class
    if (extra) extra.remove();
  };

  // Thay prompt bằng modal nhập mật khẩu
  document.getElementById("historyBtn").onclick = () => {
    document.getElementById("managerPassword").value = "";
    document.getElementById("passwordError").style.display = "none";
    toggleModal("passwordModal", true);
    document.getElementById("managerPassword").focus();
  };

  // Event listener for password submission (for history)
  document.getElementById("submitPasswordBtn").onclick = function() {
    const pass = document.getElementById("managerPassword").value;
    if (pass !== "002299") { // Manager password
      document.getElementById("passwordError").style.display = "block";
      return;
    }
    toggleModal("passwordModal", false);
    showHistory();
    toggleModal("historyModal", true);
    // Re-attach delete history functionality correctly after password check
    document.getElementById("deleteHistoryBtn").onclick = handleDeleteHistoryAttempt;
  };

  document.getElementById("closePasswordBtn").onclick = () => {
    toggleModal("passwordModal", false);
  };

  // Khởi tạo lại modal lịch sử
  document.getElementById("closeHistoryBtn").onclick = () => {
    toggleModal("historyModal", false);
  };

  // Initial setup for delete history button
  document.getElementById("deleteHistoryBtn").onclick = handleDeleteHistoryAttempt;

  renderHotItems();
  renderBill(); // Render empty bill on load if no orders
};

// Function to handle delete history button click (opens password modal)
function handleDeleteHistoryAttempt() {
  // Show password modal
  document.getElementById("managerPassword").value = "";
  document.getElementById("passwordError").style.display = "none";
  toggleModal("passwordModal", true);
  document.getElementById("managerPassword").focus();

  // Temporarily change submitPasswordBtn's behavior for history deletion
  document.getElementById("submitPasswordBtn").onclick = function() {
    const pass = document.getElementById("managerPassword").value;
    if (pass !== "002299") { // Manager password
      document.getElementById("passwordError").style.display = "block";
      return;
    }
    // Correct password, proceed with deletion
    localStorage.removeItem("orderHistory");
    localStorage.removeItem("drinkStats"); // Also clear drink stats
    showHistory(); // Refresh history display (will be empty)
    renderHotItems(); // Refresh hot items (will be based on empty stats)
    toggleModal("passwordModal", false); // Close password modal
    // No need to close history modal, it should still be open
    // Re-attach the default submit password behavior (for future history viewing)
    document.getElementById("submitPasswordBtn").onclick = () => {
      const currentPass = document.getElementById("managerPassword").value;
      if (currentPass !== "002299") {
        document.getElementById("passwordError").style.display = "block";
        return;
      }
      toggleModal("passwordModal", false);
      showHistory();
      toggleModal("historyModal", true);
    };
  };
}


// Lưu lịch sử vào localStorage
function saveHistory(orderArr) {
  let history = JSON.parse(localStorage.getItem("orderHistory") || "[]");
  history = history.concat(orderArr);
  localStorage.setItem("orderHistory", JSON.stringify(history));
}

// Hiển thị lịch sử đơn hàng
function showHistory() {
  let history = JSON.parse(localStorage.getItem("orderHistory") || "[]");
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";
  if (!history.length) {
    historyList.innerHTML = '<div class="empty-bill">Chưa có lịch sử đơn hàng.</div>';
    return;
  }
  history.forEach((order, idx) => {
    let total = calculateTotal(order);
    const card = document.createElement('div');
    card.className = 'order-card'; // Keep order-card class for styling
    card.innerHTML = `
      <div class="order-header">
        <div class="title">Đơn hàng ${idx+1}</div>
        <div class="muted">${order.time || ""}</div>
      </div>
      <ul class="order-items">
        <li><span>Nước</span><span>${order.drink}</span></li>
        <li><span>Kích thước</span><span>${order.size}</span></li>
        <li><span>Topping</span><span>${order.topping && order.topping.length ? order.topping.join(', ') : '<span class="muted">Không chọn</span>'}</span></li>
        <li><span>Ăn vặt</span><span>${order.snack ? order.snack : '<span class="muted">Không chọn</span>'}</span></li>
      </ul>
      <div class="order-total">
        <div class="muted">Tổng đơn</div><div><strong>${total.toLocaleString()} VND</strong></div>
      </div>
    `;
    historyList.appendChild(card);
  });
}

// Cập nhật thống kê số lượng nước bán được
function updateDrinkStats(ordersArr) {
  let stats = JSON.parse(localStorage.getItem("drinkStats") || "{}");
  ordersArr.forEach(order => {
    if (order.drink) {
      stats[order.drink] = (stats[order.drink] || 0) + 1;
    }
  });
  localStorage.setItem("drinkStats", JSON.stringify(stats));
}

function getDrinkStats() {
  return JSON.parse(localStorage.getItem("drinkStats") || "{}");
}

// Sửa hàm handlePayment để cập nhật số lượng nước bán được
function handlePayment(methodText) {
  let totalAll = orders.reduce((sum, order) => sum + calculateTotal(order), 0);
  toggleModal("paymentModal", false); // Close payment modal
  saveHistory(orders); // Lưu lịch sử
  updateDrinkStats(orders); // Cập nhật thống kê nước bán được
  renderHotItems(); // Re-render hot items after stats update
  orders = [];
  renderBill(); // Clear current bill

  // Hiện modal cảm ơn
  const thankModal = document.getElementById("thankModal");
  // Remove any previous total info before adding new one
  let prevTotalInfo = thankModal.querySelector(".modal-total-info");
  if (prevTotalInfo) prevTotalInfo.remove();

  thankModal.querySelector(".modal-content").insertAdjacentHTML(
    "beforeend",
    `<div class="modal-total-info" style="margin-top:20px; color:#4CAF50; font-weight:600; font-size:1.1em;">Tổng hóa đơn: ${totalAll.toLocaleString()} VND<br>Phương thức: ${methodText}</div>`
  );
  toggleModal("thankModal", true); // Show thank you modal
}

function calculateTotal(order) {
  let total = 0;
  // Tìm giá nước
  for (const group of drinkOptions) {
    const found = group.items.find(item => item.name === order.drink);
    if (found) {
      total += found.price;
      break;
    }
  }
  // Size
  total += priceTable.size[order.size] || 0;
  // Topping
  order.topping.forEach(t => total += priceTable.topping[t] || 0);
  // Ăn vặt
  if (order.snack) {
    const foundSnack = snackOptions.find(s => s.name === order.snack);
    if (foundSnack) total += foundSnack.price;
  }
  return total;
}

function confirmOrder() {
  let drink = document.getElementById("drink").value;
  let size = document.getElementById("size").value;
  let snack = document.getElementById("snack").value || null;

  let topping = [];
  document.querySelectorAll("input[name='topping']:checked").forEach(cb => topping.push(cb.value));
  if (topping.length > 3) {
    alert("Chỉ được chọn tối đa 3 topping!");
    return;
  }

  let order = {drink, size, snack, topping, time: new Date().toLocaleString()};
  orders.push(order);
  sendOrderToGoogleSheet(order);
  renderBill();
  resetForm(); // Reset form after confirming an order
}

function renderBill() {
  const container = document.getElementById("bill");
  container.innerHTML = "";
  if (!orders.length) {
    container.innerHTML = '<div class="empty-bill">Chưa có đơn hàng nào.<br>Nhấn "Xác nhận đơn hàng" để thêm.</div>';
    return;
  }

  let totalAll = 0;
  orders.forEach((order, idx) => {
    let total = calculateTotal(order);
    totalAll += total;

    const card = document.createElement('div');
    card.className = 'order-card'; // This class has the animation
    card.innerHTML = `
      <div class="order-header">
        <div class="title">Đơn hàng ${idx+1}</div>
        <button class="remove-btn" onclick="deleteOrderAt(${idx})">Xóa</button>
      </div>
      <ul class="order-items">
        <li><span>Nước</span><span>${order.drink}</span></li>
        <li><span>Kích thước</span><span>${order.size}</span></li>
        <li><span>Topping</span><span>${order.topping && order.topping.length ? order.topping.join(', ') : '<span class="muted">Không chọn</span>'}</span></li>
        <li><span>Ăn vặt</span><span>${order.snack ? order.snack : '<span class="muted">Không chọn</span>'}</span></li>
      </ul>
      <div class="order-total">
        <div class="muted">Tổng đơn</div><div><strong>${total.toLocaleString()} VND</strong></div>
      </div>
    `;
    container.appendChild(card);
  });

  const grand = document.createElement('div');
  grand.className = 'grand-total';
  grand.innerHTML = `💰 TỔNG TẤT CẢ: ${totalAll.toLocaleString()} VND`;
  container.appendChild(grand);
}

function deleteOrderAt(idx) {
  if (idx >=0 && idx < orders.length) {
    orders.splice(idx, 1);
    renderBill();
  }
}

function resetForm() {
  document.getElementById("drink").selectedIndex = 0;
  document.getElementById("size").selectedIndex = 0;
  document.getElementById("snack").selectedIndex = 0;
  document.querySelectorAll("input[name='topping'").forEach(cb => cb.checked = false);
}

function showBill() {
  if (!orders.length) {
    alert("Chưa có đơn hàng nào!");
  } else {
    renderBill();
  }
}

// Hàm render danh sách nước bán chạy
function renderHotItems() {
  const stats = getDrinkStats();
  const hotList = document.getElementById("hotItemsList");
  hotList.innerHTML = "";
  
  let allDrinks = [];
  drinkOptions.forEach(group => {
    group.items.forEach(item => {
      allDrinks.push(item.name);
    });
  });

  // Sort and filter for items that have been sold at least once
  const sortedHotDrinks = allDrinks
    .filter(drink => (stats[drink] || 0) > 0) // Only show items that have been sold
    .sort((a, b) => (stats[b] || 0) - (stats[a] || 0));

  // If no items have been sold, display a message
  if (sortedHotDrinks.length === 0) {
    hotList.innerHTML = '<li><span class="muted" style="margin-left: 0;">Chưa có nước nào được bán.</span></li>';
    return;
  }

  // Only take top 5 or 6 (you had 6 in your initial HTML, let's stick to 6 for consistency)
  sortedHotDrinks.slice(0, 6).forEach((drink, idx) => {
    const count = stats[drink] || 0;
    hotList.innerHTML += `
      <li>
        <span class="hot-rank${idx==0?' top1':(idx==1?' top2':(idx==2?' top3':''))}">${idx+1}</span>
        <span>${drink}</span>
        <span class="hot-count">${count}</span>
      </li>
    `;
  });
}
