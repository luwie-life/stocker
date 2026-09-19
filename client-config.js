// Set this to the deployed API origin, including /api.
// Example: https://api.example.com/api
window.STOCKER_API_BASE = 'https://stocker-i6x4.onrender.com/api';

if ('serviceWorker' in navigator && location.protocol === 'https:') {
	window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
