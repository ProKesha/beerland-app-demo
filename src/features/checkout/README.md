# Checkout

`CheckoutScreen` composes the validated fulfillment, address, contact, payment-placeholder and age-confirmation sections. `useCheckoutFlow` owns the form and safe error/retry behavior; it reuses `useCartQuote` and `useCreateOrder` for revalidation and idempotent local mock creation.

Contact drafts and addresses live behind the validated local stores. Owner-specific form state resets on an identity change. No payment is processed or store order dispatched. See [integration readiness](../../../docs/integration-readiness.md) for the real quote/order/address boundaries and [the Phase 10 report](../../../docs/phase-10-verification.md) for verification gaps.
