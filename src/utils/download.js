export const _blobUrls = []; // track for cleanup

export function downloadBlob(blob, filename, onComplete) {
  const url = URL.createObjectURL(blob);
  _blobUrls.push(url);

  // Clean up old blob URLs (keep last 3, revoke anything older)
  while (_blobUrls.length > 3) {
    const old = _blobUrls.shift();
    try { URL.revokeObjectURL(old); } catch(e) {}
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Deferred cleanup — do NOT revoke quickly, give browser time
  setTimeout(function() {
    try { document.body.removeChild(a); } catch(e) {}
  }, 200);
  // Revoke after a long delay — browser needs the URL alive until download completes
  setTimeout(function() {
    try { URL.revokeObjectURL(url); } catch(e) {}
    const idx = _blobUrls.indexOf(url);
    if (idx >= 0) _blobUrls.splice(idx, 1);
  }, 60000);

  if (onComplete) onComplete();
}
