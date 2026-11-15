/* ==========================================================
   Final Project: authentication simulation
   Bodybuilders Gym - Group SE-2512

   There is no backend, so everything lives in localStorage:
     gym-users    : array of accounts  { name, email, phone, plan, password, createdAt }
     gym-session  : email of the user who is logged in
   NOTE: a real website never stores a plain password. We do it
   here only because the project asks to simulate Sign Up / Log In.

   Sections
     1. Auth     : sign up, log in, log out, current user, per-user storage keys
     2. Navbar   : shows Log In / Sign Up or the user's name + Log Out
     3. Pages    : signup.html, login.html, profile.html
   Each page feature only runs when its elements exist.
   ========================================================== */

const PLAN_PRICES = { basic: 9900, standard: 14900, premium: 19900 };
function membershipPrice(plan, promo = '') {
    const base = PLAN_PRICES[plan] || PLAN_PRICES.standard;
    return Math.round(base * (promo.trim().toUpperCase() === 'BODY2026' ? 0.9 : 1));
}

const AUTH_KEYS = {
    users:   'gym-users',
    session: 'gym-session',
    flash:   'gym-flash'      // a one-time message shown on the next page (sessionStorage)
};

/* ==========================================================
   1. Auth
   ========================================================== */
function readJSON(key, fallback) {
    try {
        const text = localStorage.getItem(key);
        return text ? JSON.parse(text) : fallback;
    } catch (error) {
        return fallback;                      // blocked storage or broken JSON
    }
}

function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { return false; }
}

const Auth = {

    getUsers() { return readJSON(AUTH_KEYS.users, []); },

    findUser(email) {
        const wanted = email.trim().toLowerCase();
        return this.getUsers().find(user => user.email.toLowerCase() === wanted) || null;
    },

    // Sign Up: stores the user and logs them in. Returns { ok, user } or { ok: false, field, message }
    signUp(data) {
        if (this.findUser(data.email)) {
            return { ok: false, field: 'email', message: 'An account with this email already exists. Please log in.' };
        }
        const user = {
            name:      data.name.trim(),
            email:     data.email.trim().toLowerCase(),
            phone:     data.phone.trim(),
            plan:      data.plan,
            password:  data.password,
            promo:     (data.promo || '').trim().toUpperCase(),
            firstMonthPrice: membershipPrice(data.plan, data.promo),
            createdAt: new Date().toISOString()
        };
        const users = this.getUsers();
        users.push(user);
        if (!writeJSON(AUTH_KEYS.users, users)) {
            return { ok: false, field: null, message: 'Your browser blocked local storage, so the account could not be saved.' };
        }
        this.startSession(user.email);
        return { ok: true, user };
    },

    // Log In: checks the email and password. Returns { ok, user } or { ok: false, field, message }
    logIn(email, password) {
        const user = this.findUser(email);
        if (!user) {
            return { ok: false, field: 'email', message: 'We could not find an account with this email. Sign up first?' };
        }
        if (user.password !== password) {
            return { ok: false, field: 'password', message: 'Incorrect password. Please try again.' };
        }
        this.startSession(user.email);
        return { ok: true, user };
    },

    startSession(email) {
        try { localStorage.setItem(AUTH_KEYS.session, email); } catch (error) { /* ignore */ }
        this.mergeGuestData();
    },

    logOut() {
        try { localStorage.removeItem(AUTH_KEYS.session); } catch (error) { /* ignore */ }
    },

    currentUser() {
        let email = null;
        try { email = localStorage.getItem(AUTH_KEYS.session); } catch (error) { return null; }
        return email ? this.findUser(email) : null;
    },

    // Data that belongs to one person: gym-favorites:name@mail.com  (guests use "guest")
    userKey(name) {
        const user = this.currentUser();
        return 'gym-' + name + ':' + (user ? user.email : 'guest');
    },

    getFavorites()      { return readJSON(this.userKey('favorites'), []); },
    saveFavorites(list) { return writeJSON(this.userKey('favorites'), list); },

    // Exercises saved before logging in are moved into the account
    mergeGuestData() {
        const guestKey = 'gym-favorites:guest';
        const guestList = readJSON(guestKey, []);
        if (guestList.length === 0) return;
        const mine = this.getFavorites();
        guestList.forEach(item => {
            if (!mine.some(saved => saved.id === item.id)) mine.push(item);
        });
        this.saveFavorites(mine);
        try { localStorage.removeItem(guestKey); } catch (error) { /* ignore */ }
    },

    setFlash(text) {
        try { sessionStorage.setItem(AUTH_KEYS.flash, text); } catch (error) { /* ignore */ }
    },

    takeFlash() {
        try {
            const text = sessionStorage.getItem(AUTH_KEYS.flash);
            sessionStorage.removeItem(AUTH_KEYS.flash);
            return text;
        } catch (error) { return null; }
    }
};

function showToastIfAvailable(text, type) {
    if (window.GymUI) window.GymUI.showToast(text, type);
}


/* ==========================================================
   2. Navbar: <div id="auth-nav"> is filled by JavaScript
   ========================================================== */
function makeNavLink(text, href, className) {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = href;
    link.className = className;
    return link;
}

function initAuthNav() {
    const slot = document.getElementById('auth-nav');
    if (!slot) return;

    slot.innerHTML = '';
    const user = Auth.currentUser();

    if (user) {
        const firstName = user.name.split(' ')[0];
        const profile = makeNavLink(firstName, 'profile.html', 'btn btn-sm btn-outline-light auth-name');
        profile.title = 'Open your profile';
        profile.prepend(document.createTextNode('☺ '));          // small smiley as an icon

        const logout = document.createElement('button');
        logout.type = 'button';
        logout.id = 'logoutBtn';
        logout.className = 'btn btn-sm btn-custom-rust';
        logout.textContent = 'Log Out';
        logout.addEventListener('click', () => {
            Auth.logOut();
            Auth.setFlash('You have been logged out.');
            window.location.href = 'login.html';
        });

        slot.append(profile, logout);
    } else {
        slot.append(
            makeNavLink('Log In', 'login.html', 'btn btn-sm btn-outline-light'),
            makeNavLink('Sign Up', 'signup.html', 'btn btn-sm btn-custom-rust')
        );
    }
}


/* ==========================================================
   3. Pages
   ========================================================== */

// Shows the message the previous page left behind (for example "You have been logged out.")
function showFlashMessage() {
    const text = Auth.takeFlash();
    if (!text) return;
    const box = document.getElementById('flash-message');
    if (box) {
        box.textContent = text;
        box.classList.remove('d-none');
    }
    showToastIfAvailable(text, 'success');
}

function showFormAlert(box, text, type) {
    box.textContent = text;
    box.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
    box.classList.add('alert-' + type);
}

// ---------- signup.html ----------
function initSignupPage() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    // Already logged in: no need to sign up again
    if (Auth.currentUser()) { window.location.replace('profile.html'); return; }

    const alertBox = document.getElementById('signup-alert');
    const password = document.getElementById('signup-password');

    const promo = document.getElementById('signup-promo');
    const plan = document.getElementById('signup-plan');
    const updatePrice = () => {
        document.getElementById('signup-price').textContent =
            'First month: ' + membershipPrice(plan.value, promo.value).toLocaleString('en-US') + ' KZT' +
            (promo.value.trim().toUpperCase() === 'BODY2026' ? ' (10% discount)' : '');
    };
    promo.addEventListener('input', updatePrice);
    plan.addEventListener('change', updatePrice);
    updatePrice();

    FormKit.passwordChecklist(password, document.getElementById('password-rules'));
    FormKit.initPasswordToggles(form);

    FormKit.bind(form, [
        { id: 'signup-promo', check: el => Rules.promo(el.value) },
        { id: 'signup-name',     check: el => Rules.name(el.value) },
        { id: 'signup-email',    check: el => Rules.email(el.value) },
        { id: 'signup-phone',    check: el => Rules.phone(el.value) },
        { id: 'signup-password', check: el => Rules.password(el.value) },
        { id: 'signup-confirm',  check: el => Rules.confirm(password.value, el.value) },
        { id: 'signup-terms',    check: el => el.checked ? '' : 'Please accept the gym rules to continue.' }
    ], () => {
        const result = Auth.signUp({
            name:     document.getElementById('signup-name').value,
            email:    document.getElementById('signup-email').value,
            phone:    document.getElementById('signup-phone').value,
            plan:     document.getElementById('signup-plan').value,
            promo: promo.value,
            password: password.value
        });

        if (!result.ok) {
            const field = result.field && document.getElementById('signup-' + result.field);
            if (field) { FormKit.showError(field, result.message); field.focus(); }
            else showFormAlert(alertBox, result.message, 'danger');
            if (typeof playSound === 'function') playSound('error');
            return;
        }

        if (typeof playSound === 'function') playSound('success');
        Auth.setFlash('Welcome, ' + result.user.name.split(' ')[0] + '! Your account has been created.');
        window.location.href = 'profile.html';          // new users go straight to their profile
    });
}

// ---------- login.html ----------
function initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    if (Auth.currentUser()) { window.location.replace('profile.html'); return; }

    const alertBox = document.getElementById('login-alert');
    FormKit.initPasswordToggles(form);
    showFlashMessage();

    FormKit.bind(form, [
        { id: 'login-email',    check: el => Rules.email(el.value) },
        { id: 'login-password', check: el => Rules.required(el.value, 'Password') }
    ], () => {
        const email    = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const result   = Auth.logIn(email, password);

        if (!result.ok) {
            const field = document.getElementById('login-' + result.field);
            FormKit.showError(field, result.message);
            field.focus();
            if (typeof playSound === 'function') playSound('error');
            return;
        }

        if (typeof playSound === 'function') playSound('success');
        Auth.setFlash('Welcome back, ' + result.user.name.split(' ')[0] + '!');
        window.location.href = 'profile.html';          // successful login redirects to the profile page
    });
}

// ---------- profile.html ----------
const PLAN_LABELS = {
    basic:    'Basic (9,900 KZT / month)',
    standard: 'Standard (14,900 KZT / month)',
    premium:  'Premium (19,900 KZT / month)'
};

function initProfilePage() {
    const card = document.getElementById('profile-card');
    if (!card) return;

    const user = Auth.currentUser();
    if (!user) {                                         // not logged in: go to the login page
        Auth.setFlash('Please log in to see your profile.');
        window.location.replace('login.html');
        return;
    }

    showFlashMessage();

    const setText = (id, text) => { document.getElementById(id).textContent = text; };
    setText('profile-name', user.name);
    setText('profile-email', user.email);
    setText('profile-phone', user.phone);
    setText('profile-plan', (PLAN_LABELS[user.plan] || user.plan) +
        (user.promo === 'BODY2026' ? ' | First month: ' + membershipPrice(user.plan, user.promo).toLocaleString('en-US') + ' KZT (BODY2026)' : ''));
    setText('profile-since', new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setText('profile-initials', user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase());

    renderSavedExercises();
    renderLastSearch();

    document.getElementById('profile-logout').addEventListener('click', () => {
        Auth.logOut();
        Auth.setFlash('You have been logged out.');
        window.location.href = 'login.html';
    });
}

function renderSavedExercises() {
    const list = document.getElementById('saved-list');
    const empty = document.getElementById('saved-empty');
    if (!list) return;

    const favorites = Auth.getFavorites();
    list.innerHTML = '';
    empty.classList.toggle('d-none', favorites.length > 0);

    favorites.forEach(item => {
        const row = document.createElement('li');
        row.className = 'list-group-item bg-transparent d-flex justify-content-between align-items-center gap-2';

        const info = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = item.name;
        const meta = document.createElement('span');
        meta.className = 'text-muted small d-block';
        meta.textContent = item.category + (item.muscles && item.muscles.length ? ' | ' + item.muscles.join(', ') : '');
        info.append(title, meta);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-sm btn-outline-danger';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove ' + item.name + ' from saved exercises');
        remove.addEventListener('click', () => {
            Auth.saveFavorites(Auth.getFavorites().filter(saved => saved.id !== item.id));
            renderSavedExercises();
            showToastIfAvailable('Removed from saved exercises.', 'info');
        });

        row.append(info, remove);
        list.appendChild(row);
    });
}

function renderLastSearch() {
    const box = document.getElementById('last-search');
    if (!box) return;
    const saved = readJSON('gym-exercise-filters', null);
    const parts = [];
    if (saved && saved.query)     parts.push('"' + saved.query + '"');
    if (saved && saved.category)  parts.push('category: ' + saved.category);
    if (saved && saved.equipment) parts.push('equipment: ' + saved.equipment);
    if (parts.length) {
        box.textContent = parts.join(', ');
        return;
    }
    // no active filter: show the newest search from the "Recent" list instead
    const recent = readJSON('gym-recent-searches', []);
    box.textContent = recent.length ? '"' + recent[0] + '" (most recent search)' : 'No saved search yet.';
}

document.addEventListener('DOMContentLoaded', () => {
    initAuthNav();
    initSignupPage();
    initLoginPage();
    initProfilePage();
});
