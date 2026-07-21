const calculatorSupabase = window.credibleSupabase;
const calculatorForm = document.querySelector("#calculator-form");
const errorMessage = document.querySelector("#form-error");
const resultPanel = document.querySelector("#result");
const bmrValue = document.querySelector("#bmr-value");
const dailyCalorieValue = document.querySelector("#daily-calorie-value");
const saveTargetButton = document.querySelector("#save-target-button");
const saveTargetStatus = document.querySelector("#save-target-status");

let calculatedDailyTarget = null;

calculatorForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(calculatorForm);
    const gender = formData.get("gender");
    const age = Number(formData.get("age"));
    const height = Number(formData.get("height"));
    const weight = Number(formData.get("weight"));
    const activityLevel = Number(formData.get("activityLevel"));

    const validationError = validateInputs({ age, height, weight, activityLevel });

    if (validationError) {
        errorMessage.textContent = validationError;
        resultPanel.hidden = true;
        calculatedDailyTarget = null;
        return;
    }

    errorMessage.textContent = "";
    saveTargetStatus.textContent = "";

    const bmr = gender === "male"
        ? 66.5 + (13.75 * weight) + (5 * height) - (6.75 * age)
        : 655.1 + (9.56 * weight) + (1.85 * height) - (4.68 * age);

    calculatedDailyTarget = Math.round(bmr * activityLevel);

    bmrValue.textContent = Math.round(bmr).toLocaleString("tr-TR");
    dailyCalorieValue.textContent = calculatedDailyTarget.toLocaleString("tr-TR");
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

saveTargetButton.addEventListener("click", saveDailyTarget);

async function saveDailyTarget() {
    if (!Number.isFinite(calculatedDailyTarget)) {
        saveTargetStatus.textContent = "Önce günlük kalori ihtiyacını hesapla.";
        return;
    }

    if (!calculatorSupabase) {
        saveTargetStatus.textContent = "Supabase bağlantısı kurulamadı.";
        return;
    }

    saveTargetButton.disabled = true;
    saveTargetButton.textContent = "Kaydediliyor...";
    saveTargetStatus.textContent = "";

    const { data: { session }, error: sessionError } = await calculatorSupabase.auth.getSession();

    if (sessionError || !session) {
        const returnPath = encodeURIComponent("calorie-calculator.html");
        window.location.href = `login.html?redirect=${returnPath}`;
        return;
    }

    const { error } = await calculatorSupabase
        .from("user_profiles")
        .upsert(
            {
                user_id: session.user.id,
                daily_calorie_target: calculatedDailyTarget,
                updated_at: new Date().toISOString()
            },
            { onConflict: "user_id" }
        );

    if (error) {
        saveTargetStatus.textContent = "Hedef kaydedilemedi. Supabase tablosunu ve güvenlik kurallarını kontrol et.";
        saveTargetButton.disabled = false;
        saveTargetButton.textContent = "Bu değeri günlük hedefim olarak kaydet";
        return;
    }

    saveTargetStatus.textContent = `${calculatedDailyTarget.toLocaleString("tr-TR")} kcal günlük hedef olarak kaydedildi.`;
    saveTargetButton.textContent = "Günlük hedef kaydedildi";

    window.setTimeout(() => {
        saveTargetButton.disabled = false;
        saveTargetButton.textContent = "Hedefi güncelle";
    }, 1200);
}

function validateInputs({ age, height, weight, activityLevel }) {
    if (![age, height, weight, activityLevel].every(Number.isFinite)) {
        return "Lütfen tüm alanları doldur.";
    }

    if (age < 18 || age > 100) {
        return "Yaş değeri 18 ile 100 arasında olmalı.";
    }

    if (height < 120 || height > 230) {
        return "Boy değeri 120 ile 230 cm arasında olmalı.";
    }

    if (weight < 35 || weight > 300) {
        return "Kilo değeri 35 ile 300 kg arasında olmalı.";
    }

    if (activityLevel < 1.2 || activityLevel > 1.9) {
        return "Lütfen geçerli bir aktivite seviyesi seç.";
    }

    return "";
}