/**
 * Updates the progress bar immediately when it is created.
 */

function updateProgress(mutations) {
    const seen = new Set();

    mutations.forEach(function (mutation) {
        const moduleEl = mutation.target.closest('.MMM-OnThisDay');
        if (!moduleEl || seen.has(moduleEl)) return;
        seen.add(moduleEl);

        const progress = moduleEl.querySelector('.mmm-otd-carousel-progress');
        if (progress) progress.value = 1;
    });
}

const observer = new MutationObserver(updateProgress);
observer.observe(document, { subtree: true, childList: true });
