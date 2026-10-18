import { defineConfig } from 'vite';
import https from 'https';
import http from 'http';
import CryptoJS from 'crypto-js';

function decryptMediaUrl(enc) {
  if (!enc) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse('38346581');
    const decrypted = CryptoJS.DES.decrypt({
      ciphertext: CryptoJS.enc.Base64.parse(enc)
    }, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    const url = decrypted.toString(CryptoJS.enc.Utf8);
    if (!url || !url.startsWith('http')) return null;
    return url.replace(/_96\./, '_320.').replace(/_48\./, '_320.');
  } catch (e) {
    return null;
  }
}

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    cors: true
  },
  plugins: [
    {
      name: 'resonix-audio-and-search-engine',
      configureServer(server) {
        // 1. Live Saavn Search with Full 320kbps Stream Decryption & Pagination
        server.middlewares.use('/api/saavn-search', async (req, res) => {
          const urlParams = new URL(req.url, 'http://localhost:5173');
          const query = urlParams.searchParams.get('q');
          const limit = parseInt(urlParams.searchParams.get('n') || '25', 10);
          const page = parseInt(urlParams.searchParams.get('p') || '1', 10);

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');

          if (!query || query.trim().length < 2) {
            res.end(JSON.stringify({ results: [] }));
            return;
          }

          const saavnUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&p=${page}&q=${encodeURIComponent(query.trim())}`;

          https.get(saavnUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://www.jiosaavn.com/'
            }
          }, (apiRes) => {
            let data = '';
            apiRes.on('data', d => data += d);
            apiRes.on('end', () => {
              try {
                const json = JSON.parse(data);
                const rawResults = json.results || [];
                const formatted = rawResults.map((r, idx) => {
                  const rawTitle = (r.title || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
                  const rawArtist = (r.more_info?.singers || r.description || 'Popular Artist')
                    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');

                  const encUrl = r.more_info?.encrypted_media_url;
                  const fullStreamUrl = decryptMediaUrl(encUrl) || r.more_info?.vlink;
                  const lang = (r.more_info?.language || 'hindi').toLowerCase();
                  const langCode = lang.includes('telugu') ? 'te' : lang.includes('tamil') ? 'ta' : lang.includes('english') ? 'en' : 'hi';

                  return {
                    id: 80000 + page * 1000 + idx,
                    title: rawTitle,
                    artist: rawArtist,
                    album: (r.album || rawTitle).replace(/&quot;/g, '"'),
                    language: langCode,
                    language_label: lang.toUpperCase(),
                    genre: `${lang.toUpperCase()} Commercial Hit`,
                    duration_seconds: parseInt(r.more_info?.duration, 10) || 240,
                    sample_rate: 44100,
                    bit_depth: 16,
                    format: 'AAC 320k Full Master',
                    is_native_hires: false,
                    source_platform: 'JioSaavn 320k REA',
                    image: r.image ? r.image.replace('150x150', '500x500') : null,
                    stream_url: fullStreamUrl,
                    features: {
                      tempo_bpm: 112,
                      energy: 0.78,
                      spectral_centroid: 3300,
                      danceability: 0.68,
                      valence: 0.62,
                      acousticness: 0.38,
                      dynamic_range_dr: 13.5
                    }
                  };
                });
                res.end(JSON.stringify({ results: formatted, total: json.total || formatted.length }));
              } catch (err) {
                res.end(JSON.stringify({ error: err.message, results: [] }));
              }
            });
          }).on('error', (err) => {
            res.end(JSON.stringify({ error: err.message, results: [] }));
          });
        });

        // 2. Audius Global Decentralized Trending Tracks
        server.middlewares.use('/api/audius-trending', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json');

          const audiusUrl = 'https://discoveryprovider.audius.co/v1/tracks/trending?app_name=RESONIX&limit=25';
          https.get(audiusUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (apiRes) => {
            let data = '';
            apiRes.on('data', d => data += d);
            apiRes.on('end', () => {
              try {
                const json = JSON.parse(data);
                const list = (json.data || []).map((t, idx) => ({
                  id: 90000 + idx,
                  title: t.title,
                  artist: t.user?.name || 'Audius Creator',
                  album: t.genre || 'Electronic / Indie Global',
                  language: 'en',
                  language_label: 'GLOBAL',
                  genre: t.genre || 'Global Pop / EDM',
                  duration_seconds: t.duration || 210,
                  sample_rate: 44100,
                  bit_depth: 16,
                  format: 'MP3 320k Lossless',
                  is_native_hires: false,
                  source_platform: 'Audius Global Protocol',
                  image: t.artwork ? (t.artwork['480x480'] || t.artwork['150x150']) : null,
                  stream_url: `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=RESONIX`,
                  features: {
                    tempo_bpm: 124,
                    energy: 0.82,
                    spectral_centroid: 3500,
                    danceability: 0.78,
                    valence: 0.68,
                    acousticness: 0.25,
                    dynamic_range_dr: 14.0
                  }
                }));
                res.end(JSON.stringify({ results: list }));
              } catch (err) {
                res.end(JSON.stringify({ error: err.message, results: [] }));
              }
            });
          }).on('error', (err) => {
            res.end(JSON.stringify({ error: err.message, results: [] }));
          });
        });

        // 3. Audio CORS Proxy for Remote CDNs
        server.middlewares.use('/api/proxy-stream', (req, res) => {
          const urlParams = new URL(req.url, 'http://localhost:5173');
          const targetUrl = urlParams.searchParams.get('url');

          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }

          try {
            const client = targetUrl.startsWith('https') ? https : http;
            client.get(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.jiosaavn.com/'
              }
            }, (proxyRes) => {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', '*');
              res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'audio/mp4');
              if (proxyRes.headers['content-length']) {
                res.setHeader('Content-Length', proxyRes.headers['content-length']);
              }
              if (proxyRes.headers['accept-ranges']) {
                res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
              }
              proxyRes.pipe(res);
            }).on('error', (err) => {
              res.statusCode = 502;
              res.end('Proxy error: ' + err.message);
            });
          } catch (e) {
            res.statusCode = 500;
            res.end('Internal error: ' + e.message);
          }
        });
      }
    }
  ]
});
