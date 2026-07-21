const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const loginError = document.querySelector("#login-error");
const supabaseClient = window.credibleSupabase;

checkExistingSession();

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    if (!email || !password) {
        loginError.textContent = "Lütfen e-posta ve şifre alanlarını doldur.";
        return;
    }

    setLoading(true);
    loginError.textContent = "";

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        loginError.textContent = "E-posta veya şifre hatalı.";
        setLoading(false);
        return;
    }

    window.location.replace("daily-calorie-tracker.html");
});

async function checkExistingSession() {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        window.location.replace("daily-calorie-tracker.html");
    }
}

function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading ? "Giriş yapılıyor..." : "Giriş Yap";
}