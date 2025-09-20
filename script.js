// script.js (v5.2 - Robust Fee Calculation)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz2k7VL9AF-gSWfOC-iTx_OaWLeQkDFccoBCicC82u2RO72cf-eWuYmEu-zegKXsHnEYQ/exec';

window.addEventListener('DOMContentLoaded', () => {
    // --- Element Declarations (No changes) ---
    const form = document.getElementById('order-form');
    const menuContainer = document.getElementById('menu-container');
    const loadingMessage = document.getElementById('loading-menu');
    const getLocationBtn = document.getElementById('get-location-btn');
    const locationStatus = document.getElementById('location-status');
    const totalPriceValue = document.getElementById('total-price-value');
    const grandTotalValue = document.getElementById('grand-total-value');
    const reviewOrderBtn = document.getElementById('review-order-btn');
    const summaryModal = document.getElementById('summary-modal');
    const customerSummary = document.getElementById('customer-summary');
    const orderSummaryList = document.getElementById('order-summary-list');
    const summaryFoodTotal = document.getElementById('summary-food-total');
    const summaryDistance = document.getElementById('summary-distance');
    const summaryDeliveryFee = document.getElementById('summary-delivery-fee');
    const summaryGrandTotal = document.getElementById('summary-grand-total');
    const modalSpinner = document.getElementById('modal-spinner');
    const editOrderBtn = document.getElementById('edit-order-btn');
    const confirmOrderBtn = document.getElementById('confirm-order-btn');
    const thankYouModal = document.getElementById('thank-you-modal');
    const closeThankYouBtn = document.getElementById('close-thank-you-btn');
    
    let userLocation = null;
    let menuData = [];
    let currentOrderData = {};

    // --- Main Functions ---
    async function fetchMenu() {
        try {
            // This still uses GET, which is fine for fetching the menu
            const response = await fetch(WEB_APP_URL); 
            if (!response.ok) throw new Error(`Network response was not ok`);
            const result = await response.json();
            if (result.status === 'success') {
                menuData = result.data;
                renderMenu(menuData);
            } else { throw new Error(result.message); }
        } catch (error) { 
            loadingMessage.textContent = `เกิดข้อผิดพลาดในการโหลดเมนู: ${error.message}`;
            loadingMessage.style.color = 'red';
        }
    }

    function renderMenu(items) {
        if(loadingMessage) loadingMessage.style.display = 'none';
        menuContainer.innerHTML = '';
        items.forEach((item) => {
            let subOptionsHTML = '';
            if (item.Options && item.Options.length > 0) {
                const options = item.Options.split(',').map(opt => opt.trim());
                subOptionsHTML += '<div class="sub-options-container">';
                options.forEach((option, optionIndex) => {
                    subOptionsHTML += `<label><input type="radio" name="option-${item.ItemID}" value="${option}" ${optionIndex === 0 ? 'checked' : ''}><span>${option}</span></label>`;
                });
                subOptionsHTML += '</div>';
            }
            const specialRequestHTML = `<input type="text" class="special-request-input" data-itemid="${item.ItemID}" placeholder="คำสั่งพิเศษ (เช่น ไม่ใส่ผัก)">`;
            
            const menuItemHTML = `
                <div class="menu-item-dynamic" id="${item.ItemID}">
                    <img src="${item.ImageURL}" alt="${item.Name}" onerror="this.src='https://placehold.co/160x160/EFEFEF/AAAAAA?text=Image'">
                    <div class="menu-item-details">
                        <span class="item-name">${item.Name}</span>
                        <span class="item-price">${item.Price} บาท</span>
                        ${subOptionsHTML}
                        ${specialRequestHTML}
                    </div>
                    <div class="quantity-controls">
                        <button type="button" class="btn-minus" data-itemid="${item.ItemID}">-</button>
                        <span class="quantity-display" id="qty-${item.ItemID}">0</span>
                        <button type="button" class="btn-plus" data-itemid="${item.ItemID}">+</button>
                    </div>
                </div>`;
            menuContainer.innerHTML += menuItemHTML;
        });
        addQuantityButtonListeners();
        updateTotals();
    }
    
    function addQuantityButtonListeners() {
        document.querySelectorAll('.btn-plus, .btn-minus').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemID = e.target.dataset.itemid;
                const display = document.getElementById(`qty-${itemID}`);
                let currentQty = parseInt(display.textContent, 10);
                if (e.target.classList.contains('btn-plus')) {
                    currentQty++;
                } else if (currentQty > 0) {
                    currentQty--;
                }
                display.textContent = currentQty;
                updateTotals();
            });
        });
    }

    function updateTotals() {
        let foodTotal = 0;
        document.querySelectorAll('.quantity-display').forEach(display => {
            const qty = parseInt(display.textContent, 10);
            if (qty > 0) {
                const itemID = display.id.replace('qty-', '');
                const item = menuData.find(m => m.ItemID === itemID);
                if (item) {
                    foodTotal += item.Price * qty;
                }
            }
        });
        totalPriceValue.textContent = foodTotal;
        grandTotalValue.textContent = foodTotal; 
    }

    function collectOrderData() {
        const orderDetails = [];
        let foodTotal = 0;
        document.querySelectorAll('.quantity-display').forEach(display => {
            const qty = parseInt(display.textContent, 10);
            if (qty > 0) {
                const itemID = display.id.replace('qty-', '');
                const item = menuData.find(m => m.ItemID === itemID);
                if (item) {
                    let itemName = item.Name;
                    const selectedOption = document.querySelector(`input[name="option-${itemID}"]:checked`);
                    if (selectedOption) itemName += ` (${selectedOption.value})`;
                    const specialRequest = document.querySelector(`.special-request-input[data-itemid="${itemID}"]`).value.trim();
                    if (specialRequest) itemName += ` [${specialRequest}]`;
                    orderDetails.push({ name: itemName, qty: qty, price: item.Price, total: item.Price * qty });
                    foodTotal += item.Price * qty;
                }
            }
        });
        return {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            address: document.getElementById('customer-address').value,
            orderDetailsRaw: orderDetails,
            orderDetails: orderDetails.map(item => `${item.name} (x${item.qty})`).join(', '),
            totalPrice: foodTotal,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
        };
    }
    
    // --- Event Listeners ---
    getLocationBtn.addEventListener('click', () => {
        locationStatus.textContent = "กำลังค้นหาตำแหน่ง...";
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
                    locationStatus.textContent = "✅ ได้รับตำแหน่งแล้ว!";
                },
                () => { locationStatus.textContent = "⚠️ ไม่สามารถเข้าถึงตำแหน่งได้"; }
            );
        } else {
            locationStatus.textContent = "เบราว์เซอร์ไม่รองรับฟังก์ชันนี้";
        }
    });

    reviewOrderBtn.addEventListener('click', async () => {
        if (!userLocation) {
            alert("กรุณากด 'ขอตำแหน่งปัจจุบัน' ก่อนครับ"); return;
        }
        if (!form.checkValidity()) {
            form.reportValidity(); return;
        }
        currentOrderData = collectOrderData();
        if (currentOrderData.orderDetailsRaw.length === 0) {
            alert("กรุณาเลือกอาหารอย่างน้อย 1 รายการ"); return;
        }
        
        summaryModal.classList.add('active');
        modalSpinner.style.display = 'block';
        document.getElementById('cost-summary').style.display = 'none';
        confirmOrderBtn.style.display = 'none';

        customerSummary.innerHTML = `<div><strong>ชื่อ:</strong> ${currentOrderData.name}</div><div><strong>โทร:</strong> ${currentOrderData.phone}</div><div><strong>ที่อยู่:</strong> ${currentOrderData.address}</div>`;
        orderSummaryList.innerHTML = currentOrderData.orderDetailsRaw.map(item => `<div class="item-line"><span>- ${item.name} (x${item.qty})</span> <span>${item.total} บ.</span></div>`).join('');

        try {
            // **อัปเกรด:** เปลี่ยนเป็น "ส่งจดหมายถาม" (POST)
            const feeResponse = await fetch(WEB_APP_URL, {
                method: 'POST',
                // **สำคัญ:** ไม่ใช้ mode: 'no-cors' ที่นี่ เพราะเราต้องการอ่านคำตอบ
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'calculateFee',
                    lat: currentOrderData.latitude,
                    lng: currentOrderData.longitude
                })
            });
            if (!feeResponse.ok) throw new Error("Server error calculating fee.");
            const feeResult = await feeResponse.json();

            if (feeResult.status === 'success') {
                currentOrderData.deliveryFee = feeResult.fee;
                summaryDistance.textContent = `${feeResult.distance} กม.`;
                summaryDeliveryFee.textContent = `${feeResult.fee} บาท`;
                summaryFoodTotal.textContent = `${currentOrderData.totalPrice} บาท`;
                const grandTotal = currentOrderData.totalPrice + feeResult.fee;
                summaryGrandTotal.textContent = `${grandTotal} บาท`;
            } else {
                throw new Error(feeResult.message);
            }
        } catch(error) {
            alert(`เกิดข้อผิดพลาดในการคำนวณค่าส่ง: ${error.message}`);
            currentOrderData.deliveryFee = -1;
            summaryDeliveryFee.textContent = "คำนวณไม่ได้";
            summaryGrandTotal.textContent = "N/A";
        } finally {
            modalSpinner.style.display = 'none';
            document.getElementById('cost-summary').style.display = 'block';
            if (currentOrderData.deliveryFee !== -1) {
                confirmOrderBtn.style.display = 'block';
            }
        }
    });

    editOrderBtn.addEventListener('click', () => { summaryModal.classList.remove('active'); });
    
    closeThankYouBtn.addEventListener('click', () => { thankYouModal.classList.remove('active'); });

    confirmOrderBtn.addEventListener('click', () => {
        confirmOrderBtn.disabled = true;
        confirmOrderBtn.textContent = 'กำลังส่ง...';
        
        // **อัปเกรด:** เพิ่ม action: 'submitOrder' เพื่อความชัดเจน
        const finalOrderPayload = { ...currentOrderData, action: 'submitOrder' };

        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Use no-cors ONLY for the final submission
            body: JSON.stringify(finalOrderPayload)
        })
        .then(() => {
            summaryModal.classList.remove('active');
            thankYouModal.classList.add('active');
            form.reset();
            document.querySelectorAll('.quantity-display').forEach(d => d.textContent = '0');
            locationStatus.textContent = 'ยังไม่ได้ระบุตำแหน่ง';
            userLocation = null;
            updateTotals();
        })
        .catch(error => { alert(`เกิดข้อผิดพลาดในการส่งออเดอร์: ${error}`); })
        .finally(() => {
            confirmOrderBtn.disabled = false;
            confirmOrderBtn.textContent = 'ยืนยันการสั่งซื้อ';
        });
    });

    fetchMenu();
});

