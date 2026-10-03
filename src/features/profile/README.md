# Profile

Phase 8 account screens use injected user, loyalty and order repositories through query hooks. Profile counts derive from repository results and the existing favorites/address stores. Secondary query failures retain the rest of the profile.

Personal data reuses Checkout's customer schema and phone normalization. The local user adapter persists validated fields, recovers malformed local records without inventing an identity, and exposes storage failures for retry. AccountPage gates interactions until persistence hydration and provides safe-area, keyboard and back-navigation behavior.

Addresses reuse Checkout AddressBook and its persisted store, including confirmed deletion and default selection. Notification preferences persist locally; no push permission is requested. Support and legal actions remain disabled until approved contacts/URLs are configured in customerSupport.
