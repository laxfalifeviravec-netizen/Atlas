/* Shared upload helpers. Hosting rejects requests over ~4.5 MB, so photos are shrunk
   on the phone first and videos go straight to storage instead of through the server. */
(function () {
  const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3001' : '';

  window.isVideoFile = f => !!f && (((f.type || '').startsWith('video/')) || /\.(mp4|mov|m4v|webm)$/i.test(f.name || ''));

  window.shrinkImage = function (file, maxDim = 2048, quality = 0.85) {
    return new Promise(resolve => {
      if (!file || !(file.type || '').startsWith('image/') || file.type === 'image/gif' || (file.size < 500 * 1024 && maxDim >= 2048)) return resolve(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => {
          if (!blob || blob.size >= file.size) return resolve(file);
          resolve(new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };
  // Shrinks a set of photos so the whole request stays under the hosting limit,
  // stepping down size and quality only as far as needed.
  window.shrinkImages = async function (files, budget = 4 * 1024 * 1024) {
    const steps = [[2048, 0.85], [1600, 0.8], [1280, 0.75], [1080, 0.7], [900, 0.65]];
    let out = files;
    for (const [dim, q] of steps) {
      out = await Promise.all(files.map(f => window.shrinkImage(f, dim, q)));
      if (out.reduce((n, f) => n + f.size, 0) <= budget) return out;
    }
    return out;
  };

  // Turns a non-JSON hosting error (like a 413 page) into a readable message.
  window.readUploadResponse = async function (res) {
    const text = await res.text();
    try { return JSON.parse(text); } catch {}
    if (res.status === 413) return { error: 'Those files are too large to upload together. Try fewer photos.' };
    return { error: 'Upload failed. Check your connection and try again.' };
  };

  function xhr(method, url, body, headers, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open(method, url);
      Object.entries(headers || {}).forEach(([k, v]) => x.setRequestHeader(k, v));
      if (onProgress && x.upload) x.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      x.onload = () => resolve({ status: x.status, text: x.responseText });
      x.onerror = () => reject(new Error('Network error during upload. Check your connection and try again.'));
      x.send(body);
    });
  }
  
  // Uploads a video straight to storage, then creates the post (rollers and video posts).
  window.uploadVideo = async function (file, caption, token, onProgress) {
    const ur = await fetch(`${API}/api/reels/upload-url`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size }) });
    const info = await ur.json();
    if (!ur.ok) throw new Error(info.error || 'Could not start the upload.');
  
    if (info.mode === 'signed') {
      const fd = new FormData();
      fd.append('cacheControl', '3600');
      fd.append('', file);
      // Newer Supabase "publishable" keys (sb_publishable_...) are not JWTs and must not be sent as a Bearer token
      const keyHeaders = { apikey: info.anonKey, 'x-upsert': 'false' };
      if (!info.anonKey.startsWith('sb_')) keyHeaders.Authorization = `Bearer ${info.anonKey}`;
      const up = await xhr('PUT', info.signedUrl, fd, keyHeaders, onProgress);
      if (up.status < 200 || up.status >= 300) throw new Error(up.status === 413 ? 'That video is too large for storage. Try a shorter or smaller clip.' : 'The upload was rejected. Please try again.');
      const res = await fetch(`${API}/api/reels`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ video_path: info.path, caption }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not post the roller.');
      return d.reel;
    }
  
    const fd = new FormData();
    fd.append('video', file);
    fd.append('caption', caption);
    const up = await xhr('POST', `${API}/api/reels`, fd, { Authorization: `Bearer ${token}` }, onProgress);
    if (up.status === 413) throw new Error('That video is too large to upload right now.');
    let d = {};
    try { d = JSON.parse(up.text); } catch {}
    if (up.status < 200 || up.status >= 300) throw new Error(d.error || 'Could not post the roller.');
    return d.reel;
  };
})();
