// Public base URL of the fysca server (no trailing slash). The pages fetch
// channel data from its keyless /public/s9_data endpoint, so this site can be
// hosted as plain static files (GitHub Pages) on its own domain.
window.FYSC_API_BASE = 'https://netherlands-apiprox-fyscs1-private44.tnstats.dev';
window.FYSC_DATA_URL = window.FYSC_API_BASE + '/public/s1_data';