//=======================================
// RTL for Arabic Langauge Script
//=======================================
    document.addEventListener("DOMContentLoaded", function() {
        const rtlButton = document.getElementById('RTL');
        if (!rtlButton) return;

        
        const urlParams = new URLSearchParams(window.location.search);
        let currentLang = urlParams.get('lang') || '';

        
        fetch(`/api/language/arabic.php${currentLang ? '?lang=' + currentLang : ''}`)
            .then(res => res.json())
            .then(data => {
                
                document.documentElement.setAttribute('lang', data.lang);
                document.documentElement.setAttribute('dir', data.dir);

                
                if (data.dir === 'rtl') {
                    
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

                
                rtlButton.addEventListener('click', function() {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('lang', data.nextLang);
                    window.location.href = newUrl.toString();
                });
            })
            .catch(err => console.error('RTL State Error:', err));
    });