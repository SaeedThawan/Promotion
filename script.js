document.addEventListener("DOMContentLoaded", function() {
    // رابط Web App الخاص بك
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxEH1IQL3sBIRBN-DVbgttvM3Ok8PqAeGxkk6pUz24rm96It-OiKMc2oRvbz41h18kl7Q/exec";

    const form = document.getElementById('visitForm');
    const statusMessage = document.getElementById('statusMessage');

    // جلب البيانات من ملفات JSON
    Promise.all([
        fetch('sales_representatives.json').then(res => res.json()),
        fetch('customers_main.json').then(res => res.json()),
        fetch('actions_list.json').then(res => res.json()),
        fetch('workspace_status.json').then(res => res.json()),
        fetch('products.json').then(res => res.json()),
        fetch('governorates.json').then(res => res.json())
    ]).then(([reps, customers, actions, workspaces, products, governorates]) => {
        // تعبئة القوائم المنسدلة
        populateDropdown('salesRepName', reps);
        populateDropdown('actionsTaken', actions);
        populateDropdown('workspaceStatus', workspaces);
        populateDropdown('governorate', governorates);
        
        // تعبئة قائمة المنتجات (سيتم استخدامها لتكرار الحقول)
        const productSelects = document.querySelectorAll('.missingProduct');
        productSelects.forEach(select => populateProductsDropdown(select, products));

        // تعبئة قائمة العملاء الذكية
        populateCustomersDatalist('customersList', customers);
    });

    // دالة لملء القوائم المنسدلة البسيطة
    function populateDropdown(selectId, data) {
        const select = document.getElementById(selectId);
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });
    }
    
    // دالة لملء قائمة المنتجات
    function populateProductsDropdown(selectElement, productsData) {
        selectElement.innerHTML = '<option value="" disabled selected>اختر منتج</option>';
        productsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.Product_Name_AR;
            option.setAttribute('data-code', product.Product_Code);
            option.setAttribute('data-category', product.Category);
            option.textContent = product.Product_Name_AR;
            selectElement.appendChild(option);
        });
    }

    // دالة لملء قائمة العملاء الذكية
    function populateCustomersDatalist(listId, customersData) {
        const datalist = document.getElementById(listId);
        customersData.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.Customer_Name_AR;
            option.setAttribute('data-code', customer.Customer_Code);
            datalist.appendChild(option);
        });
    }

    // ربط كود العميل بحقل الإدخال المخفي
    const customerNameInput = document.getElementById('customerNameInput');
    const customersList = document.getElementById('customersList');
    const customerCodeHidden = document.getElementById('customerCodeHidden');
    customerNameInput.addEventListener('input', function() {
        const selectedOption = Array.from(customersList.options).find(option => option.value === this.value);
        customerCodeHidden.value = selectedOption ? selectedOption.getAttribute('data-code') : '';
    });
    
    // إضافة حقل منتج ناقص جديد
    const addProductBtn = document.getElementById('addProductBtn');
    const productsContainer = document.getElementById('missingProductsContainer');
    addProductBtn.addEventListener('click', function() {
        fetch('products.json').then(res => res.json()).then(products => {
            const newProductItem = document.createElement('div');
            newProductItem.classList.add('missing-product-item');
            newProductItem.innerHTML = `
                <select class="missingProduct" name="missingProduct" required></select>
                <input type="hidden" class="missingProductCode" name="missingProductCode">
                <button type="button" class="remove-product-btn">X</button>
            `;
            productsContainer.appendChild(newProductItem);
            const newSelect = newProductItem.querySelector('.missingProduct');
            populateProductsDropdown(newSelect, products);
        });
    });

    // إزالة حقل منتج ناقص
    productsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-product-btn')) {
            if (productsContainer.querySelectorAll('.missing-product-item').length > 1) {
                e.target.closest('.missing-product-item').remove();
            }
        }
    });
    
    // ربط كود المنتج واسمه وفئته بحقل الإدخال المخفي عند التغيير
    productsContainer.addEventListener('change', function(e) {
        if (e.target.classList.contains('missingProduct')) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const codeInput = e.target.closest('.missing-product-item').querySelector('.missingProductCode');
            const categoryInput = e.target.closest('.missing-product-item').querySelector('.missingProductCategory');
            codeInput.value = selectedOption.getAttribute('data-code');
            categoryInput.value = selectedOption.getAttribute('data-category');
        }
    });

    // دالة إرسال النموذج
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        statusMessage.textContent = 'جاري الإرسال...';
        statusMessage.className = 'status loading';
        
        const formData = new FormData(form);
        const missingProducts = [];
        const missingProductCodes = [];
        const missingProductCategories = [];

        // جمع بيانات المنتجات الناقصة
        const productNames = form.querySelectorAll('select.missingProduct');
        const productCodes = form.querySelectorAll('input.missingProductCode');
        const productCategories = form.querySelectorAll('input.missingProductCategory');

        productNames.forEach((select, index) => {
            const name = select.value;
            const code = productCodes[index].value;
            const category = productCategories[index].value;
            if (name && code) {
                missingProducts.push(name);
                missingProductCodes.push(code);
                missingProductCategories.push(category);
            }
        });
        
        // تعديل البيانات قبل الإرسال
        formData.append('missingProducts', missingProducts.join(','));
        formData.append('missingProductCodes', missingProductCodes.join(','));
        formData.append('missingProductCategories', missingProductCategories.join(','));
        
        // إزالة الحقول القديمة التي تكررت
        formData.delete('missingProduct');
        formData.delete('missingProductCode');
        formData.delete('missingProductCategory');

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(result => {
            if (result.includes('Success')) {
                statusMessage.textContent = 'تم إرسال البيانات بنجاح!';
                statusMessage.className = 'status success';
                form.reset();
            } else {
                throw new Error('فشل الإرسال.');
            }
        })
        .catch(error => {
            statusMessage.textContent = 'حدث خطأ: ' + error.message;
            statusMessage.className = 'status error';
            console.error('Error:', error);
        });
    });
});