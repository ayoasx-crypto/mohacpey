// ==========================================
// مُحاسبي - app.js
// Supabase + تسجيل الدخول + لوحة التحكم
// ==========================================

const SUPABASE_URL = "https://liqayyvzmdtlssvkzrxv.supabase.co";
const SUPABASE_KEY =
    "sb_publishable_gFxveHgD1Ncco9OTGbNFvA_sjdqp0zy";


// ==========================================
// تحميل مكتبة Supabase إذا لم تكن موجودة
// ==========================================

function loadSupabase() {

    return new Promise((resolve, reject) => {

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {
            resolve();
            return;
        }


        const existingScript =
            document.querySelector(
                'script[src*="supabase-js"]'
            );


        if (existingScript) {

            existingScript.addEventListener(
                "load",
                resolve,
                { once: true }
            );

            existingScript.addEventListener(
                "error",
                reject,
                { once: true }
            );

            return;
        }


        const script =
            document.createElement("script");


        script.src =
            "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

        script.async = false;


        script.onload = resolve;


        script.onerror = function () {

            reject(
                new Error(
                    "تعذر تحميل مكتبة Supabase"
                )
            );

        };


        document.head.appendChild(script);

    });

}


// ==========================================
// تشغيل التطبيق
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await loadSupabase();


            const supabaseClient =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_KEY
                );



            // ======================================
            // إنشاء حساب
            // ======================================

            const registerForm =
                document.getElementById(
                    "registerForm"
                );


            if (registerForm) {

                registerForm.addEventListener(
                    "submit",
                    async function (e) {

                        e.preventDefault();


                        const ownerNameElement =
                            document.getElementById(
                                "ownerName"
                            );


                        const shopNameElement =
                            document.getElementById(
                                "shopName"
                            );


                        const emailElement =
                            document.getElementById(
                                "email"
                            );


                        const phoneElement =
                            document.getElementById(
                                "phone"
                            );


                        const passwordElement =
                            document.getElementById(
                                "registerPassword"
                            );


                        const confirmPasswordElement =
                            document.getElementById(
                                "confirmPassword"
                            );


                        const ownerName =
                            ownerNameElement
                                ? ownerNameElement.value.trim()
                                : "";


                        const shopName =
                            shopNameElement
                                ? shopNameElement.value.trim()
                                : "";


                        const email =
                            emailElement
                                ? emailElement.value.trim()
                                : "";


                        const phone =
                            phoneElement
                                ? phoneElement.value.trim()
                                : "";


                        const password =
                            passwordElement
                                ? passwordElement.value
                                : "";


                        const confirmPassword =
                            confirmPasswordElement
                                ? confirmPasswordElement.value
                                : "";



                        if (
                            !ownerName ||
                            !shopName ||
                            !email ||
                            !phone
                        ) {

                            alert(
                                "يرجى تعبئة جميع البيانات المطلوبة"
                            );

                            return;

                        }



                        if (
                            password !==
                            confirmPassword
                        ) {

                            alert(
                                "كلمة المرور وتأكيد كلمة المرور غير متطابقين"
                            );

                            return;

                        }



                        if (
                            password.length < 6
                        ) {

                            alert(
                                "يجب أن تكون كلمة المرور 6 أحرف على الأقل"
                            );

                            return;

                        }



                        const button =
                            registerForm.querySelector(
                                "button[type='submit']"
                            );


                        const oldButtonText =
                            button
                                ? button.textContent
                                : "";



                        if (button) {

                            button.disabled = true;

                            button.textContent =
                                "جاري إنشاء الحساب...";

                        }



                        try {

                            // إنشاء المستخدم في Supabase Auth

                            const {
                                data: authData,
                                error: authError
                            } =
                                await supabaseClient.auth.signUp({
                                    email: email,
                                    password: password
                                });



                            if (authError) {

                                throw authError;

                            }



                            if (
                                !authData ||
                                !authData.user
                            ) {

                                throw new Error(
                                    "لم يتم إنشاء المستخدم في Supabase"
                                );

                            }



                            const userId =
                                authData.user.id;



                            // حفظ بيانات صاحب الحساب

                            const {
                                error: profileError
                            } =
                                await supabaseClient
                                    .from("profiles")
                                    .upsert(
                                        {
                                            id: userId,
                                            full_name: ownerName,
                                            phone: phone,
                                            role: "owner"
                                        },
                                        {
                                            onConflict: "id"
                                        }
                                    );



                            if (profileError) {

                                throw profileError;

                            }



                            // إنشاء المحل

                            const {
                                data: shop,
                                error: shopError
                            } =
                                await supabaseClient
                                    .from("shops")
                                    .insert({
                                        user_id: userId,
                                        shop_name: shopName,
                                        phone: phone
                                    })
                                    .select()
                                    .single();



                            if (shopError) {

                                throw shopError;

                            }



                            // حفظ بيانات مساعدة محليًا

                            localStorage.setItem(
                                "mohasibiUser",
                                JSON.stringify({
                                    id: userId,
                                    ownerName: ownerName,
                                    shopName:
                                        shop?.shop_name ||
                                        shopName,
                                    email: email,
                                    phone: phone
                                })
                            );


                            localStorage.removeItem(
                                "mohasibiLoggedIn"
                            );



                            alert(
                                "تم إنشاء الحساب بنجاح 🎉"
                            );



                            window.location.href =
                                "index.html";


                        } catch (error) {

                            console.error(
                                "Supabase Registration Error:",
                                error
                            );


                            alert(
                                "تعذر إنشاء الحساب:\n\n" +
                                (
                                    error.message ||
                                    "حدث خطأ غير معروف"
                                )
                            );


                        } finally {

                            if (button) {

                                button.disabled = false;

                                button.textContent =
                                    oldButtonText;

                            }

                        }

                    }
                );

            }



            // ======================================
            // تسجيل الدخول
            // ======================================

            const loginForm =
                document.getElementById(
                    "loginForm"
                );


            if (loginForm) {

                loginForm.addEventListener(
                    "submit",
                    async function (e) {

                        e.preventDefault();


                        const usernameElement =
                            document.getElementById(
                                "username"
                            );


                        const passwordElement =
                            document.getElementById(
                                "password"
                            );


                        const username =
                            usernameElement
                                ? usernameElement.value.trim()
                                : "";


                        const password =
                            passwordElement
                                ? passwordElement.value
                                : "";



                        if (
                            !username ||
                            !password
                        ) {

                            alert(
                                "يرجى إدخال البريد الإلكتروني وكلمة المرور"
                            );

                            return;

                        }



                        const button =
                            loginForm.querySelector(
                                "button[type='submit']"
                            );


                        const oldButtonText =
                            button
                                ? button.textContent
                                : "";



                        if (button) {

                            button.disabled = true;

                            button.textContent =
                                "جاري تسجيل الدخول...";

                        }



                        try {

                            // تسجيل الدخول

                            const {
                                data,
                                error
                            } =
                                await supabaseClient.auth.signInWithPassword({
                                    email: username,
                                    password: password
                                });



                            if (error) {

                                throw error;

                            }



                            if (
                                !data ||
                                !data.user
                            ) {

                                throw new Error(
                                    "تعذر تسجيل الدخول"
                                );

                            }



                            const userId =
                                data.user.id;



                            // جلب بيانات صاحب الحساب

                            const {
                                data: profile,
                                error: profileError
                            } =
                                await supabaseClient
                                    .from("profiles")
                                    .select(
                                        "id, full_name, phone, role"
                                    )
                                    .eq(
                                        "id",
                                        userId
                                    )
                                    .maybeSingle();



                            if (profileError) {

                                throw profileError;

                            }



                            // جلب المحل الخاص بالمستخدم

                            const {
                                data: shop,
                                error: shopError
                            } =
                                await supabaseClient
                                    .from("shops")
                                    .select(
                                        "id, user_id, shop_name, logo_url, phone, address"
                                    )
                                    .eq(
                                        "user_id",
                                        userId
                                    )
                                    .limit(1)
                                    .maybeSingle();



                            if (shopError) {

                                throw shopError;

                            }



                            if (!shop) {

                                throw new Error(
                                    "تم تسجيل الدخول، لكن لم يتم العثور على المحل المرتبط بهذا الحساب."
                                );

                            }



                            // حفظ حالة تسجيل الدخول

                            localStorage.setItem(
                                "mohasibiLoggedIn",
                                "true"
                            );



                            // حفظ البيانات محليًا

                            localStorage.setItem(
                                "mohasibiUser",
                                JSON.stringify({
                                    id: userId,

                                    ownerName:
                                        profile?.full_name ||
                                        "",

                                    shopName:
                                        shop.shop_name ||
                                        "",

                                    email:
                                        data.user.email ||
                                        "",

                                    phone:
                                        profile?.phone ||
                                        ""
                                })
                            );



                            window.location.href =
                                "dashboard.html";


                        } catch (error) {

                            console.error(
                                "Supabase Login Error:",
                                error
                            );


                            alert(
                                "تعذر تسجيل الدخول:\n\n" +
                                (
                                    error.message ||
                                    "بيانات الدخول غير صحيحة"
                                )
                            );


                        } finally {

                            if (button) {

                                button.disabled = false;

                                button.textContent =
                                    oldButtonText;

                            }

                        }

                    }
                );

            }



            // ======================================
            // لوحة التحكم
            // ======================================

            const dashboard =
                document.querySelector(
                    ".dashboard"
                );


            if (dashboard) {

                // التأكد من وجود مستخدم مسجل

                const {
                    data: userData,
                    error: userError
                } =
                    await supabaseClient.auth.getUser();



                if (
                    userError ||
                    !userData?.user
                ) {

                    localStorage.removeItem(
                        "mohasibiLoggedIn"
                    );


                    localStorage.removeItem(
                        "mohasibiUser"
                    );


                    window.location.href =
                        "index.html";


                    return;

                }



                const user =
                    userData.user;



                try {

                    // ==================================
                    // بيانات صاحب الحساب
                    // ==================================

                    const {
                        data: profile,
                        error: profileError
                    } =
                        await supabaseClient
                            .from("profiles")
                            .select(
                                "id, full_name, phone, role"
                            )
                            .eq(
                                "id",
                                user.id
                            )
                            .maybeSingle();



                    if (profileError) {

                        throw profileError;

                    }



                    // ==================================
                    // بيانات المحل
                    // ==================================

                    const {
                        data: shop,
                        error: shopError
                    } =
                        await supabaseClient
                            .from("shops")
                            .select(
                                "id, user_id, shop_name, logo_url, phone, address"
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

// ======================================
// التحديث التلقائي للمبيعات
// ======================================
// ======================================
// اختبار التحديث التلقائي للمبيعات
// ======================================

const salesChannel =
    supabaseClient.channel(
        "sales-realtime-" + shop.id
    );

salesChannel
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "sales",
            filter: "shop_id=eq." + shop.id
        },
        function (payload) {

            console.log(
                "✅ تم استقبال عملية بيع جديدة:",
                payload
            );

            window.location.reload();

        }
    )
    .subscribe(function (status) {

        console.log(
            "📡 حالة Realtime:",
            status
        );

    });
                    // ==================================
                    // عرض اسم المحل
                    // ==================================

                    const shopNameElement =
                        document.querySelector(
                            ".shop-name"
                        );


                    if (shopNameElement) {

                        shopNameElement.textContent =
                            shop.shop_name ||
                            "مُحاسبي";

                    }



                    // ==================================
                    // عرض اسم صاحب المحل
                    // ==================================

                    const welcomeTitle =
                        document.querySelector(
                            ".dashboard-header h1"
                        );


                    if (welcomeTitle) {

                        const ownerName =
                            profile?.full_name ||
                            "صاحب المحل";


                        welcomeTitle.textContent =
                            `مرحباً ${ownerName} 👋`;

                    }



                    // ==================================
                    // جلب المبيعات الخاصة بالمحل
                    // ==================================

const {
    data: sales,
    error: salesError
} =
    await supabaseClient
        .from("sales")
        .select(`
            id,
            shop_id,
            product_id,
            quantity,
            total_amount,
            profit_amount,
            created_at
        `)
        .eq("shop_id", shop.id)
        .order("created_at", {
            ascending: false
        })
        .limit(5);

                    if (salesError) {

                        throw salesError;

                    }



                    const salesRows =
                        Array.isArray(sales)
                            ? sales
                            : [];


let productsMap = {};

try {

    const productIds = [
        ...new Set(
            salesRows
                .map(sale => sale.product_id)
                .filter(Boolean)
        )
    ];

    if (productIds.length > 0) {

        const {
            data: productsData,
            error: productsError
        } = await supabaseClient
            .from("products")
            .select("id, name")
            .in("id", productIds);

        if (productsError) {

    console.error(
        "❌ خطأ جلب المنتجات:",
        productsError
    );

} else {

    console.log(
        "✅ المنتجات التي وصلت من Supabase:",
        productsData
    );

    (productsData || []).forEach(
        function (product) {

            productsMap[product.id] =
                product.name;

        }
    );

    console.log(
        "✅ productsMap:",
        productsMap
    );

}

console.log("========== فحص المنتجات ==========");
console.log("Product IDs:", productIds);
console.log("Products Data:", productsData);
console.log("Products Map:", productsMap);
console.log("==================================");
        }

    }

catch (error) {

    console.warn(
        "خطأ في جلب أسماء المنتجات:",
        error
    );

}
// ======================================
// حساب المنتجات الأكثر مبيعاً
// ======================================

const productSales = {};

salesRows.forEach(function (sale) {

    const productId = sale.product_id;

    if (!productId) {
        return;
    }

    const quantity =
        Number(sale.quantity || 0);

    productSales[productId] =
        (productSales[productId] || 0) +
        quantity;
});


const topProducts =
    Object.entries(productSales)
        .sort(function (a, b) {
            return Number(b[1]) - Number(a[1]);
        })
        .slice(0, 4);


const maxSold =
    topProducts.length > 0
        ? Number(topProducts[0][1])
        : 0;


const topProductsElement =
    document.getElementById("topProducts");


if (topProductsElement) {

    topProductsElement.innerHTML = "";

    if (topProducts.length === 0) {

        topProductsElement.innerHTML =
            "<p>لا توجد بيانات مبيعات حتى الآن</p>";

    } else {

        topProducts.forEach(function (item) {

            const productId =
                Number(item[0]);

            const quantitySold =
                Number(item[1]);

            const productName =
                productsMap[productId] ||
                "منتج غير معروف";

            const percentage =
                maxSold > 0
                    ? Math.round(
                        (quantitySold / maxSold) * 100
                    )
                    : 0;


            const row =
                document.createElement("div");

            row.className =
                "product-row";


row.innerHTML = `
    <span>
        📦 ${productName}
        <small style="display:block; margin-top:4px;">
            ${quantitySold} قطعه مباعة
        </small>
    </span>

    <div class="progress">
        <div style="width: ${percentage}%;"></div>
    </div>

    <strong>
        ${percentage}%
    </strong>
`;

            topProductsElement.appendChild(row);

        });

    }

}
                    // ==================================
                    // إجمالي المبيعات
                    // ==================================

                    const totalSales =
                        salesRows.reduce(
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

console.log("========== فحص المبيعات ==========");
console.log("Shop ID:", shop.id);
console.log("Sales:", salesRows);
console.log("Total Sales:", totalSales);
console.log("=================================");

                    // ==================================
                    // إجمالي الأرباح
                    // ==================================

const totalProfit =
    salesRows.reduce(
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


const invoiceCount = salesRows.length;


const productsSold = salesRows.reduce(
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

console.log("========== فحص الإحصائيات ==========");
console.log("Total Sales =", totalSales);
console.log("Total Profit =", totalProfit);
console.log("Invoice Count =", invoiceCount);
console.log("Products Sold =", productsSold);
console.log("====================================");
// ======================================
// عرض آخر عمليات البيع
// ======================================


// ======================================
// عرض آخر عمليات البيع
// ======================================

const salesList =
    document.getElementById("salesList");

if (salesList) {

    salesList.innerHTML = "";

    if (!salesRows || salesRows.length === 0) {

        salesList.innerHTML =
            `<p>لا توجد عمليات بيع حتى الآن</p>`;

    } else {

        salesRows.forEach(function (sale) {

const productName =
    productsMap[sale.product_id] ||
    "منتج غير معروف";
            const saleItem =
                document.createElement("div");

            saleItem.className = "sale-item";

            saleItem.innerHTML = `
                <div class="product-icon">
                    📦
                </div>

                <div class="sale-info">

                    <strong>
                        ${productName}
                    </strong>
 
<span>
    الكمية: ${Number(sale.quantity || 0)}
</span>


<span>
    ${sale.created_at
        ? (() => {

            const seconds =
                Math.floor(
                    (Date.now() -
                    new Date(sale.created_at).getTime()) /
                    1000
                );

            if (seconds < 60) {
                return "منذ أقل من دقيقة";
            }

            const minutes =
                Math.floor(seconds / 60);

            if (minutes < 60) {
                return `منذ ${minutes} دقيقة`;
            }

            const hours =
                Math.floor(minutes / 60);

            if (hours < 24) {
                return `منذ ${hours} ساعة`;
            }

            const days =
                Math.floor(hours / 24);

            return `منذ ${days} يوم`;

        })()
        : ""
    }
</span>




                </div>

                <strong class="sale-price">
                    ${formatNumber(sale.total_amount)} د.ل
                </strong>
            `;

            salesList.appendChild(saleItem);

        });

    }

}
                    // ==================================
                    // تنسيق الأرقام
                    // ==================================

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



                    // ==================================
                    // تحديث بطاقات لوحة التحكم
                    // ==================================

                    const statCards =
                        document.querySelectorAll(
                            ".stat-card"
                        );


                    statCards.forEach(
                        function (card) {

                            const labelElement =
                                card.querySelector(
                                    "p"
                                );


                            const valueElement =
                                card.querySelector(
                                    "h2"
                                );


                            if (
                                !labelElement ||
                                !valueElement
                            ) {

                                return;

                            }



                            const label =
                                labelElement.textContent.trim();



                            // إجمالي المبيعات

                            if (
                                label.includes(
                                    "إجمالي المبيعات"
                                )
                            ) {

                                valueElement.textContent =
                                    `${formatNumber(totalSales)} د.ل`;

                            }



                            // الأرباح

                            if (
                                label.includes(
                                    "الأرباح"
                                )
                            ) {

                                valueElement.textContent =
                                    `${formatNumber(totalProfit)} د.ل`;

                            }



                            // الفواتير

                            if (
                                label.includes(
                                    "الفواتير"
                                )
                            ) {

                                valueElement.textContent =
                                    formatNumber(
                                        invoiceCount
                                    );

                            }



                            // المنتجات المباعة

                            if (
                                label.includes(
                                    "المنتجات المباعة"
                                )
                            ) {

                                valueElement.textContent =
                                    formatNumber(
                                        productsSold
                                    );

                            }

                        }
                    );



                    // ==================================
                    // عنصر totalSales
                    // ==================================

                    const totalSalesElement =
                        document.getElementById(
                            "totalSales"
                        );


                    if (totalSalesElement) {

                        totalSalesElement.textContent =
                            `${formatNumber(totalSales)} د.ل`;

                    }



                    // ==================================
                    // عنصر totalProfit
                    // ==================================

                    const totalProfitElement =
                        document.getElementById(
                            "totalProfit"
                        );


                    if (totalProfitElement) {

                        totalProfitElement.textContent =
                            `${formatNumber(totalProfit)} د.ل`;

                    }



                    // ==================================
                    // Console للتأكد
                    // ==================================

                    console.log(
                        "اسم المحل من Supabase:",
                        shop.shop_name
                    );


                    console.log(
                        "Supabase User:",
                        user
                    );


                    console.log(
                        "Supabase Profile:",
                        profile
                    );


                    console.log(
                        "Supabase Shop:",
                        shop
                    );


                    console.log(
                        "Supabase Sales:",
                        salesRows
                    );


                    console.log(
                        "Total Sales:",
                        totalSales
                    );


                    console.log(
                        "Total Profit:",
                        totalProfit
                    );


                    console.log(
                        "Invoice Count:",
                        invoiceCount
                    );


                    console.log(
                        "Products Sold:",
                        productsSold
                    );



                } catch (error) {

                    console.error(
                        "Dashboard Data Error:",
                        error
                    );


                    alert(
                        "تعذر تحميل بيانات لوحة التحكم:\n\n" +
                        (
                            error.message ||
                            "حدث خطأ غير معروف"
                        )
                    );

                }

            }

            // ======================================
            // تسجيل الخروج
            // ======================================

            const logoutButton =
                document.getElementById(
                    "logoutButton"
                );


            if (logoutButton) {

                logoutButton.addEventListener(
                    "click",
                    async function () {

                        try {

                            await supabaseClient.auth.signOut();

                        } catch (error) {

                            console.error(
                                "Logout Error:",
                                error
                            );

                        }



                        localStorage.removeItem(
                            "mohasibiLoggedIn"
                        );


                        localStorage.removeItem(
                            "mohasibiUser"
                        );


                        window.location.href =
                            "index.html";

                    }
                );

            }



        } catch (error) {

            console.error(
                "Application Error:",
                error
            );


            alert(
                "تعذر تشغيل التطبيق:\n\n" +
                (
                    error.message ||
                    "حدث خطأ غير معروف"
                )
            );

        }

    }
);