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
    let cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = t;
    cb.name = "topping";
    toppingDiv.appendChild(cb);
    toppingDiv.appendChild(document.createTextNode(" " + t));
    toppingDiv.appendChild(document.createElement("br"));
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
      let totalAll = orders.reduce((sum, order) => sum + calculateTotal(order), 0);
      alert(`Cảm ơn bạn đã thanh toán!\nTổng hóa đơn: ${totalAll.toLocaleString()} VND`);
      orders = [];
      renderBill();
    };
  }
};

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
    card.className = 'order-card';

    const header = document.createElement('div');
    header.className = 'order-header';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `Đơn hàng ${idx+1}`;
    const remove = document.createElement('button');
    remove.className = 'remove-btn';
    remove.textContent = 'Xóa';
    remove.onclick = () => { deleteOrderAt(idx); };
    header.appendChild(title);
    header.appendChild(remove);

    const items = document.createElement('ul');
    items.className = 'order-items';

    // Nước
    const drinkLi = document.createElement('li');
    drinkLi.innerHTML = `<span>Nước</span><span>${order.drink}</span>`;
    items.appendChild(drinkLi);

    // Size
    const sizeLi = document.createElement('li');
    sizeLi.innerHTML = `<span>Kích thước</span><span>${order.size}</span>`;
    items.appendChild(sizeLi);

    // Topping
    const toppingLi = document.createElement('li');
    if (order.topping.length) {
      const toppings = order.topping.map(t => `${t}`).join(', ');
      toppingLi.innerHTML = `<span>Topping</span><span>${toppings}</span>`;
    } else {
      toppingLi.innerHTML = `<span>Topping</span><span class="muted">Không chọn</span>`;
    }
    items.appendChild(toppingLi);

    // Ăn vặt
    const snackLi = document.createElement('li');
    snackLi.innerHTML = `<span>Ăn vặt</span><span>${order.snack ? order.snack : '<span class="muted">Không chọn</span>'}</span>`;
    items.appendChild(snackLi);

    const totalRow = document.createElement('div');
    totalRow.className = 'order-total';
    totalRow.innerHTML = `<div class="muted">Tổng đơn</div><div><strong>${total.toLocaleString()} VND</strong></div>`;

    card.appendChild(header);
    card.appendChild(items);
    card.appendChild(totalRow);

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
    // keep user informed if no orders left
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

function deleteOrder() {
  if (!orders.length) {
    alert("Không có đơn hàng để xóa!");
    return;
  }
  let idx = prompt(`Nhập số đơn hàng muốn xóa (1 - ${orders.length}):`);
  idx = parseInt(idx) - 1;
  if (idx >= 0 && idx < orders.length) {
    orders.splice(idx, 1);
    renderBill();
    alert("Đã xóa đơn hàng!");
  } else {
    alert("Số không hợp lệ!");
  }
}


