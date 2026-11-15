/* ==========================================================
   Final Project: main page scripts
   Bodybuilders Gym - Group SE-2512
   One file for all pages. Each feature only runs when its
   elements exist on the current page.
   Form checks live in js/validation.js (Rules + FormKit).
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initFormValidation();   // contact.html
    initAccordion();        // faq.html
    initPopup();            // index.html
    initDateTime();         // dashboard.html
});


/* ----------------------------------------------------------
   Contact request demo: saves the request in this browser.
   No message is sent to a real gym. The callback reports storage errors.
   ---------------------------------------------------------- */
function sendFormData(data, callback) {
    const requests = readJSON('gym-contact-requests', []);
    requests.push({ ...data, createdAt: new Date().toISOString() });
    if (writeJSON('gym-contact-requests', requests.slice(-20))) callback(null, data);
    else callback(new Error('Your browser blocked local storage.'));
}

function showFormMessage(box, text, isError) {
    box.textContent = text;
    box.classList.remove('d-none', 'alert-success', 'alert-danger');
    box.classList.add(isError ? 'alert-danger' : 'alert-success');
}

/* ----------------------------------------------------------
   Small bridges to the jQuery helpers (GymUI in
   js/jquery-features.js). If jQuery could not load, the forms
   still work, just without the spinner and the toast.
   ---------------------------------------------------------- */
function startSubmitSpinner(button) {
    if (window.GymUI) return window.GymUI.startSpinner(button);
    return (afterStop) => { if (afterStop) afterStop(); };   // no jQuery: do nothing special
}

function showToastMessage(text, type) {
    if (window.GymUI) window.GymUI.showToast(text, type);
}


/* ==========================================================
   Contact / free trial form  (contact.html)
   ========================================================== */
function initFormValidation() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const nameInput    = document.getElementById('contact-name');
    const emailInput   = document.getElementById('contact-email');
    const phoneInput   = document.getElementById('contact-phone');
    const messageInput = document.getElementById('contact-message');
    const successBox   = document.getElementById('form-success');
    const submitButton = form.querySelector('button[type="submit"]');

    // A logged-in member does not have to type their details again
    const user = Auth.currentUser();
    if (user) {
        nameInput.value  = user.name;
        emailInput.value = user.email;
        phoneInput.value = user.phone || '';
    }

    // Which rule checks which field (messages are shown under the field)
    const kit = FormKit.bind(form, [
        { id: 'contact-name',    check: el => Rules.name(el.value) },
        { id: 'contact-email',   check: el => Rules.email(el.value) },
        { id: 'contact-phone',   check: el => Rules.phone(el.value) },
        { id: 'contact-message', check: el => Rules.message(el.value, 10) }
    ], sendContactForm);

    function sendContactForm() {
        successBox.classList.add('d-none');

        // Data we send to the server
        const payload = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            plan: document.getElementById('contact-plan').value,
            trainingTime: form.querySelector('input[name="time"]:checked').value,
            message: messageInput.value.trim()
        };

        // jQuery shows a spinner + "Please wait..." and disables the button.
        // stopSpinner(fn) puts the button back to normal, then runs fn.
        const stopSpinner = startSubmitSpinner(submitButton);

        // sendFormData(data, callback): the callback runs when the server answers
        sendFormData(payload, (error) => {
            stopSpinner(() => {
                if (error) {
                    showFormMessage(successBox, 'Sorry, we could not save your demo request (' + error.message + '). Please try again.', true);
                    if (typeof playSound === 'function') playSound('error');
                    showToastMessage('Could not save the demo request. Please try again.', 'error');
                    return;
                }

                showFormMessage(successBox, 'Thank you, ' + payload.name + '! Your demo request was saved in this browser. No message was sent to a gym.', false);
                if (typeof playSound === 'function') playSound('success');
                showToastMessage('Demo request saved locally.', 'success');
                form.reset();
                kit.reset();
            });
        });
    }
}


/* ==========================================================
   TASK 2. Accordion (faq.html)
   Answers are hidden by default (max-height: 0 in CSS).
   JS sets max-height to the real height so CSS can animate it.
   ========================================================== */
// Open or close ONE item. It is a separate function (Assignment 6) so the
// jQuery search can also open the answers that contain the searched word.
function setAccordionItem(item, open) {
    const question = item.querySelector('.faq-question');
    const answer   = item.querySelector('.faq-answer');

    item.classList.toggle('open', open);                          // add or remove class
    question.setAttribute('aria-expanded', String(open));         // accessibility
    answer.style.maxHeight = open ? answer.scrollHeight + 'px' : null;
}

function initAccordion() {
    const items = document.querySelectorAll('.faq-item');
    if (items.length === 0) return;

    items.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            setAccordionItem(item, !item.classList.contains('open'));
        });
    });
}


/* ==========================================================
   TASK 3. Popup Subscription Form (index.html)
   ========================================================== */
function initPopup() {
    const overlay    = document.getElementById('subscribe-popup');
    const openBtn    = document.getElementById('openPopupBtn');
    const closeBtn   = document.getElementById('closePopupBtn');
    if (!overlay || !openBtn) return;

    const form       = document.getElementById('subscribe-form');
    const emailInput = document.getElementById('subEmail');
    const message    = document.getElementById('subscribe-message');

    const openPopup  = () => {
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        emailInput.focus();
    };

    const closePopup = () => {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    };

    openBtn.addEventListener('click', openPopup);
    closeBtn.addEventListener('click', closePopup);

    // Click on the dark area outside the white box closes the popup
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closePopup();
    });

    // Escape key closes it too
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closePopup();
    });

    // The newsletter form uses the same Rules.email check as every other form
    FormKit.bind(form, [
        { id: 'subEmail', check: el => Rules.email(el.value) }
    ], () => {
        const subscribers = readJSON('gym-newsletter-emails', []);
        const email = emailInput.value.trim().toLowerCase();
        if (!subscribers.includes(email)) subscribers.push(email);
        if (!writeJSON('gym-newsletter-emails', subscribers)) {
            FormKit.showError(emailInput, 'Your browser blocked storage. Please try again.');
            return;
        }
        // Local newsletter demo; no email is sent.
        const stopSpinner = startSubmitSpinner(form.querySelector('button[type="submit"]'));
        stopSpinner(() => {
            message.textContent = 'Demo subscription saved in this browser. No email will be sent.';
            if (typeof playSound === 'function') playSound('success');
            showToastMessage('Demo subscription saved locally.', 'success');
            message.className = 'mt-3 mb-0 text-success';
            form.reset();
            FormKit.clear(emailInput);
            setTimeout(() => {              // close after 1.5 s
                closePopup();
                message.textContent = '';
            }, 1500);
        });
    });
}


/* ==========================================================
   TASK 5. Current Date and Time (dashboard.html)
   ========================================================== */
function formatDateTime(date) {
    const day  = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    return day + ', ' + time;                       // e.g. October 9, 2026, 10:45:12 AM
}

function initDateTime() {
    const output = document.getElementById('datetime');
    if (!output) return;

    const update = () => {
        output.textContent = formatDateTime(new Date());
    };

    update();                    // show immediately
    setInterval(update, 1000);   // then refresh every second
}
