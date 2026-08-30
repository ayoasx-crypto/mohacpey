// ==========================================
// مُحاسبي - صفحة ربط الأنظمة
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
let integrations = [];
let dataSources = [];
let integrationsChannel = null;

let lastConnectionTestPassed = false;


// ==========================================
// أدوات مساعدة
// ==========================================

function el(id) {

    return document.getElementById(id);

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


function toast(message) {

    const toastElement =
        el("integrationToast");


    if (!toastElement) {

        return;

    }


    toastElement.textContent =
        message;


    toastElement.classList.add(
        "show"
    );


    clearTimeout(
        toast.timer
    );


    toast.timer =
        setTimeout(
            function () {

                toastElement.classList.remove(
                    "show"
                );

            },
            1800
        );

}


// ==========================================
// تحميل المستخدم والمحل
// ==========================================

async function loadShop() {

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


    currentUser =
        user;


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

}


// ==========================================
// تحميل الأنظمة المرتبطة
// ==========================================

async function loadIntegrations() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("integrations")
            .select(
                `
                id,
                shop_id,
                system_name,
                api_base_url,
                status,
                last_sync_at,
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


    integrations =
        Array.isArray(data)
            ? data
            : [];


    renderIntegrations();

}


// ==========================================
// تحميل مصادر البيانات
// ==========================================

async function loadDataSources() {

    dataSources = [];


    const integrationIds =
        integrations.map(
            function (item) {

                return item.id;

            }
        );


    if (
        integrationIds.length === 0
    ) {

        renderDataSources();

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("data_sources")
            .select(
                `
                id,
                integration_id,
                data_type,
                endpoint,
                is_active,
                created_at
                `
            )
            .in(
                "integration_id",
                integrationIds
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


    dataSources =
        Array.isArray(data)
            ? data
            : [];


    renderDataSources();

}


// ==========================================
// عرض الأنظمة
// ==========================================

function renderIntegrations() {

    const container =
        el("linkedSystems");


    if (!container) {

        return;

    }


    if (
        integrations.length === 0
    ) {

        container.innerHTML =
            `
            <section class="integration-card">

                <div style="
                    text-align:center;
                    color:#8a94a6;
                    font-size:11px;
                    padding:14px;
                ">
                    لا يوجد نظام مرتبط حاليًا.
                </div>

            </section>
            `;


        updateConnectionInfo();

        return;

    }


    container.innerHTML =
        integrations
            .map(
                function (integration) {

                    const normalizedStatus =
                        String(
                            integration.status ||
                            ""
                        ).toLowerCase();


                    const isActive =
                        [
                            "active",
                            "connected",
                            "نشط",
                            "متصل"
                        ].includes(
                            normalizedStatus
                        );


                    const sourceCount =
                        dataSources.filter(
                            function (source) {

                                return (
                                    source.integration_id ===
                                    integration.id
                                );

                            }
                        ).length;


                    return `
                        <section class="integration-card">

                            <div class="integration-top">

                                <div class="system-main">

                                    <div class="system-logo">
                                        🔗
                                    </div>

                                    <div>

                                        <strong>
                                            ${escapeHtml(
                                                integration.system_name ||
                                                "نظام غير محدد"
                                            )}
                                        </strong>

                                        <span>
                                            ${
                                                isActive
                                                    ? "الاتصال يعمل بشكل طبيعي"
                                                    : "راجع حالة النظام"
                                            }
                                        </span>

                                    </div>

                                </div>


                                <span
                                    class="status-badge"
                                    style="${
                                        isActive
                                            ? ""
                                            : "background:#fff3f3;color:#dc2626"
                                    }"
                                >
                                    ● ${escapeHtml(
                                        integration.status ||
                                        "غير محدد"
                                    )}
                                </span>

                            </div>


                            <div class="integration-meta">

                                <div class="meta-item">

                                    <span>
                                        النوع
                                    </span>

                                    <strong>
                                        API / نظام خارجي
                                    </strong>

                                </div>


                                <div class="meta-item">

                                    <span>
                                        الحالة
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            integration.status ||
                                            "غير محدد"
                                        )}
                                    </strong>

                                </div>


                                <div class="meta-item">

                                    <span>
                                        تاريخ الربط
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                integration.created_at
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div class="meta-item">

                                    <span>
                                        مصادر البيانات
                                    </span>

                                    <strong>
                                        ${sourceCount}
                                    </strong>

                                </div>


                                <div class="meta-item">

                                    <span>
                                        آخر مزامنة
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            formatDate(
                                                integration.last_sync_at
                                            )
                                        )}
                                    </strong>

                                </div>


                                <div class="meta-item">

                                    <span>
                                        API
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            integration.api_base_url ||
                                            "غير محدد"
                                        )}
                                    </strong>

                                </div>

                            </div>


                            <div class="integration-actions">

                                <button
                                    type="button"
                                    data-view="${integration.id}"
                                >
                                    📊 عرض البيانات
                                </button>


                                <button
                                    type="button"
                                    data-settings="${integration.id}"
                                >
                                    ⚙ إعدادات
                                </button>


                                <button
                                    type="button"
                                    class="danger"
                                    data-unlink="${integration.id}"
                                >
                                    🔗 إلغاء الربط
                                </button>

                            </div>

                        </section>
                    `;

                }
            )
            .join("");


    bindIntegrationActions();

    updateConnectionInfo();

}


// ==========================================
// عرض مصادر البيانات
// ==========================================

function renderDataSources() {

    const container =
        el("dataSources");


    if (!container) {

        return;

    }


    if (
        dataSources.length === 0
    ) {

        container.innerHTML =
            `
            <div style="
                padding:18px 15px;
                text-align:center;
                color:#8a94a6;
                font-size:10px;
                border-top:1px solid #f0f2f5;
            ">
                لا توجد مصادر بيانات مرتبطة حاليًا.
            </div>
            `;

        return;

    }


    container.innerHTML =
        dataSources
            .map(
                function (source) {

                    return `
                        <div class="source-row">

                            <span>
                                ${escapeHtml(
                                    source.data_type ||
                                    "مصدر"
                                )}
                            </span>

                            <span>
                                ${escapeHtml(
                                    source.endpoint ||
                                    "API"
                                )}
                            </span>

                            <span
                                class="source-status"
                                style="
                                    color:${
                                        source.is_active
                                            ? "#23833f"
                                            : "#dc2626"
                                    };
                                "
                            >
                                ● ${
                                    source.is_active
                                        ? "متزامن"
                                        : "متوقف"
                                }
                            </span>

                            <span>
                                ${escapeHtml(
                                    formatDate(
                                        source.created_at
                                    )
                                )}
                            </span>

                        </div>
                    `;

                }
            )
            .join("");

}


// ==========================================
// معلومات الاتصال
// ==========================================

function updateConnectionInfo() {

    const activeIntegration =
        integrations.find(
            function (integration) {

                const status =
                    String(
                        integration.status ||
                        ""
                    ).toLowerCase();


                return [
                    "active",
                    "connected",
                    "نشط",
                    "متصل"
                ].includes(
                    status
                );

            }
        ) ||
        integrations[0];


    if (!activeIntegration) {

        if (el("connectionMethod")) {

            el("connectionMethod")
                .textContent =
                    "غير مرتبط";

        }


        if (el("apiBaseUrl")) {

            el("apiBaseUrl")
                .textContent =
                    "—";

        }


        if (el("connectionStatus")) {

            el("connectionStatus")
                .textContent =
                    "غير متصل";

        }


        if (el("lastChecked")) {

            el("lastChecked")
                .textContent =
                    formatDate(
                        new Date()
                    );

        }


        return;

    }


    if (el("connectionMethod")) {

        el("connectionMethod")
            .textContent =
                "API REST";

    }


    if (el("apiBaseUrl")) {

        el("apiBaseUrl")
            .textContent =
                activeIntegration.api_base_url ||
                "غير محدد";

    }


    if (el("connectionStatus")) {

        el("connectionStatus")
            .textContent =
                activeIntegration.status ||
                "غير محدد";

    }


    if (el("lastChecked")) {

        el("lastChecked")
            .textContent =
            formatDate(
                new Date()
            );

    }

}


// ==========================================
// أزرار النظام
// ==========================================

function bindIntegrationActions() {

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(
            function (button) {

                button.onclick =
                    function () {

                        toast(
                            "عرض البيانات يتم من صفحات المبيعات والمنتجات والتقارير."
                        );

                    };

            }
        );


    document
        .querySelectorAll(
            "[data-settings]"
        )
        .forEach(
            function (button) {

                button.onclick =
                    function () {

                        toast(
                            "إعدادات الربط المتقدمة ستُفعّل مع موصل النظام."
                        );

                    };

            }
        );


    document
        .querySelectorAll(
            "[data-unlink]"
        )
        .forEach(
            function (button) {

                button.onclick =
                    async function () {

                        const integrationId =
                            Number(
                                button.dataset.unlink
                            );


                        const confirmed =
                            confirm(
                                "هل تريد حذف سجل الربط؟"
                            );


                        if (!confirmed) {

                            return;

                        }


                        try {

                            const {
                                error
                            } =
                                await supabaseClient
                                    .from(
                                        "integrations"
                                    )
                                    .delete()
                                    .eq(
                                        "id",
                                        integrationId
                                    )
                                    .eq(
                                        "shop_id",
                                        currentShop.id
                                    );


                            if (error) {

                                throw error;

                            }


                            toast(
                                "تم إلغاء الربط"
                            );


                            await refreshPageData();

                        } catch (error) {

                            console.error(
                                "Unlink integration error:",
                                error
                            );


                            toast(
                                "تعذر إلغاء الربط"
                            );

                        }

                    };

            }
        );

}


// ==========================================
// فتح نافذة إضافة نظام
// ==========================================

function openIntegrationModal() {

    const modal =
        el("integrationModal");


    if (!modal) {

        return;

    }


    modal.classList.add(
        "show"
    );


    const form =
        el("integrationForm");


    if (form) {

        form.reset();

    }


    lastConnectionTestPassed =
        false;


    const status =
        el("integrationFormStatus");


    if (status) {

        status.textContent =
            "الحالة: لم يتم اختبار الاتصال بعد.";

        status.style.color =
            "#475569";

    }

}


// ==========================================
// إغلاق نافذة الإضافة
// ==========================================

function closeIntegrationModal() {

    const modal =
        el("integrationModal");


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// ==========================================
// اختبار الاتصال الحقيقي
// ==========================================

async function testIntegrationConnection() {

    const apiBaseUrl =
        el("apiBaseUrlInput")
            ?.value
            .trim();


    const apiToken =
        el("apiTokenInput")
            ?.value
            .trim();


    const authType =
        el("apiAuthType")
            ?.value ||
        "bearer";


    const statusBox =
        el("integrationFormStatus");


    const testButton =
        el("testIntegration");


    if (!apiBaseUrl) {

        toast(
            "أدخل رابط API أولًا."
        );

        return;

    }


    try {

        new URL(
            apiBaseUrl
        );

    } catch {

        toast(
            "رابط API غير صالح."
        );

        return;

    }


    if (
        authType !== "none" &&
        !apiToken
    ) {

        toast(
            "أدخل مفتاح API أو Token."
        );

        return;

    }


    if (testButton) {

        testButton.disabled =
            true;

        testButton.textContent =
            "⏳ جاري الاختبار...";

    }


    if (statusBox) {

        statusBox.textContent =
            "⏳ يتم اختبار الاتصال بالنظام الخارجي...";

        statusBox.style.color =
            "#475569";

    }


    lastConnectionTestPassed =
        false;


    try {

        const {
            data,
            error
        } =
            await supabaseClient.functions.invoke(
                "test-integration",
                {
                    body: {
                        apiBaseUrl:
                            apiBaseUrl,

                        authType:
                            authType,

                        token:
                            apiToken
                    }
                }
            );


        if (error) {

            throw error;

        }


        if (
            !data ||
            !data.success
        ) {

            throw new Error(
                data?.message ||
                "فشل اختبار الاتصال."
            );

        }


        lastConnectionTestPassed =
            true;


        if (statusBox) {

            statusBox.textContent =
                `✅ تم الاتصال بنجاح (${
                    data.status ||
                    "OK"
                })`;

            statusBox.style.color =
                "#23833f";

        }


        toast(
            "✅ الاتصال بالنظام ناجح"
        );


    } catch (error) {

        console.error(
            "Test integration error:",
            error
        );


        if (statusBox) {

            statusBox.textContent =
                "❌ فشل الاتصال: " +
                (
                    error.message ||
                    "تعذر الوصول إلى النظام."
                );

            statusBox.style.color =
                "#dc2626";

        }


        toast(
            "فشل اختبار الاتصال"
        );


    } finally {

        if (testButton) {

            testButton.disabled =
                false;

            testButton.textContent =
                "🔌 اختبار الاتصال";

        }

    }

}


// ==========================================
// حفظ نظام جديد
// ==========================================

// ==========================================
// حفظ نظام جديد بعد نجاح اختبار الاتصال
// ==========================================

async function saveIntegrationFromForm(event) {

    event.preventDefault();


    if (!currentShop) {

        toast(
            "لم يتم تحديد المحل الحالي."
        );

        return;

    }


    const systemName =
        el("systemName")
            ?.value
            .trim();


    const systemType =
        el("systemType")
            ?.value;


    const apiBaseUrl =
        el("apiBaseUrlInput")
            ?.value
            .trim() ||
        null;


    const saveButton =
        el("saveIntegration");


    // ======================================
    // التحقق من البيانات الأساسية
    // ======================================

    if (
        !systemName ||
        !systemType
    ) {

        toast(
            "أكمل اسم النظام ونوعه."
        );

        return;

    }


    // ======================================
    // إذا كان هناك API يجب اختبار الاتصال
    // أولًا
    // ======================================

    if (apiBaseUrl) {

        try {

            new URL(
                apiBaseUrl
            );

        } catch {

            toast(
                "رابط API غير صالح."
            );

            return;

        }


        if (
            !lastConnectionTestPassed
        ) {

            toast(
                "يجب نجاح اختبار الاتصال أولًا."
            );

            return;

        }

    }


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "⏳ جاري الحفظ...";

    }


    try {

        // ==================================
        // تحديد حالة الربط
        // ==================================

        const status =
            apiBaseUrl
                ? "connected"
                : "not_configured";


        // ==================================
        // حفظ النظام في integrations
        // ==================================

        const {
            data: integration,
            error: integrationError
        } =
            await supabaseClient
                .from("integrations")
                .insert(
                    {
                        shop_id:
                            currentShop.id,

                        system_name:
                            systemName,

                        api_base_url:
                            apiBaseUrl,

                        status:
                            status
                    }
                )
                .select(
                    `
                    id,
                    shop_id,
                    system_name,
                    api_base_url,
                    status,
                    last_sync_at,
                    created_at
                    `
                )
                .single();


        if (integrationError) {

            throw integrationError;

        }


        console.log(
            "✅ Integration created:",
            integration
        );


        // ==================================
        // إغلاق النافذة
        // ==================================

        closeIntegrationModal();


        // ==================================
        // إعادة تحميل البيانات
        // ==================================

        await refreshPageData();


        toast(
            "✅ تم حفظ الربط بنجاح"
        );


    } catch (error) {

        console.error(
            "Create integration error:",
            error
        );


        toast(
            "تعذر حفظ الربط: " +
            (
                error.message ||
                "خطأ غير معروف"
            )
        );


    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "💾 حفظ الربط";

        }

    }

}

// ==========================================
// تحديث البيانات
// ==========================================

async function refreshPageData() {

    await loadIntegrations();

    await loadDataSources();

    updateConnectionInfo();

}


// ==========================================
// Realtime
// ==========================================

function subscribeRealtime() {

    if (!currentShop) {

        return;

    }


    if (integrationsChannel) {

        supabaseClient.removeChannel(
            integrationsChannel
        );

    }


    integrationsChannel =
        supabaseClient
            .channel(
                "integrations-" +
                currentShop.id
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "integrations",
                    filter:
                        `shop_id=eq.${currentShop.id}`
                },
                async function () {

                    try {

                        await refreshPageData();

                        toast(
                            "تم تحديث الأنظمة المرتبطة"
                        );

                    } catch (error) {

                        console.error(
                            "Integration Realtime Error:",
                            error
                        );

                    }

                }
            )


            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "data_sources"
                },
                async function () {

                    try {

                        await refreshPageData();

                        toast(
                            "تم تحديث مصادر البيانات"
                        );

                    } catch (error) {

                        console.error(
                            "Data Source Realtime Error:",
                            error
                        );

                    }

                }
            )


            .subscribe(
                function (status) {

                    console.log(
                        "Integrations Realtime:",
                        status
                    );

                }
            );

}


// ==========================================
// أحداث الصفحة
// ==========================================

function setupEvents() {

    const helpButton =
        el("helpButton");


    if (helpButton) {

        helpButton.addEventListener(
            "click",
            function () {

                toast(
                    "هذه الصفحة لإدارة ربط الأنظمة ومصادر البيانات."
                );

            }
        );

    }


    const newIntegrationButton =
        el("newIntegrationButton");


    if (newIntegrationButton) {

        newIntegrationButton.addEventListener(
            "click",
            openIntegrationModal
        );

    }


    const cancelButton =
        el("cancelIntegration");


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeIntegrationModal
        );

    }


    const modal =
        el("integrationModal");


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeIntegrationModal();

                }

            }
        );

    }


    const form =
        el("integrationForm");


    if (form) {

        form.addEventListener(
            "submit",
            saveIntegrationFromForm
        );

    }


    const testButton =
        el("testIntegration");


    if (testButton) {

        testButton.addEventListener(
            "click",
            testIntegrationConnection
        );

    }


    const manageSources =
        el("manageSources");


    if (manageSources) {

        manageSources.addEventListener(
            "click",
            function () {

                toast(
                    "مصادر البيانات تُقرأ من جدول data_sources."
                );

            }
        );

    }

}


// ==========================================
// تشغيل الصفحة
// ==========================================

async function initIntegrations() {

    try {

        setupEvents();

        await loadShop();

        await loadIntegrations();

        await loadDataSources();

        updateConnectionInfo();

        subscribeRealtime();

    } catch (error) {

        console.error(
            "Integrations Page Error:",
            error
        );


        const container =
            el("linkedSystems");


        if (container) {

            container.innerHTML =
                `
                <section class="integration-card">

                    <div style="
                        text-align:center;
                        color:#dc2626;
                        font-size:11px;
                        padding:14px;
                    ">
                        تعذر تحميل بيانات الربط:
                        ${escapeHtml(
                            error.message ||
                            "خطأ غير معروف"
                        )}
                    </div>

                </section>
                `;

        }


        const connectionStatus =
            el("connectionStatus");


        if (connectionStatus) {

            connectionStatus.textContent =
                "خطأ في الاتصال";

        }

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initIntegrations
);