const homeSupabase = window.credibleSupabase;

const summaryDate = document.querySelector("#summary-date");
const summaryCalories = document.querySelector("#summary-calories");
const summaryTarget = document.querySelector("#summary-target");
const summaryRemaining = document.querySelector("#summary-remaining");
const summaryProtein = document.querySelector("#summary-protein");
const summaryCarbohydrates = document.querySelector("#summary-carbohydrates");
const summaryFat = document.querySelector("#summary-fat");
const summaryStatus = document.querySelector("#summary-status");
const summaryLoginLink = document.querySelector("#summary-login-link");
const progressCircle = document.querySelector(".progress-circle");

initializeHomeSummary();

async function initializeHomeSummary() {
    summaryDate.textContent = formatToday();

    if (!homeSupabase) {
        showSummaryError("Günlük özet şu anda yüklenemiyor.");
        return;
    }

    const { data: { session }, error: sessionError } = await homeSupabase.auth.getSession();

    if (sessionError) {
        showSummaryError("Oturum bilgisi alınamadı.");
        return;
    }

    if (!session) {
        showLoggedOutSummary();
        return;
    }

    summaryLoginLink.textContent = "Yemek günlüğüne git";
    summaryLoginLink.href = "pages/daily-calorie-tracker.html";
    await loadTodaySummary(session.user.id);
}

async function loadTodaySummary(userId) {
    summaryStatus.textContent = "Bugünkü kayıtlar yükleniyor...";

    const [entriesResult, profileResult] = await Promise.all([
        homeSupabase
            .from("food_entries")
            .select("calories, protein, fat, carbohydrates")
            .eq("entry_date", getTodayKey()),
        homeSupabase
            .from("user_profiles")
            .select("daily_calorie_target")
            .eq("user_id", userId)
            .maybeSingle()
    ]);

    if (entriesResult.error) {
        showSummaryError("Bugünkü kayıtlar alınamadı.");
        return;
    }

    const entries = entriesResult.data || [];
    const totals = entries.reduce(
        (sum, entry) => ({
            calories: sum.calories + Number(entry.calories || 0),
            protein: sum.protein + Number(entry.protein || 0),
            fat: sum.fat + Number(entry.fat || 0),
            carbohydrates: sum.carbohydrates + Number(entry.carbohydrates || 0)
        }),
        { calories: 0, protein: 0, fat: 0, carbohydrates: 0 }
    );

    summaryCalories.textContent = formatNumber(totals.calories);
    summaryProtein.textContent = `${formatNumber(totals.protein)} g`;
    summaryCarbohydrates.textContent = `${formatNumber(totals.carbohydrates)} g`;
    summaryFat.textContent = `${formatNumber(totals.fat)} g`;

    const dailyTarget = Number(profileResult.data?.daily_calorie_target || 0);

    if (profileResult.error) {
        summaryTarget.textContent = "Yüklenemedi";
        summaryRemaining.textContent = "—";
        progressCircle.style.setProperty("--summary-progress", "0deg");
    } else if (dailyTarget > 0) {
        const remaining = dailyTarget - totals.calories;
        const progressRatio = Math.min(Math.max(totals.calories / dailyTarget, 0), 1);

        summaryTarget.textContent = `${formatNumber(dailyTarget)} kcal`;
        summaryRemaining.textContent = remaining >= 0
            ? `${formatNumber(remaining)} kcal`
            : `${formatNumber(Math.abs(remaining))} kcal aşıldı`;
        progressCircle.style.setProperty("--summary-progress", `${progressRatio * 360}deg`);
    } else {
        summaryTarget.textContent = "Belirlenmedi";
        summaryRemaining.textContent = "—";
        summaryLoginLink.textContent = "Hedefini hesapla";
        summaryLoginLink.href = "pages/calorie-calculator.html";
        progressCircle.style.setProperty("--summary-progress", "0deg");
    }

    summaryStatus.textContent = entries.length === 0
        ? "Bugün henüz yemek eklenmedi."
        : `${entries.length} kayıt üzerinden hesaplandı.`;
}

function showLoggedOutSummary() {
    summaryCalories.textContent = "—";
    summaryProtein.textContent = "—";
    summaryCarbohydrates.textContent = "—";
    summaryFat.textContent = "—";
    summaryTarget.textContent = "Giriş gerekli";
    summaryRemaining.textContent = "—";
    summaryStatus.textContent = "Kendi günlük özetini görmek için giriş yap.";
    summaryLoginLink.textContent = "Giriş yap";
    summaryLoginLink.href = "pages/login.html";
}

function showSummaryError(message) {
    summaryCalories.textContent = "—";
    summaryProtein.textContent = "—";
    summaryCarbohydrates.textContent = "—";
    summaryFat.textContent = "—";
    summaryTarget.textContent = "—";
    summaryRemaining.textContent = "—";
    summaryStatus.textContent = message;
}

function getTodayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatToday() {
    return new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long"
    }).format(new Date());
}

function formatNumber(value) {
    return Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}