document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.pdf-shortcuts button');
    const pdfUrl = encodeURI('260528 AH Gruppen AS - Redegjørelse for Åpenhetsloven 2025.pdf');

    buttons.forEach(btn => {
        btn.addEventListener('click', function () {
            const pageNum = this.getAttribute('data-page');

            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const currentIframe = document.getElementById('pdf-frame');
            if (currentIframe) {
                const newIframe = currentIframe.cloneNode();
                newIframe.src = `${pdfUrl}#page=${pageNum}&toolbar=0&navpanes=0&scrollbar=0`;
                currentIframe.parentNode.replaceChild(newIframe, currentIframe);
            }
        });
    });
});
