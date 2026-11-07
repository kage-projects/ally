'use client';

export function WhyPanel({ id, explanation }: { id: string; explanation: string }) {
  return <section className="ally-why" data-ally-ui="" id={id} aria-label="Alasan penyesuaian">
    <p>{explanation}</p>
  </section>;
}
