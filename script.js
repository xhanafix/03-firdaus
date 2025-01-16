class FMWriter {
    constructor() {
        this.apiKey = localStorage.getItem('openRouterApiKey');
        this.initializeElements();
        this.setupEventListeners();
        this.copyButton = document.getElementById('copyButton');
        this.setupCopyButton();
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
        if (key) {
            localStorage.setItem('openRouterApiKey', key);
            this.apiKey = key;
            this.apiSetup.style.display = 'none';
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    }

    async generateContent() {
        if (!this.apiKey) {
            alert('Sila masukkan API key terlebih dahulu');
            return;
        }

        const prompt = this.promptInput.value.trim();
        if (!prompt) {
            alert('Sila masukkan topik penulisan');
            return;
        }

        this.loadingIndicator.classList.remove('hidden');
        this.output.innerHTML = '';
        this.showProgressIndicator();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

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

            const data = await response.json();
            const formattedContent = this.formatContent(data.choices[0].message.content);
            this.output.innerHTML = formattedContent;
            this.copyButton.style.display = 'flex';
        } catch (error) {
            this.output.innerHTML = `Ralat: ${error.message === 'The operation was aborted' ? 
                'Masa menunggu telah tamat. Sila cuba lagi.' : error.message}`;
            this.copyButton.style.display = 'none';
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
        const content = this.output.textContent;
        if (!content) return;

        try {
            await navigator.clipboard.writeText(content);
            
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

        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Tidak dapat menyalin teks. Sila cuba lagi.');
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