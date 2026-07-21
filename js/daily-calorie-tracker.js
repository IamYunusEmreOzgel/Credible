const foodForm = document.querySelector("#food-form");
const foodList = document.querySelector("#food-list");
const emptyLog = document.querySelector("#empty-log");
const clearLogButton = document.querySelector("#clear-log");
const totalCalories = document.querySelector("#total-calories");
const entryCount = document.querySelector("#entry-count");
const foodError = document.querySelector("#food-error");

const storageKey = `credible-food-log-${getTodayKey()}`;
let foodEntries = loadEntries();

renderEntries();

foodForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(foodForm);
    const foodName = String(formData.get("foodName") || "").trim();
    const portion = String(formData.get("portion") || "").trim();
    const calories = Number(formData.get("calories"));

    const validationError = validateEntry({ foodName, portion, calories });

    if (validationError) {
        foodError.textContent = validationError;
        return;
    }

    foodError.textContent = "";

    foodEntries.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        foodName,
        portion,
        calories: Math.round(calories)
    });

    saveEntries();
    renderEntries();
    foodForm.reset();
    document.querySelector("#food-name").focus();
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

function renderEntries() {
    foodList.innerHTML = "";

    foodEntries.forEach((entry) => {
        const listItem = document.createElement("li");
        listItem.className = "food-item";

        const details = document.createElement("div");
        const title = document.createElement("h3");
        const portion = document.createElement("p");
        const calories = document.createElement("strong");
        const removeButton = document.createElement("button");

        title.textContent = entry.foodName;
        portion.textContent = entry.portion;
        calories.textContent = `${entry.calories.toLocaleString("tr-TR")} kcal`;

        removeButton.type = "button";
        removeButton.className = "remove-food-button";
        removeButton.dataset.removeId = entry.id;
        removeButton.textContent = "Sil";
        removeButton.setAttribute("aria-label", `${entry.foodName} kaydını sil`);

        details.append(title, portion);
        listItem.append(details, calories, removeButton);
        foodList.append(listItem);
    });

    const total = foodEntries.reduce((sum, entry) => sum + entry.calories, 0);
    totalCalories.textContent = total.toLocaleString("tr-TR");

    if (foodEntries.length === 0) {
        entryCount.textContent = "Henüz yemek eklenmedi.";
    } else {
        entryCount.textContent = `${foodEntries.length} kayıt eklendi.`;
    }

    emptyLog.hidden = foodEntries.length > 0;
    clearLogButton.hidden = foodEntries.length === 0;
}

function validateEntry({ foodName, portion, calories }) {
    if (!foodName || !portion || !Number.isFinite(calories)) {
        return "Lütfen tüm alanları doldur.";
    }

    if (foodName.length < 2) {
        return "Yiyecek adı en az 2 karakter olmalı.";
    }

    if (calories < 1 || calories > 5000) {
        return "Kalori değeri 1 ile 5000 arasında olmalı.";
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

function getTodayKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}
