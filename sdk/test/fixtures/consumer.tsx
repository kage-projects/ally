import { useState } from 'react';
import { AllyProvider, useAlly } from '@ally/react';
import type { AllyPolicy } from '@ally/react';
import { DEFAULT_POLICY } from '@ally/react/core';

const steps = ['cart', 'shipping', 'payment'] as const;
type Step = (typeof steps)[number];

function CheckoutForm() {
  const ally = useAlly();
  const [step, setStep] = useState<Step>('cart');

  function goTo(next: Step) {
    ally.reportStep(next);
    setStep(next);
  }

  return <form>
    <output data-test-status="">{ally.status}</output>
    <output data-test-summary="">{ally.summary
      ? `${ally.summary.context.step}:${ally.summary.counts.errorLoop}` : ''}</output>
    <section data-ally-step="cart" hidden={step !== 'cart'}>
      <strong data-ally-slot="price">Rp 90.000</strong>
      <aside data-ally-optional="promoBanner">Promo fixture</aside>
      <button type="button" data-ally-slot="primaryAction"
        style={{ minWidth: 'var(--ally-target)', minHeight: 'var(--ally-target)' }}
        onClick={() => goTo('shipping')}>Continue</button>
    </section>
    <section data-ally-step="shipping" hidden={step !== 'shipping'}>
      <label htmlFor="ally-fixture-email">Email SENTINEL_TEXT_DO_NOT_SEND</label>
      <input id="ally-fixture-email" name="email" defaultValue="SENTINEL_VALUE_DO_NOT_SEND"
        onBlur={() => ally.reportError({ field: 'email', category: 'required' })} />
      <aside data-ally-optional="recommendations">Suggested items</aside>
      <button type="button" data-ally-slot="primaryAction"
        style={{ minWidth: 'var(--ally-target)', minHeight: 'var(--ally-target)' }}
        onClick={() => goTo('payment')}>Continue</button>
    </section>
    <section data-ally-step="payment" hidden={step !== 'payment'}>
      <strong data-ally-slot="totalAmount">Rp 90.000</strong>
      <p data-ally-slot="legalText">Payment terms</p>
      <button type="button" data-ally-slot="payButton"
        style={{ minWidth: 'var(--ally-target)', minHeight: 'var(--ally-target)' }}>Pay</button>
    </section>
    <button type="button" onClick={() => ally.resetPreferences()}>Reset Ally preferences</button>
  </form>;
}

export function ConsumerFixture({ policy = DEFAULT_POLICY }: { policy?: AllyPolicy }) {
  return <AllyProvider policy={policy} config={{ steps: [...steps],
    allowedFields: ['email'], errorCategories: ['required'], persistence: 'memory' }}>
    <CheckoutForm />
  </AllyProvider>;
}
