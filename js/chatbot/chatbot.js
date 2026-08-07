// 1. Build the layout as soon as the file executes
(function() {
    const chatbotWrapper = document.createElement('div');
    chatbotWrapper.id = 'global-chat-widget';
    chatbotWrapper.innerHTML = `
      <div class="chat-widget-wrapper" id="chatWidget">
        <div class="chat-box" id="chatBox" style="display: none;">
          
          <div class="chat-header">
            <span>Landscape UOB Assistant (Aspen)</span>
            <button class="clear-chat-btn" onclick="resetChat()" title="Clear Chat">🔄</button>
          </div>
          
          <div class="chat-messages" id="chatMessages">
            <div class="bot-welcome-msg">Hello! How can I help you today?</div>
          </div>
          
          <div class="chat-options" id="chatOptions">
            <button class="option-btn" onclick="handleOption('who is aspen?')">Who is Aspen?</button>
            <button class="option-btn" onclick="handleOption('i would like to know about uob landscape website')">About</button>
            <button class="option-btn" onclick="handleOption('lanscape campus map')">Map</button>
            <button class="option-btn" onclick="handleOption('plants')">Plants</button>
            <button class="option-btn" onclick="handleOption('locations')">Locations</button>
            <button class="option-btn" onclick="handleOption('statistics')">Statistics</button>
            <button class="option-btn" onclick="handleOption('improvements')">Improvements</button>
            <button class="option-btn" onclick="handleOption('others')">Others</button>
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

    async function processBotResponse(userInput) {
        const optionsContainer = document.getElementById('chatOptions');
        
        try {
            // Send request to secure PHP backend API endpoint
            const response = await fetch('../../api/chatbot/chatbot.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userInput })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            setTimeout(() => {
                appendMessage(data.reply, 'bot-msg');
                
                // Show options container if user greeted the bot
                const cleanedInput = userInput.toLowerCase().trim();
                if ((cleanedInput === 'hello' || cleanedInput === 'hi' || cleanedInput === 'السلام عليكم' || cleanedInput === 'مرحبا' || cleanedInput === 'مرحبًا') && optionsContainer) {
                    optionsContainer.style.display = 'flex';
                }
            }, 500);

        } catch (error) {
            setTimeout(() => {
                appendMessage("Sorry, I'm having trouble connecting to the server right now.", 'bot-msg');
            }, 500);
        }
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

// Automatic Dynamic Stylesheet Linker using absolute root path
document.addEventListener("DOMContentLoaded", function () {
    const finalCssPath = '/public/css/bot.css'; 

    if (!document.querySelector(`link[href="${finalCssPath}"]`)) {
        const botStyle = document.createElement('link');
        botStyle.rel = 'stylesheet';
        botStyle.href = finalCssPath;
        document.head.appendChild(botStyle);
    }
});