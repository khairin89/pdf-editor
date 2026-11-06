/**
 * Download helpers. In the browser, downloads are plain object-URL anchors.
 * Inside the Tauri (Android) shell, anchor downloads do nothing, so the file
 * is written through the native "Save as…" dialog instead. Either way, files
 * are produced and saved locally — nothing ever leaves the machine.
 */

/** True when running inside the Tauri native shell. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Saves a blob. Resolves once the file is written (native) or the browser
 * download has been triggered; rejects if the native save fails so callers
 * can show the error instead of a false "saved" message.
 */
export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  if (isTauri()) {
    try {
      await saveWithNativeDialog(blob, fileName);
    } catch (error) {
      throw new Error(`Could not save ${fileName}: ${String(error)}`, { cause: error });
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function saveWithNativeDialog(blob: Blob, fileName: string): Promise<void> {
  const [{ save }, { writeFile }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ]);
  const extension = fileName.split('.').pop() ?? 'pdf';
  const path = await save({
    defaultPath: fileName,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  });
  if (path === null) return; // user cancelled
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

export function downloadPdf(bytes: Uint8Array, fileName: string): Promise<void> {
  return downloadBlob(new Blob([bytes.slice()], { type: 'application/pdf' }), fileName);
}

export function downloadZip(bytes: Uint8Array, fileName: string): Promise<void> {
  return downloadBlob(new Blob([bytes.slice()], { type: 'application/zip' }), fileName);
}

/** Strips the .pdf extension and unsafe filename characters. */
export function safeBaseName(fileName: string): string {
  const base = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  return base === '' ? 'document' : base;
}
