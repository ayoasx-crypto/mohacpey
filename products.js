// ==========================================
// مُحاسبي - صفحة المنتجات
// ==========================================

const SUPABASE_URL =
    "https://liqayyvzmdtlssvkzrxv.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_gFxveHgD1Ncco9OTGbNFvA_sjdqp0zy";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// المتغيرات
// ==========================================

let currentShop = null;

let allProducts = [];

let filteredProducts = [];

let currentPage = 1;

const PAGE_SIZE = 6;

let productsChannel = null;


// ==========================================
// أدوات مساعدة
// ==========================================

function getElement(id) {

    return document.getElementById(id);

}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US",
        {
            maximumFractionDigits: 2
        }
    );

}


function formatDate(value) {

    if (!value) {

        return "—";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleDateString(
        "ar-LY",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function showMessage(message) {

    const container =
        getElement(
            "productsList"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `
        <div class="empty-state">
            ${escapeHtml(message)}
        </div>
    `;

}


// ==========================================
// جلب المستخدم والمحل
// ==========================================

async function loadCurrentShop() {

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient
            .auth
            .getUser();


    if (
        userError ||
        !user
    ) {

        throw new Error(
            "انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد."
        );

    }


    const {
        data: shop,
        error: shopError
    } =
        await supabaseClient
            .from("shops")
            .select(
                "id, shop_name"
            )
            .eq(
                "user_id",
                user.id
            )
            .limit(1)
            .maybeSingle();


    if (shopError) {

        throw shopError;

    }


    if (!shop) {

        throw new Error(
            "لم يتم العثور على محل مرتبط بهذا الحساب."
        );

    }


    currentShop =
        shop;


    const shopName =
        document.querySelector(
            ".shop-name"
        );


    if (shopName) {

        shopName.textContent =
            shop.shop_name ||
            "مُحاسبي";

    }

}


// ==========================================
// جلب المنتجات من Supabase
// ==========================================

async function loadProducts() {

    if (!currentShop) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("products")
            .select(
                `
                id,
                shop_id,
                name,
                purchase_price,
                selling_price,
                stock_quantity,
                created_at
                `
            )
            .eq(
                "shop_id",
                currentShop.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        throw error;

    }


    allProducts =
        Array.isArray(data)
            ? data
            : [];


    filteredProducts =
        [...allProducts];


    updateStats();

    renderProducts();

}


// ==========================================
// إحصائيات المنتجات
// ==========================================

function updateStats() {

    const totalProducts =
        allProducts.length;


    const totalStock =
        allProducts.reduce(
            function (
                sum,
                product
            ) {

                return (
                    sum +
                    Number(
                        product.stock_quantity ||
                        0
                    )
                );

            },
            0
        );


    const inventoryValue =
        allProducts.reduce(
            function (
                sum,
                product
            ) {

                return (
                    sum +
                    (
                        Number(
                            product.stock_quantity ||
                            0
                        ) *
                        Number(
                            product.purchase_price ||
                            0
                        )
                    )
                );

            },
            0
        );


    const sellingValue =
        allProducts.reduce(
            function (
                sum,
                product
            ) {

                return (
                    sum +
                    (
                        Number(
                            product.stock_quantity ||
                            0
                        ) *
                        Number(
                            product.selling_price ||
                            0
                        )
                    )
                );

            },
            0
        );


    const lowStock =
        allProducts.filter(
            function (
                product
            ) {

                const quantity =
                    Number(
                        product.stock_quantity ||
                        0
                    );


                return (
                    quantity > 0 &&
                    quantity <= 5
                );

            }
        ).length;


    const outOfStock =
        allProducts.filter(
            function (
                product
            ) {

                return (
                    Number(
                        product.stock_quantity ||
                        0
                    ) <= 0
                );

            }
        ).length;


    const totalProductsElement =
        getElement(
            "totalProducts"
        );


    const totalStockElement =
        getElement(
            "totalStock"
        );


    const inventoryValueElement =
        getElement(
            "inventoryValue"
        );


    const sellingValueElement =
        getElement(
            "sellingValue"
        );


    const lowStockElement =
        getElement(
            "lowStock"
        );


    const outOfStockElement =
        getElement(
            "outOfStock"
        );


    if (totalProductsElement) {

        totalProductsElement.textContent =
            formatNumber(
                totalProducts
            );

    }


    if (totalStockElement) {

        totalStockElement.textContent =
            formatNumber(
                totalStock
            );

    }


    if (inventoryValueElement) {

        inventoryValueElement.textContent =
            formatNumber(
                inventoryValue
            ) +
            " د.ل";

    }


    if (sellingValueElement) {

        sellingValueElement.textContent =
            formatNumber(
                sellingValue
            ) +
            " د.ل";

    }


    if (lowStockElement) {

        lowStockElement.textContent =
            formatNumber(
                lowStock
            );

    }


    if (outOfStockElement) {

        outOfStockElement.textContent =
            formatNumber(
                outOfStock
            );

    }

}


// ==========================================
// حالة المخزون
// ==========================================

function getStockStatus(
    quantity
) {

    quantity =
        Number(
            quantity || 0
        );


    if (quantity <= 0) {

        return {
            text: "نفد المخزون",
            className: "out-stock"
        };

    }


    if (quantity <= 5) {

        return {
            text: "مخزون منخفض",
            className: "low-stock"
        };

    }


    return {
        text: "متوفر",
        className: "in-stock"
    };

}


// ==========================================
// البحث والفلترة
// ==========================================

function applyFilters(
    resetPage = true
) {

    const searchInput =
        getElement(
            "searchInput"
        );


    const stockFilter =
        getElement(
            "stockFilter"
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const stockStatus =
        stockFilter
            ? stockFilter.value
            : "";


    filteredProducts =
        allProducts.filter(
            function (
                product
            ) {

                const name =
                    String(
                        product.name ||
                        ""
                    ).toLowerCase();


                const id =
                    String(
                        product.id ||
                        ""
                    );


                const quantity =
                    Number(
                        product.stock_quantity ||
                        0
                    );


                const matchesSearch =
                    !search ||
                    name.includes(
                        search
                    ) ||
                    id.includes(
                        search
                    );


                let matchesStock =
                    true;


                if (
                    stockStatus ===
                    "available"
                ) {

                    matchesStock =
                        quantity > 5;

                }


                if (
                    stockStatus ===
                    "low"
                ) {

                    matchesStock =
                        quantity > 0 &&
                        quantity <= 5;

                }


                if (
                    stockStatus ===
                    "out"
                ) {

                    matchesStock =
                        quantity <= 0;

                }


                return (
                    matchesSearch &&
                    matchesStock
                );

            }
        );


    if (resetPage) {

        currentPage =
            1;

    }


    renderProducts();

}


// ==========================================
// عرض المنتجات
// ==========================================

function renderProducts() {

    const container =
        getElement(
            "productsList"
        );


    if (!container) {

        return;

    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredProducts.length /
                PAGE_SIZE
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const start =
        (
            currentPage -
            1
        ) *
        PAGE_SIZE;


    const pageProducts =
        filteredProducts.slice(
            start,
            start +
            PAGE_SIZE
        );


    if (!pageProducts.length) {

        container.innerHTML = `
            <div class="empty-state">
                لا توجد منتجات مطابقة.
            </div>
        `;

        renderPagination(
            totalPages
        );

        return;

    }


    container.innerHTML =
        pageProducts
            .map(
                function (
                    product
                ) {

                    const quantity =
                        Number(
                            product.stock_quantity ||
                            0
                        );


                    const purchasePrice =
                        Number(
                            product.purchase_price ||
                            0
                        );


                    const sellingPrice =
                        Number(
                            product.selling_price ||
                            0
                        );


                    const profitPerUnit =
                        sellingPrice -
                        purchasePrice;


                    const stockStatus =
                        getStockStatus(
                            quantity
                        );


                    return `
                        <article class="product-card">

                            <div class="product-card-top">

                                <div class="product-icon">
                                    📦
                                </div>

                                <div class="product-title">

                                    <strong>
                                        ${escapeHtml(
                                            product.name ||
                                            "منتج بدون اسم"
                                        )}
                                    </strong>

                                    <span>
                                        المنتج #${escapeHtml(
                                            product.id
                                        )}
                                    </span>

                                </div>

                                <span class="stock-badge ${stockStatus.className}">
                                    ${stockStatus.text}
                                </span>

                            </div>


                            <div class="product-details">

                                <div class="product-detail">

                                    <span>
                                        سعر الشراء
                                    </span>

                                    <strong>
                                        ${formatNumber(
                                            purchasePrice
                                        )}
                                        د.ل
                                    </strong>

                                </div>


                                <div class="product-detail">

                                    <span>
                                        سعر البيع
                                    </span>

                                    <strong>
                                        ${formatNumber(
                                            sellingPrice
                                        )}
                                        د.ل
                                    </strong>

                                </div>


                                <div class="product-detail">

                                    <span>
                                        المخزون
                                    </span>

                                    <strong>
                                        ${formatNumber(
                                            quantity
                                        )}
                                        وحدة
                                    </strong>

                                </div>


                                <div class="product-detail">

                                    <span>
                                        ربح الوحدة
                                    </span>

                                    <strong class="profit-text">
                                        ${formatNumber(
                                            profitPerUnit
                                        )}
                                        د.ل
                                    </strong>

                                </div>

                            </div>


                            <div class="product-card-footer">

                                <span>
                                    أضيف في:
                                    ${escapeHtml(
                                        formatDate(
                                            product.created_at
                                        )
                                    )}
                                </span>


                                <span>
                                    قيمة المخزون:
                                    ${formatNumber(
                                        quantity *
                                        purchasePrice
                                    )}
                                    د.ل
                                </span>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");


    renderPagination(
        totalPages
    );

}


// ==========================================
// ترقيم الصفحات
// ==========================================

function renderPagination(
    totalPages
) {

    const pageInfo =
        getElement(
            "pageInfo"
        );


    const previousButton =
        getElement(
            "prevPage"
        );


    const nextButton =
        getElement(
            "nextPage"
        );


    if (pageInfo) {

        pageInfo.textContent =
            `${currentPage} / ${totalPages}`;

    }


    if (previousButton) {

        previousButton.disabled =
            currentPage <= 1;

    }


    if (nextButton) {

        nextButton.disabled =
            currentPage >=
            totalPages;

    }

}


// ==========================================
// Realtime
// ==========================================

function subscribeRealtime() {

    if (!currentShop) {

        return;

    }


    if (productsChannel) {

        supabaseClient.removeChannel(
            productsChannel
        );

    }


    productsChannel =
        supabaseClient
            .channel(
                `products-page-${currentShop.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "products",
                    filter:
                        `shop_id=eq.${currentShop.id}`
                },
                async function () {

                    try {

                        await loadProducts();

                        showToast(
                            "تم تحديث المنتجات تلقائيًا"
                        );

                    } catch (error) {

                        console.error(
                            "Products Realtime Error:",
                            error
                        );

                    }

                }
            )
            .subscribe(
                function (
                    status
                ) {

                    console.log(
                        "Products Realtime:",
                        status
                    );

                }
            );

}


// ==========================================
// رسالة مؤقتة
// ==========================================

function showToast(
    message
) {

    const toast =
        getElement(
            "toast"
        );


    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        showToast.timer
    );


    showToast.timer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            1800
        );

}


// ==========================================
// الأحداث
// ==========================================

function setupEvents() {

    const searchInput =
        getElement(
            "searchInput"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                applyFilters(
                    true
                );

            }
        );

    }


    const stockFilter =
        getElement(
            "stockFilter"
        );


    if (stockFilter) {

        stockFilter.addEventListener(
            "change",
            function () {

                applyFilters(
                    true
                );

            }
        );

    }


    const resetButton =
        getElement(
            "resetFilters"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                if (searchInput) {

                    searchInput.value =
                        "";

                }


                if (stockFilter) {

                    stockFilter.value =
                        "";

                }


                applyFilters(
                    true
                );

            }
        );

    }


    const refreshButton =
        getElement(
            "refreshProducts"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                try {

                    await loadProducts();

                    showToast(
                        "تم تحديث المنتجات"
                    );

                } catch (error) {

                    console.error(
                        "Refresh Products Error:",
                        error
                    );

                }

            }
        );

    }


    const previousButton =
        getElement(
            "prevPage"
        );


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            function () {

                if (
                    currentPage >
                    1
                ) {

                    currentPage--;

                    renderProducts();

                }

            }
        );

    }


    const nextButton =
        getElement(
            "nextPage"
        );


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function () {

                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filteredProducts.length /
                            PAGE_SIZE
                        )
                    );


                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;

                    renderProducts();

                }

            }
        );

    }

}


// ==========================================
// تشغيل الصفحة
// ==========================================

async function initProductsPage() {

    try {

        setupEvents();

        await loadCurrentShop();

        await loadProducts();

        subscribeRealtime();

    } catch (error) {

        console.error(
            "Products Page Error:",
            error
        );


        showMessage(
            "تعذر تحميل المنتجات: " +
            (
                error.message ||
                "خطأ غير معروف"
            )
        );

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initProductsPage
);