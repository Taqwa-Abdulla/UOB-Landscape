// 1. Build the layout as soon as the file executes
(function() {
    const chatbotWrapper = document.createElement('div');
    chatbotWrapper.id = 'global-chat-widget';
    chatbotWrapper.innerHTML = `
      <div class="chat-widget-wrapper" id="chatWidget">
        <div class="chat-box" id="chatBox" style="display: none;">
          
          <div class="chat-header">
            <span>UOB Assistant</span>
            <button class="clear-chat-btn" onclick="resetChat()" title="Clear Chat">🔄</button>
          </div>
          
          <div class="chat-messages" id="chatMessages">
            <div class="bot-welcome-msg">Hello! How can I help you today?</div>
          </div>
          
          <div class="chat-options" id="chatOptions">
            <button class="option-btn" onclick="handleOption('Admissions')">Admissions Info</button>
            <button class="option-btn" onclick="handleOption('Courses')">Available Courses</button>
            <button class="option-btn" onclick="handleOption('Campus Map')">Campus Map</button>
          </div>

          <div class="chat-input-area">
            <input type="text" placeholder="Type your message here..." id="chatInput">
          </div>
        </div>
        
        <div class="bot-container" id="botToggleContainer">
          <div class="plant-loader">
            <div class="stem"></div>
            <div class="leaf leaf-left"></div>
            <div class="leaf leaf-right"></div>
          </div>
          <div class="bot-head">
            <div class="bot-screen">
              <div class="eye-socket"><div class="pupil"></div></div>
              <div class="eye-socket"><div class="pupil"></div></div>
            </div>
          </div>
        </div>
       </div>
    `;
    document.body.appendChild(chatbotWrapper);
})();

// 2. Set up all bot logic, message routing, and interactions
window.addEventListener('load', function() {
    const botKnowledge = {
        "admissions": "Admissions are open until next month. You can apply online through the student portal.",
        "courses": "We offer programs in Engineering, IT, Science, and Business.",
        "campus map": "You can find our interactive landscape campus map on the main website header."
    };

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && chatInput.value.trim() !== '') {
                const userText = chatInput.value.trim();
                appendMessage(userText, 'user-msg');
                chatInput.value = ''; 
                processBotResponse(userText);
            }
        });
    }

    function processBotResponse(userInput) {
        const cleanedInput = userInput.toLowerCase().trim();
        const optionsContainer = document.getElementById('chatOptions');
        
        setTimeout(() => {
            if (cleanedInput === 'hello' || cleanedInput === 'hi') {
                const greetingHTML = `
                    Hello there! 👋 <br>
                    I am your UOB Assistant. How can I help you navigate our landscape website today?
                `;
                appendMessage(greetingHTML, 'bot-msg');
                if (optionsContainer) optionsContainer.style.display = 'flex';
            } 
            else if (botKnowledge[cleanedInput]) {
                appendMessage(botKnowledge[cleanedInput], 'bot-msg');
            } 
            else {
                const fallbackHTML = `
                    I couldn't find an exact match for that. Would you like to reach out to us directly? <br><br>
                    📞 Phone: +973 1743 8888<br>
                    📧 Email: <a href="mailto:support@uob.edu.bh">support@uob.edu.bh</a><br>
                    🌐 Web: <a href="https://www.uob.edu.bh/">Contact Form</a>
                `;
                appendMessage(fallbackHTML, 'bot-msg');
            }
        }, 500); 
    }

    function appendMessage(text, className) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = className;
        msgDiv.innerHTML = text; 
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; 
    }

    window.handleOption = function(optionText) {
        appendMessage(optionText, 'user-msg');
        processBotResponse(optionText);
    };

    window.resetChat = function() {
        const messagesContainer = document.getElementById('chatMessages');
        const optionsContainer = document.getElementById('chatOptions');
        if (messagesContainer) {
            messagesContainer.innerHTML = `<div class="bot-welcome-msg">Hello! How can I help you today?</div>`;
        }
        if (optionsContainer) optionsContainer.style.display = 'flex';
        if (chatInput) chatInput.value = '';
    };

    // 3. Interface Toggling Logic
    window.toggleChat = function() {
        const chatBox = document.getElementById('chatBox');
        const inputField = document.getElementById('chatInput');
        if (chatBox) {
            if (chatBox.style.display === 'none' || chatBox.style.display === '') {
                chatBox.style.display = 'flex';
                if(inputField) inputField.focus();
            } else {
                chatBox.style.display = 'none';
            }
        }
    };

    const botContainer = document.getElementById('botToggleContainer');
    if (botContainer) {
        botContainer.addEventListener('click', window.toggleChat);
    }

    // 4. Mouse Tracking Eye Vector System
    const pupils = document.querySelectorAll('.pupil');
    window.addEventListener('mousemove', (e) => {
        pupils.forEach(pupil => {
            const rect = pupil.getBoundingClientRect();
            const eyeX = rect.left + rect.width / 2;
            const eyeY = rect.top + rect.height / 2;
            
            const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
            const maxDistance = 3; 
            
            const moveX = Math.cos(angle) * maxDistance;
            const moveY = Math.sin(angle) * maxDistance;
            
            pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
});

// 5. Automatic Dynamic Stylesheet Linker (Handles multiple folder depths)
document.addEventListener("DOMContentLoaded", function () {
    // Check if we are inside the 'projects' subfolder or the main 'web pages' folder
    const pathPrefix = window.location.pathname.includes('/projects/') ? '../../' : '../';
    const finalCssPath = pathPrefix + 'public/css/bot.css';

    if (!document.querySelector(`link[href="${finalCssPath}"]`)) {
        const botStyle = document.createElement('link');
        botStyle.rel = 'stylesheet';
        botStyle.href = finalCssPath;
        document.head.appendChild(botStyle);
    }
});