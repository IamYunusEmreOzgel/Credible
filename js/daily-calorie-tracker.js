const foodForm = document.querySelector("#food-form");
const foodSelect = document.querySelector("#food-select");
const portionInput = document.querySelector("#portion-grams");
const nutritionPreview = document.querySelector("#nutrition-preview");
const previewBasis = document.querySelector("#preview-basis");
const previewCalories = document.querySelector("#preview-calories");
const previewProtein = document.querySelector("#preview-protein");
const previewFat = document.querySelector("#preview-fat");
const foodList = document.querySelector("#food-list");
const emptyLog = document.querySelector("#empty-log");
const clearLogButton = document.querySelector("#clear-log");
const totalCalories = document.querySelector("#total-calories");
const totalProtein = document.querySelector("#total-protein");
const totalFat = document.querySelector("#total-fat");
const entryCount = document.querySelector("#entry-count");
const foodError = document.querySelector("#food-error");

const foods = Array.isArray(window.FOOD_DATABASE) ? window.FOOD_DATABASE : [];
const storageKey = `credible-food-log-${getTodayKey()}`;
let foodEntries = loadEntries();

populateFoodSelect();
renderEntries();

foodSelect.addEventListener("change", updateNutritionPreview);
portionInput.addEventListener("input", updateNutritionPreview);

foodForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const food = getSelectedFood();
    const portionGrams = Number(portionInput.value);
    const validationError = validateEntry({ food, portionGrams });

    if (validationError) {
        foodError.textContent = validationError;
        return;
    }

    foodError.textContent = "";
    const nutrition = calculateNutrition(food, portionGrams);

    foodEntries.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        foodId: food.id,
        foodName: food.name,
        portionGrams,
        calories: nutrition.calories,
        protein: nutrition.protein,
        fat: nutrition.fat
    });

    saveEntries();
    renderEntries();
    foodForm.reset();
    nutritionPreview.hidden = true;
    foodSelect.focus();
});

foodList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-id]");

    if (!removeButton) {
        return;
    }

    foodEntries = foodEntries.filter((entry) => entry.id !== removeButton.dataset.removeId);
    saveEntries();
    renderEntries();
});

clearLogButton.addEventListener("click", () => {
    foodEntries = [];
    saveEntries();
    renderEntries();
});

function populateFoodSelect() {
    foods
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "tr"))
        .forEach((food) => {
            const option = document.createElement("option");
            option.value = food.id;
            option.textContent = food.name;
            foodSelect.append(option);
        });
}

function updateNutritionPreview() {
    const food = getSelectedFood();
    const portionGrams = Number(portionInput.value);

    if (!food) {
        nutritionPreview.hidden = true;
        return;
    }

    const grams = Number.isFinite(portionGrams) && portionGrams > 0 ? portionGrams : 100;
    const nutrition = calculateNutrition(food, grams);

    previewBasis.textContent = `${formatNumber(grams)} gram için`;
    previewCalories.textContent = formatNumber(nutrition.calories);
    previewProtein.textContent = formatNumber(nutrition.protein);
    previewFat.textContent = formatNumber(nutrition.fat);
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
        fat: roundTo(food.fat * multiplier, 1)
    };
}

function renderEntries() {
    foodList.innerHTML = "";

    foodEntries.forEach((entry) => {
        const listItem = document.createElement("li");
        listItem.className = "food-item";

        const details = document.createElement("div");
        const title = document.createElement("h3");
        const portion = document.createElement("p");
        const nutrition = document.createElement("div");
        const calories = document.createElement("strong");
        const macros = document.createElement("small");
        const removeButton = document.createElement("button");

        title.textContent = entry.foodName;
        portion.textContent = `${formatNumber(entry.portionGrams)} gram`;
        calories.textContent = `${formatNumber(entry.calories)} kcal`;
        macros.textContent = `${formatNumber(entry.protein)} g protein · ${formatNumber(entry.fat)} g yağ`;
        nutrition.className = "food-item-nutrition";

        removeButton.type = "button";
        removeButton.className = "remove-food-button";
        removeButton.dataset.removeId = entry.id;
        removeButton.textContent = "Sil";
        removeButton.setAttribute("aria-label", `${entry.foodName} kaydını sil`);

        details.append(title, portion);
        nutrition.append(calories, macros);
        listItem.append(details, nutrition, removeButton);
        foodList.append(listItem);
    });

    const totals = foodEntries.reduce(
        (sum, entry) => ({
            calories: sum.calories + Number(entry.calories || 0),
            protein: sum.protein + Number(entry.protein || 0),
            fat: sum.fat + Number(entry.fat || 0)
        }),
        { calories: 0, protein: 0, fat: 0 }
    );

    totalCalories.textContent = formatNumber(totals.calories);
    totalProtein.textContent = `${formatNumber(roundTo(totals.protein, 1))} g`;
    totalFat.textContent = `${formatNumber(roundTo(totals.fat, 1))} g`;
    entryCount.textContent = foodEntries.length === 0
        ? "Henüz yemek eklenmedi."
        : `${foodEntries.length} kayıt eklendi.`;

    emptyLog.hidden = foodEntries.length > 0;
    clearLogButton.hidden = foodEntries.length === 0;
}

function validateEntry({ food, portionGrams }) {
    if (!food || !Number.isFinite(portionGrams)) {
        return "Lütfen bir yiyecek seç ve porsiyon miktarını gir.";
    }

    if (portionGrams < 1 || portionGrams > 3000) {
        return "Porsiyon miktarı 1 ile 3000 gram arasında olmalı.";
    }

    return "";
}

function loadEntries() {
    try {
        const storedEntries = JSON.parse(localStorage.getItem(storageKey));
        return Array.isArray(storedEntries) ? storedEntries : [];
    } catch (error) {
        return [];
    }
}

function saveEntries() {
    localStorage.setItem(storageKey, JSON.stringify(foodEntries));
}

function roundTo(value, digits) {
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
}

function formatNumber(value) {
    return Number(value).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}

function getTodayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
