import { database, ref, onValue, remove } from '../firebase-config.js';

class AdminDashboard {
    constructor() {
        this.productsRef = ref(database, 'products');
        this.allProducts = {};
        this.filteredProducts = {};
        this.sortConfig = { key: 'timestamp', direction: 'desc' };
        this.isConnected = false;
        this.init();
    }

    init() {
        console.log('🚀 بدء تهيئة لوحة تحكم الأدمن...');
        
        this.setupEventListeners();
        this.loadProducts();
        
        console.log('✅ لوحة الأدمن جاهزة');
    }

    // اختبار الاتصال بـ Firebase
    async testFirebaseConnection() {
        try {
            console.log('🧪 اختبار اتصال Firebase...');
            
            // محاولة قراءة البيانات
            onValue(this.productsRef, (snapshot) => {
                console.log('✅ تم الاتصال بـ Firebase بنجاح!');
                console.log('📊 البيانات المستلمة:', snapshot.val());
                this.isConnected = true;
                this.updateConnectionStatus();
                
                if (snapshot.val()) {
                    this.allProducts = snapshot.val();
                    this.renderProducts(this.allProducts);
                    this.updateStats(this.allProducts);
                } else {
                    console.log('📝 لا توجد بيانات في Firebase');
                    this.showNoData();
                }
            }, (error) => {
                console.error('❌ فشل الاتصال بـ Firebase:', error);
                this.isConnected = false;
                this.updateConnectionStatus();
                this.showError('خطأ في الاتصال بقاعدة البيانات: ' + error.message);
            });
            
        } catch (error) {
            console.error('❌ خطأ في اختبار الاتصال:', error);
            this.isConnected = false;
            this.updateConnectionStatus();
        }
    }

    // تحديث مؤشر حالة الاتصال
    updateConnectionStatus() {
        const indicator = document.querySelector('.live-indicator');
        const statusText = indicator.querySelector('span');
        const statusIcon = indicator.querySelector('i');
        
        if (this.isConnected) {
            indicator.classList.add('connected');
            indicator.classList.remove('disconnected');
            statusText.textContent = 'متصل - البيانات المباشرة';
            statusIcon.className = 'fas fa-circle';
        } else {
            indicator.classList.add('disconnected');
            indicator.classList.remove('connected');
            statusText.textContent = 'غير متصل';
            statusIcon.className = 'fas fa-exclamation-triangle';
        }
    }

    setupEventListeners() {
        // مرشح مستوى الاحتياج
        document.getElementById('demandFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        // البحث
        document.getElementById('searchInput').addEventListener('input', () => {
            this.applyFilters();
        });

        // أزرار الإجراءات
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            this.exportToExcel();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllData();
        });

        // ترتيب الجدول
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                this.sortTable(header.dataset.sort);
            });
        });
    }

    loadProducts() {
        console.log('📥 تحميل البيانات من Firebase...');
        
        onValue(this.productsRef, (snapshot) => {
            const data = snapshot.val();
            console.log('📊 البيانات المستلمة:', data);
            
            if (data) {
                this.allProducts = data;
                console.log(`✅ تم تحميل ${Object.keys(data).length} منتج`);
                this.applyFilters();
                this.updateStats();
                this.addNotification(`تم تحديث البيانات - ${Object.keys(data).length} منتج`, 'success');
            } else {
                console.log('📝 لا توجد بيانات');
                this.allProducts = {};
                this.showNoData();
                this.updateStats();
                this.addNotification('لا توجد بيانات متوفرة', 'info');
            }
        }, (error) => {
            console.error('❌ خطأ في تحميل البيانات:', error);
            this.addNotification('خطأ في تحميل البيانات: ' + error.message, 'error');
        });
    }

    // عرض رسالة عدم وجود بيانات
    showNoData() {
        const tableBody = document.getElementById('adminTableBody');
        const noDataDiv = document.getElementById('adminNoData');
        
        tableBody.innerHTML = '';
        noDataDiv.style.display = 'block';
        
        // تحديث الإحصائيات
        document.getElementById('totalItems').textContent = '0';
        document.getElementById('filteredItems').textContent = '0';
    }

    // عرض رسالة خطأ
    showError(message) {
        const tableBody = document.getElementById('adminTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-refresh"></i> إعادة المحاولة
                    </button>
                </td>
            </tr>
        `;
        document.getElementById('adminNoData').style.display = 'none';
    }

    applyFilters() {
        const demandFilter = document.getElementById('demandFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

        this.filteredProducts = {};

        Object.entries(this.allProducts).forEach(([id, product]) => {
            let includeProduct = true;

            // تصفية حسب مستوى الاحتياج
            if (demandFilter && product.demandLevel !== demandFilter) {
                includeProduct = false;
            }

            // تصفية حسب البحث
            if (searchTerm) {
                const searchableText = [
                    product.name,
                    product.code,
                    product.branchCode
                ].join(' ').toLowerCase();

                if (!searchableText.includes(searchTerm)) {
                    includeProduct = false;
                }
            }

            if (includeProduct) {
                this.filteredProducts[id] = product;
            }
        });

        this.renderTable();
        this.updateTableStats();
    }

    sortTable(sortKey) {
        if (this.sortConfig.key === sortKey) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = sortKey;
            this.sortConfig.direction = 'asc';
        }

        this.updateSortIcons();
        this.renderTable();
    }

    updateSortIcons() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
            if (header.dataset.sort === this.sortConfig.key) {
                header.classList.add(`sorted-${this.sortConfig.direction}`);
            }
        });
    }

    renderTable() {
        const tbody = document.getElementById('adminTableBody');
        const noData = document.getElementById('adminNoData');

        if (Object.keys(this.filteredProducts).length === 0) {
            tbody.innerHTML = '';
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';

        // تحويل البيانات لمصفوفة وترتيبها
        const productList = Object.entries(this.filteredProducts).map(([id, product]) => ({
            id,
            ...product
        }));

        // ترتيب البيانات
        productList.sort((a, b) => {
            const { key, direction } = this.sortConfig;
            let aValue = a[key];
            let bValue = b[key];

            // معالجة خاصة للتاريخ
            if (key === 'timestamp') {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (direction === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        tbody.innerHTML = productList.map(product => `
            <tr class="product-row fade-in" data-id="${product.id}" data-demand="${product.demandLevel}">
                <td class="product-name">
                    <div class="product-info">
                        <strong>${this.escapeHtml(product.name)}</strong>
                    </div>
                </td>
                <td class="product-code">
                    <code>${this.escapeHtml(product.code)}</code>
                </td>
                <td class="branch-code">
                    <span class="branch-tag">${this.escapeHtml(product.branchCode)}</span>
                </td>
                <td class="demand-level">
                    <span class="demand-badge demand-${product.demandLevel}">
                        ${this.getDemandText(product.demandLevel)}
                    </span>
                </td>
                <td class="timestamp">
                    <div>
                        <strong>${this.formatDate(product.timestamp)}</strong>
                        <br>
                        <small>${this.formatTime(product.timestamp)}</small>
                    </div>
                </td>
                <td class="actions">
                    <button class="btn-delete" onclick="adminDashboard.deleteProduct('${product.id}')" 
                            title="حذف المنتج">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // إضافة تأثير التمييز للعناصر الجديدة
        setTimeout(() => {
            document.querySelectorAll('.fade-in').forEach(row => {
                row.classList.remove('fade-in');
            });
        }, 500);
    }

    updateStats() {
        const stats = {
            urgent: 0,
            needed: 0,
            scheduled: 0,
            new: 0,
            total: 0
        };

        Object.values(this.allProducts).forEach(product => {
            stats.total++;
            if (stats.hasOwnProperty(product.demandLevel)) {
                stats[product.demandLevel]++;
            }
        });

        // تحديث الإحصائيات مع animation
        this.animateCounter('urgentCount', stats.urgent);
        this.animateCounter('neededCount', stats.needed);
        this.animateCounter('scheduledCount', stats.scheduled);
        this.animateCounter('newCount', stats.new);
        
        console.log('📊 الإحصائيات المحدثة:', stats);
    }

    // animation للعدادات
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent) || 0;
        const duration = 800; // مدة animation بالميللي ثانية
        const steps = 20;
        const stepValue = (targetValue - currentValue) / steps;
        const stepDuration = duration / steps;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            const newValue = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = newValue;

            if (currentStep >= steps) {
                element.textContent = targetValue;
                clearInterval(interval);
            }
        }, stepDuration);
    }

    updateTableStats() {
        const total = Object.keys(this.allProducts).length;
        const filtered = Object.keys(this.filteredProducts).length;
        
        document.getElementById('totalItems').textContent = total;
        document.getElementById('filteredItems').textContent = filtered;
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

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async deleteProduct(productId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟\nلا يمكن التراجع عن هذا الإجراء.')) {
            return;
        }

        try {
            await remove(ref(database, `products/${productId}`));
            this.addNotification('تم حذف المنتج بنجاح', 'success');
            
            // إضافة تأثير بصري للحذف
            const row = document.querySelector(`[data-id="${productId}"]`);
            if (row) {
                row.style.animation = 'fadeOut 0.5s ease-out forwards';
                setTimeout(() => {
                    if (row.parentNode) {
                        row.remove();
                    }
                }, 500);
            }
        } catch (error) {
            console.error('خطأ في حذف المنتج:', error);
            this.addNotification('حدث خطأ في حذف المنتج', 'error');
        }
    }

    refreshData() {
        console.log('🔄 طلب تحديث البيانات يدوياً...');
        
        const refreshBtn = document.getElementById('refreshBtn');
        const originalText = refreshBtn.innerHTML;
        
        // تغيير شكل الزر أثناء التحديث
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
        refreshBtn.disabled = true;
        
        this.addNotification('🔄 جاري تحديث البيانات...', 'info');
        
        // إعادة الاتصال بـ Firebase وتحديث البيانات
        this.testFirebaseConnection();
        
        setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
            this.addNotification('✅ تم تحديث البيانات بنجاح', 'success');
            console.log('✅ تم تحديث البيانات يدوياً');
        }, 2000);
    }

    exportData() {
        if (Object.keys(this.allProducts).length === 0) {
            this.addNotification('لا توجد بيانات للتصدير', 'error');
            return;
        }

        try {
            // تحضير البيانات للتصدير
            const exportData = Object.values(this.allProducts).map(product => ({
                'اسم المنتج': product.name,
                'كود المنتج': product.code,
                'السعر': product.price ? `${product.price} ريال` : 'غير محدد',
                'رقم الفرع': product.branchCode,
                'اسم الفرع': product.branchName || `فرع رقم ${product.branchCode}`,
                'مستوى الاحتياج': this.getDemandText(product.demandLevel),
                'تاريخ الإضافة': product.date
            }));

            // تحويل لـ CSV
            const csvContent = this.convertToCSV(exportData);
            
            // تحميل الملف
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `منتجات_الفروع_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            this.addNotification('تم تصدير البيانات بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            this.addNotification('حدث خطأ في تصدير البيانات', 'error');
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => `"${row[header] || ''}"`)
                   .join(',')
        );
        
        return '\uFEFF' + csvHeaders + '\n' + csvRows.join('\n');
    }

    exportToExcel() {
        if (Object.keys(this.allProducts).length === 0) {
            this.addNotification('لا توجد بيانات للتصدير', 'error');
            return;
        }

        try {
            // تحضير البيانات للتصدير
            const exportData = Object.values(this.allProducts).map(product => ({
                'اسم المنتج': product.name,
                'كود المنتج': product.code,
                'السعر': product.price ? `${product.price} ريال` : 'غير محدد',
                'رقم الفرع': product.branchCode,
                'اسم الفرع': product.branchName || `فرع رقم ${product.branchCode}`,
                'مستوى الاحتياج': this.getDemandText(product.demandLevel),
                'تاريخ الإضافة': product.date
            }));

            // إنشاء workbook
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "منتجات الفروع");

            // تحسين عرض الأعمدة
            const cols = [
                {wch: 30}, // اسم المنتج
                {wch: 15}, // كود المنتج  
                {wch: 12}, // السعر
                {wch: 10}, // رقم الفرع
                {wch: 20}, // اسم الفرع
                {wch: 15}, // مستوى الاحتياج
                {wch: 20}  // تاريخ الإضافة
            ];
            ws['!cols'] = cols;

            // تحميل الملف
            const fileName = `منتجات_الفروع_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.addNotification('تم تصدير ملف Excel بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تصدير Excel:', error);
            this.addNotification('حدث خطأ في تصدير Excel', 'error');
        }
    }

    async clearAllData() {
        const confirmText = 'هل أنت متأكد من حذف جميع البيانات؟\n\nهذا الإجراء سيؤدي إلى:\n• حذف جميع المنتجات نهائياً\n• فقدان جميع البيانات بشكل دائم\n• عدم إمكانية التراجع عن هذا الإجراء\n\nيرجى كتابة "حذف" للتأكيد:';
        
        const userInput = prompt(confirmText);
        
        if (userInput !== 'حذف') {
            this.addNotification('تم إلغاء عملية الحذف', 'info');
            return;
        }

        try {
            await remove(this.productsRef);
            this.addNotification('تم حذف جميع البيانات بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            this.addNotification('حدث خطأ في حذف البيانات', 'error');
        }
    }

    addNotification(message, type = 'info') {
        const notification = document.getElementById('adminNotification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// تهيئة لوحة تحكم الأدمن
const adminDashboard = new AdminDashboard();
// جعل adminDashboard متاحاً عالمياً
window.adminDashboard = adminDashboard;

// إضافة CSS للتأثيرات
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.9);
        }
    }
`;
document.head.appendChild(style);

