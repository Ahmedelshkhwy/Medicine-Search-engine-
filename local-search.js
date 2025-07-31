// نظام البحث المحلي السريع
class LocalSearchEngine {
    constructor() {
        this.productsDatabase = [];
        this.isLoaded = false;
        this.init();
    }

    async init() {
        console.log('🚀 تهيئة محرك البحث المحلي...');
        await this.loadProductsDatabase();
        console.log(`✅ تم تحميل ${this.productsDatabase.length} منتج للبحث`);
    }

    // تحميل قاعدة بيانات المنتجات
    async loadProductsDatabase() {
        try {
            console.log('🔄 جاري تحميل قاعدة بيانات المنتجات...');
            const response = await fetch('./products-db.json');
            
            if (response.ok) {
                console.log('✅ تم العثور على ملف قاعدة البيانات');
                const data = await response.json();
                
                // التحقق من البيانات قبل المعالجة
                console.log('📊 نوع البيانات المستلمة:', typeof data);
                console.log('📊 حجم البيانات:', JSON.stringify(data).length, 'بايت');
                
                this.productsDatabase = this.processDatabaseData(data);
                console.log(`✅ تم تحميل ${this.productsDatabase.length} منتج بنجاح`);
                
                // عرض عينة من البيانات للتأكد
                if (this.productsDatabase.length > 0) {
                    console.log('📋 عينة من المنتجات المحملة:', this.productsDatabase.slice(0, 3));
                }
            } else {
                console.error('❌ لم يتم العثور على ملف قاعدة البيانات - الاستجابة:', response.status);
                this.productsDatabase = [];
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل قاعدة البيانات:', error);
            console.error('❌ تفاصيل الخطأ:', error.message);
            this.productsDatabase = [];
        }
        
        this.isLoaded = true;
        console.log(`🎯 انتهى التحميل - حالة التحميل: ${this.isLoaded}, عدد المنتجات: ${this.productsDatabase.length}`);
    }

    // معالجة بيانات قاعدة البيانات
    processDatabaseData(data) {
        console.log('🔍 تحليل تنسيق البيانات...');
        console.log('📊 نوع البيانات:', typeof data);
        
        // إذا كانت البيانات كائن يحتوي على حقل products
        if (typeof data === 'object' && data.products && Array.isArray(data.products)) {
            console.log('📊 تم العثور على حقل products مع', data.products.length, 'عنصر');
            
            if (data.products.length > 0) {
                console.log('📋 عينة من البيانات:', data.products[0]);
            }
            
            return data.products.map(item => {
                // البحث عن الكود في مختلف الحقول
                const code = item.code || item.id || item.productCode || item['كود المنتج'] || item['product_code'] || '';
                
                // البحث عن الاسم في مختلف الحقول
                const name = item.name || item.productName || item['اسم المنتج'] || item['product_name'] || item.title || '';
                
                // البحث عن السعر في مختلف الحقول
                const price = parseFloat(item.price || item.cost || item['السعر'] || item['price_value'] || 0) || 0;
                
                // البحث عن الفئة في مختلف الحقول
                const category = item.category || item.type || item['الفئة'] || item['category_name'] || 'عام';
                
                // البحث عن searchText
                const searchText = item.searchText || item.search_text || '';
                
                return {
                    code: code.toString().trim(),
                    name: name.toString().trim(),
                    price: price,
                    category: category.toString().trim(),
                    searchText: searchText.toString().trim()
                };
            }).filter(product => product.code && product.name);
        }
        
        // إذا كانت البيانات مصفوفة مباشرة
        if (Array.isArray(data)) {
            console.log('📊 البيانات مصفوفة مباشرة مع', data.length, 'عنصر');
            
            if (data.length > 0) {
                console.log('📋 عينة من البيانات:', data[0]);
            }
            
            return data.map(item => {
                // البحث عن الكود في مختلف الحقول
                const code = item.code || item.id || item.productCode || item['كود المنتج'] || item['product_code'] || '';
                
                // البحث عن الاسم في مختلف الحقول
                const name = item.name || item.productName || item['اسم المنتج'] || item['product_name'] || item.title || '';
                
                // البحث عن السعر في مختلف الحقول
                const price = parseFloat(item.price || item.cost || item['السعر'] || item['price_value'] || 0) || 0;
                
                // البحث عن الفئة في مختلف الحقول
                const category = item.category || item.type || item['الفئة'] || item['category_name'] || 'عام';
                
                // البحث عن searchText
                const searchText = item.searchText || item.search_text || '';
                
                return {
                    code: code.toString().trim(),
                    name: name.toString().trim(),
                    price: price,
                    category: category.toString().trim(),
                    searchText: searchText.toString().trim()
                };
            }).filter(product => product.code && product.name);
        }
        
        console.log('❌ تنسيق بيانات غير معروف');
        return [];
    }

    // البحث السريع
    search(query) {
        console.log(`🔍 بدء البحث عن: "${query}"`);
        console.log(`📊 حالة التحميل: ${this.isLoaded}, عدد المنتجات: ${this.productsDatabase.length}`);
        
        if (!this.isLoaded || !query || query.length < 2) {
            console.log('❌ البحث مرفوض: غير محمل أو استعلام قصير');
            return [];
        }

        const searchTerm = query.toLowerCase().trim();
        console.log(`🔍 البحث عن: "${searchTerm}" في ${this.productsDatabase.length} منتج`);
        
        // البحث في البيانات الأصلية أيضاً
        const results = this.productsDatabase.filter(product => {
            // البحث في الحقول المعالجة
            const basicMatch = product.code.toLowerCase().includes(searchTerm) ||
                              product.name.toLowerCase().includes(searchTerm) ||
                              (product.category && product.category.toLowerCase().includes(searchTerm));
            
            // البحث في searchText إذا كان موجوداً
            const searchTextMatch = product.searchText && product.searchText.toLowerCase().includes(searchTerm);
            
            return basicMatch || searchTextMatch;
        }).slice(0, 10); // أول 10 نتائج فقط
        
        console.log(`✅ البحث عن "${query}": ${results.length} نتيجة`);
        if (results.length > 0) {
            console.log('📋 النتائج:', results.slice(0, 3));
        }
        return results;
    }

    // البحث بالكود
    getProductByCode(code) {
        return this.productsDatabase.find(product => 
            product.code.toLowerCase() === code.toLowerCase()
        );
    }

    // الحصول على إحصائيات قاعدة البيانات
    getDatabaseStats() {
        return {
            totalProducts: this.productsDatabase.length,
            isLoaded: this.isLoaded
        };
    }
}

// إنشاء مثيل من محرك البحث
const localSearchEngine = new LocalSearchEngine();

// تصدير الوظائف للاستخدام في التطبيق
export { localSearchEngine };

// دوال مساعدة للتوافق مع النظام الحالي
export function searchProducts(query) {
    return localSearchEngine.search(query);
}

export function getProductByCode(code) {
    return localSearchEngine.getProductByCode(code);
}

export function getDatabaseStats() {
    return localSearchEngine.getDatabaseStats();
} 