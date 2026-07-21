const calculatorForm = document.querySelector("#calculator-form");
const errorMessage = document.querySelector("#form-error");
const resultPanel = document.querySelector("#result");
const bmrValue = document.querySelector("#bmr-value");

calculatorForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(calculatorForm);
    const gender = formData.get("gender");
    const age = Number(formData.get("age"));
    const height = Number(formData.get("height"));
    const weight = Number(formData.get("weight"));

    const validationError = validateInputs({ age, height, weight });

    if (validationError) {
        errorMessage.textContent = validationError;
        resultPanel.hidden = true;
        return;
    }

    errorMessage.textContent = "";

    // Harris-Benedict denklemi
    const bmr = gender === "male"
        ? 66.5 + (13.75 * weight) + (5 * height) - (6.75 * age)
        : 655.1 + (9.56 * weight) + (1.85 * height) - (4.68 * age);

    bmrValue.textContent = Math.round(bmr).toLocaleString("tr-TR");
    resultPanel.hidden = false;
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function validateInputs({ age, height, weight }) {
    if (!Number.isFinite(age) || !Number.isFinite(height) || !Number.isFinite(weight)) {
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

    return "";
}
