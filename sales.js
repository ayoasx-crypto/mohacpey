const SUPABASE_URL = "https://liqayyvzmdtlssvkzrxv.supabase.co";
const SUPABASE_KEY = "sb_publishable_gFxveHgD1Ncco9OTGbNFvA_sjdqp0zy";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let currentShop = null;
let allSales = [];
let productsMap = {};
let filteredSales = [];
let currentPage = 1;

const PAGE_SIZE = 6;

let salesChannel = null;


// ======================================
// أدوات مساعدة
// ======================================

const $ = (id) =>
    document.getElementById(id);


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


function formatDateTime(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    return date.toLocaleString(
        "ar-LY",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function timeAgo(value) {

    if (!value) {
        return "";
    }

    const seconds =
        Math.max(
            0,
            Math.floor(
                (
                    Date.now() -
                    new Date(value).getTime()
                ) / 1000
            )
        );


    if (seconds < 60) {

        return "منذ أقل من دقيقة";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes === 1) {

        return "منذ دقيقة";

    }


    if (minutes === 2) {

        return "منذ دقيقتين";

    }


    if (minutes < 11) {

        return `منذ ${minutes} دقائق`;

    }


    if (minutes < 60) {

        return `منذ ${minutes} دقيقة`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours === 1) {

        return "منذ ساعة";

    }


    if (hours === 2) {

        return "منذ ساعتين";

    }


    if (hours < 11) {

        return `منذ ${hours} ساعات`;

    }


    if (hours < 24) {

        return `منذ ${hours} ساعة`;

    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days === 1) {

        return "منذ يوم";

    }


    if (days === 2) {

        return "منذ يومين";

    }


    if (days < 11) {

        return `منذ ${days} أيام`;

    }


    return `منذ ${days} يوم`;

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


function showToast(message) {

    const toast =
        $("toast");

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


// ======================================
// جلب المستخدم والمحل
// ======================================

async function getCurrentUserAndShop() {

    const {
        data: {
            user
        },
        error: userError
    } =
        await supabaseClient.auth.getUser();


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


    const storeName =
        $("storeName");

    if (storeName) {

        storeName.textContent =
            shop.shop_name ||
            "مُحاسبي";

    }

}


// ======================================
// جلب المنتجات
// ======================================

async function loadProducts(
    productIds
) {

    productsMap = {};


    if (
        !productIds.length
    ) {

        updateProductFilter();

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("products")
            .select(
                "id, name"
            )
            .in(
                "id",
                productIds
            );


    if (error) {

        throw error;

    }


    for (
        const product of (
            data || []
        )
    ) {

        productsMap[
            product.id
        ] =
            product.name;

    }


    updateProductFilter();

}


// ======================================
// جلب المبيعات
// ======================================

async function loadSales() {

    if (!currentShop) {

        return;

    }


    const connectionStatus =
        $("connectionStatus");

    if (connectionStatus) {

        connectionStatus.textContent =
            "● جاري التحديث";

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("sales")
            .select(
                `
                id,
                shop_id,
                product_id,
                quantity,
                total_amount,
                profit_amount,
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


    allSales =
        Array.isArray(data)
            ? data
            : [];


    const productIds =
        [
            ...new Set(
                allSales
                    .map(
                        sale =>
                            sale.product_id
                    )
                    .filter(
                        Boolean
                    )
            )
        ];


    await loadProducts(
        productIds
    );


    applyFilters(false);

    updateStats(
        allSales
    );

    renderSales();


    if (connectionStatus) {

        connectionStatus.textContent =
            "● متصل";

    }

}


// ======================================
// تحديث الإحصائيات
// ======================================

function updateStats(rows) {

    const totalSales =
        rows.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                Number(
                    sale.total_amount ||
                    0
                ),
            0
        );


    const totalProfit =
        rows.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                Number(
                    sale.profit_amount ||
                    0
                ),
            0
        );


    const invoiceCount =
        rows.length;


    const productsSold =
        rows.reduce(
            (
                sum,
                sale
            ) =>
                sum +
                Number(
                    sale.quantity ||
                    0
                ),
            0
        );


    if ($("salesTotal")) {

        $("salesTotal").textContent =
            `${formatNumber(totalSales)} د.ل`;

    }


    if ($("profitTotal")) {

        $("profitTotal").textContent =
            `${formatNumber(totalProfit)} د.ل`;

    }


    if ($("invoiceTotal")) {

        $("invoiceTotal").textContent =
            formatNumber(
                invoiceCount
            );

    }


    if ($("productsTotal")) {

        $("productsTotal").textContent =
            formatNumber(
                productsSold
            );

    }

}


// ======================================
// تحديث فلتر المنتجات
// ======================================

function updateProductFilter() {

    const select =
        $("productFilter");


    if (!select) {

        return;

    }


    const selected =
        select.value;


    const ids =
        [
            ...new Set(
                allSales
                    .map(
                        sale =>
                            sale.product_id
                    )
                    .filter(
                        Boolean
                    )
            )
        ];


    select.innerHTML =
        `
        <option value="">
            كل المنتجات
        </option>
        `;


    ids.forEach(
        function (id) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                String(
                    id
                );


            option.textContent =
                productsMap[id] ||
                `منتج #${id}`;


            select.appendChild(
                option
            );

        }
    );


    if (
        ids.includes(
            Number(selected)
        )
    ) {

        select.value =
            selected;

    }

}


// ======================================
// تطبيق البحث والفلاتر
// ======================================

function applyFilters(
    resetPage = true
) {

    const searchInput =
        $("searchInput");


    const productFilter =
        $("productFilter");


    const dateFrom =
        $("dateFrom");


    const dateTo =
        $("dateTo");


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const productId =
        productFilter
            ? productFilter.value
            : "";


    const from =
        dateFrom
            ? dateFrom.value
            : "";


    const to =
        dateTo
            ? dateTo.value
            : "";


    filteredSales =
        allSales.filter(
            function (sale) {

                const productName =
                    productsMap[
                        sale.product_id
                    ] ||
                    `منتج #${
                        sale.product_id ||
                        ""
                    }`;


                const matchesSearch =
                    !search ||
                    String(
                        sale.id
                    )
                        .toLowerCase()
                        .includes(
                            search
                        ) ||
                    productName
                        .toLowerCase()
                        .includes(
                            search
                        );


                const matchesProduct =
                    !productId ||
                    String(
                        sale.product_id
                    ) ===
                    productId;


                const saleDate =
                    sale.created_at
                        ? new Date(
                            sale.created_at
                        )
                        : null;


                const saleDay =
                    saleDate
                        ? saleDate
                            .toISOString()
                            .slice(
                                0,
                                10
                            )
                        : "";


                const matchesFrom =
                    !from ||
                    saleDay >= from;


                const matchesTo =
                    !to ||
                    saleDay <= to;


                return (
                    matchesSearch &&
                    matchesProduct &&
                    matchesFrom &&
                    matchesTo
                );

            }
        );


    if (resetPage) {

        currentPage =
            1;

    }


    renderSales();

}


// ======================================
// عرض المبيعات
// ======================================

function renderSales() {

    const list =
        $("salesList");


    if (!list) {

        return;

    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredSales.length /
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


    const rows =
        filteredSales.slice(
            start,
            start +
            PAGE_SIZE
        );


    if (!rows.length) {

        list.innerHTML =
            `
            <div class="empty">
                لا توجد عمليات بيع مطابقة للبحث أو الفلاتر.
            </div>
            `;


        renderPagination(
            1
        );

        return;

    }


    list.innerHTML =
        rows
            .map(
                function (sale) {

                    const productName =
                        productsMap[
                            sale.product_id
                        ] ||
                        `منتج #${
                            sale.product_id ||
                            ""
                        }`;


                    const quantity =
                        Number(
                            sale.quantity ||
                            0
                        );


                    const amount =
                        Number(
                            sale.total_amount ||
                            0
                        );


                    const profit =
                        Number(
                            sale.profit_amount ||
                            0
                        );


                    return `
                        <article class="sale-card">

                            <div class="sale-main">

                                <div class="sale-id">
                                    #${escapeHtml(
                                        sale.id
                                    )}
                                </div>


                                <div class="sale-product">

                                    <div class="sale-icon">
                                        📦
                                    </div>


                                    <div>

                                        <strong>
                                            ${escapeHtml(
                                                productName
                                            )}
                                        </strong>


                                        <span>
                                            الكمية:
                                            ${formatNumber(
                                                quantity
                                            )}
                                            •
                                            ${escapeHtml(
                                                timeAgo(
                                                    sale.created_at
                                                )
                                            )}
                                        </span>

                                    </div>

                                </div>


                                <div class="sale-amount">

                                    <strong>
                                        ${formatNumber(
                                            amount
                                        )}
                                        د.ل
                                    </strong>


                                    <span class="profit-pill">
                                        ربح
                                        ${formatNumber(
                                            profit
                                        )}
                                        د.ل
                                    </span>

                                </div>

                            </div>


                            <div class="sale-meta">

                                <span>
                                    التاريخ:
                                    ${escapeHtml(
                                        formatDateTime(
                                            sale.created_at
                                        )
                                    )}
                                </span>


                                <span>
                                    منتج #
                                    ${escapeHtml(
                                        sale.product_id ??
                                        "—"
                                    )}
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


// ======================================
// ترقيم الصفحات
// ======================================

function renderPagination(
    totalPages
) {

    const prevPage =
        $("prevPage");


    const nextPage =
        $("nextPage");


    if (prevPage) {

        prevPage.disabled =
            currentPage <= 1;

    }


    if (nextPage) {

        nextPage.disabled =
            currentPage >=
            totalPages;

    }


    const holder =
        $("pageNumbers");


    if (!holder) {

        return;

    }


    holder.innerHTML =
        "";


    const start =
        Math.max(
            1,
            currentPage - 2
        );


    const end =
        Math.min(
            totalPages,
            start + 4
        );


    for (
        let page = start;
        page <= end;
        page++
    ) {

        const btn =
            document.createElement(
                "button"
            );


        btn.className =
            "page-number" +
            (
                page === currentPage
                    ? " active"
                    : ""
            );


        btn.textContent =
            String(page);


        btn.type =
            "button";


        btn.addEventListener(
            "click",
            function () {

                currentPage =
                    page;


                renderSales();


                window.scrollTo(
                    {
                        top: 0,
                        behavior: "smooth"
                    }
                );

            }
        );


        holder.appendChild(
            btn
        );

    }

}


// ======================================
// التصدير CSV
// ======================================

function exportCsv() {

    if (
        !filteredSales.length
    ) {

        showToast(
            "لا توجد بيانات للتصدير"
        );

        return;

    }


    const rows =
        [
            [
                "رقم العملية",
                "المنتج",
                "الكمية",
                "إجمالي البيع",
                "الربح",
                "التاريخ والوقت"
            ],


            ...filteredSales.map(
                function (sale) {

                    return [
                        sale.id,


                        productsMap[
                            sale.product_id
                        ] ||
                        `منتج #${
                            sale.product_id ||
                            ""
                        }`,


                        Number(
                            sale.quantity ||
                            0
                        ),


                        Number(
                            sale.total_amount ||
                            0
                        ),


                        Number(
                            sale.profit_amount ||
                            0
                        ),


                        formatDateTime(
                            sale.created_at
                        )
                    ];

                }
            )
        ];


    const csv =
        rows
            .map(
                function (row) {

                    return row
                        .map(
                            function (value) {

                                const text =
                                    String(
                                        value ??
                                        ""
                                    )
                                        .replaceAll(
                                            '"',
                                            '""'
                                        );


                                return `"${text}"`;

                            }
                        )
                        .join(",");

                }
            )
            .join("\r\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `mohasibi-sales-${
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                )
        }.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showToast(
        "تم تصدير المبيعات"
    );

}


// ======================================
// Realtime
// ======================================

function subscribeRealtime() {

    if (!currentShop) {

        return;

    }


    if (salesChannel) {

        supabaseClient.removeChannel(
            salesChannel
        );

    }


    salesChannel =
        supabaseClient
            .channel(
                `sales-page-${currentShop.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "sales",
                    filter:
                        `shop_id=eq.${currentShop.id}`
                },
                async function () {

                    try {

                        await loadSales();


                        showToast(
                            "تم تحديث المبيعات تلقائيًا"
                        );

                    } catch (error) {

                        console.error(
                            "Realtime load error:",
                            error
                        );

                    }

                }
            )
            .subscribe(
                function (status) {

                    console.log(
                        "Sales Realtime:",
                        status
                    );

                }
            );

}


// ======================================
// ربط أحداث الصفحة
// ======================================

function wireEvents() {

    const searchInput =
        $("searchInput");


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


    const productFilter =
        $("productFilter");


    if (productFilter) {

        productFilter.addEventListener(
            "change",
            function () {

                applyFilters(
                    true
                );

            }
        );

    }


    const dateFrom =
        $("dateFrom");


    if (dateFrom) {

        dateFrom.addEventListener(
            "change",
            function () {

                applyFilters(
                    true
                );

            }
        );

    }


    const dateTo =
        $("dateTo");


    if (dateTo) {

        dateTo.addEventListener(
            "change",
            function () {

                applyFilters(
                    true
                );

            }
        );

    }


    const resetFilters =
        $("resetFilters");


    if (resetFilters) {

        resetFilters.addEventListener(
            "click",
            function () {

                if (searchInput) {

                    searchInput.value =
                        "";

                }


                if (productFilter) {

                    productFilter.value =
                        "";

                }


                if (dateFrom) {

                    dateFrom.value =
                        "";

                }


                if (dateTo) {

                    dateTo.value =
                        "";

                }


                applyFilters(
                    true
                );

            }
        );

    }


    const exportCsvButton =
        $("exportCsv");


    if (exportCsvButton) {

        exportCsvButton.addEventListener(
            "click",
            exportCsv
        );

    }


    const refreshSales =
        $("refreshSales");


    if (refreshSales) {

        refreshSales.addEventListener(
            "click",
            async function () {

                try {

                    await loadSales();


                    showToast(
                        "تم تحديث البيانات"
                    );

                } catch (error) {

                    console.error(
                        "Refresh error:",
                        error
                    );

                }

            }
        );

    }


    const refreshTop =
        $("refreshTop");


    if (refreshTop) {

        refreshTop.addEventListener(
            "click",
            async function () {

                try {

                    await loadSales();


                    showToast(
                        "تم تحديث البيانات"
                    );

                } catch (error) {

                    console.error(
                        "Refresh error:",
                        error
                    );

                }

            }
        );

    }


    const prevPage =
        $("prevPage");


    if (prevPage) {

        prevPage.addEventListener(
            "click",
            function () {

                if (
                    currentPage >
                    1
                ) {

                    currentPage--;


                    renderSales();

                }

            }
        );

    }


    const nextPage =
        $("nextPage");


    if (nextPage) {

        nextPage.addEventListener(
            "click",
            function () {

                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filteredSales.length /
                            PAGE_SIZE
                        )
                    );


                if (
                    currentPage <
                    totalPages
                ) {

                    currentPage++;


                    renderSales();

                }

            }
        );

    }

}


// ======================================
// تشغيل الصفحة
// ======================================

async function init() {

    try {

        wireEvents();

        await getCurrentUserAndShop();

        await loadSales();

        subscribeRealtime();

    } catch (error) {

        console.error(
            "Sales Page Error:",
            error
        );


        const salesList =
            $("salesList");


        if (salesList) {

            salesList.innerHTML =
                `
                <div class="empty">
                    تعذر تحميل بيانات المبيعات:
                    ${escapeHtml(
                        error.message ||
                        "خطأ غير معروف"
                    )}
                </div>
                `;

        }


        const connectionStatus =
            $("connectionStatus");


        if (connectionStatus) {

            connectionStatus.textContent =
                "● غير متصل";

        }

    }

}


document.addEventListener(
    "DOMContentLoaded",
    init
);