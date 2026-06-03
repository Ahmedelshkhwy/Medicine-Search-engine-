import { database, ref, push, onValue, remove } from './firebase-config.js';
import { localSearchEngine } from './local-search.js';

class ProductManager {
    constructor() {
        this.productsRef = ref(database, 'products');
        this.selectedBranch = null;
        this.isSubmitting = false;
        this.init();
    }

    init() {
        console.log('🚀 بدء تهيئة التطبيق...');
        
        this.setupEventListeners();
        this.initializeBranches();
        this.testFirebaseConnection();
        
        console.log('✅ التطبيق جاهز للاستخدام');
        this.showNotification('🎉 التطبيق جاهز!', 'success');
    }

    // تهيئة الفروع
    initializeBranches() {
        const branchSelector = document.getElementById('branchSelector');
        if (branchSelector) {
            console.log('🏢 جاري إنشاء قائمة الفروع من 1 إلى 40...');
            branchSelector.innerHTML = '<option value="">اختر الفرع</option>';
            
            for (let i = 1; i <= 40; i++) {
                const option = document.createElement('option');
                option.value = i.toString();
                option.textContent = `فرع الفارابى ${i}`;
                branchSelector.appendChild(option);
            }
            
            console.log('✅ تم إنشاء 40 فرع في القائمة');
        } else {
            console.error('❌ لم يتم العثور على عنصر اختيار الفرع');
        }
    }

    // اختبار الاتصال بـ Firebase
    async testFirebaseConnection() {
        try {
            console.log('🔗 اختبار الاتصال بـ Firebase...');
            
            if (!database) {
                console.error('❌ Firebase غير مهيأ');
                this.updateConnectionStatus(false);
                this.showNotification('❌ خطأ في تهيئة قاعدة البيانات', 'error');
                return;
            }
            
            // اختبار الاتصال أولاً
            const connectedRef = ref(database, '.info/connected');
            onValue(connectedRef, (snapshot) => {
                if (snapshot.val() === true) {
                    console.log('✅ متصل بـ Firebase');
                    this.updateConnectionStatus(true);
                    this.loadProducts(); // تحميل البيانات
                    
                    // إرسال الإشعارات المعلقة للإدمن
                    this.sendPendingAdminNotifications();
                    
                    this.showNotification('✅ متصل بقاعدة البيانات - جاري مزامنة البيانات', 'success');
                } else {
                    console.log('❌ غير متصل بـ Firebase');
                    this.updateConnectionStatus(false);
                    this.showNotification('⚠️ غير متصل - سيتم الحفظ محلياً', 'warning');
                }
            });
            
        } catch (error) {
            console.error('❌ خطأ في اختبار الاتصال:', error);
            this.updateConnectionStatus(false);
            this.showNotification('❌ خطأ في الاتصال: ' + error.message, 'error');
        }
    }

    // تحديث حالة الاتصال
    updateConnectionStatus(isConnected) {
        const dbStatus = document.getElementById('dbStatus');
        if (dbStatus) {
            if (isConnected) {
                dbStatus.innerHTML = '<i class="fas fa-check-circle"></i> متصل بقاعدة البيانات';
                dbStatus.className = 'db-status success';
            } else {
                dbStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> غير متصل - سيتم الحفظ محلياً';
                dbStatus.className = 'db-status warning';
            }
        }
    }

    setupEventListeners() {
        const form = document.getElementById('productForm');
        if (!form) {
            console.error('❌ لم يتم العثور على النموذج!');
            return;
        }
        
        console.log('✅ تم العثور على النموذج:', form);
        form.addEventListener('submit', (e) => {
            console.log('🎯 تم الضغط على زر الإرسال');
            this.handleSubmit(e);
        });
        form.addEventListener('reset', () => this.handleReset());

        // اختيار الفرع المباشر
        const branchSelect = document.getElementById('branchSelector');
        if (branchSelect) {
            branchSelect.addEventListener('change', (e) => this.selectBranch(e.target.value));
            this.branchSelector = branchSelect;
        }

        // البحث الذكي
        const smartSearch = document.getElementById('smartSearch');
        if (smartSearch) {
            smartSearch.addEventListener('input', (e) => this.handleSmartSearch(e.target.value));
        }

        // مراقبة تغيير الحقول للتحقق من صحة النموذج
        const requiredFields = ['productName', 'productCode', 'demandLevel'];
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.checkFormValidation());
                field.addEventListener('change', () => this.checkFormValidation());
            }
        });

        this.productForm = form;
    }

    // البحث الذكي المبسط
    async handleSmartSearch(query) {
        if (!query || query.length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            console.log('🔍 البحث عن:', query);
            // استخدام البحث المحلي الحقيقي
            const results = localSearchEngine.search(query);
            if (results.length > 0) {
                this.displaySearchResults(results);
            } else {
                this.showNoResults();
            }
        } catch (error) {
            console.error('❌ خطأ في البحث:', error);
            this.showSearchError();
        }
    }

    // تحديث إحصائيات البحث
    updateSearchStats(resultCount) {
        const searchStats = document.getElementById('searchStats');
        if (searchStats) {
            searchStats.innerHTML = `🔍 تم العثور على ${resultCount} منتج - انقر لاختيار المنتج`;
        }
    }

    // عرض نتائج البحث
    displaySearchResults(products) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) {
            console.warn('⚠️ عنصر نتائج البحث غير موجود');
            return;
        }
        
        resultsContainer.innerHTML = products.map(product => `
            <div class="search-result-item" onclick="productManager.selectProduct('${this.escapeHtml(product.name)}', '${this.escapeHtml(product.code)}', ${product.price || 0})">
                <div class="result-main">
                    <span class="result-name">${this.escapeHtml(product.name)}</span>
                    <span class="result-code">${this.escapeHtml(product.code)}</span>
                </div>
                <div class="result-details">
                    <span class="result-price">${product.price ? product.price + ' ريال' : 'سعر غير محدد'}</span>
                </div>
                <div class="import-hint">
                    <i class="fas fa-download"></i> انقر للاستيراد
                </div>
            </div>
        `).join('');
        
        resultsContainer.style.display = 'block';
        
        const searchStats = document.getElementById('searchStats');
        if (searchStats) {
            searchStats.innerHTML = `🔍 تم العثور على ${products.length} منتج - انقر لاختيار المنتج`;
        }
    }

    // إخفاء نتائج البحث
    hideSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        
        const searchStats = document.getElementById('searchStats');
        if (searchStats) {
            searchStats.innerHTML = '💡 اكتب للبحث الفوري في قاعدة البيانات المحلية';
        }
    }

    // عرض رسالة عدم وجود نتائج
    showNoResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '<div class="no-results">لم يتم العثور على نتائج</div>';
        resultsContainer.style.display = 'block';
        
        const searchStats = document.getElementById('searchStats');
        if (searchStats) {
            searchStats.innerHTML = '❌ لم يتم العثور على نتائج للبحث';
        }
    }

    // عرض رسالة خطأ في البحث
    showSearchError() {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '<div class="search-error">حدث خطأ في البحث - تحقق من الاتصال</div>';
        resultsContainer.style.display = 'block';
    }

    // اختيار منتج من نتائج البحث
    selectProduct(name, code, price) {
        console.log('📦 اختيار المنتج:', { name, code, price });
        
        // ملء الحقول بالمنتج المحدد بأمان
        const nameField = document.getElementById('productName');
        const codeField = document.getElementById('productCode');
        const priceField = document.getElementById('productPrice');
        
        if (nameField) nameField.value = name;
        if (codeField) codeField.value = code;
        if (priceField) priceField.value = price;
        
        // إخفاء نتائج البحث
        this.hideSearchResults();
        
        // مسح حقل البحث
        const searchField = document.getElementById('smartSearch');
        if (searchField) searchField.value = '';
        
        // إظهار رسالة نجاح
        this.showNotification(`✅ تم اختيار المنتج: ${name}`, 'success');
        
        // التحقق من صحة النموذج
        this.checkFormValidation();
    }

    // إلغاء اختيار المنتج
    clearSelectedProduct() {
        console.log('🗑️ إلغاء اختيار المنتج');
        
        // مسح الحقول بأمان
        const nameField = document.getElementById('productName');
        const codeField = document.getElementById('productCode');
        const priceField = document.getElementById('productPrice');
        
        if (nameField) nameField.value = '';
        if (codeField) codeField.value = '';
        if (priceField) priceField.value = '';
        
        this.checkFormValidation();
    }

    selectBranch(branchCode) {
        if (!branchCode) {
            this.selectedBranch = null;
            return;
        }

        // إنشاء كائن الفرع بناءً على الكود
        const branchNumber = parseInt(branchCode);
        if (branchNumber >= 1 && branchNumber <= 40) {
            this.selectedBranch = {
                code: branchCode,
                name: `فرع الفارابى ${branchNumber}`
            };
            console.log('✅ تم اختيار الفرع:', this.selectedBranch);
            this.showSelectedBranch(this.selectedBranch);
            this.checkFormValidation();
        } else {
            console.error('❌ رقم فرع غير صحيح:', branchNumber);
        }
    }

    showSelectedBranch(branch) {
        const branchSelector = document.getElementById('branchSelector');
        const selectedBranchDiv = document.getElementById('selectedBranch');
        
        if (branchSelector && selectedBranchDiv) {
            branchSelector.style.display = 'none';
            selectedBranchDiv.style.display = 'block';
            selectedBranchDiv.innerHTML = `
                <div class="selected-branch">
                    <div class="branch-info">
                        <strong>${branch.name}</strong>
                        <small>كود: ${branch.code}</small>
                    </div>
                    <button type="button" class="btn-change-branch" onclick="productManager.changeBranch()">
                        <i class="fas fa-edit"></i>
                        تغيير
                    </button>
                </div>
            `;
        } else {
            // إذا لم تكن العناصر موجودة، فقط اظهر رسالة في console
            console.log('✅ تم اختيار الفرع:', branch.name);
        }
    }

    changeBranch() {
        const branchSelector = document.getElementById('branchSelector');
        const selectedBranchDiv = document.getElementById('selectedBranch');
        
        if (branchSelector && selectedBranchDiv) {
            branchSelector.style.display = 'block';
            selectedBranchDiv.style.display = 'none';
        }
        
        this.selectedBranch = null;
        this.checkFormValidation();
    }

    checkFormValidation() {
        const productName = document.getElementById('productName')?.value.trim();
        const productCode = document.getElementById('productCode')?.value.trim();
        const demandLevel = document.getElementById('demandLevel')?.value;
        const submitBtn = document.querySelector('button[type="submit"]');
        
        const isValid = productName && productCode && demandLevel && this.selectedBranch;
        
        if (submitBtn) {
            submitBtn.disabled = !isValid || this.isSubmitting;
            
            if (this.isSubmitting) {
                submitBtn.classList.remove('ready');
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            } else if (isValid) {
                submitBtn.classList.add('ready');
                submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
            } else {
                submitBtn.classList.remove('ready');
                submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
            }
        }

        // عرض رسالة توضيحية للمستخدم
        if (!this.selectedBranch) {
            console.log('⚠️ يرجى اختيار الفرع أولاً');
        } else if (!productName || !productCode || !demandLevel) {
            console.log('⚠️ يرجى ملء جميع الحقول المطلوبة');
        } else {
            console.log('✅ النموذج جاهز للحفظ');
        }
    }

    showValidationMessage(message) {
        const validationDiv = document.getElementById('validationMessage');
        if (validationDiv) {
            validationDiv.textContent = message;
            validationDiv.style.display = 'block';
            validationDiv.className = 'alert alert-error';
        } else {
            // عرض الرسالة كتنبيه بدلاً من ذلك
            this.showNotification(message, 'error');
        }
    }

    clearValidationMessage() {
        const validationDiv = document.getElementById('validationMessage');
        if (validationDiv) {
            validationDiv.style.display = 'none';
        }
        // لا حاجة لعمل شيء إذا لم يكن العنصر موجوداً
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) {
            console.log('⏳ عملية الحفظ جارية بالفعل...');
            return;
        }
        
        console.log('🚀 بدء عملية الحفظ...');
        this.isSubmitting = true;
        this.checkFormValidation();

        // جمع البيانات من النموذج
        const formData = new FormData(e.target);
        const productName = formData.get('productName')?.trim();
        const productCode = formData.get('productCode')?.trim();
        const productPrice = parseFloat(formData.get('productPrice')) || 0;
        const demandLevel = formData.get('demandLevel');
        
        console.log('📋 بيانات النموذج:', {
            productName,
            productCode,
            productPrice,
            demandLevel,
            selectedBranch: this.selectedBranch
        });
        
        // التحقق من البيانات المطلوبة
        if (!productName) {
            this.showNotification('❌ يرجى إدخال اسم المنتج', 'error');
            this.isSubmitting = false;
            this.checkFormValidation();
            return;
        }
        
        if (!productCode) {
            this.showNotification('❌ يرجى إدخال كود المنتج', 'error');
            this.isSubmitting = false;
            this.checkFormValidation();
            return;
        }
        
        if (!this.selectedBranch) {
            this.showNotification('❌ يرجى اختيار الفرع أولاً', 'error');
            this.isSubmitting = false;
            this.checkFormValidation();
            return;
        }

        if (!demandLevel) {
            this.showNotification('❌ يرجى اختيار مستوى الاحتياج', 'error');
            this.isSubmitting = false;
            this.checkFormValidation();
            return;
        }

        // إعداد البيانات للحفظ
        const productData = {
            name: productName,
            code: productCode,
            price: productPrice,
            branchCode: this.selectedBranch.code,
            branchName: this.selectedBranch.name,
            demandLevel: demandLevel,
            timestamp: Date.now(),
            date: new Date().toLocaleString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        console.log('💾 محاولة الحفظ:', productData);
        this.showNotification('🔄 جاري الحفظ...', 'info');

        try {
            // محاولة الحفظ في Firebase إذا كان متاحاً
            if (database && this.productsRef) {
                console.log('🔄 جاري الحفظ في Firebase...');
                const result = await push(this.productsRef, productData);
                
                if (result && result.key) {
                    console.log('✅ تم الحفظ في Firebase بنجاح! ID:', result.key);
                    
                    // إشعار الإدمن بالمنتج الجديد
                    await this.notifyAdmin(productData, result.key);
                    
                    this.showNotification('✅ تم حفظ المنتج وإرساله للإدمن!', 'success');
                    this.handleReset();
                    return;
                }
            }
            
            // إذا لم يكن Firebase متاحاً، احفظ محلياً
            throw new Error('Firebase غير متاح');
            
        } catch (error) {
            console.log('⚠️ Firebase غير متاح، جاري الحفظ المحلي...');
            
            // الحفظ المحلي
            try {
                const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
                productData.id = 'local_' + Date.now();
                productData.isLocal = true; // إشارة لكونه محلي
                localProducts.push(productData);
                localStorage.setItem('products', JSON.stringify(localProducts));
                
                // إضافة للعرض المحلي
                this.addProductToLocalTable(productData);
                
                // محاولة إشعار الإدمن محلياً
                this.saveAdminNotification(productData);
                
                this.showNotification('✅ تم الحفظ محلياً - سيتم إرساله للإدمن عند عودة الاتصال!', 'warning');
                this.handleReset();
                
            } catch (localError) {
                console.error('❌ فشل الحفظ المحلي:', localError);
                this.showNotification('❌ فشل الحفظ: ' + localError.message, 'error');
            }
            
        } finally {
            this.isSubmitting = false;
            this.checkFormValidation();
        }
    }

    // إضافة منتج للجدول المحلي
    addProductToLocalTable(productData) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <tr class="product-row local-product">
                <td class="product-name">
                    <strong>${this.escapeHtml(productData.name)}</strong>
                    <small style="color: #f6ad55;">💾 محفوظ محلياً</small>
                </td>
                <td class="product-code">
                    <code>${this.escapeHtml(productData.code)}</code>
                </td>
                <td class="product-price">
                    <span class="price-tag">${productData.price || 'غير محدد'} ريال</span>
                </td>
                <td class="branch-info">
                    <div class="branch-details">
                        <strong>${this.escapeHtml(productData.branchName)}</strong>
                        <small>كود: ${this.escapeHtml(productData.branchCode)}</small>
                    </div>
                </td>
                <td class="demand-level">
                    <span class="demand-badge demand-${productData.demandLevel}">
                        ${this.getDemandText(productData.demandLevel)}
                    </span>
                </td>
                <td class="timestamp">
                    <small>${productData.date}</small>
                </td>
                <td class="actions">
                    <span style="color: #28a745;">✅ محفوظ</span>
                </td>
            </tr>
        `;
        
        tbody.insertBefore(row, tbody.firstChild);
        this.updateLocalStats();
    }

    // تحديث الإحصائيات المحلية
    updateLocalStats() {
        try {
            const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
            const totalElement = document.getElementById('totalCount');
            if (totalElement) {
                totalElement.textContent = localProducts.length;
            }
        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
    }

    handleReset() {
        // إعادة تعيين النموذج
        if (this.productForm) {
            this.productForm.reset();
        }
        
        // إعادة تعيين الفرع المحدد
        this.selectedBranch = null;
        
        // إعادة تعيين اختيار الفرع بأمان
        const branchSelectorElement = document.getElementById('branchSelector');
        if (branchSelectorElement) {
            branchSelectorElement.value = '';
        }
        
        // مسح حقل البحث بأمان
        const smartSearch = document.getElementById('smartSearch');
        if (smartSearch) {
            smartSearch.value = '';
        }
        
        // إخفاء نتائج البحث
        this.hideSearchResults();
        
        // إعادة فحص صحة النموذج
        this.checkFormValidation();
        
        console.log('🔄 تم إعادة تعيين النموذج');
    }

    loadProducts() {
        console.log('📥 تحميل المنتجات من جميع الفروع...');
        
        onValue(this.productsRef, (snapshot) => {
            try {
                const products = snapshot.val();
                console.log('📊 البيانات المستلمة من جميع الفروع:', products);
                
                if (products) {
                    // عرض جميع المنتجات من جميع الفروع
                    const allProducts = Object.entries(products).map(([key, product]) => ({
                        id: key,
                        ...product
                    }));
                    
                    console.log(`✅ تم تحميل ${allProducts.length} منتج من جميع الفروع`);
                    this.renderProducts(products);
                    this.updateStats(products);
                    
                    // إظهار رسالة توضح أن البيانات مشتركة
                    if (allProducts.length > 0) {
                        this.showNotification(`📋 عرض ${allProducts.length} منتج من جميع فروع الفارابى`, 'info');
                    }
                } else {
                    console.log('📝 لا توجد منتجات في أي فرع');
                    this.renderProducts(null);
                    this.updateStats(null);
                }
                
            } catch (error) {
                console.error('❌ خطأ في معالجة البيانات:', error);
                this.showNotification('❌ خطأ في تحميل البيانات', 'error');
            }
        }, (error) => {
            console.error('❌ خطأ في تحميل البيانات:', error);
            this.showNotification('❌ فشل تحميل البيانات: ' + error.message, 'error');
        });
    }

    renderProducts(products) {
        const tbody = document.getElementById('productsTableBody');
        
        if (!tbody) {
            console.error('❌ لم يتم العثور على جدول المنتجات');
            return;
        }

        if (!products) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data">
                        <i class="fas fa-database"></i>
                        <p>لا توجد منتجات من أي فرع</p>
                        <small>ستظهر هنا منتجات جميع فروع الفارابى</small>
                    </td>
                </tr>
            `;
            return;
        }

        const productList = Object.entries(products).map(([key, product]) => ({
            id: key,
            ...product
        }));

        // ترتيب المنتجات حسب التاريخ (الأحدث أولاً)
        productList.sort((a, b) => b.timestamp - a.timestamp);

        tbody.innerHTML = productList.map(product => `
            <tr class="product-row" data-demand="${product.demandLevel}">
                <td class="product-name">
                    <div class="product-info">
                        <strong>${this.escapeHtml(product.name)}</strong>
                    </div>
                </td>
                <td class="product-code">
                    <code>${this.escapeHtml(product.code)}</code>
                </td>
                <td class="product-price">
                    <span class="price-tag">${product.price || 'غير محدد'} ريال</span>
                </td>
                <td class="branch-info">
                    <div class="branch-details">
                        <strong>${this.escapeHtml(product.branchName || 'غير محدد')}</strong>
                        <small>كود: ${this.escapeHtml(product.branchCode || '')}</small>
                    </div>
                </td>
                <td class="demand-level">
                    <span class="demand-badge demand-${product.demandLevel}">
                        ${this.getDemandText(product.demandLevel)}
                    </span>
                </td>
                <td class="timestamp">
                    <small>${product.date}</small>
                </td>
                <td class="actions">
                    <button class="btn-delete" onclick="productManager.deleteProduct('${product.id}')" 
                            title="حذف المنتج">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getDemandText(demandLevel) {
        const demandTexts = {
            'urgent': 'مطلوب جداً',
            'needed': 'مطلوب',
            'scheduled': 'مطلوب بعد 3 أشهر',
            'new': 'جديد'
        };
        return demandTexts[demandLevel] || demandLevel;
    }

    updateStats(products) {
        const stats = {
            urgent: 0,
            needed: 0,
            scheduled: 0,
            new: 0,
            total: 0
        };

        if (products) {
            Object.values(products).forEach(product => {
                stats.total++;
                if (stats.hasOwnProperty(product.demandLevel)) {
                    stats[product.demandLevel]++;
                }
            });
        }

        // تحديث الإحصائيات مع المعرفات الصحيحة
        const totalElement = document.getElementById('totalCount');
        const urgentElement = document.getElementById('urgentCount');
        const neededElement = document.getElementById('neededCount');
        const scheduledElement = document.getElementById('scheduledCount');

        if (totalElement) totalElement.textContent = stats.total;
        if (urgentElement) urgentElement.textContent = stats.urgent;
        if (neededElement) neededElement.textContent = stats.needed;
        if (scheduledElement) scheduledElement.textContent = stats.scheduled;

        console.log('📊 تم تحديث الإحصائيات:', stats);
    }

    async deleteProduct(productId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            return;
        }

        try {
            await remove(ref(database, `products/${productId}`));
            this.showNotification('تم حذف المنتج بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حذف المنتج:', error);
            this.showNotification('حدث خطأ في حذف المنتج', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) {
            console.error('❌ عنصر التنبيهات غير موجود');
            // عرض تنبيه بديل في console
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
            return;
        }
        
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        // إخفاء التنبيه بعد 3 ثوان
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // إشعار الإدمن بمنتج جديد
    async notifyAdmin(productData, productId) {
        try {
            console.log('📢 جاري إرسال إشعار للإدمن...');
            
            const adminNotification = {
                type: 'new_product',
                productId: productId,
                productData: productData,
                timestamp: Date.now(),
                date: new Date().toLocaleString('ar-EG'),
                read: false,
                urgent: productData.demandLevel === 'urgent'
            };
            
            // إرسال الإشعار إلى مجموعة إشعارات الإدمن
            const adminNotificationsRef = ref(database, 'admin_notifications');
            await push(adminNotificationsRef, adminNotification);
            
            console.log('✅ تم إرسال الإشعار للإدمن بنجاح');
            
        } catch (error) {
            console.error('❌ فشل في إرسال الإشعار للإدمن:', error);
            // حفظ الإشعار محلياً للإرسال لاحقاً
            this.saveAdminNotification(productData, productId);
        }
    }
    
    // حفظ إشعار الإدمن محلياً
    saveAdminNotification(productData, productId = null) {
        try {
            console.log('💾 حفظ إشعار الإدمن محلياً...');
            
            const pendingNotifications = JSON.parse(localStorage.getItem('pending_admin_notifications') || '[]');
            
            const notification = {
                type: 'new_product',
                productId: productId || productData.id,
                productData: productData,
                timestamp: Date.now(),
                date: new Date().toLocaleString('ar-EG'),
                pending: true,
                urgent: productData.demandLevel === 'urgent'
            };
            
            pendingNotifications.push(notification);
            localStorage.setItem('pending_admin_notifications', JSON.stringify(pendingNotifications));
            
            console.log('✅ تم حفظ الإشعار محلياً للإرسال لاحقاً');
            
        } catch (error) {
            console.error('❌ فشل في حفظ إشعار الإدمن محلياً:', error);
        }
    }
    
    // إرسال الإشعارات المعلقة للإدمن
    async sendPendingAdminNotifications() {
        try {
            const pendingNotifications = JSON.parse(localStorage.getItem('pending_admin_notifications') || '[]');
            
            if (pendingNotifications.length === 0) {
                return;
            }
            
            console.log(`📤 جاري إرسال ${pendingNotifications.length} إشعار معلق للإدمن...`);
            
            const adminNotificationsRef = ref(database, 'admin_notifications');
            
            for (const notification of pendingNotifications) {
                try {
                    await push(adminNotificationsRef, notification);
                    console.log('✅ تم إرسال إشعار معلق للإدمن');
                } catch (error) {
                    console.error('❌ فشل في إرسال إشعار معلق:', error);
                    break; // إيقاف المحاولة إذا فشل إشعار واحد
                }
            }
            
            // مسح الإشعارات المرسلة
            localStorage.removeItem('pending_admin_notifications');
            console.log('✅ تم إرسال جميع الإشعارات المعلقة');
            
        } catch (error) {
            console.error('❌ فشل في إرسال الإشعارات المعلقة:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// دوال عامة يمكن استدعاؤها من HTML
window.changeProduct = function() {
    const selectedProductElement = document.getElementById('selectedProduct');
    const productSearchElement = document.getElementById('productSearch');
    
    if (selectedProductElement) {
        selectedProductElement.style.display = 'none';
    }
    if (productSearchElement) {
        productSearchElement.focus();
    }
    if (window.productManager) {
        window.productManager.selectedProduct = null;
        window.productManager.checkFormValidation();
    }
};

window.changeBranch = function() {
    const selectedBranchElement = document.getElementById('selectedBranch');
    const branchSelectorElement = document.getElementById('branchSelector');
    
    if (selectedBranchElement) {
        selectedBranchElement.style.display = 'none';
    }
    if (branchSelectorElement) {
        branchSelectorElement.style.display = 'block';
        branchSelectorElement.focus();
    }
    if (window.productManager) {
        window.productManager.selectedBranch = null;
        window.productManager.checkFormValidation();
    }
};

// تهيئة التطبيق
const productManager = new ProductManager();

// جعل productManager متاحاً عالمياً للاستخدام في onclick
window.productManager = productManager;