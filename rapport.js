document.addEventListener('DOMContentLoaded', () => {
    const pdfUrl = '260528 AH Gruppen AS - Redegjørelse for Åpenhetsloven 2025.pdf';

    // PDF.js State Variables
    let pdfDoc = null;
    let currentZoom = 100; // Zoom percentage
    const zoomStep = 25;
    const minZoom = 50;
    const maxZoom = 250;
    let currentPageNum = 1; // Used for tracking the most visible page

    // DOM Elements
    const container = document.getElementById('pdf-canvas-container');
    const mainLoader = document.getElementById('pdf-loader');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageDisplay = document.getElementById('page-num-display');
    const wrapper = document.getElementById('pdf-viewer-wrapper');
    const fallbackIframe = document.getElementById('pdf-frame-fallback');
    const shortcutButtons = document.querySelectorAll('.pdf-shortcuts button');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomDisplay = document.getElementById('zoom-percent');

    // Track rendered pages
    const renderedPages = new Set();
    const pageWrappers = [];

    /**
     * Hides the custom canvas viewer and displays the standard fallback iframe
     */
    function useFallback(reason) {
        console.warn("PDF.js faller tilbake til standard iframe. Årsak:", reason);
        if (wrapper) wrapper.classList.add('hidden');
        if (fallbackIframe) fallbackIframe.classList.remove('fallback-hidden');
    }

    /**
     * Initialize the multi-page viewer
     */
    function initViewer(pdf) {
        pdfDoc = pdf;
        if (mainLoader) mainLoader.classList.add('hidden');
        if (container) {
            // Keep the loader hidden, clear everything else just in case (though we removed static canvas)
            container.innerHTML = '';
        }

        // Generate placeholders for all pages
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'pdf-page-wrapper';
            pageWrapper.id = `pdf-page-${i}`;
            pageWrapper.dataset.pageNumber = i;
            // Initially set width via inline styles so zoom works even before render
            pageWrapper.style.width = currentZoom === 100 ? '100%' : currentZoom + '%';

            const canvas = document.createElement('canvas');
            const placeholder = document.createElement('div');
            placeholder.className = 'page-loading-placeholder';
            placeholder.textContent = `Laster side ${i}...`;

            pageWrapper.appendChild(canvas);
            pageWrapper.appendChild(placeholder);
            container.appendChild(pageWrapper);
            pageWrappers.push(pageWrapper);
        }

        // Initialize Intersection Observer for lazy rendering
        setupIntersectionObserver();

        // Initialize scroll listener for accurate page tracking
        setupScrollTracking();

        // Initial setup for UI
        updateUI(1);
    }

    function setupIntersectionObserver() {
        const options = {
            root: container,
            rootMargin: '200px 0px', // Load pages 200px before they enter viewport
            threshold: 0 // Only care when it enters/leaves the margin for loading
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const wrapper = entry.target;
                const pageNum = parseInt(wrapper.dataset.pageNumber, 10);

                // Lazy Loading Logic
                if (entry.isIntersecting && !renderedPages.has(pageNum)) {
                    renderPage(pageNum, wrapper);
                }
            });
        }, options);

        pageWrappers.forEach(wrapper => observer.observe(wrapper));
    }

    function setupScrollTracking() {
        if (!container) return;

        let scrollTimeout;
        container.addEventListener('scroll', () => {
            if (!scrollTimeout) {
                scrollTimeout = requestAnimationFrame(() => {
                    updateActivePageOnScroll();
                    scrollTimeout = null;
                });
            }
        });
    }

    function updateActivePageOnScroll() {
        if (!container) return;
        if (window.innerWidth <= 768) return; // Disable scroll tracking on mobile for strict pagination
        
        const containerRect = container.getBoundingClientRect();
        // Calculate the center Y of the visible container area
        const containerCenterY = containerRect.top + (containerRect.height / 2);

        let minDistance = Infinity;
        let closestPage = currentPageNum;

        pageWrappers.forEach(wrapper => {
            const rect = wrapper.getBoundingClientRect();
            // Check if wrapper is at least partially in the viewport
            if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
                const wrapperCenterY = rect.top + (rect.height / 2);
                const distance = Math.abs(containerCenterY - wrapperCenterY);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPage = parseInt(wrapper.dataset.pageNumber, 10);
                }
            }
        });

        if (closestPage !== currentPageNum) {
            updateUI(closestPage);
            maintainRenderedPages(); // enforce max two pages
        }
    }

    function renderPage(pageNum, pageWrapper) {
        renderedPages.add(pageNum); // Mark as rendering/rendered
        const canvas = pageWrapper.querySelector('canvas');
        const placeholder = pageWrapper.querySelector('.page-loading-placeholder');
        const ctx = canvas.getContext('2d');

        pdfDoc.getPage(pageNum).then((page) => {
            // Uncap the devicePixelRatio for maximum sharpness on modern phones/monitors
            const outputScale = window.devicePixelRatio || 1;
            // Bump the base scale to 2.5 to ensure text is extremely crisp even when zoomed in
            const baseScale = 2.5;
            const viewport = page.getViewport({ scale: baseScale });

            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.height = 'auto';
            pageWrapper.style.minHeight = 'auto'; // Reset minHeight lock

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
                canvasContext: ctx,
                transform: transform,
                viewport: viewport
            };

            return page.render(renderContext).promise;
        }).then(() => {
            // Hide placeholder on success
            if (placeholder) placeholder.style.display = 'none';
            maintainRenderedPages();
        }).catch(err => {
            console.error(`Feil under tegneprosess av side ${pageNum}:`, err);
            renderedPages.delete(pageNum); // Allow retrying
            if (placeholder) placeholder.textContent = "Feil ved lasting av side";
        });
    }

    // --- Memory management helpers ---
    function unloadPage(pageNum) {
        const wrapper = document.getElementById(`pdf-page-${pageNum}`);
        if (!wrapper) return;
        
        const canvas = wrapper.querySelector('canvas');
        const placeholder = wrapper.querySelector('.page-loading-placeholder');
        
        if (window.innerWidth > 768) {
            // Preserve wrapper height to prevent scroll jumps when canvas is cleared
            const rect = wrapper.getBoundingClientRect();
            if (rect.height > 0) {
                wrapper.style.minHeight = rect.height + 'px';
            }
        } else {
            // Mobile: hide it entirely to remove infinite scroll
            wrapper.style.display = 'none';
        }
        
        if (canvas) {
            canvas.width = 0;
            canvas.height = 0;
        }
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        
        renderedPages.delete(pageNum);
    }

    function maintainRenderedPages() {
        if (window.innerWidth > 768) {
            // Desktop: restore visibility of any wrappers hidden by mobile mode
            pageWrappers.forEach(wrapper => {
                wrapper.style.display = 'block';
            });
            return;
        }

        // Mobile: strict pagination with exactly 2 pages
        const pagesToKeep = new Set([currentPageNum, currentPageNum + 1]);

        pageWrappers.forEach(wrapper => {
            const pNum = parseInt(wrapper.dataset.pageNumber, 10);
            if (!pagesToKeep.has(pNum)) {
                unloadPage(pNum);
            } else {
                wrapper.style.display = 'block'; // Ensure visible on mobile
            }
        });

        if (pdfDoc) {
            pagesToKeep.forEach(pNum => {
                if (pNum >= 1 && pNum <= pdfDoc.numPages && !renderedPages.has(pNum)) {
                    const wrapper = document.getElementById(`pdf-page-${pNum}`);
                    if (wrapper) {
                        renderPage(pNum, wrapper);
                    }
                }
            });
        }
    }

    /**
     * Updates the UI based on the current visible page
     */
    function updateUI(pageNum) {
        currentPageNum = pageNum;

        // Update page number indicator
        if (pageDisplay && pdfDoc) {
            if (window.innerWidth <= 768) {
                const endPage = Math.min(pageNum + 1, pdfDoc.numPages);
                if (pageNum === endPage) {
                    pageDisplay.textContent = `Side ${pageNum} av ${pdfDoc.numPages}`;
                } else {
                    pageDisplay.textContent = `Side ${pageNum}-${endPage} av ${pdfDoc.numPages}`;
                }
            } else {
                pageDisplay.textContent = `Side ${pageNum} av ${pdfDoc.numPages}`;
            }
        }

        // Disable/enable navigation buttons
        if (prevBtn) prevBtn.disabled = (pageNum <= 1);
        if (nextBtn && pdfDoc) nextBtn.disabled = (pageNum >= pdfDoc.numPages);

        // Update active class on shortcut buttons
        shortcutButtons.forEach(btn => {
            const btnPage = parseInt(btn.getAttribute('data-page'), 10);
            if (btnPage === pageNum) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function scrollToPage(pageNum) {
        if (window.innerWidth <= 768) {
            updateUI(pageNum);
            maintainRenderedPages();
            if (container) container.scrollTop = 0;
        } else {
            const targetWrapper = document.getElementById(`pdf-page-${pageNum}`);
            if (targetWrapper) {
                // Smooth scroll to the wrapper
                targetWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (!pdfDoc && fallbackIframe) {
                // Fallback rendering navigation
                const newIframe = fallbackIframe.cloneNode();
                newIframe.src = `${encodeURI(pdfUrl)}#page=${pageNum}&toolbar=0&navpanes=0&scrollbar=0`;
                fallbackIframe.parentNode.replaceChild(newIframe, fallbackIframe);
                updateUI(pageNum);
            }
        }
    }

    /**
     * Updates the width for all page wrappers
     */
    function updateZoom() {
        const widthVal = currentZoom === 100 ? '100%' : currentZoom + '%';
        const maxWidthVal = currentZoom === 100 ? '100%' : 'none';

        pageWrappers.forEach(wrapper => {
            wrapper.style.width = widthVal;
            wrapper.style.maxWidth = maxWidthVal;
        });

        if (zoomDisplay) zoomDisplay.textContent = `${currentZoom}%`;
        if (zoomInBtn) zoomInBtn.disabled = (currentZoom >= maxZoom);
        if (zoomOutBtn) zoomOutBtn.disabled = (currentZoom <= minZoom);
    }

    // Navigation Events
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPageNum > 1) {
                const step = window.innerWidth <= 768 ? 2 : 1;
                scrollToPage(Math.max(1, currentPageNum - step));
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (pdfDoc && currentPageNum < pdfDoc.numPages) {
                const step = window.innerWidth <= 768 ? 2 : 1;
                scrollToPage(Math.min(pdfDoc.numPages, currentPageNum + step));
            }
        });
    }

    // Zoom Events
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (currentZoom >= maxZoom) return;
            currentZoom += zoomStep;
            updateZoom();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (currentZoom <= minZoom) return;
            currentZoom -= zoomStep;
            updateZoom();
        });
    }

    // Sidebar Shortcut Events
    shortcutButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const targetPage = parseInt(this.getAttribute('data-page'), 10);
            if (!isNaN(targetPage)) scrollToPage(targetPage);
        });
    });

    // Initialize PDF.js loading
    if (window.location.protocol === 'file:') {
        useFallback("Nettsiden kjører lokalt via filsystemet (file://). Nettleseren blokkerer lasting av lokale PDF-er via JavaScript av sikkerhetsgrunner.");
    } else if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

        pdfjsLib.getDocument(pdfUrl).promise
            .then(initViewer)
            .catch(useFallback);
    } else {
        useFallback("PDF.js biblioteket ble ikke lastet inn.");
    }

    // Handle resize to switch between infinite scroll and strict pagination
    window.addEventListener('resize', () => {
        maintainRenderedPages();
    });
});
