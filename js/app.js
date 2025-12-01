// ============================================
// ShoreSquad - JavaScript Application
// ============================================

// Configuration
const CONFIG = {
    API: {
        WEATHER: 'https://api.data.gov.sg/v1/environment/air-temperature',
        WEATHER_2HR: 'https://api.data.gov.sg/v1/environment/2-hour-weather-forecast',
        WEATHER_4DAY: 'https://api.data.gov.sg/v1/environment/4-day-weather-forecast',
    },
    MAP: {
        DEFAULT_LAT: 1.381497,
        DEFAULT_LNG: 103.955574,
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
                // Use default location (Pasir Ris, Singapore)
                appState.userLocation = {
                    lat: CONFIG.MAP.DEFAULT_LAT,
                    lng: CONFIG.MAP.DEFAULT_LNG,
                };
                console.log('📍 Using default location: Pasir Ris');
            }
        );
    }
}

// ============================================
// Weather Data - NEA API Integration
// ============================================

async function fetchWeatherData() {
    try {
        // Fetch current conditions and 4-day forecast from NEA API
        const currentResponse = await fetch(CONFIG.API.WEATHER_2HR);
        const forecastResponse = await fetch(CONFIG.API.WEATHER_4DAY);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Weather fetch failed');
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        displayWeatherForecast(currentData, forecastData);
        console.log('🌤️ Weather data fetched successfully');
    } catch (error) {
        console.error('Weather fetch error:', error);
        displayWeatherError();
    }
}

function displayWeatherForecast(currentData, forecastData) {
    const weatherData = document.getElementById('weatherData');
    
    try {
        // Extract 4-day forecast data
        const forecasts = forecastData.items[0].forecasts || [];
        
        let html = '<div class="forecast-grid">';
        
        // Display up to 4 days of forecast
        for (let i = 0; i < Math.min(4, forecasts.length); i++) {
            const forecast = forecasts[i];
            const date = new Date(forecast.date + 'T12:00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            // Map weather forecast text to emoji
            const emoji = getWeatherEmoji(forecast.forecast);
            
            html += `
                <div class="forecast-card">
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-date">${dateStr}</div>
                    <div class="forecast-icon">${emoji}</div>
                    <div class="forecast-text">${forecast.forecast}</div>
                    <div class="forecast-temp">
                        <span class="temp-label">Temp:</span>
                        <span class="temp-value">${forecast.temperature[0]}°C - ${forecast.temperature[1]}°C</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        weatherData.innerHTML = html;
    } catch (error) {
        console.error('Error parsing weather data:', error);
        displayWeatherError();
    }
}

function getWeatherEmoji(weatherText) {
    // Map NEA weather descriptions to emojis
    const text = weatherText.toLowerCase();
    
    if (text.includes('clear') || text.includes('sunny')) return '☀️';
    if (text.includes('partly cloudy')) return '⛅';
    if (text.includes('cloudy') || text.includes('overcast')) return '☁️';
    if (text.includes('rain') || text.includes('thunder')) return '🌧️';
    if (text.includes('storm')) return '⛈️';
    if (text.includes('wind')) return '💨';
    if (text.includes('fog') || text.includes('haze')) return '🌫️';
    
    return '🌤️'; // default
}

function displayWeatherError() {
    const weatherData = document.getElementById('weatherData');
    weatherData.innerHTML = `
        <div class="weather-error">
            <p>⚠️ Unable to load weather forecast</p>
            <p class="error-note">Please check your connection or try refreshing the page</p>
        </div>
    `;
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
