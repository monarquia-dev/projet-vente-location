// js/database.js - Gestion centralisée des données JSON
class DataManager {
    constructor() {
        this.data = null;
        this.dataUrl = 'data/donnees.json';
        this.init();
    }

    async init() {
        await this.loadData();
        
        // Écouter les mises à jour depuis l'admin
        window.addEventListener('dataUpdated', () => {
            this.loadData();
        });
    }

    async loadData() {
        try {
            const response = await fetch(this.dataUrl + '?t=' + Date.now());
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            console.log('✅ Données chargées depuis', this.dataUrl);
            
            // Déclencher un événement pour informer les autres composants
            window.dispatchEvent(new CustomEvent('dataLoaded', {
                detail: { data: this.data }
            }));
            
        } catch (error) {
            console.error('❌ Erreur de chargement des données:', error);
            // Fallback aux données par défaut
            this.loadDefaultData();
        }
    }

    loadDefaultData() {
        this.data = {
            vehicules: [],
            residences: [],
            reservations: [],
            settings: {
                name: "GRÂCE AUTO SERVICE-CI-BKT",
                description: "Vente • Location • Assurance",
                contactPhone: "+225 0748735115",
                contactEmail: "graceautoservice88@gmail.com"
            },
            lastUpdate: new Date().toISOString()
        };
    }

    // Méthodes de lecture (pour toutes les pages)
    getVehicules() {
        return this.data?.vehicules?.filter(v => v.categorie === "vente") || [];
    }

    getLocations() {
        return this.data?.vehicules?.filter(v => v.categorie === "location") || [];
    }

    getResidences() {
        return this.data?.residences || [];
    }

    getAllItems() {
        return [...(this.data?.vehicules || []), ...(this.data?.residences || [])];
    }

    getItemById(id) {
        const allItems = this.getAllItems();
        return allItems.find(item => item.id === parseInt(id));
    }

    getReservations() {
        return this.data?.reservations || [];
    }

    getSettings() {
        return this.data?.settings || {};
    }

    getStats() {
        const vehicules = this.getVehicules();
        const locations = this.getLocations();
        const residences = this.getResidences();
        const reservations = this.getReservations();

        return {
            vehiculesVente: vehicules.length,
            vehiculesLocation: locations.length,
            totalResidences: residences.length,
            totalReservations: reservations.length,
            reservationsEnAttente: reservations.filter(r => r.statut === 'en attente').length,
            reservationsConfirmees: reservations.filter(r => r.statut === 'confirmée').length
        };
    }

    // Rafraîchir les données
    async refresh() {
        await this.loadData();
        return this.data;
    }
}

// Instance globale pour toutes les pages
const dataManager = new DataManager();

// Fonctions utilitaires globales
function formatPrice(price, isMonthly = false) {
    if (!price) return 'Prix sur demande';
    const formatted = new Intl.NumberFormat('fr-FR').format(price);
    return `${formatted} FCFA${isMonthly ? '/jour' : ''}`;
}

// Exporter pour utilisation globale
window.dataManager = dataManager;

window.formatPrice = formatPrice;
