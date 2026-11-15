/* ==========================================================
   Final Project: shared form validation
   Bodybuilders Gym - Group SE-2512

   Every form on the site uses this file. We do NOT use the HTML
   validation attributes (required, pattern, minlength, maxlength,
   type="email"). Each <form> has "novalidate", and the rules below
   check the values with JavaScript instead.

   Rules  : small functions. They return "" when the value is fine,
            or a friendly error message when it is not.
   FormKit: shows the messages on the page (not in alerts) and
            connects the rules to a form.
   ========================================================== */

/* ----------------------------------------------------------
   Rules
   ---------------------------------------------------------- */
const Rules = {

    required(value, label) {
        return value.trim() === '' ? label + ' is required.' : '';
    },

    name(value) {
        const text = value.trim();
        if (text === '')       return 'Full name is required.';
        if (text.length < 2)   return 'Name must be at least 2 characters.';
        if (text.length > 40)  return 'Name must be 40 characters or fewer.';
        // letters (any alphabet), spaces, hyphens, apostrophes and dots
        if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(text)) return 'Use letters only: no digits or special symbols.';
        return '';
    },

    email(value) {
        const text = value.trim();
        if (text === '')                                    return 'Email is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text))    return 'Enter a valid email, for example name@example.com.';
        return '';
    },

    // Kazakhstan mobile or city number: +7 7XX XXX XX XX, 8 7XX XXX XX XX
    // Spaces, dashes and brackets are allowed between the digits.
    phone(value) {
        const text = value.trim();
        if (text === '')                      return 'Phone number is required.';
        if (/[^\d\s()+-]/.test(text))         return 'Phone can contain digits, spaces, +, - and brackets only.';
        const digits = text.replace(/[\s()-]/g, '');
        if (!/^(\+7|8)7\d{9}$/.test(digits))  return 'Use a Kazakhstan number, for example +7 700 123 45 67.';
        return '';
    },

    // Password length and complexity: the first rule that fails gives the message
    password(value) {
        if (value === '')                 return 'Password is required.';
        if (value.length < 8)             return 'Password must be at least 8 characters.';
        if (value.length > 64)            return 'Password must be 64 characters or fewer.';
        if (!/[A-Z]/.test(value))         return 'Add at least one uppercase letter (A-Z).';
        if (!/[a-z]/.test(value))         return 'Add at least one lowercase letter (a-z).';
        if (!/\d/.test(value))            return 'Add at least one digit (0-9).';
        return '';
    },

    promo(value) {
        return value.trim() === '' || value.trim().toUpperCase() === 'BODY2026'
            ? '' : 'Unknown promo code. Use BODY2026 or leave this field empty.';
    },

    confirm(password, value) {
        if (value === '')          return 'Please repeat your password.';
        if (value !== password)    return 'Passwords do not match.';
        return '';
    },

    message(value, minLength) {
        const text = value.trim();
        if (text === '')                return 'Please write a message.';
        if (text.length < minLength)    return 'Please write at least ' + minLength + ' characters.';
        if (text.length > 500)          return 'Message must be 500 characters or fewer.';
        return '';
    },

    // The list shown under the password field while the user types
    passwordChecks(value) {
        return [
            { label: 'At least 8 characters', ok: value.length >= 8 },
            { label: 'One uppercase letter',  ok: /[A-Z]/.test(value) },
            { label: 'One lowercase letter',  ok: /[a-z]/.test(value) },
            { label: 'One digit',             ok: /\d/.test(value) }
        ];
    }
};


/* ----------------------------------------------------------
   FormKit: show messages and connect rules to a form
   ---------------------------------------------------------- */
const FormKit = {

    // The red message box under a field. It is created when the page has none.
    getErrorBox(input) {
        let box = document.getElementById(input.id + '-error');
        if (!box) {
            box = document.createElement('div');
            box.id = input.id + '-error';
            box.className = 'invalid-feedback';
            const anchor = input.closest('.input-group') || input;
            anchor.insertAdjacentElement('afterend', box);
        }
        return box;
    },

    showError(input, message) {
        const box = this.getErrorBox(input);
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', box.id);
        box.textContent = message;
        box.classList.add('d-block');          // visible even when the box is not next to the input
    },

    showValid(input) {
        const box = this.getErrorBox(input);
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        input.removeAttribute('aria-invalid');
        box.textContent = '';
        box.classList.remove('d-block');
    },

    clear(input) {
        const box = this.getErrorBox(input);
        input.classList.remove('is-invalid', 'is-valid');
        input.removeAttribute('aria-invalid');
        box.textContent = '';
        box.classList.remove('d-block');
    },

    // Runs one field. Returns true when it is valid.
    checkField(field) {
        const message = field.check(field.input);
        if (message) { this.showError(field.input, message); return false; }
        this.showValid(field.input);
        return true;
    },

    /* bind(form, fields, onValid)
       fields  : [{ id: 'email', check: (input) => Rules.email(input.value) }, ...]
       onValid : called with the form when every field is valid */
    bind(form, fields, onValid) {
        const list = fields
            .map(field => ({ input: form.querySelector('#' + field.id), check: field.check }))
            .filter(field => field.input);

        // When the user presses the submit button, the field they were typing in loses focus.
        // If that blur removed an error message, the page would jump and the click would miss
        // the button. So we skip the blur check while the mouse is pressed on the button.
        let pressingSubmit = false;
        form.addEventListener('mousedown', (event) => {
            if (event.target.closest('button[type="submit"]')) pressingSubmit = true;
        });
        document.addEventListener('mouseup', () => { setTimeout(() => { pressingSubmit = false; }, 0); });

        list.forEach(field => {
            const isChoice = field.input.type === 'checkbox' || field.input.tagName === 'SELECT';
            // leave the field -> check it
            field.input.addEventListener('blur', () => { if (!pressingSubmit) this.checkField(field); });
            // while typing: only update a field that is already marked invalid
            field.input.addEventListener(isChoice ? 'change' : 'input', () => {
                if (field.input.classList.contains('is-invalid')) this.checkField(field);
            });
        });

        const validateAll = () => {
            // run every check (do not stop at the first error)
            const results = list.map(field => this.checkField(field));
            const firstBad = list.find((field, index) => !results[index]);
            if (firstBad) firstBad.input.focus();
            return results.every(Boolean);
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();               // stop the page from reloading
            if (validateAll()) onValid(form);
        });

        return {
            validateAll,
            reset() { list.forEach(field => this.clear(field.input)); }
        };
    },

    // Live checklist under a password field (items turn green when the rule is met)
    passwordChecklist(input, listElement) {
        const draw = () => {
            listElement.innerHTML = '';
            Rules.passwordChecks(input.value).forEach(item => {
                const li = document.createElement('li');
                li.textContent = (item.ok ? '✓ ' : '• ') + item.label;
                li.className = item.ok ? 'rule-ok' : 'rule-todo';
                listElement.appendChild(li);
            });
        };
        input.addEventListener('input', draw);
        draw();
    },

    // "Show / Hide" buttons for password fields: <button data-toggle-password="passwordId">
    initPasswordToggles(scope) {
        (scope || document).querySelectorAll('[data-toggle-password]').forEach(button => {
            const input = document.getElementById(button.dataset.togglePassword);
            if (!input) return;
            button.addEventListener('click', () => {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                button.textContent = show ? 'Hide' : 'Show';
                button.setAttribute('aria-pressed', String(show));
            });
        });
    }
};
