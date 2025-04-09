/**
 * pwa.js
 * Modul pro integraci PWA funkcí
 */

class PWAManager {
    constructor() {
        // DOM elementy
        this.offlineIndicator = null;
        this.installButton = null;
        this.deferredPrompt = null;
        
        // Stav aplikace
        this.isInstalled = false;
        this.isOnline = navigator.onLine;
    }
    
    /**
     * Inicializace správce PWA
     */
    init() {
        this.createOfflineIndicator();
        this.setupEventListeners();
        this.checkAppInstalled();
        this.createInstallButton();
    }
    
    /**
     * Vytvoření offline indikátoru
     */
    createOfflineIndicator() {
        if (!this.offlineIndicator) {
            this.offlineIndicator = document.createElement('div');
            this.offlineIndicator.className = 'offline-indicator';
            this.offlineIndicator.textContent = 'Jste offline. Některé funkce mohou být nedostupné.';
            document.body.prepend(this.offlineIndicator);
            
            // Aktualizovat stav indikátoru
            this.updateOfflineIndicator();
        }
    }
    
    /**
     * Vytvoření tlačítka pro instalaci
     */
    createInstallButton() {
        if (!this.installButton && !this.isInstalled) {
            this.installButton = document.createElement('button');
            this.installButton.className = 'pwa-install-button';
            this.installButton.textContent = 'Nainstalovat aplikaci';
            this.installButton.style.display = 'none';
            
            this.installButton.addEventListener('click', () => this.installApp());
            
            document.body.appendChild(this.installButton);
        }
    }
    
    /**
     * Nastavení event listenerů
     */
    setupEventListeners() {
        // Online/offline události
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOfflineIndicator();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOfflineIndicator();
        });
        
        // Událost před instalací
        window.addEventListener('beforeinstallprompt', (event) => {
            // Zabránit automatickému zobrazení výzvy v prohlížeči
            event.preventDefault();
            
            // Uložit událost, abychom ji mohli vyvolat později
            this.deferredPrompt = event;
            
            // Zobrazit tlačítko pro instalaci
            if (this.installButton) {
                this.installButton.style.display = 'block';
            }
        });
        
        // Událost po instalaci
        window.addEventListener('appinstalled', () => {
            console.log('PWA byla úspěšně nainstalována');
            this.isInstalled = true;
            
            // Skrýt tlačítko pro instalaci
            if (this.installButton) {
                this.installButton.style.display = 'none';
            }
        });
    }
    
    /**
     * Aktualizace offline indikátoru
     */
    updateOfflineIndicator() {
        if (this.offlineIndicator) {
            if (this.isOnline) {
                this.offlineIndicator.classList.remove('visible');
            } else {
                this.offlineIndicator.classList.add('visible');
            }
        }
    }
    
    /**
     * Kontrola, zda je aplikace nainstalována
     */
    checkAppInstalled() {
        // Detekce, zda jsme v režimu standalone nebo fullscreen (PWA)
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.matchMedia('(display-mode: fullscreen)').matches || 
            window.navigator.standalone === true) {
            this.isInstalled = true;
        }
    }
    
    /**
     * Instalace aplikace
     */
    async installApp() {
        if (!this.deferredPrompt) return;
        
        // Zobrazit výzvu k instalaci
        this.deferredPrompt.prompt();
        
        // Počkat na odpověď uživatele
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`Uživatel ${outcome === 'accepted' ? 'přijal' : 'odmítl'} instalaci`);
        
        // Vyčistit uloženou událost
        this.deferredPrompt = null;
        
        // Skrýt tlačítko, ať už uživatel přijal nebo odmítl instalaci
        if (this.installButton) {
            this.installButton.style.display = 'none';
        }
    }
    
    /**
     * Registrace pro push notifikace
     * @returns {Promise<PushSubscription|null>} Promise, který se vyřeší se subscription objektem nebo null
     */
    async registerForPushNotifications() {
        try {
            // Kontrola, zda prohlížeč podporuje push notifikace
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('Push notifikace nejsou podporovány tímto prohlížečem');
                return null;
            }
            
            // Kontrola a případné vyžádání práv pro notifikace
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('Uživatel nepovolil notifikace');
                return null;
            }
            
            // Získání registrace Service Workeru
            const registration = await navigator.serviceWorker.ready;
            
            // Registrace pro push notifikace
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    // VAPID klíč je potřeba vygenerovat a použít váš vlastní
                    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
                )
            });
            
            console.log('Uživatel je registrován pro push notifikace');
            return subscription;
        } catch (error) {
            console.error('Chyba při registraci push notifikací:', error);
            return null;
        }
    }
    
    /**
     * Konverze Base64 URL na Uint8Array
     * @param {string} base64String Base64 řetězec
     * @returns {Uint8Array} Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
            
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
}

// Vytvoření a export instance pro globální použití
const pwaManager = new PWAManager();
export default pwaManager;