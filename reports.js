const SUPABASE_URL =
    "https://liqayyvzmdtlssvkzrxv.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_gFxveHgD1Ncco9OTGbNFvA_sjdqp0zy";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

let shop = null;
let sales = [];
let productsMap = {};
let filteredSales = [];
let selectedPeriod = "month";
let reportsChannel = null;


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


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function getDateKey(value) {

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }

    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            date.getDate()
        ).padStart(2, "0")
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


function showToast(message) {

    const toast =
        getElement(
            "reportToast"
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
// جلب بيانات المحل
// ==========================================

async function loadShop() {

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
        data: shopData,
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


    if (!shopData) {

        throw new Error(
            "لم يتم العثور على محل مرتبط بهذا الحساب."
        );

    }


    shop =
        shopData;


    const shopName =
        getElement(
            "shopName"
        );


    if (shopName) {

        shopName.textContent =
            shop.shop_name ||
            "مُحاسبي";

    }

}


// ==========================================
// جلب المبيعات والمنتجات
// ==========================================

async function loadData() {

    if (!shop) {

        return;

    }


    const {
        data: salesData,
        error: salesError
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
                shop.id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (salesError) {

        throw salesError;

    }


    sales =
        Array.isArray(
            salesData
        )
            ? salesData
            : [];


    const productIds =
        [
            ...new Set(
                sales
                    .map(
                        sale =>
                            sale.product_id
                    )
                    .filter(
                        Boolean
                    )
            )
        ];


    productsMap =
        {};


    if (
        productIds.length > 0
    ) {

        const {
            data: products,
            error: productsError
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


        if (productsError) {

            throw productsError;

        }


        (
            products || []
        ).forEach(
            function (
                product
            ) {

                productsMap[
                    product.id
                ] =
                    product.name;

            }
        );

    }


    applyReportFilter();

}


// ==========================================
// تحديد الفترة
// ==========================================

function getPeriodRange() {

    const today =
        new Date();

    const todayKey =
        getDateKey(
            today
        );


    if (
        selectedPeriod ===
        "today"
    ) {

        return {
            from: todayKey,
            to: todayKey
        };

    }


    if (
        selectedPeriod ===
        "week"
    ) {

        const start =
            new Date(
                today
            );


        const day =
            start.getDay();


        const difference =
            day === 0
                ? 6
                : day - 1;


        start.setDate(
            start.getDate() -
            difference
        );


        return {
            from:
                getDateKey(
                    start
                ),
            to:
                todayKey
        };

    }


    if (
        selectedPeriod ===
        "month"
    ) {

        const start =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );


        return {
            from:
                getDateKey(
                    start
                ),
            to:
                todayKey
        };

    }


    return {
        from: "",
        to: ""
    };

}


// ==========================================
// تطبيق فلتر الفترة
// ==========================================

function applyReportFilter() {

    const dateFrom =
        getElement(
            "dateFrom"
        );


    const dateTo =
        getElement(
            "dateTo"
        );


    const periodRange =
        getPeriodRange();


    const from =
        dateFrom &&
        dateFrom.value
            ? dateFrom.value
            : periodRange.from;


    const to =
        dateTo &&
        dateTo.value
            ? dateTo.value
            : periodRange.to;


    filteredSales =
        sales.filter(
            function (
                sale
            ) {

                if (
                    !sale.created_at
                ) {

                    return false;

                }


                const saleDay =
                    getDateKey(
                        sale.created_at
                    );


                if (!saleDay) {

                    return false;

                }


                if (
                    from &&
                    saleDay < from
                ) {

                    return false;

                }


                if (
                    to &&
                    saleDay > to
                ) {

                    return false;

                }


                return true;

            }
        );


    updateStats();

    renderChart();

    renderTopProducts();

    renderDailySummary();


    const status =
        getElement(
            "reportStatus"
        );


    if (status) {

        status.textContent =
            `تم تحليل ${formatNumber(
                filteredSales.length
            )} عملية بيع`;

    }

}


// ==========================================
// الإحصائيات
// ==========================================

function updateStats() {

    const totalSales =
        filteredSales.reduce(
            function (
                sum,
                sale
            ) {

                return (
                    sum +
                    Number(
                        sale.total_amount ||
                        0
                    )
                );

            },
            0
        );


    const totalProfit =
        filteredSales.reduce(
            function (
                sum,
                sale
            ) {

                return (
                    sum +
                    Number(
                        sale.profit_amount ||
                        0
                    )
                );

            },
            0
        );


    const invoiceCount =
        filteredSales.length;


    const productsSold =
        filteredSales.reduce(
            function (
                sum,
                sale
            ) {

                return (
                    sum +
                    Number(
                        sale.quantity ||
                        0
                    )
                );

            },
            0
        );


    const salesElement =
        getElement(
            "reportSales"
        );


    const profitElement =
        getElement(
            "reportProfit"
        );


    const invoiceElement =
        getElement(
            "reportInvoices"
        );


    const productsElement =
        getElement(
            "reportUnits"
        );


    if (salesElement) {

        salesElement.textContent =
            `${formatNumber(
                totalSales
            )} د.ل`;

    }


    if (profitElement) {

        profitElement.textContent =
            `${formatNumber(
                totalProfit
            )} د.ل`;

    }


    if (invoiceElement) {

        invoiceElement.textContent =
            formatNumber(
                invoiceCount
            );

    }


    if (productsElement) {

        productsElement.textContent =
            formatNumber(
                productsSold
            );

    }

}


// ==========================================
// الرسم البياني
// ==========================================

function renderChart() {

    const canvas =
        getElement(
            "salesChart"
        );


    if (!canvas) {

        return;

    }


    const groupedSales =
        {};


    filteredSales.forEach(
        function (
            sale
        ) {

            if (
                !sale.created_at
            ) {

                return;

            }


            const day =
                getDateKey(
                    sale.created_at
                );


            if (!day) {

                return;

            }


            groupedSales[day] =
                (
                    groupedSales[day] ||
                    0
                ) +
                Number(
                    sale.total_amount ||
                    0
                );

        }
    );


    const labels =
        Object.keys(
            groupedSales
        ).sort();


    const values =
        labels.map(
            function (
                label
            ) {

                return groupedSales[
                    label
                ];

            }
        );


    const ctx =
        canvas.getContext(
            "2d"
        );


    if (!ctx) {

        return;

    }


    const width =
        canvas.clientWidth ||
        320;


    const height =
        220;


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        width *
        dpr;


    canvas.height =
        height *
        dpr;


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    if (
        labels.length === 0
    ) {

        ctx.fillStyle =
            "#8a94a6";

        ctx.font =
            "12px Arial";

        ctx.textAlign =
            "center";

        ctx.fillText(
            "لا توجد بيانات في الفترة المحددة",
            width / 2,
            height / 2
        );

        ctx.textAlign =
            "start";

        return;

    }


    const padding =
        {
            left: 42,
            right: 12,
            top: 18,
            bottom: 30
        };


    const chartWidth =
        width -
        padding.left -
        padding.right;


    const chartHeight =
        height -
        padding.top -
        padding.bottom;


    const maxValue =
        Math.max(
            ...values,
            1
        );


    ctx.strokeStyle =
        "#e9edf3";

    ctx.lineWidth =
        1;


    for (
        let i = 0;
        i <= 4;
        i++
    ) {

        const y =
            padding.top +
            (
                chartHeight *
                i /
                4
            );


        ctx.beginPath();

        ctx.moveTo(
            padding.left,
            y
        );

        ctx.lineTo(
            width -
            padding.right,
            y
        );

        ctx.stroke();

    }


    const points =
        values.map(
            function (
                value,
                index
            ) {

                const x =
                    labels.length === 1
                        ? width / 2
                        : padding.left +
                          (
                              chartWidth *
                              index /
                              (
                                  labels.length -
                                  1
                              )
                          );


                const y =
                    padding.top +
                    chartHeight -
                    (
                        value /
                        maxValue
                    ) *
                    chartHeight;


                return {
                    x,
                    y
                };

            }
        );


    ctx.strokeStyle =
        "#2563eb";

    ctx.lineWidth =
        3;


    ctx.beginPath();


    points.forEach(
        function (
            point,
            index
        ) {

            if (
                index === 0
            ) {

                ctx.moveTo(
                    point.x,
                    point.y
                );

            } else {

                ctx.lineTo(
                    point.x,
                    point.y
                );

            }

        }
    );


    ctx.stroke();


    ctx.fillStyle =
        "#2563eb";


    points.forEach(
        function (
            point
        ) {

            ctx.beginPath();

            ctx.arc(
                point.x,
                point.y,
                4,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }
    );


    ctx.fillStyle =
        "#8a94a6";

    ctx.font =
        "10px Arial";


    const labelStep =
        Math.max(
            1,
            Math.ceil(
                labels.length /
                5
            )
        );


    labels.forEach(
        function (
            label,
            index
        ) {

            if (
                index %
                    labelStep !==
                    0 &&
                index !==
                    labels.length - 1
            ) {

                return;

            }


            const point =
                points[index];


            const text =
                label.slice(
                    5
                );


            ctx.fillText(
                text,
                point.x - 10,
                height - 8
            );

        }
    );

}


// ==========================================
// الأكثر مبيعًا
// ==========================================

function renderTopProducts() {

    const container =
        getElement(
            "topProducts"
        );


    if (!container) {

        return;

    }


    const totals =
        {};


    filteredSales.forEach(
        function (
            sale
        ) {

            const productId =
                sale.product_id;


            if (!productId) {

                return;

            }


            totals[productId] =
                (
                    totals[productId] ||
                    0
                ) +
                Number(
                    sale.quantity ||
                    0
                );

        }
    );


    const rows =
        Object.entries(
            totals
        )
            .sort(
                function (
                    a,
                    b
                ) {

                    return (
                        Number(b[1]) -
                        Number(a[1])
                    );

                }
            )
            .slice(
                0,
                5
            );


    if (
        rows.length === 0
    ) {

        container.innerHTML =
            `
            <div class="chart-empty">
                لا توجد بيانات مبيعات في الفترة المحددة.
            </div>
            `;

        return;

    }


    const maxQuantity =
        Number(
            rows[0][1]
        );


    container.innerHTML =
        rows
            .map(
                function (
                    row
                ) {

                    const productId =
                        row[0];


                    const quantity =
                        Number(
                            row[1]
                        );


                    const productName =
                        productsMap[
                            productId
                        ] ||
                        `منتج #${productId}`;


                    const percentage =
                        maxQuantity >
                        0
                            ? Math.round(
                                (
                                    quantity /
                                    maxQuantity
                                ) *
                                100
                            )
                            : 0;


                    return `
                        <div class="top-product-row">

                            <div class="top-product-main">

                                <div class="top-product-name">

                                    <strong>
                                        📦 ${escapeHtml(
                                            productName
                                        )}
                                    </strong>

                                    <span>
                                        ${formatNumber(
                                            quantity
                                        )}
                                        وحدة
                                    </span>

                                </div>

                                <div class="top-product-bar">

                                    <div
                                        style="width:${percentage}%"
                                    ></div>

                                </div>

                            </div>

                            <div class="top-product-percent">
                                ${percentage}%
                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// ==========================================
// ملخص الأيام
// ==========================================

function renderDailySummary() {

    const container =
        getElement(
            "dailySummary"
        );


    if (!container) {

        return;

    }


    const grouped =
        {};


    filteredSales.forEach(
        function (
            sale
        ) {

            if (
                !sale.created_at
            ) {

                return;

            }


            const day =
                getDateKey(
                    sale.created_at
                );


            if (!day) {

                return;

            }


            if (
                !grouped[day]
            ) {

                grouped[day] =
                    {
                        sales: 0,
                        profit: 0,
                        invoices: 0,
                        units: 0
                    };

            }


            grouped[day].sales +=
                Number(
                    sale.total_amount ||
                    0
                );


            grouped[day].profit +=
                Number(
                    sale.profit_amount ||
                    0
                );


            grouped[day].invoices +=
                1;


            grouped[day].units +=
                Number(
                    sale.quantity ||
                    0
                );

        }
    );


    const days =
        Object.keys(
            grouped
        )
            .sort()
            .reverse();


    if (
        days.length === 0
    ) {

        container.innerHTML =
            `
            <div class="chart-empty">
                لا توجد بيانات في الفترة المحددة.
            </div>
            `;

        return;

    }


    container.innerHTML =
        days
            .slice(
                0,
                10
            )
            .map(
                function (
                    day
                ) {

                    const item =
                        grouped[
                            day
                        ];


                    return `
                        <div class="daily-row">

                            <div class="day">
                                ${escapeHtml(
                                    formatDate(
                                        day
                                    )
                                )}
                            </div>

                            <div class="value">

                                <strong>
                                    ${formatNumber(
                                        item.sales
                                    )}
                                    د.ل
                                </strong>

                                <span>
                                    ربح
                                    ${formatNumber(
                                        item.profit
                                    )}
                                    د.ل
                                    •
                                    ${formatNumber(
                                        item.units
                                    )}
                                    وحدة
                                    •
                                    ${formatNumber(
                                        item.invoices
                                    )}
                                    فاتورة
                                </span>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// ==========================================
// اختيار الفترة
// ==========================================

function setupPeriodButtons() {

    document
        .querySelectorAll(
            "[data-period]"
        )
        .forEach(
            function (
                button
            ) {

                button.addEventListener(
                    "click",
                    function () {

                        document
                            .querySelectorAll(
                                "[data-period]"
                            )
                            .forEach(
                                function (
                                    item
                                ) {

                                    item.classList.remove(
                                        "active"
                                    );

                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        selectedPeriod =
                            button.dataset.period;


                        const range =
                            getPeriodRange();


                        const from =
                            getElement(
                                "dateFrom"
                            );


                        const to =
                            getElement(
                                "dateTo"
                            );


                        if (
                            from
                        ) {

                            from.value =
                                range.from;

                        }


                        if (
                            to
                        ) {

                            to.value =
                                range.to;

                        }


                        applyReportFilter();

                    }
                );

            }
        );

}


// ==========================================
// تصدير التقرير CSV
// ==========================================

function exportReport() {

    if (
        filteredSales.length === 0
    ) {

        showToast(
            "لا توجد بيانات للتصدير"
        );

        return;

    }


    const rows =
        [
            [
                "التاريخ",
                "رقم العملية",
                "المنتج",
                "الكمية",
                "إجمالي البيع",
                "الربح"
            ],


            ...filteredSales.map(
                function (
                    sale
                ) {

                    return [
                        formatDate(
                            sale.created_at
                        ),

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
                        )
                    ];

                }
            )
        ];


    const csv =
        rows
            .map(
                function (
                    row
                ) {

                    return row
                        .map(
                            function (
                                value
                            ) {

                                return (
                                    '"' +
                                    String(
                                        value ??
                                        ""
                                    )
                                        .replaceAll(
                                            '"',
                                            '""'
                                        ) +
                                    '"'
                                );

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
        `mohasibi-report-${
            getDateKey(
                new Date()
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
        "تم تصدير التقرير"
    );

}


// ==========================================
// Realtime
// ==========================================

function subscribeRealtime() {

    if (!shop) {

        return;

    }


    if (reportsChannel) {

        supabaseClient.removeChannel(
            reportsChannel
        );

    }


    reportsChannel =
        supabaseClient
            .channel(
                `reports-${shop.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "sales",
                    filter:
                        `shop_id=eq.${shop.id}`
                },
                async function () {

                    try {

                        await loadData();

                        showToast(
                            "تم تحديث التقرير تلقائيًا"
                        );

                    } catch (error) {

                        console.error(
                            "Reports Realtime Error:",
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
                        "Reports Realtime:",
                        status
                    );

                }
            );

}


// ==========================================
// الأحداث
// ==========================================

function setupEvents() {

    const applyButton =
        getElement(
            "applyDateFilter"
        );


    if (applyButton) {

        applyButton.addEventListener(
            "click",
            function () {

                selectedPeriod =
                    "custom";

                applyReportFilter();

            }
        );

    }


    const resetButton =
        getElement(
            "resetDateFilter"
        );


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            function () {

                selectedPeriod =
                    "month";


                document
                    .querySelectorAll(
                        "[data-period]"
                    )
                    .forEach(
                        function (
                            button
                        ) {

                            button.classList.toggle(
                                "active",
                                button.dataset.period ===
                                "month"
                            );

                        }
                    );


                const range =
                    getPeriodRange();


                const from =
                    getElement(
                        "dateFrom"
                    );


                const to =
                    getElement(
                        "dateTo"
                    );


                if (
                    from
                ) {

                    from.value =
                        range.from;

                }


                if (
                    to
                ) {

                    to.value =
                        range.to;

                }


                applyReportFilter();

            }
        );

    }


    const exportButton =
        getElement(
            "exportReport"
        );


    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportReport
        );

    }


    window.addEventListener(
        "resize",
        function () {

            renderChart();

        }
    );

}


// ==========================================
// تشغيل الصفحة
// ==========================================

async function initReports() {

    try {

        setupEvents();

        setupPeriodButtons();

        await loadShop();


        const initialRange =
            getPeriodRange();


        const from =
            getElement(
                "dateFrom"
            );


        const to =
            getElement(
                "dateTo"
            );


        if (
            from
        ) {

            from.value =
                initialRange.from;

        }


        if (
            to
        ) {

            to.value =
                initialRange.to;

        }


        await loadData();

        subscribeRealtime();

    } catch (error) {

        console.error(
            "Reports Page Error:",
            error
        );


        const status =
            getElement(
                "reportStatus"
            );


        if (
            status
        ) {

            status.textContent =
                "تعذر تحميل التقرير: " +
                (
                    error.message ||
                    "خطأ غير معروف"
                );

        }

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initReports
);