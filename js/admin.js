// js/admin.js - Gestion des opérations d'écriture
class AdminManager {
    constructor() {
        this.dataUrl = 'data/donnees.json';
        this.backupUrl = 'data/enregistrement.json';
        this.apiUrl = 'api/update.php'; // Optionnel pour serveur
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadDashboard();
    }

    async saveData(data) {
        try {
            // Pour un environnement local, nous ne pouvons pas écrire directement dans le fichier
            // Solution 1: Utiliser un script PHP (recommandé)
            // Solution 2: Télécharger le fichier JSON (fallback)
            
            if (typeof phpSaveAvailable !== 'undefined') {
                // Méthode avec PHP
                return await this.saveViaPHP(data);
            } else {
                // Méthode de fallback: Télécharger le fichier
                this.downloadJSON(data);
                return true;
            }
            
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            return false;
        }
    }

    async saveViaPHP(data) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        formData.append('action', 'save');
        
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            body: formData
        });
        
        return response.ok;
    }

    downloadJSON(data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `donnees-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        // Informer l'utilisateur
        alert('Fichier JSON téléchargé. Veuillez le remplacer dans le dossier /data/');
    }

    async addVehicule(vehiculeData) {
        const data = await dataManager.refresh();
        const newId = Math.max(...data.vehicules.map(v => v.id), 0) + 1;
        
        const newVehicule = {
            id: newId,
            ...vehiculeData,
            disponible: true,
            createdAt: new Date().toISOString()
        };
        
        data.vehicules.push(newVehicule);
        data.lastUpdate = new Date().toISOString();
        
        const success = await this.saveData(data);
        if (success) {
            window.dispatchEvent(new Event('dataUpdated'));
        }
        return success;
    }

    async addResidence(residenceData) {
        const data = await dataManager.refresh();
        const newId = Math.max(...data.residences.map(r => r.id), 0) + 1;
        
        const newResidence = {
            id: newId,
            categorie: "location",
            ...residenceData,
            disponible: true,
            createdAt: new Date().toISOString()
        };
        
        data.residences.push(newResidence);
        data.lastUpdate = new Date().toISOString();
        
        const success = await this.saveData(data);
        if (success) {
            window.dispatchEvent(new Event('dataUpdated'));
        }
        return success;
    }

    async updateItem(id, updatedData) {
        const data = await dataManager.refresh();
        let updated = false;
        
        // Chercher dans les véhicules
        const vehiculeIndex = data.vehicules.findIndex(v => v.id === id);
        if (vehiculeIndex !== -1) {
            data.vehicules[vehiculeIndex] = { 
                ...data.vehicules[vehiculeIndex], 
                ...updatedData 
            };
            updated = true;
        }
        
        // Chercher dans les résidences
        const residenceIndex = data.residences.findIndex(r => r.id === id);
        if (residenceIndex !== -1) {
            data.residences[residenceIndex] = { 
                ...data.residences[residenceIndex], 
                ...updatedData 
            };
            updated = true;
        }
        
        if (updated) {
            data.lastUpdate = new Date().toISOString();
            const success = await this.saveData(data);
            if (success) {
                window.dispatchEvent(new Event('dataUpdated'));
            }
            return success;
        }
        
        return false;
    }

    async deleteItem(id) {
        const data = await dataManager.refresh();
        
        const vehiculeIndex = data.vehicules.findIndex(v => v.id === id);
        if (vehiculeIndex !== -1) {
            data.vehicules.splice(vehiculeIndex, 1);
        } else {
            const residenceIndex = data.residences.findIndex(r => r.id === id);
            if (residenceIndex !== -1) {
                data.residences.splice(residenceIndex, 1);
            } else {
                return false;
            }
        }
        
        data.lastUpdate = new Date().toISOString();
        const success = await this.saveData(data);
        if (success) {
            window.dispatchEvent(new Event('dataUpdated'));
        }
        return success;
    }

    async addReservation(reservationData) {
        const data = await dataManager.refresh();
        const newId = Math.max(...data.reservations.map(r => r.id), 0) + 1;
        
        const newReservation = {
            id: newId,
            ...reservationData,
            dateReservation: new Date().toISOString(),
            statut: "en attente"
        };
        
        data.reservations.push(newReservation);
        data.lastUpdate = new Date().toISOString();
        
        const success = await this.saveData(data);
        if (success) {
            window.dispatchEvent(new Event('dataUpdated'));
        }
        return success;
    }

    async updateReservationStatus(id, statut) {
        const data = await dataManager.refresh();
        const reservation = data.reservations.find(r => r.id === id);
        
        if (reservation) {
            reservation.statut = statut;
            data.lastUpdate = new Date().toISOString();
            
            const success = await this.saveData(data);
            if (success) {
                window.dispatchEvent(new Event('dataUpdated'));
            }
            return success;
        }
        return false;
    }

    async updateSettings(settings) {
        const data = await dataManager.refresh();
        data.settings = { ...data.settings, ...settings };
        data.lastUpdate = new Date().toISOString();
        
        const success = await this.saveData(data);
        if (success) {
            window.dispatchEvent(new Event('dataUpdated'));
        }
        return success;
    }

    async exportData() {
        const data = await dataManager.refresh();
        this.downloadJSON(data);
        return true;
    }

    async importData(jsonFile) {
        try {
            const text = await jsonFile.text();
            const importedData = JSON.parse(text);
            
            // Validation basique
            if (!importedData.vehicules || !importedData.residences) {
                throw new Error('Format JSON invalide');
            }
            
            importedData.lastUpdate = new Date().toISOString();
            const success = await this.saveData(importedData);
            
            if (success) {
                window.dispatchEvent(new Event('dataUpdated'));
                return true;
            }
        } catch (error) {
            console.error('Erreur import:', error);
        }
        return false;
    }

    // Méthodes d'interface utilisateur
    setupNavigation() {
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                this.showSection(sectionId);
            });
        });
    }

    showSection(sectionId) {
        // Mettre à jour la navigation active
        document.querySelectorAll('.admin-menu a').forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === `#${sectionId}`) {
                a.classList.add('active');
            }
        });

        // Afficher la section
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
                this.currentSection = sectionId;
                this.loadSectionData(sectionId);
            }
        });
    }

    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'vehicules':
                this.loadVehiculesAdmin();
                break;
            case 'locations':
                this.loadLocationsAdmin();
                break;
            case 'residences':
                this.loadResidencesAdmin();
                break;
            case 'reservations':
                this.loadReservationsAdmin();
                break;
            case 'settings':
                this.loadSettingsAdmin();
                break;
        }
    }

    loadDashboard() {
        const stats = dataManager.getStats();
        
        // Mettre à jour les statistiques
        document.getElementById('count-admin-vehicules').textContent = stats.vehiculesVente;
        document.getElementById('count-admin-locations').textContent = stats.vehiculesLocation;
        document.getElementById('count-admin-residences').textContent = stats.totalResidences;
        document.getElementById('count-admin-reservations').textContent = stats.totalReservations;
        
        // Charger l'activité récente
        this.loadRecentActivity();
        
        // Mettre à jour la date
        const data = dataManager.data;
        if (data && data.lastUpdate) {
            document.getElementById('db-last-update').textContent = 
                new Date(data.lastUpdate).toLocaleString('fr-FR');
        }
    }

    loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;
        
        const allItems = dataManager.getAllItems();
        const recentItems = allItems
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 5);
        
        container.innerHTML = recentItems.map(item => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <h4>${item.titre}</h4>
                    <p class="recent-item-price">${formatPrice(item.prix, item.categorie === 'location')}</p>
                    <p class="recent-item-type">${item.localisation ? 'Résidence' : 'Véhicule'}</p>
                </div>
                <div class="recent-item-actions">
                    <span class="badge ${item.localisation ? 'residence' : 'vehicule'}">
                        ${item.localisation ? 'Résidence' : 'Véhicule'}
                    </span>
                    <button class="btn-outline-admin" onclick="adminManager.editItem(${item.id})">
                        Éditer
                    </button>
                </div>
            </div>
        `).join('');
    }

    loadVehiculesAdmin() {
        const container = document.getElementById('vehicules-list');
        if (!container) return;
        
        const vehicules = dataManager.getVehicules();
        
        container.innerHTML = vehicules.map(v => this.createAdminItemCard(v, 'véhicule')).join('');
    }

    loadLocationsAdmin() {
        const container = document.getElementById('locations-list');
        if (!container) return;
        
        const locations = dataManager.getLocations();
        
        container.innerHTML = locations.map(l => this.createAdminItemCard(l, 'location')).join('');
    }

    loadResidencesAdmin() {
        const container = document.getElementById('residences-list');
        if (!container) return;
        
        const residences = dataManager.getResidences();
        
        container.innerHTML = residences.map(r => this.createAdminItemCard(r, 'residence')).join('');
    }

    loadReservationsAdmin() {
        const container = document.getElementById('reservations-list');
        if (!container) return;
        
        const reservations = dataManager.getReservations();
        
        container.innerHTML = reservations.map(r => this.createAdminReservationCard(r)).join('');
    }

    loadSettingsAdmin() {
        const settings = dataManager.getSettings();
        
        // Remplir le formulaire des paramètres
        document.getElementById('settings-name').value = settings.name || '';
        document.getElementById('settings-description').value = settings.description || '';
        document.getElementById('settings-phone').value = settings.contactPhone || '';
        document.getElementById('settings-email').value = settings.contactEmail || '';
        
        if (settings.businessHours) {
            document.getElementById('settings-hours-weekday').value = settings.businessHours.weekday || '';
            document.getElementById('settings-hours-saturday').value = settings.businessHours.saturday || '';
        }
    }

    createAdminItemCard(item, type) {
        const isResidence = type === 'residence';
        
        return `
            <div class="item-card" style="margin-bottom: 15px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="${item.image || (isResidence ? 'images/default-house.jpg' : 'images/default-car.jpg')}" 
                         style="width: 100px; height: 70px; object-fit: cover; border-radius: 4px;"
                         onerror="this.src='${isResidence ? 'images/default-house.jpg' : 'images/default-car.jpg'}'">
                    <div style="flex: 1;">
                        <h4>${item.titre || 'Sans titre'}</h4>
                        <p>${formatPrice(item.prix, item.categorie === 'location')}</p>
                        <p style="color: ${item.disponible ? '#2ecc71' : '#e74c3c'}; font-weight: 600;">
                            ${item.disponible ? 'Disponible' : 'Non disponible'}
                        </p>
                        ${isResidence ? 
                            `<p><i class="fas fa-map-marker-alt"></i> ${item.localisation || 'Non spécifiée'}</p>` :
                            `<p><i class="fas fa-car"></i> ${item.type || 'Non spécifié'}</p>`
                        }
                    </div>
                    <div class="item-actions-admin">
                        <button class="btn-admin btn-edit" onclick="adminManager.editItem(${item.id})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-admin btn-delete" onclick="adminManager.deleteItem(${item.id})">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                        <button class="btn-admin btn-status" onclick="adminManager.toggleDisponible(${item.id})">
                            ${item.disponible ? 'Indisponible' : 'Disponible'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createAdminReservationCard(reservation) {
        const item = dataManager.getItemById(reservation.itemId);
        
        return `
            <div class="reservation-item ${reservation.statut || 'pending'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <h4>${item ? item.titre : 'Item non trouvé'}</h4>
                        <p><strong>Client:</strong> ${reservation.nom} (${reservation.email})</p>
                        <p><strong>Téléphone:</strong> ${reservation.telephone}</p>
                        <p><strong>Date souhaitée:</strong> ${new Date(reservation.date).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Statut:</strong> 
                            <span class="badge ${reservation.statut}">${reservation.statut || 'En attente'}</span>
                        </p>
                        ${reservation.message ? `<p><strong>Message:</strong> ${reservation.message}</p>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px; flex-direction: column;">
                        <button class="btn btn-small" onclick="adminManager.updateReservationStatus(${reservation.id}, 'confirmée')">
                            Confirmer
                        </button>
                        <button class="btn btn-small btn-danger" onclick="adminManager.updateReservationStatus(${reservation.id}, 'annulée')">
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Boutons d'ajout
        document.getElementById('add-vehicule-btn')?.addEventListener('click', () => {
            this.openItemModal('vehicule', 'vente');
        });
        
        document.getElementById('add-location-btn')?.addEventListener('click', () => {
            this.openItemModal('vehicule', 'location');
        });
        
        document.getElementById('add-residence-btn')?.addEventListener('click', () => {
            this.openItemModal('residence', 'location');
        });
        
        // Formulaire de paramètres
        document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const settings = {
                name: document.getElementById('settings-name').value,
                description: document.getElementById('settings-description').value,
                contactPhone: document.getElementById('settings-phone').value,
                contactEmail: document.getElementById('settings-email').value,
                businessHours: {
                    weekday: document.getElementById('settings-hours-weekday').value,
                    saturday: document.getElementById('settings-hours-saturday').value,
                    sunday: "Dimanche: Fermé"
                }
            };
            
            const success = await this.updateSettings(settings);
            if (success) {
                alert('Paramètres mis à jour avec succès!');
            }
        });
        
        // Export/Import
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-btn')?.addEventListener('click', () => this.importFile());
    }

    importFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file && confirm('Attention ! L\'importation remplacera toutes les données actuelles. Continuer ?')) {
                const success = await this.importData(file);
                if (success) {
                    alert('Données importées avec succès!');
                    this.loadDashboard();
                } else {
                    alert('Erreur lors de l\'importation');
                }
            }
        };
        
        input.click();
    }
}

// Initialiser l'admin
let adminManager;

document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
    window.adminManager = adminManager;
    
    // Écouter les mises à jour
    window.addEventListener('dataUpdated', () => {
        adminManager.loadDashboard();
        adminManager.loadSectionData(adminManager.currentSection);
    });
});