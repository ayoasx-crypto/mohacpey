// ==========================================
// مُحاسبي - صفحة الإعدادات
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


let currentUser = null;
let currentShop = null;
let settingsChannel = null;


// ==========================================
// أدوات مساعدة
// ==========================================

function el(id) {

    return document.getElementById(id);

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


function showToast(message) {

    const toast =
        el("settingsToast");


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
// تحميل بيانات الحساب والمحل
// ==========================================

async function loadAccountData() {

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
            "انتهت جلسة الدخول. يرجى تسجيل الدخول."
        );

    }


    currentUser =
        user;


    // ======================================
    // جلب بيانات الحساب
    // ======================================

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "full_name, phone, role"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (profileError) {

        throw profileError;

    }


    // ======================================
    // جلب بيانات المحل
    // ======================================

    const {
        data: shop,
        error: shopError
    } =
        await supabaseClient
            .from("shops")
            .select(
                "id, user_id, shop_name, logo_url, phone, address, created_at"
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
            "لم يتم العثور على المحل."
        );

    }


    currentShop =
        shop;


    // ======================================
    // عرض بيانات المحل
    // ======================================

    if (el("headerShopName")) {

        el("headerShopName").textContent =
            shop.shop_name ||
            "مُحاسبي";

    }


    if (el("shopName")) {

        el("shopName").textContent =
            shop.shop_name ||
            "—";

    }


    if (el("shopPhone")) {

        el("shopPhone").textContent =
            shop.phone ||
            profile?.phone ||
            "—";

    }


    if (el("shopAddress")) {

        el("shopAddress").textContent =
            shop.address ||
            "غير محدد";

    }


    if (el("shopId")) {

        el("shopId").textContent =
            shop.id ??
            "—";

    }


    if (el("shopCreatedAt")) {

        el("shopCreatedAt").textContent =
            formatDate(
                shop.created_at
            );

    }


    // ======================================
    // عرض بيانات الحساب
    // ======================================

    if (el("accountEmail")) {

        el("accountEmail").textContent =
            user.email ||
            "—";

    }


    if (el("accountName")) {

        el("accountName").textContent =
            profile?.full_name ||
            "—";

    }


    if (el("accountRole")) {

        el("accountRole").textContent =
            profile?.role ||
            "—";

    }


    if (el("accountStatus")) {

        el("accountStatus").textContent =
            user.email_confirmed_at
                ? "نشط"
                : "يحتاج تأكيد البريد";

    }


    setConnectionState(
        "connected",
        "متصل بالنظام",
        "الاتصال بـ Supabase يعمل بشكل طبيعي."
    );

}


// ==========================================
// فحص اتصال Supabase
// ==========================================

async function checkConnection() {

    if (!currentShop) {

        return;

    }


    const status =
        el("supabaseStatus");


    const sub =
        el("connectionSub");


    if (status) {

        status.textContent =
            "جاري الفحص...";

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("shops")
                .select(
                    "id"
                )
                .eq(
                    "id",
                    currentShop.id
                )
                .limit(1);


        if (error) {

            throw error;

        }


        if (status) {

            status.textContent =
                "متصل";

        }


        if (sub) {

            sub.textContent =
                "تم الاتصال بقاعدة البيانات بنجاح.";

        }


        setConnectionState(
            "connected",
            "متصل بالنظام",
            "Supabase متصل ويعمل بشكل طبيعي."
        );


        setLastSync();


    } catch (error) {

        console.error(
            "Connection check error:",
            error
        );


        if (status) {

            status.textContent =
                "غير متصل";

        }


        if (sub) {

            sub.textContent =
                error.message ||
                "تعذر الاتصال بقاعدة البيانات.";

        }


        setConnectionState(
            "error",
            "تعذر الاتصال",
            "تحقق من الاتصال بالشبكة."
        );

    }

}


// ==========================================
// حالة الاتصال
// ==========================================

function setConnectionState(
    state,
    title,
    sub
) {

    const text =
        el("connectionText");


    const dot =
        document.querySelector(
            ".status-dot"
        );


    const statusSub =
        el("connectionSub");


    if (text) {

        text.textContent =
            title;

    }


    if (
        statusSub &&
        sub
    ) {

        statusSub.textContent =
            sub;

    }


    if (dot) {

        dot.style.background =
            state === "error"
                ? "#ef4444"
                : "#35a853";

    }

}


function setLastSync() {

    const target =
        el("lastSync");


    if (target) {

        target.textContent =
            formatDate(
                new Date()
            );

    }

}


// ==========================================
// Realtime
// ==========================================

function subscribeRealtime() {

    if (!currentShop) {

        return;

    }


    if (settingsChannel) {

        supabaseClient
            .removeChannel(
                settingsChannel
            );

    }


    const realtimeStatus =
        el("realtimeStatus");


    settingsChannel =
        supabaseClient
            .channel(
                "settings-" +
                currentShop.id
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "shops",
                    filter:
                        `id=eq.${currentShop.id}`
                },
                async function () {

                    try {

                        await loadAccountData();

                        setLastSync();

                        showToast(
                            "تم تحديث بيانات المحل"
                        );

                    } catch (error) {

                        console.error(
                            "Shop realtime error:",
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
                        "Settings Realtime:",
                        status
                    );


                    if (realtimeStatus) {

                        realtimeStatus.textContent =
                            status ===
                            "SUBSCRIBED"
                                ? "نشط"
                                : status;

                    }

                }
            );

}


// ==========================================
// الوضع الداكن
// ==========================================

function applyDarkMode(
    enabled
) {

    document.body.classList.toggle(
        "dark-mode",
        enabled
    );


    localStorage.setItem(
        "mohasibiDarkMode",
        enabled
            ? "true"
            : "false"
    );

}


function loadPreferences() {

    const darkMode =
        localStorage.getItem(
            "mohasibiDarkMode"
        ) === "true";


    const notifications =
        localStorage.getItem(
            "mohasibiNotifications"
        );


    const darkToggle =
        el("darkModeToggle");


    const notificationsToggle =
        el("notificationsToggle");


    if (darkToggle) {

        darkToggle.checked =
            darkMode;

    }


    if (notificationsToggle) {

        notificationsToggle.checked =
            notifications !== "false";

    }


    applyDarkMode(
        darkMode
    );

}


// ==========================================
// تغيير كلمة المرور
// ==========================================

function setupPasswordChange() {

    const modal =
        el("passwordModal");


    const openButton =
        el("changePasswordButton");


    const cancelButton =
        el("cancelPassword");


    const saveButton =
        el("savePassword");


    const newPassword =
        el("newPassword");


    const confirmPassword =
        el("confirmPassword");


    // فتح النافذة

    if (openButton) {

        openButton.addEventListener(
            "click",
            function () {

                if (modal) {

                    modal.classList.add(
                        "show"
                    );

                }


                if (newPassword) {

                    newPassword.value =
                        "";

                }


                if (confirmPassword) {

                    confirmPassword.value =
                        "";

                }

            }
        );

    }


    // إلغاء

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function () {

                if (modal) {

                    modal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    // إغلاق بالضغط خارج النافذة

    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    modal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }


    // حفظ كلمة المرور

    if (saveButton) {

        saveButton.addEventListener(
            "click",
            async function () {

                const password =
                    newPassword
                        ? newPassword.value
                        : "";


                const confirm =
                    confirmPassword
                        ? confirmPassword.value
                        : "";


                if (
                    password.length <
                    6
                ) {

                    alert(
                        "يجب أن تكون كلمة المرور 6 أحرف على الأقل."
                    );

                    return;

                }


                if (
                    password !==
                    confirm
                ) {

                    alert(
                        "كلمة المرور وتأكيدها غير متطابقين."
                    );

                    return;

                }


                saveButton.disabled =
                    true;


                try {

                    const {
                        error
                    } =
                        await supabaseClient
                            .auth
                            .updateUser(
                                {
                                    password:
                                        password
                                }
                            );


                    if (error) {

                        throw error;

                    }


                    if (modal) {

                        modal.classList.remove(
                            "show"
                        );

                    }


                    showToast(
                        "تم تغيير كلمة المرور بنجاح"
                    );

                } catch (error) {

                    console.error(
                        "Password update error:",
                        error
                    );


                    alert(
                        "تعذر تغيير كلمة المرور:\n\n" +
                        (
                            error.message ||
                            "حدث خطأ غير معروف"
                        )
                    );

                } finally {

                    saveButton.disabled =
                        false;

                }

            }
        );

    }

}


// ==========================================
// ربط الأحداث
// ==========================================

function setupEvents() {

    // الوضع الداكن

    const darkToggle =
        el("darkModeToggle");


    if (darkToggle) {

        darkToggle.addEventListener(
            "change",
            function () {

                applyDarkMode(
                    darkToggle.checked
                );


                showToast(
                    darkToggle.checked
                        ? "تم تفعيل الوضع الداكن"
                        : "تم إيقاف الوضع الداكن"
                );

            }
        );

    }


    // التنبيهات

    const notificationsToggle =
        el("notificationsToggle");


    if (notificationsToggle) {

        notificationsToggle.addEventListener(
            "change",
            function () {

                localStorage.setItem(
                    "mohasibiNotifications",
                    notificationsToggle.checked
                        ? "true"
                        : "false"
                );


                showToast(
                    notificationsToggle.checked
                        ? "تم تفعيل التنبيهات"
                        : "تم إيقاف التنبيهات"
                );

            }
        );

    }


    // تحديث الاتصال

    const refreshButton =
        el("refreshConnection");


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                refreshButton.disabled =
                    true;


                try {

                    await checkConnection();

                    showToast(
                        "تم تحديث حالة الاتصال"
                    );

                } finally {

                    refreshButton.disabled =
                        false;

                }

            }
        );

    }


    // تسجيل الخروج

    const logoutButton =
        el("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function () {

                const confirmed =
                    confirm(
                        "هل تريد تسجيل الخروج؟"
                    );


                if (!confirmed) {

                    return;

                }


                try {

                    await supabaseClient
                        .auth
                        .signOut();

                } catch (error) {

                    console.error(
                        "Logout error:",
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


    setupPasswordChange();

}


// ==========================================
// تشغيل الصفحة
// ==========================================

async function initSettings() {

    try {

        loadPreferences();

        setupEvents();

        await loadAccountData();

        await checkConnection();

        subscribeRealtime();

    } catch (error) {

        console.error(
            "Settings Page Error:",
            error
        );


        setConnectionState(
            "error",
            "تعذر تحميل البيانات",
            error.message ||
            "حدث خطأ غير معروف."
        );


        if (el("supabaseStatus")) {

            el("supabaseStatus").textContent =
                "خطأ";

        }

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initSettings
);