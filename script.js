class FMWriter {
    constructor() {
        this.apiKey = localStorage.getItem('openRouterApiKey');
        this.lastRequestTime = 0;
        this.minRequestInterval = 2000; // Minimum 2 seconds between requests
        this.history = JSON.parse(localStorage.getItem('fmWriterHistory') || '[]');
        this.initializeElements();
        this.setupEventListeners();
        this.copyButton = document.getElementById('copyButton');
        this.setupCopyButton();
        this.setupAutoSave();
        this.loadHistory();
    }

    initializeElements() {
        this.apiKeyInput = document.getElementById('apiKey');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.productInput = document.getElementById('productInput');
        this.issuesInput = document.getElementById('issuesInput');
        this.topicInput = document.getElementById('topicInput');
        this.promptInput = document.getElementById('promptInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.output = document.getElementById('output');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.themeToggle = document.getElementById('themeToggle');
        this.apiSetup = document.getElementById('apiSetup');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // Hide API setup if key exists
        if (this.apiKey) {
            this.apiSetup.style.display = 'none';
        }
    }

    setupEventListeners() {
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.generateBtn.addEventListener('click', () => this.generateContent());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
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
        // Auto-save inputs every 30 seconds
        setInterval(() => {
            const product = this.productInput.value.trim();
            const issues = this.issuesInput.value.trim();
            const topic = this.topicInput.value.trim();
            const prompt = this.promptInput.value.trim();
            
            if (product || issues || topic || prompt) {
                localStorage.setItem('lastFormData', JSON.stringify({
                    product,
                    issues,
                    topic,
                    prompt
                }));
            }
        }, 30000);

        // Restore last inputs
        const lastFormData = JSON.parse(localStorage.getItem('lastFormData') || '{}');
        if (lastFormData.product) this.productInput.value = lastFormData.product;
        if (lastFormData.issues) this.issuesInput.value = lastFormData.issues;
        if (lastFormData.topic) this.topicInput.value = lastFormData.topic;
        if (lastFormData.prompt) this.promptInput.value = lastFormData.prompt;
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

    constructPrompt() {
        const product = this.productInput.value.trim();
        const issues = this.issuesInput.value.trim();
        const topic = this.topicInput.value.trim();
        const additionalInfo = this.promptInput.value.trim();
        
        if (!product && !topic) {
            return '';
        }
        
        let prompt = '';
        
        if (product) {
            prompt += `Produk/Perkhidmatan: ${product}\n\n`;
        }
        
        if (issues) {
            prompt += `Cabaran/Keperluan Audiens: ${issues}\n\n`;
        }
        
        if (topic) {
            prompt += `Topik: ${topic}\n\n`;
        }
        
        if (additionalInfo) {
            prompt += `Maklumat Tambahan: ${additionalInfo}\n\n`;
        }
        
        // Add extra guidance to make the output more natural but professional
        prompt += `\nPenting: Kongsi ilmu ini seperti berbual dengan pembaca secara profesional, bukan seperti menulis artikel formal. Elakkan frasa seperti "artikel ini akan membincangkan". Gunakan "kami" bukan "aku" atau "saya". Selit pengalaman kami untuk menjadikannya lebih relevan dan tulis seperti post Facebook yang profesional. Pastikan keseimbangan antara mesra tetapi profesional.\n`;
        
        return prompt.trim();
    }

    async generateContent() {
        if (!this.apiKey) {
            this.showNotification('Sila masukkan API key terlebih dahulu', 'error');
            return;
        }

        const prompt = this.constructPrompt();
        if (!prompt) {
            this.showNotification('Sila masukkan minimum topik pendidikan atau cabaran audiens', 'error');
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
                            "content": `Anda adalah penulis konten Facebook yang berkongsi ilmu dalam Bahasa Malaysia dengan gaya FM, bersahaja tetapi profesional.

Sila ikut panduan ini untuk menghasilkan kandungan:

1. Gaya dan Nada:
   - Tulis seperti PERBUALAN dengan pembaca, tetapi kekalkan nada profesional
   - ELAKKAN frasa seperti "artikel ini akan membincangkan", "dalam artikel ini", "kesimpulannya" 
   - Gunakan "kami" dan "kita", JANGAN gunakan "aku" atau "saya" yang terlalu kasual
   - Sertakan pengalaman dengan frasa seperti "kami pernah alami", "ramai pelanggan kami bertanya"
   - Mulakan dengan ayat yang menarik perhatian, bukan pengenalan formal
   - Guna gaya penulisan sopan dan mesra, tetapi kekalkan profesionalisme

2. Struktur Kandungan:
   - Mula dengan perkongsian pengalaman atau pemerhatian dengan emoji 😊
   - Masukkan nombor/poin penting dengan emoji (1️⃣, 2️⃣, 3️⃣, dst)
   - Sisipkan contoh praktikal dari "pengalaman kami" dengan label "Contoh:"
   - Kongsi tips berguna dengan simbol ✔
   - Akhiri dengan soalan terbuka untuk menggalakkan interaksi
   - Sertakan hashtag berkaitan (5-7 hashtag) 

3. Penggunaan Emoji:
   - Gunakan emoji secara sederhana pada tempat yang sesuai: 📚 🤔 💭 💡 ⭐ 🌟 😊 🙌 👍
   - Letakkan emoji untuk penekanan poin penting
   - Elakkan terlalu banyak emoji berturutan (maksimum 2)
   - Gunakan emoji untuk menyokong mesej, bukan menggantikannya

4. Strategi "Soft Selling":
   - UTAMAKAN perkongsian pengalaman dan ilmu tentang topik
   - Jika ada produk, sebut dengan profesional seperti "Di [nama perniagaan], kami menawarkan..."
   - Kongsi PENGALAMAN KAMI dengan produk/perkhidmatan (jika berkaitan)
   - ELAK ayat hard-sell atau promosi langsung
   - Fokus pada PENYELESAIAN MASALAH pembaca

5. Teknik Penulisan Bersahaja tetapi Profesional:
   - Masukkan frasa seperti "Menariknya...", "Perlu diingat...", "Apa yang kami dapati..."
   - Kadangkala guna ayat tidak lengkap...tetapi dengan tujuan penekanan
   - Gunakan ayat pendek dan jelas. Ini memudahkan pemahaman.
   - Masukkan persoalan di tengah kandungan "adakah anda pernah mengalami situasi ini?"
   - Gunakan HURUF BESAR dengan sederhana untuk penekanan
   - Kekalkan struktur yang kemas tetapi tidak terlalu formal
   - Masukkan perkataan Inggeris yang biasa digunakan dalam perbualan profesional`
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 4000,
                    "temperature": 0.75
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Ralat API');
            }

            const data = await response.json();
            const generatedContent = data.choices[0].message.content;
            const formattedContent = this.formatContent(generatedContent);
            this.output.innerHTML = formattedContent;
            this.copyButton.style.display = 'flex';
            this.showNotification('Post profesional anda telah siap!', 'success');
            
            // Add to history
            this.addToHistory({
                product: this.productInput.value.trim(),
                issues: this.issuesInput.value.trim(),
                topic: this.topicInput.value.trim(),
                prompt: this.promptInput.value.trim(),
                content: generatedContent,
                timestamp: new Date().toISOString()
            });
            
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
        if (progress < 20) return 'Menganalisa topik perkongsian...';
        if (progress < 40) return 'Menyusun poin-poin utama...';
        if (progress < 60) return 'Mengumpulkan pengalaman dan penyelesaian...';
        if (progress < 80) return 'Menyusun kandungan profesional...';
        return 'Menambah elemen yang relevan & menarik...';
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

    // History management functions
    addToHistory(item) {
        // Limit history to 20 items
        this.history.unshift(item);
        if (this.history.length > 20) {
            this.history.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('fmWriterHistory', JSON.stringify(this.history));
        
        // Refresh history display
        this.loadHistory();
    }
    
    loadHistory() {
        this.historyList.innerHTML = '';
        
        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="empty-history">Tiada sejarah penulisan dijumpai.</div>';
            return;
        }
        
        this.history.forEach((item, index) => {
            const historyItem = this.createHistoryItem(item, index);
            this.historyList.appendChild(historyItem);
        });
    }
    
    createHistoryItem(item, index) {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Get title from the content (first line)
        const title = item.content.split('\n')[0] || 'Penulisan Tanpa Tajuk';
        
        // Get a short snippet
        const snippet = item.content.replace(title, '').trim().substring(0, 100) + '...';
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.index = index;
        
        historyItem.innerHTML = `
            <div class="history-meta">
                <span class="history-date">${formattedDate}</span>
                <span class="history-topic">${item.topic || item.product || 'Tiada topik'}</span>
            </div>
            <div class="history-title">${title}</div>
            <div class="history-snippet">${snippet}</div>
            <div class="history-actions">
                <button class="history-action-btn load-btn" title="Muat semula">🔄</button>
                <button class="history-action-btn delete-btn" title="Padam">🗑️</button>
            </div>
        `;
        
        // Add event listeners
        historyItem.querySelector('.load-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.loadFromHistory(index);
        });
        
        historyItem.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteFromHistory(index);
        });
        
        // Load content when clicking on the item
        historyItem.addEventListener('click', () => {
            this.loadContentFromHistory(index);
        });
        
        return historyItem;
    }
    
    loadFromHistory(index) {
        const item = this.history[index];
        if (!item) return;
        
        this.productInput.value = item.product || '';
        this.issuesInput.value = item.issues || '';
        this.topicInput.value = item.topic || '';
        this.promptInput.value = item.prompt || '';
        
        this.showNotification('Input telah dimuat! Sedia untuk cipta post profesional baru.', 'success');
    }
    
    loadContentFromHistory(index) {
        const item = this.history[index];
        if (!item) return;
        
        const formattedContent = this.formatContent(item.content);
        this.output.innerHTML = formattedContent;
        this.copyButton.style.display = 'flex';
        
        // Scroll to output
        this.output.scrollIntoView({ behavior: 'smooth' });
        
        this.showNotification('Post profesional tersimpan berjaya dimuat!', 'success');
    }
    
    deleteFromHistory(index) {
        this.history.splice(index, 1);
        localStorage.setItem('fmWriterHistory', JSON.stringify(this.history));
        this.loadHistory();
        this.showNotification('Item sejarah telah dipadam', 'success');
    }
    
    clearHistory() {
        if (confirm('Adakah anda pasti mahu memadamkan semua sejarah penulisan?')) {
            this.history = [];
            localStorage.setItem('fmWriterHistory', JSON.stringify(this.history));
            this.loadHistory();
            this.showNotification('Semua sejarah penulisan telah dipadamkan', 'success');
        }
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