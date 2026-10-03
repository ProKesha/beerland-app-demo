# Loyalty

ClubCard and LoyaltyScreen read LoyaltyRepository through the account query hook. The account includes membership identifier, points, configurable tier progress and optional activity. Demo rules are illustrative configuration, not approved Beerland commercial policy; future server responses must be authoritative.

LoyaltyCode generates a real QR matrix with qrcode-generator and renders it with react-native-svg, including a four-module quiet zone. Its reusable value/size API does not require personal data. The demo payload contains only a membership identifier. A modal provides an enlarged code; no brightness control or checkout redemption is implemented. Tests decode the generated modules with jsQR.
