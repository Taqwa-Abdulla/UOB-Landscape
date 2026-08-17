
    document.addEventListener("DOMContentLoaded", function() {
        const rtlButton = document.getElementById('RTL');
        if (!rtlButton) return;

        // Get current language from URL parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        let currentLang = urlParams.get('lang') || '';

        // Fetch direction state from your PHP backend
        fetch(`/api/language/arabic.php${currentLang ? '?lang=' + currentLang : ''}`)
            .then(res => res.json())
            .then(data => {
                // 1. Apply HTML direction attributes (LTR / RTL)
                document.documentElement.setAttribute('lang', data.lang);
                document.documentElement.setAttribute('dir', data.dir);

                // 2. Apply styling & font adjustments when RTL is active
                if (data.dir === 'rtl') {
                    // Load clean Arabic font (Cairo)
                    const fontLink = document.createElement('link');
                    fontLink.rel = 'stylesheet';
                    fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap';
                    document.head.appendChild(fontLink);

                    const style = document.createElement('style');
                    style.innerHTML = `
                        body { font-family: 'Cairo', sans-serif !important; direction: rtl !important; text-align: right !important; }
                        nav { display: flex; justify-content: space-between; align-items: center; flex-direction: row-reverse; }
                    `;
                    document.head.appendChild(style);

                    rtlButton.innerText = "English";
                } else {
                    rtlButton.innerText = "Arabic";
                }

                // 3. Make your button interactive
                rtlButton.addEventListener('click', function() {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('lang', data.nextLang);
                    window.location.href = newUrl.toString(); // Reloads to update the PHP cookie and layout
                });
            })
            .catch(err => console.error('RTL State Error:', err));
    });