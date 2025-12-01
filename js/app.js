// ============================================
// ShoreSquad - JavaScript Application
// ============================================

// Configuration
const CONFIG = {
    API: {
        WEATHER: 'https://api.open-meteo.com/v1/forecast',
    },
    MAP: {
        DEFAULT_LAT: 34.0195,
        DEFAULT_LNG: -118.4912,
        ZOOM: 10,
    },
};

// State Management
const appState = {
    userLocation: null,
    crew: [],
    cleanups: [],
    userStats: {
        cleanupsJoined: 0,
        trashCollected: 0,
        pointsEarned: 0,
    },
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌊 ShoreSquad initialized');
    
    initializeApp();
});

async function initializeApp() {
    // Initialize map
    initializeMap();
    
    // Get user location
    getUserLocation();
    
    // Load saved data from localStorage
    loadUserData();
    
    // Fetch weather data
    fetchWeatherData();
    
    // Initialize event listeners
    setupEventListeners();
    
    // Render initial UI
    renderStats();
    renderCrewSection();
}

// ============================================
// Geolocation & Maps
// ============================================

function getUserLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                appState.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                console.log('📍 User location:', appState.userLocation);
                updateMapCenter();
            },
            (error) => {
                console.warn('Geolocation error:', error);
                // Use default location (Venice Beach)
                appState.userLocation = {
                    lat: CONFIG.MAP.DEFAULT_LAT,
                    lng: CONFIG.MAP.DEFAULT_LNG,
                };
            }
        );
    }
}

let map;

function initializeMap() {
    // Initialize Leaflet map
    const defaultLocation = [CONFIG.MAP.DEFAULT_LAT, CONFIG.MAP.DEFAULT_LNG];
    
    map = L.map('map').setView(defaultLocation, CONFIG.MAP.ZOOM);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);
    
    // Add markers for cleanups
    addCleanupMarkers();
    
    // Lazy load strategy: only fetch data when map is ready
    map.on('load', () => {
        console.log('🗺️ Map loaded');
    });
}

function updateMapCenter() {
    if (map && appState.userLocation) {
        const center = [appState.userLocation.lat, appState.userLocation.lng];
        map.setView(center, CONFIG.MAP.ZOOM);
        
        // Add user marker
        L.circleMarker(center, {
            radius: 8,
            fillColor: '#0066CC',
            color: '#00BCD4',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        })
        .bindPopup('📍 You are here')
        .addTo(map);
    }
}

function addCleanupMarkers() {
    // Sample cleanup locations
    const cleanups = [
        { name: 'Venice Beach', lat: 33.9850, lng: -118.4695 },
        { name: 'Santa Monica Pier', lat: 34.0089, lng: -118.4965 },
        { name: 'Malibu Beach', lat: 34.0295, lng: -118.6819 },
    ];
    
    cleanups.forEach((cleanup, index) => {
        const marker = L.marker([cleanup.lat, cleanup.lng])
            .bindPopup(`<strong>${cleanup.name}</strong><br>Click to join cleanup`)
            .addTo(map);
        
        // Add click handler for performance
        marker.on('click', () => handleCleanupMarkerClick(cleanup));
    });
}

function handleCleanupMarkerClick(cleanup) {
    console.log('Cleanup selected:', cleanup.name);
    // Highlight relevant cleanup in list
    const cards = document.querySelectorAll('.cleanup-card');
    cards.forEach(card => {
        if (card.querySelector('h3').textContent.includes(cleanup.name)) {
            card.scrollIntoView({ behavior: 'smooth' });
            card.style.boxShadow = '0 0 20px rgba(244, 208, 63, 0.8)';
            setTimeout(() => {
                card.style.boxShadow = '';
            }, 2000);
        }
    });
}

// ============================================
// Weather Data
// ============================================

async function fetchWeatherData() {
    try {
        // Use open-meteo free API (no key required)
        const lat = appState.userLocation?.lat || CONFIG.MAP.DEFAULT_LAT;
        const lng = appState.userLocation?.lng || CONFIG.MAP.DEFAULT_LNG;
        
        const url = `${CONFIG.API.WEATHER}?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather fetch failed');
        
        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        console.error('Weather fetch error:', error);
        displayWeatherError();
    }
}

function displayWeather(data) {
    const weatherData = document.getElementById('weatherData');
    const daily = data.daily;
    
    let html = '';
    for (let i = 0; i < 3; i++) {
        const date = new Date(daily.time[i]);
        const maxTemp = daily.temperature_2m_max[i];
        const minTemp = daily.temperature_2m_min[i];
        const precipitation = daily.precipitation_sum[i];
        
        html += `
            <div class="weather-item">
                <p><strong>${date.toLocaleDateString()}</strong></p>
                <p>🌡️ ${maxTemp}°C / ${minTemp}°C</p>
                <p>💧 ${precipitation}mm</p>
            </div>
        `;
    }
    
    weatherData.innerHTML = html;
}

function displayWeatherError() {
    const weatherData = document.getElementById('weatherData');
    weatherData.innerHTML = '<p>Unable to load weather data. Please try again later.</p>';
}

// ============================================
// Event Listeners & Interactions
// ============================================

function setupEventListeners() {
    // Join cleanup buttons
    const joinButtons = document.querySelectorAll('.join-btn');
    joinButtons.forEach(button => {
        button.addEventListener('click', (e) => handleJoinCleanup(e));
    });
    
    // Main CTA button
    const ctaButton = document.getElementById('joinBtn');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            document.getElementById('upcoming').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }
}

function handleJoinCleanup(event) {
    const card = event.target.closest('.cleanup-card');
    const cleanupName = card.querySelector('h3').textContent;
    
    // Add to crew (gamification)
    addCrewMember(cleanupName);
    
    // Update stats
    appState.userStats.cleanupsJoined += 1;
    appState.userStats.pointsEarned += 10;
    appState.userStats.trashCollected += Math.floor(Math.random() * 20) + 5;
    
    // Save state
    saveUserData();
    
    // Update UI
    renderStats();
    renderCrewSection();
    
    // Feedback
    event.target.textContent = '✓ Joined!';
    event.target.disabled = true;
    setTimeout(() => {
        event.target.textContent = 'Join Crew';
        event.target.disabled = false;
    }, 3000);
    
    console.log(`✅ Joined cleanup: ${cleanupName}`);
}

function addCrewMember(cleanupName) {
    // Simulated crew members
    const names = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    
    const member = {
        name: randomName,
        cleanup: cleanupName,
        joined: new Date().toLocaleDateString(),
    };
    
    if (!appState.crew.find(m => m.name === member.name)) {
        appState.crew.push(member);
    }
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const isExpanded = this.getAttribute('aria-expanded') === 'true';
    
    this.setAttribute('aria-expanded', !isExpanded);
    navLinks.style.display = isExpanded ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '100%';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'white';
    navLinks.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
}

// ============================================
// Rendering Functions
// ============================================

function renderStats() {
    document.getElementById('cleanups-count').textContent = appState.userStats.cleanupsJoined;
    document.getElementById('trash-collected').textContent = appState.userStats.trashCollected;
    document.getElementById('crew-size').textContent = appState.crew.length;
    document.getElementById('points-earned').textContent = appState.userStats.pointsEarned;
}

function renderCrewSection() {
    const crewList = document.getElementById('crewList');
    const noCrew = document.getElementById('no-crew-msg');
    
    if (appState.crew.length === 0) {
        crewList.innerHTML = '<p id="no-crew-msg">No crew members yet. Join a cleanup to start building your squad!</p>';
        return;
    }
    
    noCrew?.remove();
    
    const crewHTML = appState.crew.map(member => `
        <li class="crew-member" role="listitem">
            <h4>${member.name}</h4>
            <p>${member.cleanup}</p>
            <p style="font-size: 0.8rem; margin-top: 0.5rem;">${member.joined}</p>
        </li>
    `).join('');
    
    crewList.innerHTML = crewHTML;
}

// ============================================
// Data Persistence
// ============================================

function saveUserData() {
    try {
        localStorage.setItem('shoreSquadData', JSON.stringify(appState));
        console.log('💾 Data saved to localStorage');
    } catch (error) {
        console.warn('localStorage save error:', error);
    }
}

function loadUserData() {
    try {
        const saved = localStorage.getItem('shoreSquadData');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(appState, parsed);
            console.log('📂 Data loaded from localStorage');
        }
    } catch (error) {
        console.warn('localStorage load error:', error);
    }
}

// ============================================
// Performance Optimization
// ============================================

// Lazy load images using Intersection Observer
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(error => {
        console.log('Service Worker registration failed:', error);
    });
}

console.log('🚀 ShoreSquad ready to rally your crew!');
