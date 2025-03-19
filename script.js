class FMWriter {
    constructor() {
        this.apiKey = localStorage.getItem('openRouterApiKey');
        this.lastRequestTime = 0;
        this.minRequestInterval = 2000; // Minimum 2 seconds between requests
        this.initializeElements();
        this.setupEventListeners();
        this.copyButton = document.getElementById('copyButton');
        this.setupCopyButton();
        this.setupAutoSave();
    }

    initializeElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.promptInput = document.getElementById('promptInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.output = document.getElementById('output');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.themeToggle = document.getElementById('themeToggle');
        this.apiSetup = document.getElementById('apiSetup');

        // Hide API setup if key exists
        if (this.apiKey) {
            this.apiSetup.style.display = 'none';
        }
    }

    setupEventListeners() {
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.generateBtn.addEventListener('click', () => this.generateContent());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            this.showNotification('Sila masukkan API key yang sah', 'error');
            return;
        }
        
        // Basic API key validation
        if (!key.startsWith('sk-')) {
            this.showNotification('API key tidak sah. Sila pastikan format yang betul.', 'error');
            return;
        }

        localStorage.setItem('openRouterApiKey', key);
        this.apiKey = key;
        this.apiSetup.style.display = 'none';
        this.showNotification('API key berjaya disimpan!', 'success');
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    }

    setupAutoSave() {
        // Auto-save prompt every 30 seconds
        setInterval(() => {
            const prompt = this.promptInput.value.trim();
            if (prompt) {
                localStorage.setItem('lastPrompt', prompt);
            }
        }, 30000);

        // Restore last prompt
        const lastPrompt = localStorage.getItem('lastPrompt');
        if (lastPrompt) {
            this.promptInput.value = lastPrompt;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async generateContent() {
        if (!this.apiKey) {
            this.showNotification('Sila masukkan API key terlebih dahulu', 'error');
            return;
        }

        const prompt = this.promptInput.value.trim();
        if (!prompt) {
            this.showNotification('Sila masukkan topik penulisan', 'error');
            return;
        }

        // Rate limiting
        const now = Date.now();
        if (now - this.lastRequestTime < this.minRequestInterval) {
            this.showNotification('Sila tunggu sebentar sebelum membuat permintaan baru', 'warning');
            return;
        }
        this.lastRequestTime = now;

        this.loadingIndicator.classList.remove('hidden');
        this.output.innerHTML = '';
        this.showProgressIndicator();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "google/learnlm-1.5-pro-experimental:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": `Anda adalah penulis profesional yang menggunakan gaya penulisan FM dalam Bahasa Malaysia. 

Sila ikut arahan berikut untuk menghasilkan kandungan:

1. Format Penulisan:
   - Mulakan dengan tajuk yang menarik dan emoji berkaitan
   - Gunakan ayat pendek dan berkesan
   - Sediakan senarai dan poin penting
   - Gunakan pengulangan strategik untuk penekanan
   - Minimum 1000 patah perkataan

2. Struktur Kandungan:
   - Pengenalan yang menarik dengan emoji 😊
   - Penerangan terperinci dengan nombor (1️⃣, 2️⃣, 3️⃣, dst)
   - Contoh-contoh praktikal dengan label "Contoh:"
   - Tips dan panduan dengan simbol ✔
   - Kesimpulan yang berkesan
   - CTA (Call-to-Action) untuk engagement
   - Senarai hashtag berkaitan (minimum 5 hashtag)

3. Penggunaan Emoji:
   Gunakan emoji yang sesuai untuk:
   - Tajuk utama 🎯
   - Setiap seksyen utama ⭐
   - Tips penting 💡
   - Amaran atau perhatian ⚠️
   - Contoh 📝
   - Kesimpulan 🎉
   - Soalan atau CTA 💭

4. Hashtag:
   - Sertakan minimum 5 hashtag berkaitan
   - Format: #KataKunci
   - Letakkan di penghujung artikel
   - Contoh: #TipsPenulisan #ContentCreator #BahasaMalaysia

5. Gaya Penulisan:
   - Nada santai tetapi profesional
   - Gunakan bahasa yang mudah difahami
   - Masukkan unsur motivasi dan galakan
   - Buat pembaca rasa seperti berbual dengan kawan`
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 4000,
                    "temperature": 0.7
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Ralat API');
            }

            const data = await response.json();
            const formattedContent = this.formatContent(data.choices[0].message.content);
            this.output.innerHTML = formattedContent;
            this.copyButton.style.display = 'flex';
            this.showNotification('Kandungan berjaya dijana!', 'success');
        } catch (error) {
            this.output.innerHTML = `Ralat: ${error.message === 'The operation was aborted' ? 
                'Masa menunggu telah tamat. Sila cuba lagi.' : error.message}`;
            this.copyButton.style.display = 'none';
            this.showNotification(error.message, 'error');
        } finally {
            this.loadingIndicator.classList.add('hidden');
            this.hideProgressIndicator();
        }
    }

    formatContent(content) {
        // First wrap the content in a paragraph tag
        let formatted = `<p>${content}</p>`;
        
        // Format emojis and special characters
        formatted = formatted
            .replace(/([🏠✨😬💪📝🎯⭐💡⚠️🎉💭😊📌💪🎨🌟🔍💻🚀🎓💎🌈])/g, '<span class="emoji">$1</span>')
            .replace(/(#\w+)/g, '<span class="hashtag">$1</span>')
            .replace(/([1-9]️⃣)/g, '<span class="number-emoji">$1</span>');

        // Format headers and subheaders
        formatted = formatted
            .replace(/^(.+?)\n/m, '<h1>$1</h1>') // First line as main header
            .replace(/^([^\n]+?)(?=\n[1-9]️⃣)/gm, '<p class="intro">$1</p>') // Intro paragraph
            .replace(/([1-9]️⃣[^\n]+)/g, '<h2>$1</h2>') // Number emoji headers
            .replace(/(Pro tip:|Tips Bonus:)([^\n]+)/g, '<div class="pro-tip"><strong>$1</strong>$2</div>');

        // Format lists and checkmarks
        formatted = formatted
            .replace(/✔([^\n]+)/g, '<div class="checkmark-item">✔$1</div>')
            .replace(/•([^\n]+)/g, '<div class="bullet-item">•$1</div>');

        // Format examples and special sections
        formatted = formatted
            .replace(/Contoh:([^\n]+)/g, '<div class="example"><strong>Contoh:</strong>$1</div>')
            .replace(/(Nak panduan lebih lengkap\?[^#]+)/g, '<div class="cta-section">$1</div>');

        // Add line breaks and spacing
        formatted = formatted
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Strip HTML tags when copying
        this.plainTextContent = content.replace(/<[^>]+>/g, '');
        
        return formatted;
    }

    showProgressIndicator() {
        const progressContainer = document.createElement('div');
        progressContainer.id = 'progressContainer';
        progressContainer.innerHTML = `
            <div class="progress-wrapper">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Menjana kandungan terperinci...</div>
            </div>
        `;
        this.output.parentNode.insertBefore(progressContainer, this.output);
        
        // Simulate progress
        let progress = 0;
        this.progressInterval = setInterval(() => {
            progress += Math.random() * 2;
            if (progress > 95) clearInterval(this.progressInterval);
            const fill = progressContainer.querySelector('.progress-fill');
            const text = progressContainer.querySelector('.progress-text');
            fill.style.width = `${Math.min(progress, 95)}%`;
            text.textContent = this.getProgressMessage(progress);
        }, 1000);
    }

    hideProgressIndicator() {
        clearInterval(this.progressInterval);
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.remove();
        }
    }

    getProgressMessage(progress) {
        if (progress < 20) return 'Menganalisa topik...';
        if (progress < 40) return 'Menyusun struktur kandungan...';
        if (progress < 60) return 'Menghasilkan kandungan terperinci...';
        if (progress < 80) return 'Menambah contoh dan tips...';
        return 'Mengemas kini format akhir...';
    }

    setupCopyButton() {
        this.copyButton.addEventListener('click', () => this.copyOutputToClipboard());
    }

    async copyOutputToClipboard() {
        const content = this.output.innerHTML;
        if (!content) return;

        try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;

            let formattedText = '';
            
            // Process with human-like formatting
            for (const element of tempDiv.children) {
                if (element.tagName === 'H1') {
                    // Main title with varied spacing (humans don't always use perfect spacing)
                    formattedText += element.textContent + '\n\n';
                } else if (element.tagName === 'H2') {
                    // Section headers with emojis - humans often put spaces around emojis
                    let text = element.textContent;
                    // Add occasional space after emoji (not always consistent)
                    text = text.replace(/([🏠✨😬💪📝🎯⭐💡⚠️🎉💭😊📌🎨🌟🔍💻🚀🎓💎🌈])/g, '$1 ');
                    formattedText += '\n' + text + '\n\n';
                } else if (element.tagName === 'P') {
                    // Regular paragraphs with natural spacing
                    const text = element.textContent.trim();
                    if (text) {
                        // Humans often write in shorter paragraphs on social media
                        const sentences = text.split(/(?<=[.!?])\s+/);
                        for (let i = 0; i < sentences.length; i++) {
                            formattedText += sentences[i] + (i < sentences.length-1 ? '\n' : '\n\n');
                        }
                    }
                } else if (element.tagName === 'DIV') {
                    if (element.classList.contains('checkmark-item')) {
                        // Checkmark items with more natural formatting
                        const text = element.textContent.replace('✔', '').trim();
                        formattedText += '✓ ' + text + '\n';
                    } else if (element.classList.contains('bullet-item')) {
                        // Humans use different bullet styles
                        const text = element.textContent.replace('•', '').trim();
                        // Randomly choose bullet style
                        const bullets = ['-', '•', '*'];
                        const bullet = bullets[Math.floor(Math.random() * bullets.length)];
                        formattedText += bullet + ' ' + text + '\n';
                    } else if (element.classList.contains('example')) {
                        // Examples with more natural formatting
                        const text = element.textContent.replace('Contoh:', '').trim();
                        formattedText += 'Contoh: ' + text + '\n\n';
                    } else if (element.classList.contains('pro-tip')) {
                        // Pro tips with human emphasis
                        const text = element.textContent.trim();
                        formattedText += '💡 Pro Tip: ' + text + '\n\n';
                    } else if (element.classList.contains('cta-section')) {
                        // CTA with natural emphasis
                        const text = element.textContent.trim();
                        formattedText += text + '\n\n';
                    } else {
                        // Other div content with natural spacing
                        const text = element.textContent.trim();
                        if (text) {
                            formattedText += text + '\n\n';
                        }
                    }
                }
            }

            // Process hashtags like a human would
            const hashtags = formattedText.match(/#\w+/g) || [];
            if (hashtags.length > 0) {
                formattedText += '\n\n';
                
                // Humans often group related hashtags
                let hashtagText = '';
                hashtags.forEach((tag, index) => {
                    // Sometimes add space, sometimes don't
                    hashtagText += tag + (Math.random() > 0.3 ? ' ' : '');
                    
                    // Occasional line break
                    if (index % 3 === 2 && index < hashtags.length - 1) {
                        hashtagText += '\n';
                    }
                });
                
                formattedText += hashtagText;
            }

            // Humanize text
            formattedText = this.humanizeText(formattedText);

            // Copy to clipboard
            await navigator.clipboard.writeText(formattedText);
            
            // Visual feedback
            this.copyButton.classList.add('copied');
            const originalText = this.copyButton.querySelector('.copy-text').textContent;
            this.copyButton.querySelector('.copy-text').textContent = 'Disalin!';
            this.copyButton.querySelector('.copy-icon').textContent = '✅';

            // Reset after 2 seconds
            setTimeout(() => {
                this.copyButton.classList.remove('copied');
                this.copyButton.querySelector('.copy-text').textContent = originalText;
                this.copyButton.querySelector('.copy-icon').textContent = '📋';
            }, 2000);

            this.showNotification('Teks berjaya disalin dalam format yang semulajadi!', 'success');

        } catch (err) {
            console.error('Failed to copy text: ', err);
            this.showNotification('Tidak dapat menyalin teks. Sila cuba lagi.', 'error');
        }
    }
    
    humanizeText(text) {
        // Varied line spacing (humans aren't consistent with spacing)
        text = text
            // Replace excessive newlines but with some randomness
            .replace(/\n{4,}/g, '\n'.repeat(2 + Math.floor(Math.random() * 2)))
            // Sometimes single, sometimes double breaks after sentences
            .replace(/([.!?])\s*/g, (match, p1) => Math.random() > 0.4 ? p1 + '\n\n' : p1 + '\n')
            // Clean up any excessive breaks that might have been created
            .replace(/\n{5,}/g, '\n\n\n')
            .trim();
            
        // Add occasional natural typing patterns
        const lines = text.split('\n');
        let humanizedLines = [];
        
        for (let line of lines) {
            // Skip empty lines
            if (!line.trim()) {
                humanizedLines.push(line);
                continue;
            }
            
            // Occasionally add human typing quirks
            if (Math.random() < 0.05 && line.length > 10) {
                // Occasionally capitalize words for emphasis (1% chance per line)
                const words = line.split(' ');
                if (words.length > 3) {
                    const randomIndex = Math.floor(Math.random() * words.length);
                    if (words[randomIndex].length > 3) {
                        words[randomIndex] = words[randomIndex].toUpperCase();
                        line = words.join(' ');
                    }
                }
            }
            
            // Occasionally make typos and then correct them
            if (Math.random() < 0.02 && line.length > 20) {
                const words = line.split(' ');
                if (words.length > 4) {
                    const randomIndex = Math.floor(Math.random() * words.length);
                    const word = words[randomIndex];
                    if (word.length > 4) {
                        // Create a simple typo and correction
                        const typoIndex = Math.floor(Math.random() * (word.length - 2)) + 1;
                        const swappedChar = word[typoIndex];
                        const swappedWithChar = word[typoIndex + 1];
                        
                        // Make the typo by swapping characters
                        const typedWord = word.substring(0, typoIndex) + 
                                        swappedWithChar + 
                                        swappedChar + 
                                        word.substring(typoIndex + 2);
                        
                        // "Correct" the typo
                        words[randomIndex] = typedWord + '* ' + word;
                        line = words.join(' ');
                    }
                }
            }
            
            humanizedLines.push(line);
        }
        
        // Join with varied newlines
        return humanizedLines.join('\n');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const writer = new FMWriter();
    
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
}); 