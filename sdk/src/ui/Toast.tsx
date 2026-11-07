'use client';

export function Toast({ visible, explanation }: { visible: boolean; explanation: string | null }) {
  return <div className="ally-toast" data-ally-ui="" role="status" aria-live="polite">
    {visible && explanation ? `Ally menyesuaikan tampilan. ${explanation}` : ''}
  </div>;
}
