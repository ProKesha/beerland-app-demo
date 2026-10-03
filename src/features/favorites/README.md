# Favorites

FavoritesScreen uses the existing persisted favorites store shared by Catalog, Home and Product Detail. Products load through the injected ProductRepository and render with ProductCard. Current store offers govern add-to-cart; missing products remain removable. Empty, loading and retry states are provided without a second favorites store.
