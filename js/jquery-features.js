/* ==========================================================
   Assignment #6: jQuery
   Bodybuilders Gym - Group SE-2512

   jQuery 4.0.0 is loaded from the CDN in the <head> of every page.
   This file holds every jQuery feature. Each feature only runs
   when its elements exist on the current page.

   Part 1  Task 1 live filter | Task 2 autocomplete | Task 3 highlighting
   Part 2  Task 4 scroll bar  | Task 5 number counter | Task 6 submit spinner
   Part 3  Task 7 toast       | Task 8 copy button    | Task 9 lazy loading
   ========================================================== */


/* ==========================================================
   GymUI: helpers that other files can call (script.js uses
   GymUI.startSpinner and GymUI.showToast). It is created
   immediately, not inside ready(), so it exists before any click.
   ========================================================== */
window.GymUI = (function () {

    /* ---------- Task 6. Loading spinner on a submit button ---------- */
    const SPINNER_HTML =
        '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Please wait...';

    // Shows the spinner and disables the button.
    // Returns stop(afterStop): it restores the button (after at least minTime ms,
    // so the spinner is visible even when the server answers very fast) and then calls afterStop.
    function startSpinner(button, minTime) {
        const $button = $(button);
        const shownFor = (minTime === undefined) ? 1200 : minTime;
        const startedAt = Date.now();

        $button
            .data('original-html', $button.html())     // remember the normal text
            .html(SPINNER_HTML)                         // spinner + "Please wait..."
            .prop('disabled', true)                     // no repeated clicks
            .attr('aria-busy', 'true');

        return function stop(afterStop) {
            const wait = Math.max(0, shownFor - (Date.now() - startedAt));
            setTimeout(function () {
                $button
                    .html($button.data('original-html'))
                    .prop('disabled', false)
                    .removeAttr('aria-busy');
                if (typeof afterStop === 'function') afterStop();
            }, wait);
        };
    }

    /* ---------- Task 7. Toast notification ---------- */
    function getToastContainer() {
        let $container = $('#toast-container');
        if ($container.length === 0) {
            $container = $('<div id="toast-container" role="region" aria-live="polite" aria-label="Notifications"></div>')
                .appendTo('body');
        }
        return $container;
    }

    function removeToast($toast) {
        $toast.stop(true, true).fadeOut(300, function () { $(this).remove(); });
    }

    // type: 'success' | 'error' | 'info'.  The toast fades in, waits, and fades out by itself.
    function showToast(message, type, duration) {
        const kind  = type || 'info';
        const delay = (duration === undefined) ? 3000 : duration;
        const $container = getToastContainer();

        // keep at most 4 toasts on the screen: remove the oldest one
        const $old = $container.children('.toast-item');
        if ($old.length >= 4) $old.first().remove();

        const $toast = $('<div class="toast-item" role="status"></div>')
            .addClass('toast-' + kind)
            .append($('<p class="toast-message"></p>').text(message))             // .text() keeps it safe from HTML
            .append('<button type="button" class="toast-close" aria-label="Close notification">&times;</button>')
            .hide()
            .appendTo($container);

        $toast.fadeIn(250).delay(delay).fadeOut(400, function () { $(this).remove(); });
        $toast.on('click', '.toast-close', function () { removeToast($toast); });
        return $toast;
    }

    return { startSpinner: startSpinner, showToast: showToast };
})();


/* ==========================================================
   Task 0. Setup: the ready() function
   ========================================================== */
$(document).ready(function () {
    console.log("jQuery is ready!");

    // People who asked their system for less motion: jQuery animations jump to the end state
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        $.fx.off = true;
    }

    initProgramSearch();     // Tasks 1 and 2 (programs.html)
    initFaqSearch();         // Task 3 (faq.html)
    initScrollProgress();    // Task 4 (every page)
    initCounters();          // Task 5 (index.html)
    initToastTriggers();     // Task 7 (extra toasts for existing buttons)
    initCopyButtons();       // Task 8 (contact.html, pricing.html)
    initLazyLoading();       // Task 9 (index.html, gallery.html, programs.html)
});


/* ==========================================================
   Task 1 + Task 2. Live filter and autocomplete (programs.html)
   ========================================================== */
function initProgramSearch() {
    const $input  = $('#program-search');
    if ($input.length === 0) return;

    const $list   = $('#search-suggestions');
    const $status = $('#search-status');
    const $none   = $('#no-results');
    const maxSuggestions = 6;
    let activeIndex = -1;       // which suggestion is highlighted with the arrow keys
    let lastValue   = null;     // lets us ignore keyup events that did not change the text

    // ---- Task 1: live filter ----
    function applyFilter() {
        const query = $input.val().trim().toLowerCase();
        const $cards = $('#program-grid .program-col');

        // .filter() keeps only the cards whose text contains the typed words
        const $matches = $cards.filter(function () {
            const text = $(this).find('.badge, .card-title, .card-text')
                .map(function () { return $(this).text(); }).get().join(' ').toLowerCase();
            return text.indexOf(query) !== -1;
        });

        $cards.addClass('d-none');          // hide everything...
        $matches.removeClass('d-none');     // ...then show the matches

        if (query === '') {
            $status.text('');
            $none.addClass('d-none');
        } else {
            $status.text('Found ' + $matches.length + ' of ' + $cards.length + ' programs for "' + $input.val().trim() + '".');
            $none.toggleClass('d-none', $matches.length !== 0)
                 .text('No programs match "' + $input.val().trim() + '". Try another word.');
        }

        // keep the search text for the next visit (localStorage)
        writeJSON(PROGRAM_FILTER_KEY, Object.assign(readJSON(PROGRAM_FILTER_KEY, {}), { query: $input.val().trim() }));

        $(document).trigger('lazy:check');      // cards that just appeared may need their picture (Task 9)
    }

    // ---- Task 2: autocomplete suggestions ----
    function hideSuggestions() {
        $list.empty().prop('hidden', true);
        $input.attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
        activeIndex = -1;
    }

    function showSuggestions() {
        const query = $input.val().trim().toLowerCase();
        if (query === '') { hideSuggestions(); return; }

        // titles of the programs that are on the page right now
        const titles = $('#program-grid .card-title').map(function () { return $(this).text(); }).get();

        const found = titles.filter(function (title) { return title.toLowerCase().indexOf(query) !== -1; });
        // titles that START with the typed text come first
        found.sort(function (a, b) {
            const aStarts = a.toLowerCase().indexOf(query) === 0 ? 0 : 1;
            const bStarts = b.toLowerCase().indexOf(query) === 0 ? 0 : 1;
            return aStarts - bStarts;
        });

        $list.empty();
        $.each(found.slice(0, maxSuggestions), function (i, title) {
            const start = title.toLowerCase().indexOf(query);
            const $item = $('<li class="list-group-item" role="option"></li>')
                .attr('id', 'suggestion-' + i)
                .attr('data-value', title)
                .append(document.createTextNode(title.slice(0, start)))
                .append($('<strong></strong>').text(title.slice(start, start + query.length)))
                .append(document.createTextNode(title.slice(start + query.length)));
            $list.append($item);
        });

        const hasItems = $list.children().length > 0;
        $list.prop('hidden', !hasItems);
        $input.attr('aria-expanded', String(hasItems));
        activeIndex = -1;
    }

    function chooseSuggestion(title) {
        $input.val(title);
        lastValue = title;
        hideSuggestions();
        applyFilter();
    }

    function moveActive(step) {
        const $items = $list.children();
        if ($items.length === 0) return;
        activeIndex = (activeIndex + step + $items.length) % $items.length;   // wrap around
        $items.removeClass('active').eq(activeIndex).addClass('active');
        $input.attr('aria-activedescendant', $items.eq(activeIndex).attr('id'));
    }

    // typing: keyup (the hint of the task) and input (paste, the clear "x" button)
    $input.on('keyup input search', function (event) {
        if (event.type === 'keyup' && ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].indexOf(event.key) !== -1) return;
        const value = $input.val();
        if (value === lastValue) return;       // nothing changed
        lastValue = value;
        applyFilter();
        showSuggestions();
    });

    // keyboard control of the dropdown
    $input.on('keydown', function (event) {
        switch (event.key) {
            case 'ArrowDown': event.preventDefault(); moveActive(1);  break;
            case 'ArrowUp':   event.preventDefault(); moveActive(-1); break;
            case 'Enter':
                if (activeIndex >= 0) {
                    event.preventDefault();
                    chooseSuggestion($list.children().eq(activeIndex).attr('data-value'));
                }
                break;
            case 'Escape':    hideSuggestions(); break;
        }
    });

    // mouse: mousedown (not click) so the input does not lose focus first
    $list.on('mousedown', 'li', function (event) {
        event.preventDefault();
        chooseSuggestion($(this).attr('data-value'));
    });

    // click anywhere else closes the dropdown
    $(document).on('click', function (event) {
        if ($(event.target).closest('.program-search').length === 0) hideSuggestions();
    });

    // the category buttons or "Load More" in advanced.js rebuild the cards: filter them again
    $(document).on('programs:rendered', applyFilter);

    // restore the search text from the last visit
    const savedQuery = readJSON(PROGRAM_FILTER_KEY, {}).query;
    if (savedQuery) {
        $input.val(savedQuery);
        lastValue = savedQuery;
        applyFilter();
    }
}


/* ==========================================================
   Task 3. Search highlighting (faq.html)
   Uses a regular expression, .wrap() and .html()
   ========================================================== */
function escapeRegExp(text) {
    // "a.b" must search for a dot, not "any character"
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Wraps every match inside ONE text node with <mark>. Returns how many matches it found.
function wrapMatchesInTextNode(node, regex) {
    const matches = Array.from(node.nodeValue.matchAll(regex));
    // go from the last match to the first so earlier positions stay correct after splitting
    for (let i = matches.length - 1; i >= 0; i--) {
        const found = node.splitText(matches[i].index);       // text from the match to the end
        found.splitText(matches[i][0].length);                // cut off what comes after the match
        $(found).wrap('<mark class="search-hit"></mark>');    // jQuery .wrap()
    }
    return matches.length;
}

function highlightIn($element, regex) {
    let count = 0;
    const walk = function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
            count += wrapMatchesInTextNode(node, regex);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach(walk);        // copy: the list changes while we wrap
        }
    };
    $element.each(function () { walk(this); });
    return count;
}

function initFaqSearch() {
    const $input = $('#faq-search');
    if ($input.length === 0) return;

    const $status = $('#faq-status');
    const $items  = $('.faq-item');
    let lastValue = null;

    // Save the original HTML once, so we can always restore it with .html()
    $items.find('.faq-question-text, .faq-answer p').each(function () {
        $(this).data('original-html', $(this).html());
    });

    function clearHighlights() {
        $items.find('.faq-question-text, .faq-answer p').each(function () {
            $(this).html($(this).data('original-html'));      // put the saved HTML back
        });
        $items.removeClass('faq-dim');
        // close only the answers that the search opened
        $items.filter('[data-auto-open]').each(function () {
            setAccordionItem(this, false);
            $(this).removeAttr('data-auto-open');
        });
    }

    function search() {
        const term = $input.val().trim();
        clearHighlights();

        if (term === '') { $status.text(''); return; }

        const regex = new RegExp(escapeRegExp(term), 'gi');   // g = all matches, i = ignore case
        let total = 0;
        let itemsWithMatches = 0;

        $items.each(function () {
            const $item = $(this);
            const found = highlightIn($item.find('.faq-question-text, .faq-answer p'), regex);
            total += found;

            if (found === 0) {
                $item.addClass('faq-dim');
            } else {
                itemsWithMatches++;
                if (!$item.hasClass('open')) {                // open it so the user can see the highlight
                    setAccordionItem(this, true);             // from script.js
                    $item.attr('data-auto-open', 'true');
                }
            }
        });

        $status.text(total === 0
            ? 'No matches for "' + term + '".'
            : total + ' match' + (total === 1 ? '' : 'es') + ' in ' + itemsWithMatches + ' question' + (itemsWithMatches === 1 ? '' : 's') + '.');
    }

    $input.on('keyup input search', function () {
        const value = $input.val();
        if (value === lastValue) return;
        lastValue = value;
        search();
    });

    $('#faq-clear').on('click', function () {
        $input.val('').trigger('input').trigger('focus');
    });
}


/* ==========================================================
   Task 4. Colorful scroll progress bar (every page)
   The bar is created here, so no page needs extra HTML.
   ========================================================== */
function initScrollProgress() {
    const $bar = $('<div id="scroll-progress-bar"></div>');
    const $track = $('<div id="scroll-progress" aria-hidden="true"></div>').append($bar);
    const $percent = $('<div id="scroll-percent" aria-hidden="true">0%</div>');
    $('body').prepend($track, $percent);

    function update() {
        const scrollable = $(document).height() - $(window).height();      // how far the page can scroll
        const ratio = scrollable > 0 ? $(window).scrollTop() / scrollable : 0;
        const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));

        $bar.css('width', percent + '%')
            .toggleClass('complete', percent === 100);
        $percent.text(percent + '%').toggleClass('visible', percent > 0);
    }

    $(window).on('scroll resize', update);
    $(window).on('load', update);       // pictures change the page height when they load
    update();
}


/* ==========================================================
   Task 5. Animated number counter (index.html)
   ========================================================== */
function initCounters() {
    const $numbers = $('.stat-number');
    if ($numbers.length === 0) return;

    function format($element, value) {
        return Math.floor(value).toLocaleString('en-US') + ($element.data('suffix') || '');
    }

    function animate($element) {
        if ($element.data('counted')) return;       // run only once per number
        $element.data('counted', true);

        const target = Number($element.data('target'));
        // animate a plain object from 0 to target; step() runs on every frame
        $({ value: 0 }).animate({ value: target }, {
            duration: 2000,
            easing: 'swing',
            step: function (now) { $element.text(format($element, now)); },
            complete: function () { $element.text(format($element, target)); }   // exact final number
        });
    }

    function isInView($element) {
        const viewBottom = $(window).scrollTop() + $(window).height();
        return $element.offset().top + 40 < viewBottom;
    }

    function check() {
        $numbers.each(function () {
            if (isInView($(this))) animate($(this));
        });
    }

    $numbers.each(function () { $(this).text(format($(this), 0)); });   // start from 0
    $(window).on('scroll resize', check);
    check();
}


/* ==========================================================
   Task 7. Extra toasts for buttons that already exist
   (contact and subscribe forms call GymUI.showToast from script.js)
   ========================================================== */
function initToastTriggers() {
    // The listeners from advanced.js were added first, so they run first and the label is already updated.
    $('#logWorkoutBtn').on('click', function () {
        const goalReached = $('#goal-message').text().indexOf('reached') !== -1;
        GymUI.showToast(goalReached ? 'Weekly goal reached. Great work!' : 'Workout logged: ' + $('#goal-label').text(),
                        'success');
    });

    $('#greeting-form').on('submit', function () {
        const name = $('#nameInput').val().trim();
        GymUI.showToast(name ? 'Name saved. Welcome, ' + name + '!' : 'Name cleared.', 'success');
    });

    $('.star').on('click', function () {
        GymUI.showToast('Thanks for rating us ' + $(this).data('value') + ' of 5!', 'success');
    });
}


/* ==========================================================
   Task 8. Copy to clipboard (contact.html, pricing.html)
   ========================================================== */
const ICON_COPY =
    '<svg class="icon-copy" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect>' +
    '<path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>';
const ICON_CHECK =
    '<svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';

let copyingByButton = false;     // true while our Copy button copies, so the "copy" listener ignores it

// Copies text. Uses the modern Clipboard API, or an old method when it is not available.
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);       // returns a promise
    }
    return new Promise(function (resolve, reject) {
        const $helper = $('<textarea readonly></textarea>').val(text).appendTo('body');
        $helper.get(0).select();
        copyingByButton = true;
        const ok = document.execCommand('copy');          // this also fires a "copy" event
        copyingByButton = false;
        $helper.remove();
        if (ok) resolve(); else reject(new Error('copy failed'));
    });
}

function initCopyButtons() {
    const $buttons = $('.copy-btn');
    if ($buttons.length === 0) return;

    $buttons.html(ICON_COPY + ICON_CHECK);          // both icons are inside; CSS shows one of them

    $buttons.on('click', function () {
        const $button = $(this);
        const text = $($button.data('copy-target')).text().trim();

        copyToClipboard(text).then(function () {
            const label = $button.attr('aria-label');
            $button.addClass('copied').attr('aria-label', 'Copied');          // check mark

            // tooltip: fades in, waits, fades out
            $button.find('.copy-tip').remove();
            $('<span class="copy-tip" role="status">Copied to clipboard!</span>')
                .hide().appendTo($button).fadeIn(150).delay(1500).fadeOut(250, function () { $(this).remove(); });

            setTimeout(function () {                                         // back to the copy icon
                $button.removeClass('copied').attr('aria-label', label);
            }, 2000);
        }, function () {
            GymUI.showToast('Could not copy. Select the text and press Ctrl+C.', 'error');
        });
    });

    // The user selects the text and presses Ctrl+C / Cmd+C themselves: the "copy" event.
    // We show a toast when the selection is inside a snippet or contains a whole snippet.
    $(document).on('copy', function () {
        if (copyingByButton) return;                       // our own button already shows a tooltip
        const selection = window.getSelection();
        const selected = String(selection).trim();
        if (selected === '') return;

        const $anchor = $(selection.anchorNode);
        const insideSnippet = $anchor.closest('.copy-snippet').length > 0 ||
                              $anchor.parent().closest('.copy-snippet').length > 0;
        const containsSnippet = $('.copy-snippet').filter(function () {
            return selected.indexOf($(this).text().trim()) !== -1;
        }).length > 0;

        if (insideSnippet || containsSnippet) GymUI.showToast('Copied to clipboard!', 'info', 2000);
    });
}


/* ==========================================================
   Task 9. Image lazy loading (index.html, gallery.html, programs.html)
   <img src="1x1 placeholder" data-src="real picture" class="lazy">
   When the picture is close to the visible part of the page we copy data-src into src.
   ========================================================== */
function loadLazyImage($image) {
    $image.one('load error', function (event) {
        $image.addClass(event.type === 'load' ? 'loaded lazy-fade' : 'loaded');   // 'loaded' stops the shimmer
    });
    $image.attr('src', $image.attr('data-src')).removeAttr('data-src');          // .attr('src')
}

function initLazyLoading() {
    const preload = 200;      // start loading 200px before the picture is on the screen

    function check() {
        const viewBottom = $(window).scrollTop() + $(window).height();

        $('img.lazy[data-src]').each(function () {
            const $image = $(this);
            if (!$image.is(':visible')) return;                      // hidden carousel slides wait for their turn
            if ($image.offset().top < viewBottom + preload) {        // .offset().top = distance from the page top
                loadLazyImage($image);
            }
        });
    }

    // Carousel: load a slide's picture just before it appears, and also the one after it
    const $carousel = $('#gymCarousel');
    if ($carousel.length > 0) {
        const loadSlide = function ($slide) { $slide.find('img.lazy[data-src]').each(function () { loadLazyImage($(this)); }); };
        $carousel.on('slide.bs.carousel', function (event) {
            const $next = $(event.relatedTarget);
            loadSlide($next);
            loadSlide($next.next('.carousel-item'));
        });
        loadSlide($carousel.find('.carousel-item.active').next('.carousel-item'));   // slide 2 is ready for the first change
    }

    $(window).on('scroll resize', check);
    $(document).on('programs:rendered lazy:check', check);   // new program cards, or the search showed some cards
    check();
}
