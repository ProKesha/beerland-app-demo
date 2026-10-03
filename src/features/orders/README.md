# Orders

OrdersScreen loads the injected OrderRepository, sorted newest first. OrderCard, centralized status metadata and OrderDetailScreen display receipt snapshots, fulfillment/address, variants, payment state, totals and a non-live status timeline. Checkout-created receipts and seeded demo history share one repository and persist without replacing customer orders.

prepareReorder resolves current products, variants, store offers, prices and quantity limits, returning available/unavailable items, changed prices and store conflicts. useReorder shares centralized store/cart confirmation, guards repeated presses and rejects stale cart/store state during repository reads. Home and order details use this same hook. Historic prices never enter the cart.

Mock authentication and local orders are demonstration boundaries, not live backend transactions. See docs/phase-8-verification.md for verification and native gaps.
