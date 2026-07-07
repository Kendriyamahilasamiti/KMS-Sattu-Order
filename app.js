// Product Catalog Data matching sheet headers & prices exactly
const catalog = {
  "ready": [
    {
      id: "ready_kolkata_daliya",
      name: "Kolkata Daliya",
      category: "READY ATTA SATTU",
      options: [
        { label: "1/4 kg", price: 190 },
        { label: "1/2 kg", price: 375 },
        { label: "1 kg", price: 750 },
        { label: "1.250 kg", price: 940 }
      ]
    },
    {
      id: "ready_mumbai_daliya",
      name: "Mumbai Daliya",
      category: "READY ATTA SATTU",
      options: [
        { label: "1/4 kg", price: 190 },
        { label: "1/2 kg", price: 375 },
        { label: "1 kg", price: 750 },
        { label: "1.250 kg", price: 940 }
      ]
    },
    {
      id: "ready_gehu",
      name: "Gehu",
      category: "READY ATTA SATTU",
      options: [
        { label: "1/4 kg", price: 175 },
        { label: "1/2 kg", price: 350 },
        { label: "1 kg", price: 700 },
        { label: "1.250 kg", price: 875 }
      ]
    },
    {
      id: "ready_rice",
      name: "Rice",
      category: "READY ATTA SATTU",
      options: [
        { label: "1/4 kg", price: 175 },
        { label: "1/2 kg", price: 350 },
        { label: "1 kg", price: 700 },
        { label: "1.250 kg", price: 875 }
      ]
    }
  ],
  "sika": [
    {
      id: "sika_besan",
      name: "Besan",
      category: "SIKA HUA SATTU",
      options: [
        { label: "1/4 kg", price: 190 },
        { label: "1/2 kg", price: 375 },
        { label: "1 kg", price: 750 },
        { label: "1.250 kg", price: 940 }
      ]
    },
    {
      id: "sika_gehu",
      name: "Gehu",
      category: "SIKA HUA SATTU",
      options: [
        { label: "1/4 kg", price: 175 },
        { label: "1/2 kg", price: 350 },
        { label: "1 kg", price: 700 },
        { label: "1.250 kg", price: 875 }
      ]
    },
    {
      id: "sika_rice",
      name: "Rice",
      category: "SIKA HUA SATTU",
      options: [
        { label: "1/4 kg", price: 175 },
        { label: "1/2 kg", price: 350 },
        { label: "1 kg", price: 700 },
        { label: "1.250 kg", price: 875 }
      ]
    }
  ]
};

// Application State
let cart = {}; // maps key `productId|sizeLabel` to qty
let orderHistory = [];
let currentGeneratedHTML = "";
let activeOrderId = "";
let isAdminLoggedIn = false;

// Google Apps Script Web App URL for sending email receipts & saving to Google Sheet
const googleScriptURL = "https://script.google.com/macros/s/AKfycbz1uQUfOl_SFFgAwZ7__RRFjPYC1tUqFPhYeq3OqEGy5G4QpH_jTiA6pUj9XdIuzJHReA/exec";



// Global state for WhatsApp billing
let currentOrderDetailsForWA = null;

// Kshetra WhatsApp Contacts Map
const kshetraContacts = {
  "Ghatkopar": { name: "Chaitali biyani", phone: "9422800795" },
  "Goregaon": { name: "Jyoti Hurkat", phone: "9320346246" },
  "Borivali": { name: "", phone: "" },
  "Andheri": { name: "", phone: "" },
  "Mulund": { name: "", phone: "" },
  "Dakshin Mumbai": { name: "", phone: "" },
  "Madhya Mumbai": { name: "Swati Kabra", phone: "9867122621" },
  "Malad": { name: "", phone: "" }
};

// Update Kshetra Contact display card
function updateKshetraContact(kshetraValue) {
  const contactDetails = document.getElementById("kshetra-contact-details");
  if (contactDetails && kshetraContacts[kshetraValue]) {
    const contact = kshetraContacts[kshetraValue];
    if (contact.name && contact.phone) {
      contactDetails.innerText = `${contact.name}: ${contact.phone}`;
    } else {
      contactDetails.innerText = "Representative: Not Assigned";
    }
  }
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  renderCatalog();

  // Initialize Kshetra contact mapping and change listener
  const kshetraSelect = document.getElementById("kshetra");
  if (kshetraSelect) {
    kshetraSelect.addEventListener("change", (e) => {
      updateKshetraContact(e.target.value);
    });
    // Set initial contact based on default selected value
    updateKshetraContact(kshetraSelect.value);
  }
});

// Render Catalog Cards
function renderCatalog() {
  const readyGrid = document.getElementById("ready-grid");
  const sikaGrid = document.getElementById("sika-grid");

  readyGrid.innerHTML = "";
  sikaGrid.innerHTML = "";

  // Render Ready Atta Sattu Products
  catalog.ready.forEach(prod => {
    readyGrid.appendChild(createProductCard(prod));
  });

  // Render Sika Hua Sattu Products
  catalog.sika.forEach(prod => {
    sikaGrid.appendChild(createProductCard(prod));
  });
}

// Helper to create product card
function createProductCard(prod) {
  const card = document.createElement("div");
  card.className = "product-card";

  let optionsHTML = "";
  const isReady = prod.category === 'READY ATTA SATTU';
  prod.options.forEach((opt, idx) => {
    const inputId = `${prod.id}_${opt.label.replace(/\s+/g, '')}`;
    const isLast = idx === prod.options.length - 1;
    optionsHTML += `
      <div class="size-row-container" style="${isLast ? '' : 'border-bottom: 1px solid #f3f4f6;'}">
        <div class="size-row" style="border-bottom: none;">
          <div class="size-info">
            <span class="size-label">
              ${opt.label}
              ${opt.label.trim() === "1/4 kg" ? '<span style="font-size: 0.72rem; color: #ef4444; display: block; font-weight: normal; margin-top: 2px;">(Min 20 packs)</span>' : ''}
            </span>
            <span class="size-price">₹${opt.price}</span>
          </div>
          <div class="qty-counter ${isReady ? 'counter-ready' : 'counter-sika'}">
            <button class="qty-btn" type="button" onclick="updateQty('${prod.id}', '${opt.label}', -1)">-</button>
            <input type="number" class="qty-input" id="${inputId}" value="0" min="0" onchange="setQty('${prod.id}', '${opt.label}', this.value)">
            <button class="qty-btn" type="button" onclick="updateQty('${prod.id}', '${opt.label}', 1)">+</button>
          </div>
        </div>
        ${opt.label.trim() === "1/4 kg" ? `<div class="qty-warning" id="warning_${inputId}" style="display: none; color: #ef4444; font-size: 0.8rem; text-align: right; padding-bottom: 8px; font-weight: 500; margin-top: -4px;">⚠️ Min 20 packs (5 kg) required</div>` : ''}
      </div>
    `;
  });

  card.innerHTML = `
    <div class="product-header">
      <h3 class="product-name">${prod.name}</h3>
      <span class="product-category-tag ${isReady ? 'tag-ready' : 'tag-sika'}">${prod.category.split(' ')[0]}</span>
    </div>
    <div class="size-option-list">
      ${optionsHTML}
    </div>
  `;

  return card;
}

// Switch Tabs
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".products-panel").forEach(panel => panel.classList.remove("active"));

  if (tab === 'ready') {
    document.querySelector(".tab-btn:nth-child(1)").classList.add("active");
    document.getElementById("ready-panel").classList.add("active");
  } else {
    document.querySelector(".tab-btn:nth-child(2)").classList.add("active");
    document.getElementById("sika-panel").classList.add("active");
  }
}

// Change Quantity (+/- buttons)
function updateQty(prodId, label, delta) {
  const key = `${prodId}|${label}`;
  const currentVal = cart[key] || 0;
  
  let newVal;
  if (label.trim() === "1/4 kg") {
    if (delta > 0) {
      if (currentVal === 0) {
        newVal = 20; // Jump directly to 20
      } else {
        newVal = currentVal + delta;
      }
    } else {
      if (currentVal <= 20) {
        newVal = 0; // Drop back to 0
      } else {
        newVal = currentVal + delta;
      }
    }
  } else {
    newVal = Math.max(0, currentVal + delta);
  }
  
  cart[key] = newVal;
  updateUI(prodId, label, newVal);
  calculateTotals();
}

// Set Quantity (direct input)
function setQty(prodId, label, value) {
  const key = `${prodId}|${label}`;
  let newVal = Math.max(0, parseInt(value) || 0);
  
  if (label.trim() === "1/4 kg" && newVal > 0 && newVal < 20) {
    newVal = 20; // Auto-correct to minimum 20
  }
  
  cart[key] = newVal;
  updateUI(prodId, label, newVal);
  calculateTotals();
}

// Update input value in UI
function updateUI(prodId, label, value) {
  const inputId = `${prodId}_${label.replace(/\s+/g, '')}`;
  const input = document.getElementById(inputId);
  if (input) {
    input.value = value;
    
    // Check validation warning for 1/4 kg size
    const warning = document.getElementById(`warning_${inputId}`);
    const counter = input.closest(".qty-counter");
    const numVal = parseInt(value) || 0;
    
    if (label.trim() === "1/4 kg") {
      if (numVal > 0 && numVal < 20) {
        if (counter) {
          counter.style.background = "#fee2e2";
          counter.style.border = "1px solid #ef4444";
        }
        if (warning) warning.style.display = "block";
      } else {
        if (counter) {
          counter.style.background = "";
          counter.style.border = "";
        }
        if (warning) warning.style.display = "none";
      }
    }
  }
}

// Recalculate and update Sidebar
function calculateTotals() {
  const container = document.getElementById("summary-items-container");
  container.innerHTML = "";

  let totalQty = 0;
  let grandTotal = 0;
  let hasItems = false;

  // Scan through all items in cart
  Object.keys(cart).forEach(key => {
    const qty = cart[key];
    if (qty > 0) {
      hasItems = true;
      const [prodId, label] = key.split('|');
      
      // Find item details
      let item = null;
      let category = "";
      // Check ready Sattu
      let prod = catalog.ready.find(p => p.id === prodId);
      if (prod) {
        item = prod;
        category = "READY ATTA SATTU";
      } else {
        prod = catalog.sika.find(p => p.id === prodId);
        if (prod) {
          item = prod;
          category = "SIKA HUA SATTU";
        }
      }

      if (item) {
        const opt = item.options.find(o => o.label === label);
        if (opt) {
          const subtotal = qty * opt.price;
          totalQty += qty;
          grandTotal += subtotal;

          // Render summary row
          const row = document.createElement("div");
          row.className = "summary-item-row";
          row.innerHTML = `
            <div class="summary-item-details">
              <span class="summary-item-name">${item.name} (${label})</span>
              <span class="summary-item-sub">${category} | Qty: ${qty}</span>
            </div>
            <span class="summary-item-cost">₹${subtotal.toFixed(2)}</span>
          `;
          container.appendChild(row);
        }
      }
    }
  });

  if (!hasItems) {
    container.innerHTML = `<p style="color: var(--text-light); text-align: center; margin-top: 20px;">No items selected yet.</p>`;
  }

  document.getElementById("total-qty").innerText = totalQty;
  document.getElementById("grand-total").innerText = `₹${grandTotal.toFixed(2)}`;
}

// Submit the Order (replaces generateBill)
function submitOrder() {
  const kshetra = document.getElementById("kshetra").value;
  const custName = document.getElementById("customer-name").value.trim();
  const custMobile = document.getElementById("customer-mobile").value.trim();

  if (!custName) {
    alert("Please enter Customer Name.");
    return;
  }
  if (!custMobile) {
    alert("Please enter WhatsApp Number.");
    return;
  }

  // Validate minimum order requirement for 1/4 kg size (min 20 packs / 5 kg)
  let validationErrors = [];
  Object.keys(cart).forEach(key => {
    const qty = cart[key];
    if (qty > 0) {
      const [prodId, label] = key.split('|');
      if (label.trim() === "1/4 kg" && qty < 20) {
        let prod = catalog.ready.find(p => p.id === prodId) || catalog.sika.find(p => p.id === prodId);
        const prodName = prod ? prod.name : prodId;
        const categoryName = prod ? prod.category : "";
        validationErrors.push(`For ${prodName} (${categoryName}), the 1/4 kg size requires a minimum order of 20 packs (5 kg). Currently selected: ${qty} pack(s).`);
      }
    }
  });

  if (validationErrors.length > 0) {
    alert(validationErrors.join("\n\n"));
    return;
  }

  // Count active items and totals
  let activeItems = [];
  let grandTotal = 0;
  let totalQty = 0;

  Object.keys(cart).forEach(key => {
    const qty = cart[key];
    if (qty > 0) {
      const [prodId, label] = key.split('|');
      
      let item = null;
      let category = "";
      let prod = catalog.ready.find(p => p.id === prodId);
      if (prod) {
        item = prod;
        category = "READY ATTA SATTU";
      } else {
        prod = catalog.sika.find(p => p.id === prodId);
        if (prod) {
          item = prod;
          category = "SIKA HUA SATTU";
        }
      }

      if (item) {
        const opt = item.options.find(o => o.label === label);
        if (opt) {
          const subtotal = qty * opt.price;
          totalQty += qty;
          grandTotal += subtotal;
          activeItems.push({
            category: category,
            productName: item.name,
            measure: label,
            quantity: qty,
            price: opt.price,
            amount: subtotal
          });
        }
      }
    }
  });

  if (activeItems.length === 0) {
    alert("Please add at least one product with quantity greater than 0.");
    return;
  }

  const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
  processSubmitOrder(orderId, kshetra, custName, custMobile, "Cash", activeItems, totalQty, grandTotal);
}

// Process the order saving
function processSubmitOrder(orderId, kshetra, custName, custMobile, paymentMethod, activeItems, totalQty, grandTotal) {
  let tbodyHTML = "";
  activeItems.forEach(item => {
    let displayName = `${item.productName} (${item.category})`;
    tbodyHTML += `
          <tr>
            <td>${displayName}</td>
            <td>${item.measure}</td>
            <td>${item.quantity}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>${item.amount.toFixed(2)}</td>
          </tr>`;
  });

  const billHTML = `
    <div class="bill-container">
      <h2 class="bill-title">Order Receipt</h2>
      <p class="bill-details">
        <strong>Order ID:</strong> ${orderId}<br>
        <strong>Name:</strong> ${custName}<br>
        <strong>WhatsApp Number:</strong> ${custMobile}<br>
        <strong>Kshetra:</strong> ${kshetra}<br>
        <strong>Payment Method:</strong> ${paymentMethod}
      </p>
      <table class="bill-table" border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse: collapse;">
        <thead style="background-color: #f2f2f2;">
          <tr>
            <th>Product</th>
            <th>Measure</th>
            <th>Quantity</th>
            <th>Unit Price (₹)</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHTML}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align: right;"><strong>Total</strong></td>
            <td><strong>₹${grandTotal.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

  // Trigger Google Apps Script to save to spreadsheet (email sent to dummy/empty)
  if (googleScriptURL) {
    fetch(googleScriptURL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: orderId,
        kshetra: kshetra,
        customer: custName,
        mobile: custMobile,
        email: "-",
        paymentMethod: paymentMethod,
        upiId: "-",
        qty: totalQty,
        total: grandTotal,
        items: activeItems,
        timestamp: new Date().toLocaleString()
      })
    })
    .then(() => {
      console.log("Order pushed to Google Sheets successfully!");
    })
    .catch(err => {
      console.error("Failed to connect to Google Apps Script Web App:", err);
    });
  }

  // Populate global state for WhatsApp sharing
  currentOrderDetailsForWA = {
    orderId: orderId,
    kshetra: kshetra,
    custName: custName,
    custMobile: custMobile,
    activeItems: activeItems,
    totalQty: totalQty,
    grandTotal: grandTotal
  };

  // Show receipt modal
  activeOrderId = orderId;
  currentGeneratedHTML = billHTML;
  document.getElementById("modal-bill-body").innerHTML = billHTML;
  document.getElementById("bill-modal").style.display = "flex";

  // Reset form inputs (without using resetForm which prompts confirm)
  cart = {};
  document.querySelectorAll(".qty-input").forEach(input => {
    input.value = 0;
    const counter = input.closest(".qty-counter");
    if (counter) {
      counter.style.background = "";
      counter.style.border = "";
    }
  });
  document.querySelectorAll(".qty-warning").forEach(warning => warning.style.display = "none");
  document.getElementById("customer-name").value = "";
  document.getElementById("customer-mobile").value = "";
  calculateTotals();

  alert("Order Submitted Successfully! Opening WhatsApp to send your bill...");
  
  // Automatically open WhatsApp chat to both numbers
  setTimeout(() => {
    const contact = kshetraContacts[kshetra];
    const text = generateWhatsAppText(currentOrderDetailsForWA);
    
    // Open self copy
    if (custMobile) {
      const digitsOnly = custMobile.replace(/\D/g, '');
      const cleanPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
    }
    
    // Open Kshetra Rep chat (if representative is assigned)
    if (contact && contact.phone) {
      setTimeout(() => {
        window.open(`https://wa.me/91${contact.phone}?text=${text}`, "_blank");
      }, 500); // 500ms delay to prevent browser blockages
    }
  }, 1000);
}

// Close Modal
function closeModal() {
  document.getElementById("bill-modal").style.display = "none";
}

// Print Bill
function printBill() {
  window.print();
}

// Reset entire form
function resetForm() {
  if (confirm("Are you sure you want to clear current order quantities?")) {
    cart = {};
    document.querySelectorAll(".qty-input").forEach(input => input.value = 0);
    document.getElementById("customer-name").value = "";
    document.getElementById("customer-mobile").value = "";
    calculateTotals();
  }
}

// Format the order receipt as plain text for WhatsApp
function generateWhatsAppText(d) {
  let text = `*Kendriya Mahila Samiti - Sattu Order*\n`;
  text += `*Order ID:* ${d.orderId}\n`;
  text += `*Name:* ${d.custName}\n`;
  text += `*WhatsApp Number:* ${d.custMobile}\n`;
  text += `*Kshetra:* ${d.kshetra}\n`;
  text += `*Payment Method:* Cash (Pending confirmation)\n\n`;
  
  text += `*Items Ordered:*\n`;
  d.activeItems.forEach(item => {
    text += `- ${item.productName} (${item.measure}) x ${item.quantity} - ₹${item.amount.toFixed(2)}\n`;
  });
  
  text += `\n*Total Packs:* ${d.totalQty}\n`;
  text += `*Grand Total:* ₹${d.grandTotal.toFixed(2)}\n\n`;
  text += `_Please make cash payment to your respective Kshetra member. Once received, order will be confirmed._`;
  
  return encodeURIComponent(text);
}

// Share receipt to Kshetra Representative
function shareWhatsAppKshetra() {
  if (!currentOrderDetailsForWA) return;
  const d = currentOrderDetailsForWA;
  const contact = kshetraContacts[d.kshetra];
  
  if (contact && contact.phone) {
    const text = generateWhatsAppText(d);
    const waUrl = `https://wa.me/91${contact.phone}?text=${text}`;
    window.open(waUrl, "_blank");
  } else {
    alert("No WhatsApp number found for this Kshetra representative.");
  }
}

// Share receipt copy to Self (Customer)
function shareWhatsAppSelf() {
  if (!currentOrderDetailsForWA) return;
  const d = currentOrderDetailsForWA;
  
  if (d.custMobile) {
    const digitsOnly = d.custMobile.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
    
    const text = generateWhatsAppText(d);
    const waUrl = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(waUrl, "_blank");
  } else {
    alert("Please make sure you entered a valid WhatsApp number.");
  }
}


