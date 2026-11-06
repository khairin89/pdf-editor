/**
 * About & licences: app credits plus every open-source notice bundled in the
 * app (generated into public/licenses.txt by `pnpm notices`).
 */

import { useEffect, useState, type JSX } from 'react';
import { Modal } from '../Modal';

declare const __APP_VERSION__: string;

export function AboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose(): void;
}): JSX.Element | null {
  const [notices, setNotices] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || notices !== null) return;
    let cancelled = false;
    fetch(new URL('licenses.txt', document.baseURI))
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((text) => !cancelled && setNotices(text))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, notices]);

  return (
    <Modal title="About & licences" open={open} onClose={onClose}>
      <div className="about-dialog">
        <p>
          <strong>KertPDF</strong> v{__APP_VERSION__}
        </p>
        <p className="muted small">
          Based on{' '}
          <a href="https://github.com/vensas/pdf-editor" rel="noopener">
            PDF Editor
          </a>{' '}
          by vensas GmbH, used under the MIT License. All processing happens locally via pdf-lib and
          pdf.js; your files never leave the device.
        </p>
        <h3 className="about-heading">Open-source notices</h3>
        {failed ? (
          <p className="muted small">The licence notices could not be loaded.</p>
        ) : notices === null ? (
          <p className="muted small">Loading…</p>
        ) : (
          <pre className="about-notices" aria-label="Open-source notices">
            {notices}
          </pre>
        )}
      </div>
    </Modal>
  );
}
