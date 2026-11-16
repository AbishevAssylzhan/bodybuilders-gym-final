/* ==========================================================
   Final Project: Exercise Library (external API integration)
   Bodybuilders Gym - Group SE-2512

   Main data source : wger Workout Manager REST API  https://wger.de/api/v2/
   Backup source    : free-exercise-db (JSON file on GitHub)
   Last resort      : the copy we saved in localStorage on the last visit

   Features
     1. fetch() with async/await, a timeout, a loading state and an error state
     2. Live search + category + equipment filters (the page updates without reloading)
     3. The last search and filters are saved in localStorage and restored next time
     4. "Save" button: favorite exercises are stored per user (see Auth in auth.js)
   ========================================================== */

const WGER_URL        = 'https://wger.de/api/v2/exerciseinfo/?language=2&limit=100';
const BACKUP_URL      = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const BACKUP_IMAGES   = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const FALLBACK_IMAGE  = 'images/dumbbell-rack.jpg';

const EX_KEYS = {
    cache:   'gym-exercise-cache',
    filters: 'gym-exercise-filters',
    recent:  'gym-recent-searches'
};

const PAGE_SIZE = 12;          // cards shown at once; "Load more" adds another page

const HEART_ICON =
    '<svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.4 1.1 4.2 2.4h3.6C14.6 6.1 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"></path></svg>';


/* ==========================================================
   1. Getting the data
   ========================================================== */

// fetch() that gives up after a few seconds and checks the HTTP status
async function fetchJson(url, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('the server answered ' + response.status);
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') throw new Error('the request took too long');
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

function stripHtml(html) {
    return new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();
}

function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

// Both sources are converted to the same shape, so the rest of the code does not care where data came from
function normalizeWger(item) {
    const translations = item.translations || [];
    const english = translations.find(t => t.language === 2);      // language 2 = English
    const name = english ? english.name : item.name;               // older API versions had "name" on the item
    if (!name) return null;

    const description = english ? english.description : item.description;
    const images = item.images || [];
    const mainImage = images.find(image => image.is_main) || images[0];

    return {
        id:          'wger-' + item.id,
        name:        name.trim(),
        description: stripHtml(description),
        category:    (item.category && item.category.name) || 'Other',
        muscles:     (item.muscles || []).map(m => m.name_en || m.name).filter(Boolean),
        equipment:   (item.equipment || []).map(e => e.name).filter(Boolean),
        image:       mainImage ? mainImage.image : ''
    };
}

function normalizeBackup(item) {
    return {
        id:          'fdb-' + item.id,
        name:        item.name,
        description: (item.instructions || []).join('\n'),
        category:    capitalize(item.category) || 'Other',
        muscles:     (item.primaryMuscles || []).map(capitalize),
        equipment:   item.equipment ? [capitalize(item.equipment)] : [],
        image:       item.images && item.images[0] ? BACKUP_IMAGES + item.images[0] : ''
    };
}

// the same exercise name can appear more than once: keep the first one
function removeDuplicates(list) {
    const seen = new Set();
    return list.filter(item => {
        const key = item.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function saveCache(source, items) {
    const compact = items.slice(0, 200).map(item => ({ ...item, description: item.description.slice(0, 600) }));
    writeJSON(EX_KEYS.cache, { savedAt: new Date().toISOString(), source, items: compact });
}

// Tries the main API, then the backup, then the saved copy.
// Returns { items, source, notice } or throws an Error when everything failed.
async function loadExercises() {
    let mainProblem = '';

    try {
        const data = await fetchJson(WGER_URL);
        const items = removeDuplicates((data.results || []).map(normalizeWger).filter(Boolean));
        if (items.length === 0) throw new Error('the API returned no exercises');
        saveCache('wger API', items);
        return { items, source: 'wger API', notice: '' };
    } catch (error) {
        mainProblem = error.message;
        console.warn('Main API failed:', mainProblem);
    }

    try {
        const data = await fetchJson(BACKUP_URL, 15000);
        const items = removeDuplicates(data.map(normalizeBackup));
        if (items.length === 0) throw new Error('the backup file is empty');
        saveCache('free-exercise-db (backup)', items);
        return {
            items,
            source: 'free-exercise-db (backup)',
            notice: 'The wger API is not available right now (' + mainProblem + '), so a backup source is used.'
        };
    } catch (error) {
        console.warn('Backup source failed:', error.message);
    }

    const cached = readJSON(EX_KEYS.cache, null);
    if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        return {
            items: cached.items,
            source: 'saved copy',
            notice: 'You seem to be offline. Showing the copy saved on ' +
                    new Date(cached.savedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + '.'
        };
    }

    throw new Error('Could not load exercises (' + mainProblem + '). Check your internet connection and try again.');
}


/* ==========================================================
   2. Small helpers
   ========================================================== */
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function readRecent() { return readJSON(EX_KEYS.recent, []); }

function rememberQuery(query) {
    const text = query.trim();
    if (text.length < 2) return;
    const list = readRecent().filter(item => item.toLowerCase() !== text.toLowerCase());
    list.unshift(text);                                  // newest first
    writeJSON(EX_KEYS.recent, list.slice(0, 5));         // keep five
}


/* ==========================================================
   3. The page
   ========================================================== */
function initExercisePage() {
    const grid        = document.getElementById('exercise-grid');
    if (!grid) return;

    const searchInput = document.getElementById('exercise-search');
    const categorySel = document.getElementById('exercise-category');
    const equipmentSel = document.getElementById('exercise-equipment');
    const savedOnly   = document.getElementById('saved-only');
    const resetButton = document.getElementById('exercise-reset');
    const moreButton  = document.getElementById('exercise-more');
    const statusBox   = document.getElementById('exercise-status');
    const countText   = document.getElementById('exercise-count');
    const recentBox   = document.getElementById('recent-searches');
    const modalElement = document.getElementById('exerciseModal');
    const modal = new bootstrap.Modal(modalElement);

    const state = { all: [], source: '', query: '', category: '', equipment: '', savedOnly: false, visible: PAGE_SIZE };

    /* ---------- loading and error states ---------- */
    function showLoading() {
        statusBox.innerHTML = '';
        const box = el('div', 'd-flex align-items-center gap-3 p-3 rounded bg-custom-surface shadow-sm');
        box.setAttribute('role', 'status');
        box.append(el('span', 'spinner-border text-danger'), el('span', '', 'Loading exercises from the wger API...'));
        statusBox.appendChild(box);
        grid.innerHTML = '';
        countText.textContent = '';
        moreButton.classList.add('d-none');
    }

    function showError(message) {
        statusBox.innerHTML = '';
        const box = el('div', 'alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2');
        box.setAttribute('role', 'alert');
        box.appendChild(el('span', '', message));
        const retry = el('button', 'btn btn-sm btn-danger', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', start);
        box.appendChild(retry);
        statusBox.appendChild(box);
        if (typeof playSound === 'function') playSound('error');
    }

    function showNotice(message, source) {
        statusBox.innerHTML = '';
        if (message) {
            const box = el('div', 'alert alert-warning mb-3', message);
            box.setAttribute('role', 'status');
            statusBox.appendChild(box);
        }
        document.getElementById('exercise-source').textContent = source;
    }

    /* ---------- filters ---------- */
    function fillSelect(select, values, label) {
        select.innerHTML = '';
        select.appendChild(new Option(label, ''));
        values.forEach(value => select.appendChild(new Option(value, value)));
    }

    function uniqueSorted(list) {
        return [...new Set(list)].sort((a, b) => a.localeCompare(b));
    }

    function getFiltered() {
        const query = state.query.trim().toLowerCase();
        const favoriteIds = new Set(Auth.getFavorites().map(item => item.id));

        return state.all.filter(item => {
            if (state.category && item.category !== state.category) return false;
            if (state.equipment && !item.equipment.includes(state.equipment)) return false;
            if (state.savedOnly && !favoriteIds.has(item.id)) return false;
            if (query) {
                const text = (item.name + ' ' + item.category + ' ' + item.muscles.join(' ')).toLowerCase();
                if (!text.includes(query)) return false;
            }
            return true;
        });
    }

    function saveFilters() {
        writeJSON(EX_KEYS.filters, {
            query: state.query, category: state.category,
            equipment: state.equipment, savedOnly: state.savedOnly
        });
    }

    function renderRecent() {
        recentBox.innerHTML = '';
        const list = readRecent();
        if (list.length === 0) return;
        recentBox.appendChild(el('span', 'text-muted', 'Recent:'));
        list.forEach(text => {
            const chip = el('button', 'btn btn-sm btn-outline-secondary recent-chip', text);
            chip.type = 'button';
            chip.addEventListener('click', () => {
                searchInput.value = text;
                state.query = text;
                state.visible = PAGE_SIZE;
                update();
            });
            recentBox.appendChild(chip);
        });
        const clear = el('button', 'btn btn-sm btn-link text-muted', 'Clear');
        clear.type = 'button';
        clear.addEventListener('click', () => { writeJSON(EX_KEYS.recent, []); renderRecent(); });
        recentBox.appendChild(clear);
    }

    /* ---------- cards ---------- */
    function isSaved(exercise) {
        return Auth.getFavorites().some(item => item.id === exercise.id);
    }

    function toggleSaved(exercise) {
        const list = Auth.getFavorites();
        const index = list.findIndex(item => item.id === exercise.id);
        if (index >= 0) {
            list.splice(index, 1);
        } else {
            list.push({ id: exercise.id, name: exercise.name, category: exercise.category,
                        muscles: exercise.muscles, image: exercise.image });
        }
        Auth.saveFavorites(list);
        return index < 0;                       // true = it is saved now
    }

    function drawSaveButton(button, saved) {
        button.classList.toggle('saved', saved);
        button.setAttribute('aria-pressed', String(saved));
        button.innerHTML = HEART_ICON + '<span>' + (saved ? 'Saved' : 'Save') + '</span>';
    }

    function onSaveClick(exercise, button) {
        const nowSaved = toggleSaved(exercise);
        drawSaveButton(button, nowSaved);
        if (nowSaved) {
            button.classList.remove('pop'); void button.offsetWidth; button.classList.add('pop');
            const hint = Auth.currentUser() ? '' : ' Log in to keep it in your profile.';
            if (window.GymUI) window.GymUI.showToast('"' + exercise.name + '" saved.' + hint, 'success');
        } else if (window.GymUI) {
            window.GymUI.showToast('Removed from saved exercises.', 'info');
        }
        if (state.savedOnly) update();           // the list must lose the removed card
    }

    function createCard(exercise) {
        const col  = el('div', 'col-sm-6 col-lg-4 col-xl-3 fade-in');
        const card = el('div', 'card h-100 shadow-sm border-0 exercise-card');

        const image = document.createElement('img');
        image.className = 'card-img-top img-cover-200';
        image.alt = exercise.name;
        image.loading = 'lazy';
        image.src = exercise.image || FALLBACK_IMAGE;
        image.addEventListener('error', () => { image.src = FALLBACK_IMAGE; }, { once: true });

        const body = el('div', 'card-body d-flex flex-column');
        body.appendChild(el('span', 'badge bg-secondary mb-2 align-self-start', exercise.category));
        body.appendChild(el('h3', 'card-title h5', exercise.name));
        body.appendChild(el('p', 'small text-muted mb-2',
            exercise.muscles.length ? 'Muscles: ' + exercise.muscles.join(', ') : 'Muscles: not listed'));
        body.appendChild(el('p', 'small text-muted mb-3 flex-grow-1',
            exercise.equipment.length ? 'Equipment: ' + exercise.equipment.join(', ') : 'Equipment: none'));

        const actions = el('div', 'd-flex gap-2');
        const details = el('button', 'btn btn-sm btn-outline-danger flex-fill', 'Details');
        details.type = 'button';
        details.addEventListener('click', () => openDetails(exercise));

        const save = el('button', 'btn btn-sm btn-save flex-fill');
        save.type = 'button';
        drawSaveButton(save, isSaved(exercise));
        save.addEventListener('click', () => onSaveClick(exercise, save));

        actions.append(details, save);
        body.appendChild(actions);
        card.append(image, body);
        col.appendChild(card);
        return col;
    }

    function openDetails(exercise) {
        document.getElementById('exerciseModalTitle').textContent = exercise.name;
        const image = document.getElementById('modal-image');
        image.src = exercise.image || FALLBACK_IMAGE;
        image.alt = exercise.name;
        document.getElementById('modal-category').textContent = exercise.category;
        document.getElementById('modal-muscles').textContent = exercise.muscles.join(', ') || 'Not listed';
        document.getElementById('modal-equipment').textContent = exercise.equipment.join(', ') || 'None';
        document.getElementById('modal-description').textContent =
            exercise.description || 'No description is available for this exercise.';

        const save = document.getElementById('modal-save');
        const fresh = save.cloneNode(true);                       // removes the old click listener
        save.replaceWith(fresh);
        drawSaveButton(fresh, isSaved(exercise));
        fresh.addEventListener('click', () => { onSaveClick(exercise, fresh); update(); });
        modal.show();
    }

    /* ---------- drawing the list ---------- */
    function update() {
        const list = getFiltered();
        const shown = list.slice(0, state.visible);

        grid.innerHTML = '';
        shown.forEach(exercise => grid.appendChild(createCard(exercise)));

        if (list.length === 0) {
            const empty = el('div', 'col-12');
            empty.appendChild(el('div', 'alert alert-info',
                state.savedOnly ? 'You have not saved any exercise yet. Press "Save" on a card.'
                                : 'No exercises match your search. Try another word or reset the filters.'));
            grid.appendChild(empty);
        }

        countText.textContent = 'Showing ' + shown.length + ' of ' + list.length + ' exercises (' + state.all.length + ' loaded).';
        moreButton.classList.toggle('d-none', shown.length >= list.length);
        saveFilters();
    }

    /* ---------- events ---------- */
    const rememberLater = debounce(() => { rememberQuery(state.query); renderRecent(); }, 900);

    searchInput.addEventListener('input', () => {
        state.query = searchInput.value;
        state.visible = PAGE_SIZE;
        update();
        rememberLater();
    });

    categorySel.addEventListener('change', () => { state.category = categorySel.value; state.visible = PAGE_SIZE; update(); });
    equipmentSel.addEventListener('change', () => { state.equipment = equipmentSel.value; state.visible = PAGE_SIZE; update(); });
    savedOnly.addEventListener('change', () => { state.savedOnly = savedOnly.checked; state.visible = PAGE_SIZE; update(); });
    moreButton.addEventListener('click', () => { state.visible += PAGE_SIZE; update(); });

    resetButton.addEventListener('click', () => {
        searchInput.value = '';
        categorySel.value = equipmentSel.value = '';
        savedOnly.checked = false;
        Object.assign(state, { query: '', category: '', equipment: '', savedOnly: false, visible: PAGE_SIZE });
        update();
    });

    /* ---------- start ---------- */
    async function start() {
        showLoading();
        try {
            const result = await loadExercises();
            state.all = result.items;
            state.source = result.source;

            fillSelect(categorySel, uniqueSorted(state.all.map(item => item.category)), 'All categories');
            fillSelect(equipmentSel, uniqueSorted(state.all.flatMap(item => item.equipment)), 'Any equipment');

            // restore the search and filters from the last visit
            const saved = readJSON(EX_KEYS.filters, {});
            state.query = typeof saved.query === 'string' ? saved.query : '';
            state.category = [...categorySel.options].some(o => o.value === saved.category) ? saved.category : '';
            state.equipment = [...equipmentSel.options].some(o => o.value === saved.equipment) ? saved.equipment : '';
            state.savedOnly = Boolean(saved.savedOnly);
            searchInput.value = state.query;
            categorySel.value = state.category;
            equipmentSel.value = state.equipment;
            savedOnly.checked = state.savedOnly;

            showNotice(result.notice, result.source);
            renderRecent();
            update();
        } catch (error) {
            showError(error.message);
        }
    }

    start();
}

document.addEventListener('DOMContentLoaded', initExercisePage);
