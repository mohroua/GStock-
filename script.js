let products = [];
let sales = []; 
let cart = [];
let lastSale = null; // To store the last successful sale for undo

let productScanner = null;
let saleScanner = null;

let currentSortColumn = 'name';
let sortDirection = 'asc';

// Constants for stock status thresholds
const LOW_STOCK_THRESHOLD = 5;
const MEDIUM_STOCK_THRESHOLD = 20;

function showSection(id) {
  cancelSaleScanner();
  cancelProductScanner();
  hideExportMenus(); // Hide any open export menus
  closeModal(); // Close any open modals (all modals use the same class and close function)

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');

  if (id !== 'inventory') {
      document.getElementById('salesHistoryContainer').classList.remove('active');
      document.getElementById('inventoryDisplay').style.display = 'none';
  } else {
      document.getElementById('inventoryDisplay').style.display = 'block';
      showInventory();
  }
  if (id === 'sales') {
      updateSuggestions();
  }
  if (id === 'dashboard') {
      updateDashboard();
  }
   if (id === 'products') {
       updateProductCategoriesFilter(); // Update categories filter when entering products section
       updateProductTable(); // Refresh product table on entering products section
   }
}

function saveData() {
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("sales", JSON.stringify(sales));
  localStorage.setItem("darkMode", document.body.classList.contains('dark-mode'));
  localStorage.setItem("lastSale", JSON.stringify(lastSale)); // Save last sale
}

function loadData() {
  const p = localStorage.getItem("products");
  const s = localStorage.getItem("sales");
  const ls = localStorage.getItem("lastSale"); // Load last sale

  if (p) products = JSON.parse(p);
  if (s) {
    let loadedSales = JSON.parse(s);
    // Ensure legacy sales entries are converted to the new invoice format
    sales = loadedSales.map(saleEntry => {
        if (saleEntry.items && Array.isArray(saleEntry.items)) {
            // Already in new format, ensure price and total are correctly calculated
            saleEntry.items = saleEntry.items.map(item => {
                if (item.price === undefined || item.total === undefined) {
                    const productInfo = products.find(prod => prod.code === item.code || prod.name === item.name);
                    return {
                        ...item,
                        price: productInfo ? productInfo.price : 0,
                        total: item.qty * (productInfo ? productInfo.price : 0) // Recalculate total based on current product price if available
                    };
                }
                return item;
            });
            saleEntry.totalAmount = saleEntry.items.reduce((sum, item) => sum + item.total, 0);
            saleEntry.totalItems = saleEntry.items.reduce((sum, item) => sum + item.qty, 0);
            return saleEntry;
        } else {
            // Convert old single-item sale to new invoice format
            const productInfo = products.find(prod => prod.code === saleEntry.code || prod.name === saleEntry.name);
            const itemPrice = productInfo ? productInfo.price : (saleEntry.price || 0);
            const itemTotal = saleEntry.qty * itemPrice;

            return {
                invoiceId: generateInvoiceId(),
                date: saleEntry.date,
                totalAmount: itemTotal,
                totalItems: saleEntry.qty,
                items: [{
                    code: saleEntry.code || (productInfo ? productInfo.code : ''),
                    name: saleEntry.name,
                    qty: saleEntry.qty,
                    price: itemPrice,
                    total: itemTotal
                }]
            };
        }
    });
  }
  if (ls) lastSale = JSON.parse(ls); // Assign loaded last sale

  // Load dark mode preference
  const savedDarkMode = localStorage.getItem("darkMode");
  if (savedDarkMode === 'true') {
      document.body.classList.add('dark-mode');
      document.querySelector('.dark-mode-toggle').textContent = '🌙';
  } else {
      document.querySelector('.dark-mode-toggle').textContent = '☀️';
  }

  updateProductTable();
  updateProductCategoriesFilter(); // Ensure categories filter is populated on load
  updateDashboard(); // Ensure dashboard is updated on load
}

function generateBarcode() {
  const now = new Date();
  return 'P' + now.getFullYear().toString().slice(2)
    + (now.getMonth() + 1).toString().padStart(2, '0')
    + now.getDate().toString().padStart(2, '0')
    + now.getHours().toString().padStart(2, '0')
    + now.getMinutes().toString().padStart(2, '0')
    + now.getSeconds().toString().padStart(2, '0')
    + now.getMilliseconds().toString().padStart(3, '0');
}

function generateInvoiceId() {
    const now = new Date();
    const timestamp = now.getTime().toString();
    return 'INV-' + timestamp.slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

function addProduct() {
  let code = document.getElementById("productCode").value.trim();
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value.trim();
  const qty = parseInt(document.getElementById("productQty").value); // تم تصحيح ID هنا
  const price = parseFloat(document.getElementById("productPrice").value);
  const unitType = document.getElementById("unitType").value; // أضف هذا السطر لجلب نوع الوحدة

  if (!name || !category || isNaN(qty) || isNaN(price) || qty < 0 || price <= 0) {
    showNotification("يرجى إدخال جميع البيانات بشكل صحيح (الكمية يجب أن تكون 0 أو أكثر، والسعر أكبر من صفر).", "error");
    return;
  }
  if (!code) code = generateBarcode();

  const existingProductIndex = products.findIndex(p => p.code === code);

  if (existingProductIndex !== -1) {
      // Update existing product
      products[existingProductIndex].name = name;
      products[existingProductIndex].category = category;
      products[existingProductIndex].qty = qty;
      products[existingProductIndex].price = price;
      products[existingProductIndex].unitType = unitType; // أضف هذا لتحديث نوع الوحدة
      showNotification("✅ تم تحديث المنتج بنجاح.", "success");
  } else {
      // Add new product
      products.push({ code, name, category, qty, price, unitType }); // أضف unitType هنا
      showNotification("✅ تم إضافة المنتج بنجاح.", "success");
  }
  
  updateProductTable();
  saveData();
  document.getElementById("productCode").value = "";
  document.getElementById("productName").value = "";
  document.getElementById("productCategory").value = "";
  document.getElementById("productQty").value = "";
  document.getElementById("productPrice").value = "";
  document.getElementById("unitType").value = "قطعة"; // إعادة تعيين الوحدة الافتراضية
  updateSuggestions();
  updateProductCategoriesFilter(); // Update categories filter after adding/updating product
}

function updateProductTable() {
    const table = document.getElementById("productTable");
    table.innerHTML = "";
    
    const searchTerm = document.getElementById("productSearch").value.toLowerCase().trim();
    const categoryFilter = document.getElementById("productCategoryFilter").value.toLowerCase();

    let filteredProducts = [...products];

    // Apply search filter
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.code.toLowerCase().includes(searchTerm)
        );
    }

    // Apply category filter
    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(p => p.category.toLowerCase() === categoryFilter);
    }

    if (filteredProducts.length === 0) {
        table.innerHTML = `<tr><td colspan="7">لا توجد منتجات مطابقة.</td></tr>`;
        return;
    }

    filteredProducts.forEach((p) => {
        table.innerHTML += `<tr>
            <td>${p.code}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.qty} ${p.unitType ? p.unitType : ''}</td> <td>${p.price.toFixed(2)}</td>
            <td><svg id="barcode-${p.code}"></svg></td>
            <td>
                <button class="edit-btn" onclick="editProduct('${p.code}')">✏️</button>
                <button class="delete-btn" onclick="deleteProduct('${p.code}')">🗑️</button>
            </td>
        </tr>`;
        setTimeout(() => {
            try {
                JsBarcode(`#barcode-${p.code}`, p.code, { format: "CODE128", width: 1.8, height: 40, displayValue: false });
            } catch (e) {
                console.error("Error generating barcode for", p.code, ":", e);
                document.getElementById(`barcode-${p.code}`).innerHTML = `<span style="color:red; font-size: 0.8em;">خطأ بالباركود</span>`;
            }
        }, 50);
    });
}

function deleteProduct(code) {
  if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
    products = products.filter(p => p.code !== code);
    updateProductTable();
    saveData();
    showNotification("🗑️ تم حذف المنتج.", "info");
    updateSuggestions();
    updateProductCategoriesFilter();
    updateDashboard(); // Update dashboard after product deletion
  }
}

function editProduct(code) {
    const product = products.find(p => p.code === code);
    if (!product) {
        showNotification("المنتج غير موجود.", "error");
        return;
    }

    document.getElementById("editProductOriginalCode").value = product.code;
    document.getElementById("editProductCode").value = product.code;
    document.getElementById("editProductName").value = product.name;
    document.getElementById("editProductCategory").value = product.category;
    document.getElementById("editProductQty").value = product.qty;
    document.getElementById("editProductPrice").value = product.price;
    // إذا كان لديك حقل لـ unitType في نموذج التعديل، قم بتعبئته أيضاً
    // document.getElementById("editUnitType").value = product.unitType || 'قطعة'; 

    document.getElementById("editProductModal").style.display = "flex";
}

function saveEditedProduct() {
    const originalCode = document.getElementById("editProductOriginalCode").value;
    const newName = document.getElementById("editProductName").value.trim();
    const newCategory = document.getElementById("editProductCategory").value.trim();
    const newQty = parseInt(document.getElementById("editProductQty").value);
    const newPrice = parseFloat(document.getElementById("editProductPrice").value);
    // إذا كان لديك حقل لـ unitType في نموذج التعديل، قم بجلبه أيضاً
    // const newUnitType = document.getElementById("editUnitType").value;

    if (!newName || !newCategory || isNaN(newQty) || isNaN(newPrice) || newQty < 0 || newPrice <= 0) {
        showNotification("يرجى إدخال جميع البيانات بشكل صحيح (الكمية يجب أن تكون 0 أو أكثر، والسعر أكبر من صفر).", "error");
        return;
    }

    const productIndex = products.findIndex(p => p.code === originalCode);
    if (productIndex !== -1) {
        products[productIndex].name = newName;
        products[productIndex].category = newCategory;
        products[productIndex].qty = newQty;
        products[productIndex].price = newPrice;
        // products[productIndex].unitType = newUnitType; // أضف هذا لتحديث نوع الوحدة
        saveData();
        updateProductTable();
        updateSuggestions();
        updateProductCategoriesFilter();
        updateDashboard();
        showNotification("✅ تم حفظ تعديلات المنتج بنجاح.", "success");
        closeModal();
    } else {
        showNotification("حدث خطأ: لم يتم العثور على المنتج الأصلي للتعديل.", "error");
    }
}

function addQuantityToProduct() {
    const productCode = document.getElementById("addStockProductCode").value.trim();
    const quantityToAdd = parseInt(document.getElementById("addStockQuantity").value);

    if (!productCode || isNaN(quantityToAdd) || quantityToAdd <= 0) {
        showNotification("يرجى إدخال كود المنتج والكمية المراد إضافتها بشكل صحيح.", "error");
        return;
    }

    const product = products.find(p => p.code === productCode);

    if (product) {
        product.qty += quantityToAdd;
        saveData();
        updateProductTable();
        updateDashboard(); // Update dashboard after stock addition
        showNotification(`✅ تم إضافة ${quantityToAdd} إلى مخزون ${product.name}. الكمية الجديدة: ${product.qty}`, "success");
        document.getElementById("addStockProductCode").value = "";
        document.getElementById("addStockQuantity").value = "";
    } else {
        showNotification("المنتج غير موجود في المخزون بهذا الكود.", "error");
    }
}


function addToCart(codeOverride = null) {
      const input = codeOverride || document.getElementById("saleCode").value.trim();
      const qty = parseInt(document.getElementById("saleQuantity").value) || 1; // استخدام saleQuantity هنا
      
      if (!input) {
        alert("يرجى إدخال كود أو اسم المنتج.");
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        alert("الكمية المدخلة غير صالحة.");
        return;
      }

      let product = products.find(p => p.code === input);
      if (!product) product = products.find(p => p.name === input);

      if (!product) {
        alert("المنتج غير موجود في المخزون.");
        return;
      }
      if (product.qty < qty) {
        alert(`الكمية المتوفرة من ${product.name} هي ${product.qty} فقط.`);
        return;
      }

      const existingCartItem = cart.find(item => item.code === product.code);
      if (existingCartItem) {
        if (product.qty < (existingCartItem.qty + qty)) {
             alert(`الكمية المتوفرة من ${product.name} هي ${product.qty}، ولا يمكن إضافة المزيد.`);
             return;
        }
        existingCartItem.qty += qty;
        existingCartItem.total = existingCartItem.qty * existingCartItem.price;
      } else {
        cart.push({ code: product.code, name: product.name, qty, price: product.price, total: qty * product.price, unitType: product.unitType || '' }); // أضف unitType للسلة
      }
      
      updateCart();
      document.getElementById("saleCode").value = "";
      document.getElementById("saleQuantity").value = "1"; // استخدام saleQuantity هنا
      updateSuggestions();
    }


function updateCart() {
  const table = document.getElementById("cartTable");
  const totalSpan = document.getElementById("cartTotal");
  table.innerHTML = "";
  let total = 0;
  if (cart.length === 0) {
      table.innerHTML = `<tr><td colspan="5">السلة فارغة.</td></tr>`;
  } else {
      cart.forEach((item, i) => {
        table.innerHTML += `<tr><td>${item.name}</td><td>${item.qty} ${item.unitType ? item.unitType : ''}</td><td>${item.price.toFixed(2)}</td><td>${item.total.toFixed(2)}</td><td><button class="delete-btn" onclick="removeFromCart(${i})">🗑️</button></td></tr>`;
        total += item.total;
      });
  }
  totalSpan.textContent = total.toFixed(2);
}

function removeFromCart(i) {
  if (confirm("هل أنت متأكد من حذف هذا العنصر من السلة؟")) {
    cart.splice(i, 1);
    updateCart();
    showNotification("🗑️ تم إزالة المنتج من السلة.", "info");
  }
}
    
function confirmSale() {
    if (cart.length === 0) {
        showNotification("السلة فارغة. يرجى إضافة منتجات للبيع.", "error");
        return;
    }

    const modal = document.getElementById("confirmSaleModal");
    const modalCartTotal = document.getElementById("modalCartTotal");
    const modalCartItems = document.getElementById("modalCartItems");

    modalCartTotal.textContent = document.getElementById("cartTotal").textContent;
    modalCartItems.innerHTML = "";

    cart.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.name} (x${item.qty} ${item.unitType ? item.unitType : ''})</span><span>${item.total.toFixed(2)} دج</span>`;
        modalCartItems.appendChild(li);
    });

    modal.style.display = "flex"; // Show modal
}

function executeSale() {
    const saleTimestamp = new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
    const invoiceId = generateInvoiceId();
    let totalInvoiceAmount = 0;
    let totalInvoiceItems = 0;

    const soldItems = cart.map(item => {
        const p = products.find(p => p.code === item.code);
        if (p) {
            p.qty -= item.qty; // Deduct from inventory
            if (p.qty <= LOW_STOCK_THRESHOLD && p.qty > 0) {
                showNotification(`⚠️ كمية ${p.name} أصبحت منخفضة جداً (${p.qty}).`, "info");
            } else if (p.qty <= 0) {
                 showNotification(`⛔ مخزون ${p.name} نفذ!`, "error");
            }
        }
        totalInvoiceAmount += item.total;
        totalInvoiceItems += item.qty;
        return {
            code: item.code,
            name: item.name,
            qty: item.qty,
            price: item.price,
            total: item.total,
            unitType: item.unitType || '' // تضمين نوع الوحدة في الفاتورة
        };
    });

    const newSaleEntry = { 
        invoiceId: invoiceId,
        date: saleTimestamp,
        totalAmount: totalInvoiceAmount,
        totalItems: totalInvoiceItems,
        items: soldItems
    };
    sales.push(newSaleEntry);
    lastSale = newSaleEntry; // Store this sale as the last sale for potential undo

    cart = [];
    updateCart();
    updateProductTable(); // Refresh product table to show new quantities
    saveData();
    showNotification("✅ تم تسجيل البيع بنجاح!", "success");
    closeModal(); // Close modal after successful sale
    updateDashboard(); // Update dashboard after sale
    showInvoicePrintModal(newSaleEntry); // Show print modal after sale
}

function undoLastSale() {
    if (!lastSale) {
        showNotification("لا توجد عملية بيع سابقة للتراجع عنها.", "info");
        return;
    }

    if (!confirm("هل أنت متأكد من التراجع عن آخر عملية بيع؟ سيتم إعادة المنتجات إلى المخزون.")) {
        return;
    }

    // Add items back to inventory
    lastSale.items.forEach(item => {
        const product = products.find(p => p.code === item.code);
        if (product) {
            product.qty += item.qty;
        }
    });

    // Remove the last sale from sales history
    sales = sales.filter(sale => sale.invoiceId !== lastSale.invoiceId);

    // Clear lastSale variable
    lastSale = null;

    saveData();
    updateProductTable();
    updateDashboard();
    showSalesHistory(); // Refresh sales history
    showNotification("↩️ تم التراجع عن آخر عملية بيع بنجاح.", "info");
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
}

function showInvoicePrintModal(invoice) {
    const printModal = document.getElementById("invoicePrintModal");
    document.getElementById("printInvoiceId").textContent = invoice.invoiceId;
    document.getElementById("printInvoiceDate").textContent = invoice.date;
    document.getElementById("printInvoiceTotal").textContent = invoice.totalAmount.toFixed(2);

    const printItemsBody = document.getElementById("printInvoiceItems");
    printItemsBody.innerHTML = "";
    invoice.items.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.name}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.qty} ${item.unitType ? item.unitType : ''}</td> <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.total.toFixed(2)}</td>
        `;
        printItemsBody.appendChild(row);
    });

    printModal.style.display = "flex";
}

function printInvoice() {
    const printContent = document.getElementById("invoiceContent");
    const originalDisplay = printContent.style.display;
    const originalPosition = printContent.style.position;
    const originalLeft = printContent.style.left;
    const originalTop = printContent.style.top;
    
    // Temporarily make content visible and position it for printing
    printContent.style.display = 'block';
    printContent.style.position = 'absolute';
    printContent.style.left = '0';
    printContent.style.top = '0';

    window.print();

    // Restore original styles
    printContent.style.display = originalDisplay;
    printContent.style.position = originalPosition;
    printContent.style.left = originalLeft;
    printContent.style.top = originalTop;
}


function showInventory() {
  const inventoryTableBody = document.getElementById("inventoryTableBody");
  const totalInventoryValueSpan = document.getElementById("totalInventoryValue");
  const searchTerm = document.getElementById("inventorySearch").value.toLowerCase().trim();
  const categoryFilter = document.getElementById("inventoryCategoryFilter").value.toLowerCase();


  inventoryTableBody.innerHTML = "";
  let totalValue = 0;

  let displayedProducts = [...products];

  // Apply search filter
  if (searchTerm) {
      displayedProducts = displayedProducts.filter(p => 
          p.name.toLowerCase().includes(searchTerm) || 
          p.code.toLowerCase().includes(searchTerm)
      );
  }

  // Apply category filter
  if (categoryFilter) {
      displayedProducts = displayedProducts.filter(p => p.category.toLowerCase() === categoryFilter);
  }

  // Sorting logic
  displayedProducts.sort((a, b) => {
      let valA, valB;
      if (currentSortColumn === 'name' || currentSortColumn === 'code' || currentSortColumn === 'category') {
          valA = a[currentSortColumn].toLowerCase();
          valB = b[currentSortColumn].toLowerCase();
      } else if (currentSortColumn === 'qty' || currentSortColumn === 'price') {
          valA = a[currentSortColumn];
          valB = b[currentSortColumn];
      } else if (currentSortColumn === 'total-value') {
          valA = a.qty * a.price;
          valB = b.qty * b.price;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
  });

  // Update sort icons
  document.querySelectorAll('#inventoryTable thead th span').forEach(span => span.textContent = '');
  const currentSortIcon = document.getElementById(`sort-${currentSortColumn}`);
  if (currentSortIcon) {
      currentSortIcon.textContent = sortDirection === 'asc' ? '▲' : '▼';
  }

  if (displayedProducts.length === 0) {
    inventoryTableBody.innerHTML = `<tr><td colspan="7">لا توجد منتجات مطابقة في المخزون.</td></tr>`;
  } else {
    displayedProducts.forEach(p => {
      const itemTotalValue = p.qty * p.price;
      totalValue += itemTotalValue;

      let stockClass = '';
      let stockWidth = 0;
      let stockLabel = '';

      if (p.qty <= 0) {
        stockClass = 'low';
        stockWidth = '0%';
        stockLabel = 'نفذ المخزون';
      } else if (p.qty <= LOW_STOCK_THRESHOLD) {
        stockClass = 'low';
        stockWidth = ((p.qty / LOW_STOCK_THRESHOLD) * 100) + '%';
        if (p.qty > 0 && stockWidth === '0%') stockWidth = '10%'; // Ensure some visibility for >0 but very low
        stockLabel = 'كمية منخفضة';
      } else if (p.qty <= MEDIUM_STOCK_THRESHOLD) { 
        stockClass = 'medium';
        // Calculate relative width within the medium range, ensuring it starts from the low threshold
        stockWidth = ((p.qty - LOW_STOCK_THRESHOLD) / (MEDIUM_STOCK_THRESHOLD - LOW_STOCK_THRESHOLD) * 100) + '%';
        // Adjust for edge cases: if qty is very close to LOW_STOCK_THRESHOLD, ensure min width
        if (stockWidth === '0%' && p.qty > LOW_STOCK_THRESHOLD) stockWidth = '10%';
        stockLabel = 'كمية متوسطة';
      }
      else {
        stockClass = 'full';
        stockWidth = '100%';
        stockLabel = 'كمية كافية';
      }
      
      inventoryTableBody.innerHTML += `
        <tr>
            <td>${p.code}</td>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td>${p.qty} ${p.unitType ? p.unitType : ''}</td> <td>${p.price.toFixed(2)} دج</td>
            <td>${itemTotalValue.toFixed(2)} دج</td>
            <td>
                <div class="stock-status-bar" title="${stockLabel}">
                    <div class="stock-fill ${stockClass}" style="width: ${stockWidth};"></div>
                </div>
                <span>${stockLabel}</span>
            </td>
        </tr>
      `;
    });
  }
  totalInventoryValueSpan.textContent = totalValue.toFixed(2);
}

function sortInventory(column) {
    if (currentSortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        sortDirection = 'asc';
    }
    showInventory(); // Re-render with new sort order
}


function showSalesHistory(startDate = null, endDate = null) {
    const salesHistoryBody = document.getElementById("salesHistoryBody");
    const totalSalesAmountSpan = document.getElementById("totalSalesAmount");
    const salesHistoryContainer = document.getElementById("salesHistoryContainer");

    salesHistoryBody.innerHTML = "";
    let totalOverallSales = 0;

    let filteredSales = [...sales];

    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of the day

        filteredSales = filteredSales.filter(invoice => {
            const invoiceDate = new Date(invoice.date);
            return invoiceDate >= start && invoiceDate <= end;
        });
    }
    
    if (filteredSales.length === 0) {
        salesHistoryBody.innerHTML = `<tr><td colspan="5">لا توجد فواتير مطابقة للفلاتر المحددة.</td></tr>`;
    } else {
        // Sort sales by date, newest first
        const sortedInvoices = filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedInvoices.forEach((invoice, index) => {
            const rowId = `invoice-row-${index}`;
            salesHistoryBody.innerHTML += `
                <tr class="invoice-row" onclick="toggleInvoiceDetails('${rowId}', ${index})">
                    <td>${invoice.invoiceId}</td>
                    <td>${invoice.totalItems}</td>
                    <td>${invoice.totalAmount.toFixed(2)}</td>
                    <td>${invoice.date}</td>
                    <td><button class="print-btn" onclick="event.stopPropagation(); showInvoicePrintModal(${JSON.stringify(invoice).replace(/"/g, '&quot;')})">🖨️</button><span id="toggle-icon-${index}">&#x25BC;</span></td>
                </tr>
                <tr id="${rowId}" class="invoice-details-row">
                    <td colspan="5">
                        <table>
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>الكمية</th>
                                    <th>السعر (للواحدة)</th>
                                    <th>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoice.items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.qty} ${item.unitType ? item.unitType : ''}</td> <td>${item.price.toFixed(2)}</td>
                                        <td>${item.total.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </td>
                </tr>
            `;
            totalOverallSales += invoice.totalAmount;
        });
    }
    totalSalesAmountSpan.textContent = totalOverallSales.toFixed(2);
    salesHistoryContainer.classList.add('active'); // Ensure the container is visible
}

function toggleInvoiceDetails(rowId, index) {
    const detailsRow = document.getElementById(rowId);
    const toggleIcon = document.getElementById(`toggle-icon-${index}`);
    if (detailsRow.style.display === "none" || detailsRow.style.display === "") {
        detailsRow.style.display = "table-row";
        toggleIcon.innerHTML = "&#x25B2;"; // Up arrow
    } else {
        detailsRow.style.display = "none";
        toggleIcon.innerHTML = "&#x25BC;"; // Down arrow
    }
}

function applyDateFilter() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!startDate || !endDate) {
        showNotification("يرجى تحديد تاريخي البدء والانتهاء للتصفية.", "error");
        return;
    }
    if (new Date(startDate) > new Date(endDate)) {
        showNotification("تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء.", "error");
        return;
    }
    showSalesHistory(startDate, endDate);
}

function resetSalesFilters() {
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    showSalesHistory(); // Show all sales
}

function updateSuggestions() {
    const inputElement = document.getElementById("saleCode");
    const dataList = document.getElementById("productSuggestions");
    const searchTerm = inputElement.value.toLowerCase().trim();

    dataList.innerHTML = "";

    let filteredProducts = [];
    if (searchTerm === "") {
        filteredProducts = products.slice(0, 20); 
    } else {
        filteredProducts = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.code.toLowerCase().includes(searchTerm)
        );
    }

    filteredProducts.forEach(p => {
        const option = document.createElement("option");
        option.value = p.name; 
        option.textContent = `${p.name} (كود: ${p.code}) - متوفر: ${p.qty} ${p.unitType ? p.unitType : ''}`; // عرض نوع الوحدة في الاقتراحات
        dataList.appendChild(option);
    });
}

// Initialize HTML5-QRCode scanners
function startSaleScanner() {
  if (saleScanner && saleScanner.isScanning) {
    console.warn("ماسح المبيعات يعمل بالفعل.");
    return;
  }
  saleScanner = new Html5Qrcode("reader");
  document.getElementById("reader").style.display = "block";
  document.getElementById("scanBtn").style.display = "none";
  document.getElementById("cancelScanBtn").style.display = "inline-block";

  saleScanner.start(
    { facingMode: "environment" }, 
    { fps: 10, qrbox: 250 }, 
    (decodedText, decodedResult) => {
      document.getElementById("saleCode").value = decodedText;
      addToCart(decodedText); 
      cancelSaleScanner(); 
    },
    (errorMessage) => {
      // console.log(`No barcode found: ${errorMessage}`);
    }
  ).catch((err) => {
    showNotification("تعذر تشغيل الكاميرا للمبيعات. يرجى التأكد من السماح بالوصول إليها وإعادة المحاولة.", "error");
    cancelSaleScanner();
  });
}

function cancelSaleScanner() {
  if (saleScanner && saleScanner.isScanning) {
    saleScanner.stop().then(() => {
      saleScanner.clear();
      document.getElementById("reader").style.display = "none";
      document.getElementById("scanBtn").style.display = "inline-block";
      document.getElementById("cancelScanBtn").style.display = "none";
    }).catch((err) => {
      console.error("خطأ في إيقاف ماسح المبيعات:", err);
      document.getElementById("reader").style.display = "none";
      document.getElementById("scanBtn").style.display = "inline-block";
      document.getElementById("cancelScanBtn").style.display = "none";
    });
  } else {
      document.getElementById("reader").style.display = "none";
      document.getElementById("scanBtn").style.display = "inline-block";
      document.getElementById("cancelScanBtn").style.display = "none";
  }
}

function startProductScanner() {
  if (productScanner && productScanner.isScanning) {
    console.warn("ماسح المنتجات يعمل بالفعل.");
    return;
  }
  productScanner = new Html5Qrcode("productReader");
  document.getElementById("productReader").style.display = "block";

  productScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => {
      document.getElementById("productCode").value = decodedText;
      cancelProductScanner();
      // Attempt to pre-fill if product exists
      const existingProduct = products.find(p => p.code === decodedText);
      if (existingProduct) {
          document.getElementById("productName").value = existingProduct.name;
          document.getElementById("productCategory").value = existingProduct.category;
          document.getElementById("productQty").value = existingProduct.qty; // تم تصحيح ID هنا
          document.getElementById("productPrice").value = existingProduct.price;
          document.getElementById("unitType").value = existingProduct.unitType || 'قطعة'; // تعبئة نوع الوحدة
          showNotification(`تم تحميل بيانات المنتج: ${existingProduct.name}`, "info");
      } else {
          document.getElementById("productName").value = "";
          document.getElementById("productCategory").value = "";
          document.getElementById("productQty").value = ""; // تم تصحيح ID هنا
          document.getElementById("productPrice").value = "";
          document.getElementById("unitType").value = "قطعة"; // إعادة تعيين نوع الوحدة الافتراضي
          showNotification("كود جديد. يرجى إدخال تفاصيل المنتج.", "info");
      }
    },
    (errorMessage) => {
      // console.log(`No product barcode found: ${errorMessage}`);
    }
  ).catch((err) => {
    showNotification("تعذر تشغيل الكاميرا للمنتجات. يرجى التأكد من السماح بالوصول إليها وإعادة المحاولة.", "error");
    cancelProductScanner();
  });
}

function cancelProductScanner() {
  if (productScanner && productScanner.isScanning) {
    productScanner.stop().then(() => {
      productScanner.clear();
      document.getElementById("productReader").style.display = "none";
    }).catch((err) => {
      console.error("خطأ في إيقاف ماسح المنتجات:", err);
      document.getElementById("productReader").style.display = "none";
    });
  } else {
      document.getElementById("productReader").style.display = "none";
  }
}

async function exportSalesHistory(format) {
    const salesHistoryBody = document.getElementById("salesHistoryBody");

    // Temporarily show all sales to capture all data for export, then revert
    const originalSalesHtml = salesHistoryBody.innerHTML;
    const originalTotalSalesAmount = document.getElementById("totalSalesAmount").textContent;
    const currentStartDate = document.getElementById("startDate").value;
    const currentEndDate = document.getElementById("endDate").value;
    
    // Render all sales without filters for export
    showSalesHistory(); 

    if (!salesHistoryBody || salesHistoryBody.children.length === 0 || (salesHistoryBody.children.length === 1 && salesHistoryBody.children[0].textContent.includes('لا توجد فواتير'))) {
        showNotification("لا توجد فواتير لعرضها أو تصديرها.", "error");
        // Revert filters
        document.getElementById("startDate").value = currentStartDate;
        document.getElementById("endDate").value = currentEndDate;
        showSalesHistory(currentStartDate, currentEndDate);
        return;
    }

    const exportContent = document.createElement('div');
    exportContent.style.direction = 'rtl';
    exportContent.style.padding = '20px';
    exportContent.style.backgroundColor = 'white';
    exportContent.style.width = '800px';
    exportContent.style.margin = 'auto';
    exportContent.style.position = 'absolute';
    exportContent.style.left = '-9999px';
    exportContent.style.boxSizing = 'border-box';

    exportContent.innerHTML += '<h2 style="text-align: center; color: #333;">سجل المبيعات</h2>';
    exportContent.innerHTML += `<p style="text-align: center; font-size: 1.1em; color: #555;">إجمالي المبيعات الكلي: <span style="font-weight: bold;">${document.getElementById('totalSalesAmount').textContent} دج</span></p>`;
    exportContent.innerHTML += `<p style="text-align: center; font-size: 0.9em; color: #777;">تاريخ التصدير: ${new Date().toLocaleString()}</p><hr>`;

    const exportTable = document.createElement('table');
    exportTable.style.width = '100%';
    exportTable.style.borderCollapse = 'collapse';
    exportTable.style.marginTop = '20px';
    exportTable.style.direction = 'rtl';
    exportTable.style.fontFamily = 'Arial, sans-serif';
    
    exportTable.innerHTML = `
        <thead>
            <tr style="background-color: #ff7300; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">رقم الفاتورة</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">عدد المنتجات</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">إجمالي الفاتورة</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">التاريخ والوقت</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const currentRows = Array.from(salesHistoryBody.children);
    currentRows.forEach((row, index) => {
        if (row.classList.contains('invoice-row')) {
            const newRow = document.createElement('tr');
            newRow.style.backgroundColor = '#f9f9f9';
            newRow.style.fontWeight = 'bold';
            newRow.style.borderBottom = '1px solid #ccc';

            newRow.innerHTML = `
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[0].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[1].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[2].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[3].textContent}</td>
            `;
            exportTable.querySelector('tbody').appendChild(newRow);

            const detailsRowElement = currentRows[index + 1];
            // Check if the next row is indeed a details row for the current invoice
            if (detailsRowElement && detailsRowElement.classList.contains('invoice-details-row')) {
                const detailsRow = document.createElement('tr');
                detailsRow.innerHTML = `
                    <td colspan="4" style="padding: 5px 15px; text-align: right; font-size: 0.9em;">
                        <table style="width: 95%; margin: 5px auto; border: 1px solid #eee; background-color: #fff;">
                            <thead>
                                <tr style="background-color: #ffe0b2; color: #333;">
                                    <th style="padding: 5px; border: 1px solid #eee; text-align: right;">المنتج</th>
                                    <th style="padding: 5px; border: 1px solid #eee; text-align: right;">الكمية</th>
                                    <th style="padding: 5px; border: 1px solid #eee; text-align: right;">السعر (للواحدة)</th>
                                    <th style="padding: 5px; border: 1px solid #eee; text-align: right;">الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detailsRowElement.querySelector('tbody').innerHTML}
                            </tbody>
                        </table>
                    </td>
                `;
                exportTable.querySelector('tbody').appendChild(detailsRow);
            }
        }
    });

    exportContent.appendChild(exportTable);
    document.body.appendChild(exportContent);

    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4', true);
        
        const margin = 20; 
        try {
            const canvas = await html2canvas(exportContent, { scale: 3, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            
            let imgWidth = doc.internal.pageSize.width - 2 * margin;
            let imgHeight = (canvas.height * imgWidth) / canvas.width;
            let pageHeight = doc.internal.pageSize.height;

            let position = margin; 

            if (imgHeight > pageHeight - 2 * margin) {
                let pageCount = Math.ceil(imgHeight / (pageHeight - 2 * margin));
                for (let i = 0; i < pageCount; i++) {
                    if (i > 0) {
                        doc.addPage();
                    }
                    const sY = i * ((pageHeight - 2 * margin) / (imgHeight / canvas.height));
                    const sHeight = Math.min(canvas.height - sY, (pageHeight - 2 * margin) / (imgHeight / canvas.height));
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = sHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(canvas, 0, sY, canvas.width, sHeight, 0, 0, tempCanvas.width, tempCanvas.height);
                    
                    const tempImgData = tempCanvas.toDataURL('image/png');
                    doc.addImage(tempImgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight - (i * (pageHeight - 2 * margin)), pageHeight - 2 * margin));
                }
            } else {
                doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            }
            
            doc.save('سجل-المبيعات.pdf');
            showNotification("✅ تم تصدير سجل المبيعات كملف PDF.", "success");
        } catch (error) {
            console.error("خطأ في تصدير PDF:", error);
            showNotification("حدث خطأ أثناء تصدير PDF. يرجى المحاولة مرة أخرى.", "error");
        } finally {
            document.body.removeChild(exportContent);
            // Revert filters after export
            document.getElementById("startDate").value = currentStartDate;
            document.getElementById("endDate").value = currentEndDate;
            showSalesHistory(currentStartDate, currentEndDate);
        }
    } else if (format === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        const mainHeaders = ["رقم الفاتورة", "عدد المنتجات", "إجمالي الفاتورة", "التاريخ والوقت"];
        csvContent += mainHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

        currentRows.forEach((row, index) => {
            if (row.classList.contains('invoice-row')) {
                const invoiceId = `"${row.cells[0].textContent.replace(/"/g, '""')}"`;
                const totalItems = `"${row.cells[1].textContent.replace(/"/g, '""')}"`;
                const totalAmount = `"${row.cells[2].textContent.replace(/"/g, '""')}"`;
                const dateTime = `"${row.cells[3].textContent.replace(/"/g, '""')}"`;
                
                csvContent += `${invoiceId},${totalItems},${totalAmount},${dateTime}\n`;

                const detailsTableBody = currentRows[index + 1] ? currentRows[index + 1].querySelector('tbody') : null;
                if (detailsTableBody) {
                    const itemHeaders = ["", "", "المنتج", "الكمية", "السعر (للواحدة)", "الإجمالي"];
                    csvContent += itemHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
                    Array.from(detailsTableBody.children).forEach(itemRow => {
                        const productName = `"${itemRow.cells[0].textContent.replace(/"/g, '""')}"`;
                        const itemQty = `"${itemRow.cells[1].textContent.replace(/"/g, '""')}"`;
                        const itemPrice = `"${itemRow.cells[2].textContent.replace(/"/g, '""')}"`;
                        const itemTotal = `"${itemRow.cells[3].textContent.replace(/"/g, '""')}"`;
                        csvContent += `,,,${productName},${itemQty},${itemPrice},${itemTotal}\n`;
                    });
                }
            }
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "سجل-المبيعات.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("✅ تم تصدير سجل المبيعات كملف CSV.", "success");
        // Revert filters after export
        document.getElementById("startDate").value = currentStartDate;
        document.getElementById("endDate").value = currentEndDate;
        showSalesHistory(currentStartDate, currentEndDate);
    }

    document.body.removeChild(exportContent);
}


async function exportInventory(format) {
    const inventoryTableBody = document.getElementById("inventoryTableBody");
    const totalInventoryValueSpan = document.getElementById("totalInventoryValue");

    // Temporarily show all inventory without filters for export
    const originalSearchTerm = document.getElementById("inventorySearch").value;
    const originalCategoryFilter = document.getElementById("inventoryCategoryFilter").value;
    
    document.getElementById("inventorySearch").value = "";
    document.getElementById("inventoryCategoryFilter").value = "";
    showInventory(); // Re-render with no filters

    if (!inventoryTableBody || inventoryTableBody.children.length === 0 || (inventoryTableBody.children.length === 1 && inventoryTableBody.children[0].textContent.includes('لا توجد منتجات'))) {
        showNotification("لا توجد بيانات مخزون لعرضها أو تصديرها.", "error");
        // Revert filters
        document.getElementById("inventorySearch").value = originalSearchTerm;
        document.getElementById("inventoryCategoryFilter").value = originalCategoryFilter;
        showInventory();
        return;
    }

    const exportContent = document.createElement('div');
    exportContent.style.direction = 'rtl';
    exportContent.style.padding = '20px';
    exportContent.style.backgroundColor = 'white';
    exportContent.style.width = '800px';
    exportContent.style.margin = 'auto';
    exportContent.style.position = 'absolute';
    exportContent.style.left = '-9999px';
    exportContent.style.boxSizing = 'border-box';

    exportContent.innerHTML += '<h2 style="text-align: center; color: #333;">تقرير المخزون الحالي</h2>';
    exportContent.innerHTML += `<p style="text-align: center; font-size: 1.1em; color: #555;">إجمالي قيمة المخزون الكلية: <span style="font-weight: bold;">${totalInventoryValueSpan.textContent} دج</span></p>`;
    exportContent.innerHTML += `<p style="text-align: center; font-size: 0.9em; color: #777;">تاريخ التصدير: ${new Date().toLocaleString()}</p><hr>`;

    const exportTable = document.createElement('table');
    exportTable.style.width = '100%';
    exportTable.style.borderCollapse = 'collapse';
    exportTable.style.marginTop = '20px';
    exportTable.style.direction = 'rtl';
    exportTable.style.fontFamily = 'Arial, sans-serif';
    
    exportTable.innerHTML = `
        <thead>
            <tr style="background-color: #ff7300; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">كود المنتج</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">اسم المنتج</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">الفئة</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">الكمية المتوفرة</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">سعر البيع</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">إجمالي قيمة المخزون</th>
                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">حالة المخزون</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const currentRows = Array.from(inventoryTableBody.children);
    currentRows.forEach(row => {
        if (row.tagName === 'TR' && !row.querySelector('td[colspan="7"]')) { // Skip "No products" row
            const newRow = document.createElement('tr');
            newRow.style.backgroundColor = '#f9f9f9';
            newRow.style.borderBottom = '1px solid #ccc';

            newRow.innerHTML = `
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[0].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[1].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[2].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[3].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[4].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[5].textContent}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${row.cells[6].querySelector('span').textContent}</td>
            `;
            exportTable.querySelector('tbody').appendChild(newRow);
        }
    });

    exportContent.appendChild(exportTable);
    document.body.appendChild(exportContent);

    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4', true);
        const margin = 20;

        try {
            const canvas = await html2canvas(exportContent, { scale: 3, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            let imgWidth = doc.internal.pageSize.width - 2 * margin;
            let imgHeight = (canvas.height * imgWidth) / canvas.width;
            let pageHeight = doc.internal.pageSize.height;

            let position = margin;
            let currentImgHeight = imgHeight;

            if (currentImgHeight > pageHeight - 2 * margin) {
                let pageCount = Math.ceil(currentImgHeight / (pageHeight - 2 * margin));
                for (let i = 0; i < pageCount; i++) {
                    if (i > 0) {
                        doc.addPage();
                    }
                    const sY = i * ((pageHeight - 2 * margin) / (imgHeight / canvas.height));
                    const sHeight = Math.min(canvas.height - sY, (pageHeight - 2 * margin) / (imgHeight / canvas.height));
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = sHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(canvas, 0, sY, canvas.width, sHeight, 0, 0, tempCanvas.width, tempCanvas.height);
                    
                    const tempImgData = tempCanvas.toDataURL('image/png');
                    doc.addImage(tempImgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight - (i * (pageHeight - 2 * margin)), pageHeight - 2 * margin));
                }
            } else {
                doc.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            }

            doc.save('تقرير-المخزون.pdf');
            showNotification("✅ تم تصدير تقرير المخزون كملف PDF.", "success");
        } catch (error) {
            console.error("خطأ في تصدير PDF:", error);
            showNotification("حدث خطأ أثناء تصدير PDF. يرجى المحاولة مرة أخرى.", "error");
        } finally {
            document.body.removeChild(exportContent);
            // Revert filters after export
            document.getElementById("inventorySearch").value = originalSearchTerm;
            document.getElementById("inventoryCategoryFilter").value = originalCategoryFilter;
            showInventory();
        }
    } else if (format === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        const headers = ["كود المنتج", "اسم المنتج", "الفئة", "الكمية المتوفرة", "سعر البيع", "إجمالي قيمة المخزون", "حالة المخزون"];
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

        currentRows.forEach(row => {
            if (row.tagName === 'TR' && !row.querySelector('td[colspan="7"]')) {
                const code = `"${row.cells[0].textContent.replace(/"/g, '""')}"`;
                const name = `"${row.cells[1].textContent.replace(/"/g, '""')}"`;
                const category = `"${row.cells[2].textContent.replace(/"/g, '""')}"`;
                const qty = `"${row.cells[3].textContent.replace(/"/g, '""')}"`;
                const price = `"${row.cells[4].textContent.replace(/"/g, '""')}"`;
                const totalValue = `"${row.cells[5].textContent.replace(/"/g, '""')}"`;
                const status = `"${row.cells[6].querySelector('span').textContent.replace(/"/g, '""')}"`;
                csvContent += `${code},${name},${category},${qty},${price},${totalValue},${status}\n`;
            }
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "تقرير-المخزون.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("✅ تم تصدير تقرير المخزون كملف CSV.", "success");
        // Revert filters after export
        document.getElementById("inventorySearch").value = originalSearchTerm;
        document.getElementById("inventoryCategoryFilter").value = originalCategoryFilter;
        showInventory();
    }

    document.body.removeChild(exportContent);
}

function toggleExportMenu(type) {
    const menuId = type === 'inventory' ? 'inventoryExportMenu' : 'salesExportMenu';
    const menu = document.getElementById(menuId);
    hideExportMenus(menuId);
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function hideExportMenus(exceptId = null) {
    const menus = document.querySelectorAll('.export-menu');
    menus.forEach(menu => {
        if (menu.id !== exceptId) {
            menu.style.display = 'none';
        }
    });
}

window.onclick = function(event) {
    if (!event.target.matches('button[onclick*="toggleExportMenu"]') && !event.target.closest('.export-menu')) {
        hideExportMenus();
    }
};

// --- Dashboard Functions ---
function updateDashboard() {
    let totalInventoryValue = 0;
    let totalUniqueProducts = products.length;
    let lowStockItems = [];

    products.forEach(p => {
        totalInventoryValue += (p.qty * p.price);
        if (p.qty > 0 && p.qty <= LOW_STOCK_THRESHOLD) {
            lowStockItems.push(p);
        } else if (p.qty === 0) { // Also include out-of-stock items in low stock list
            lowStockItems.push(p);
        }
    });

    document.getElementById("dashboardTotalInventoryValue").textContent = totalInventoryValue.toFixed(2);
    document.getElementById("dashboardTotalProducts").textContent = totalUniqueProducts;

    const lowStockList = document.getElementById("dashboardLowStockList");
    lowStockList.innerHTML = "";
    if (lowStockItems.length === 0) {
        lowStockList.innerHTML = "<li>لا توجد منتجات منخفضة المخزون حالياً.</li>";
    } else {
        lowStockItems.forEach(item => {
            lowStockList.innerHTML += `<li>${item.name} <span class="qty">${item.qty} ${item.unitType ? item.unitType : ''}</span></li>`; // عرض نوع الوحدة
        });
    }

    // Calculate daily and weekly sales
    let dailySales = 0;
    let weeklySales = 0;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Get the start of the week (Sunday for consistency, adjust for Monday if needed)
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); 
    startOfWeek.setHours(0, 0, 0, 0); // Ensure start of the day

    sales.forEach(sale => {
        const saleDate = new Date(sale.date); // Assuming sale.date is parsable by Date constructor
        if (saleDate >= startOfDay) {
            dailySales += sale.totalAmount;
        }
        if (saleDate >= startOfWeek) {
            weeklySales += sale.totalAmount;
        }
    });

    document.getElementById("dashboardDailySales").textContent = dailySales.toFixed(2);
    document.getElementById("dashboardWeeklySales").textContent = weeklySales.toFixed(2);
}

// --- Category Filter Population (for Products and Inventory sections) ---
function updateProductCategoriesFilter() {
    const inventoryCategoryFilter = document.getElementById("inventoryCategoryFilter");
    const productCategoryFilter = document.getElementById("productCategoryFilter");
    const categories = new Set(products.map(p => p.category));

    // Clear existing options, keep "All Categories"
    inventoryCategoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
    productCategoryFilter.innerHTML = '<option value="">جميع الفئات</option>';

    categories.forEach(category => {
        const option1 = document.createElement("option");
        option1.value = category;
        option1.textContent = category;
        inventoryCategoryFilter.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = category;
        option2.textContent = category;
        productCategoryFilter.appendChild(option2);
    });
}

// --- Notification System ---
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.querySelector('.notification-container');
    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    
    container.appendChild(notification);

    // Trigger reflow to enable transition
    void notification.offsetWidth; 
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, duration);
}

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  showSection('dashboard'); // Start on the dashboard
});
