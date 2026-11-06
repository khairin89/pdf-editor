// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const { save, writeFile } = vi.hoisted(() => ({ save: vi.fn(), writeFile: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile }));

import { downloadPdf, isTauri, safeBaseName } from '../src/export/download';

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'];
  vi.clearAllMocks();
});

describe('download', () => {
  it('detects the browser by default', () => {
    expect(isTauri()).toBe(false);
  });

  it('uses an anchor download in the browser', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => 'blob:x');
    downloadPdf(new Uint8Array([1, 2]), 'a.pdf');
    expect(click).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('uses the native save dialog inside Tauri', async () => {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
    save.mockResolvedValue('content://downloads/a.pdf');
    await downloadPdf(new Uint8Array([1, 2, 3]), 'a.pdf');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: 'a.pdf' }));
    expect(writeFile).toHaveBeenCalledWith('content://downloads/a.pdf', new Uint8Array([1, 2, 3]));
  });

  it('writes nothing when the save dialog is cancelled', async () => {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
    save.mockResolvedValue(null);
    await downloadPdf(new Uint8Array([1]), 'a.pdf');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('rejects when the native write fails', async () => {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
    save.mockResolvedValue('content://x/a.pdf');
    writeFile.mockRejectedValue('denied');
    await expect(downloadPdf(new Uint8Array([1]), 'a.pdf')).rejects.toThrow(
      'Could not save a.pdf: denied',
    );
  });

  it('sanitises base names', () => {
    expect(safeBaseName('a/b.pdf')).toBe('a_b');
  });
});
