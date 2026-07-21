const foodForm = document.querySelector("#food-form");
const foodSelect = document.querySelector("#food-select");
const portionInput = document.querySelector("#portion-grams");
const nutritionPreview = document.querySelector("#nutrition-preview");
const previewBasis = document.querySelector("#preview-basis");
const previewCalories = document.querySelector("#preview-calories");
const previewProtein = document.querySelector("#preview-protein");
const previewFat = document.querySelector("#preview-fat");
const previewCarbohydrates = document.querySelector("#preview-carbohydrates");
const foodList = document.querySelector("#food-list");
const emptyLog = document.querySelector("#empty-log");
const clearLogButton = document.querySelector("#clear-log");
const logoutButton = document.querySelector("#logout-button");
const addFoodButton = document.querySelector("#add-food-button");
const whatsappShareButton = document.querySelector("#whatsapp-share-button");
const totalCalories = document.querySelector("#total-calories");
const totalProtein = document.querySelector("#total-protein");
const totalFat = document.querySelector("#total-fat");
const totalCarbohydrates = document.querySelector("#total-carbohydrates");
const entryCount = document.querySelector("#entry-count");
const foodError = document.querySelector("#food-error");

const foods = Array.isArray(window.FOOD_DATABASE) ? window.FOOD_DATABASE : [];
const supabaseClient = window.credibleSupabase;
let currentUser = null;
let foodEntries = [];
let dailyCalorieTarget = null;
let currentTotals = { calories: 0, protein: 0, fat: 0, carbohydrates: 0 };

initializePage();

foodSelect.addEventListener("change", updateNutritionPreview);
portionInput.addEventListener("input", updateNutritionPreview);
foodForm.addEventListener("submit", addFoodEntry);
foodList.addEventListener("click", removeFoodEntry);
clearLogButton.addEventListener("click", clearTodayEntries);
logoutButton.addEventListener("click", logout);
whatsappShareButton.addEventListener("click", shareDailySummary);

async function initializePage() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.replace("login.html");
        return;
    }

    currentUser = data.user;
    populateFoodSelect();
    await Promise.all([loadEntries(), loadDailyTarget()]);
}

async function addFoodEntry(event) {
    event.preventDefault();

    const food = getSelectedFood();
    const portionGrams = Number(portionInput.value);
    const validationError = validateEntry({ food, portionGrams });

    if (validationError) {
        foodError.textContent = validationError;
        return;
    }

    setFormLoading(true);
    foodError.textContent = "";
    const nutrition = calculateNutrition(food, portionGrams);

    const { data, error } = await supabaseClient
        .from("food_entries")
        .insert({
            user_id: currentUser.id,
            entry_date: getTodayKey(),
            food_id: food.id,
            food_name: food.name,
            portion_grams: portionGrams,
            calories: nutrition.calories,
            protein: nutrition.protein,
            fat: nutrition.fat,
            carbohydrates: nutrition.carbohydrates
        })
        .select()
        .single();

    if (error) {
        foodError.textContent = "Kayıt eklenemedi. Supabase tablo ve güvenlik ayarlarını kontrol et.";
        console.error(error);
        setFormLoading(false);
        return;
    }

    foodEntries.unshift(normalizeEntry(data));
    renderEntries();
    foodForm.reset();
    nutritionPreview.hidden = true;
    foodSelect.focus();
    setFormLoading(false);
}

async function loadEntries() {
    entryCount.textContent = "Kayıtlar yükleniyor...";

    const { data, error } = await supabaseClient
        .from("food_entries")
        .select("*")
        .eq("entry_date", getTodayKey())
        .order("created_at", { ascending: false });

    if (error) {
        foodError.textContent = "Kayıtlar yüklenemedi. Supabase tablo ve RLS ayarlarını kontrol et.";
        console.error(error);
        foodEntries = [];
    } else {
        foodEntries = data.map(normalizeEntry);
    }

    renderEntries();
}

async function loadDailyTarget() {
    const { data, error } = await supabaseClient
        .from("user_profiles")
        .select("daily_calorie_target")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        console.error("Günlük hedef alınamadı:", error);
        dailyCalorieTarget = null;
        return;
    }

    dailyCalorieTarget = data ? Number(data.daily_calorie_target) : null;
}

async function removeFoodEntry(event) {
    const removeButton = event.target.closest("[data-remove-id]");
    if (!removeButton) return;

    removeButton.disabled = true;
    const { error } = await supabaseClient
        .from("food_entries")
        .delete()
        .eq("id", removeButton.dataset.removeId);

    if (error) {
        foodError.textContent = "Kayıt silinemedi.";
        removeButton.disabled = false;
        return;
    }

    foodEntries = foodEntries.filter((entry) => entry.id !== removeButton.dataset.removeId);
    renderEntries();
}

async function clearTodayEntries() {
    clearLogButton.disabled = true;
    const { error } = await supabaseClient
        .from("food_entries")
        .delete()
        .eq("entry_date", getTodayKey());

    if (error) {
        foodError.textContent = "Günlük kayıtlar temizlenemedi.";
        clearLogButton.disabled = false;
        return;
    }

    foodEntries = [];
    renderEntries();
    clearLogButton.disabled = false;
}

async function logout() {
    logoutButton.disabled = true;
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
}

function shareDailySummary() {
    if (foodEntries.length === 0) return;

    const date = new Intl.DateTimeFormat("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date());

    const lines = [
        `*Credible Günlük Beslenme Özeti*`,
        date,
        "",
        `Alınan: *${formatNumber(currentTotals.calories)} kcal*`
    ];

    if (Number.isFinite(dailyCalorieTarget)) {
        const remaining = dailyCalorieTarget - currentTotals.calories;
        lines.push(`Hedef: ${formatNumber(dailyCalorieTarget)} kcal`);
        lines.push(remaining >= 0
            ? `Kalan: ${formatNumber(remaining)} kcal`
            : `Hedef aşımı: ${formatNumber(Math.abs(remaining))} kcal`);
    }

    lines.push(
        "",
        `Protein: ${formatNumber(currentTotals.protein)} g`,
        `Karbonhidrat: ${formatNumber(currentTotals.carbohydrates)} g`,
        `Yağ: ${formatNumber(currentTotals.fat)} g`,
        `Toplam kayıt: ${foodEntries.length}`
    );

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

function populateFoodSelect() {
    foods.slice().sort((a, b) => a.name.localeCompare(b.name, "tr")).forEach((food) => {
        const option = document.createElement("option");
        option.value = food.id;
        option.textContent = food.name;
        foodSelect.append(option);
    });
}

function updateNutritionPreview() {
    const food = getSelectedFood();
    if (!food) {
        nutritionPreview.hidden = true;
        return;
    }

    const value = Number(portionInput.value);
    const grams = Number.isFinite(value) && value > 0 ? value : 100;
    const nutrition = calculateNutrition(food, grams);

    previewBasis.textContent = `${formatNumber(grams)} gram için`;
    previewCalories.textContent = formatNumber(nutrition.calories);
    previewProtein.textContent = formatNumber(nutrition.protein);
    previewFat.textContent = formatNumber(nutrition.fat);
    previewCarbohydrates.textContent = formatNumber(nutrition.carbohydrates);
    nutritionPreview.hidden = false;
}

function getSelectedFood() {
    return foods.find((food) => food.id === foodSelect.value);
}

function calculateNutrition(food, portionGrams) {
    const multiplier = portionGrams / 100;
    return {
        calories: roundTo(food.calories * multiplier, 0),
        protein: roundTo(food.protein * multiplier, 1),
        fat: roundTo(food.fat * multiplier, 1),
        carbohydrates: roundTo(Number(food.carbohydrates || 0) * multiplier, 1)
    };
}

function normalizeEntry(entry) {
    return {
        id: String(entry.id),
        foodName: entry.food_name,
        portionGrams: Number(entry.portion_grams),
        calories: Number(entry.calories),
        protein: Number(entry.protein),
        fat: Number(entry.fat),
        carbohydrates: Number(entry.carbohydrates || 0)
    };
}

function renderEntries() {
    foodList.innerHTML = "";

    foodEntries.forEach((entry) => {
        const item = document.createElement("li");
        item.className = "food-item";
        item.innerHTML = `<div><h3></h3><p></p></div><div class="food-item-nutrition"><strong></strong><small></small></div><button class="remove-food-button" type="button">Sil</button>`;
        item.querySelector("h3").textContent = entry.foodName;
        item.querySelector("p").textContent = `${formatNumber(entry.portionGrams)} gram`;
        item.querySelector("strong").textContent = `${formatNumber(entry.calories)} kcal`;
        item.querySelector("small").textContent = `${formatNumber(entry.protein)} g protein · ${formatNumber(entry.fat)} g yağ · ${formatNumber(entry.carbohydrates)} g karbonhidrat`;
        const button = item.querySelector("button");
        button.dataset.removeId = entry.id;
        button.setAttribute("aria-label", `${entry.foodName} kaydını sil`);
        foodList.append(item);
    });

    currentTotals = foodEntries.reduce((sum, entry) => ({
        calories: sum.calories + entry.calories,
        protein: sum.protein + entry.protein,
        fat: sum.fat + entry.fat,
        carbohydrates: sum.carbohydrates + entry.carbohydrates
    }), { calories: 0, protein: 0, fat: 0, carbohydrates: 0 });

    totalCalories.textContent = formatNumber(currentTotals.calories);
    totalProtein.textContent = `${formatNumber(currentTotals.protein)} g`;
    totalFat.textContent = `${formatNumber(currentTotals.fat)} g`;
    totalCarbohydrates.textContent = `${formatNumber(currentTotals.carbohydrates)} g`;
    entryCount.textContent = foodEntries.length ? `${foodEntries.length} kayıt eklendi.` : "Henüz yemek eklenmedi.";
    emptyLog.hidden = foodEntries.length > 0;
    clearLogButton.hidden = foodEntries.length === 0;
    whatsappShareButton.disabled = foodEntries.length === 0;
}

function validateEntry({ food, portionGrams }) {
    if (!food || !Number.isFinite(portionGrams)) return "Lütfen bir yiyecek seç ve porsiyon miktarını gir.";
    if (portionGrams < 1 || portionGrams > 3000) return "Porsiyon miktarı 1 ile 3000 gram arasında olmalı.";
    return "";
}

function setFormLoading(isLoading) {
    addFoodButton.disabled = isLoading;
    addFoodButton.textContent = isLoading ? "Kaydediliyor..." : "Günlüğe Ekle";
}

function roundTo(value, digits) {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function getTodayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}