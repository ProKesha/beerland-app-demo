# Cart

Cart lines retain product, variant, store and requested quantity identities in the persisted Zustand cart. `useCartQuote` resolves current repository products and store offers; price and availability are never persisted in cart items. A missing price is marked as an incomplete subtotal instead of being silently treated as a free line. All unresolved availability, quantity, store or fulfillment issues block checkout.

The clear-cart action remains available while a nonempty cart loads or fails to quote; its confirmation clears persisted lines and the cart badge, and closes when the session owner changes.

Phase 8.5 transfer uses the shared store picker and `prepareCartTransfer`, then commits cart lines before selected store. See `docs/phase-8.5-verification.md` for recovery, regression coverage and device checks.
