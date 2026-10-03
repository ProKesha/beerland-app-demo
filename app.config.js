/** Build-time guard; client configuration also fails closed for these modes. */
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_APP_ENV === 'production') {
    throw new Error(
      'Production builds are blocked until real Beerland repositories, authentication and approved app identifiers are implemented. Use the demo profile for frontend review.',
    );
  }
  const iosId = process.env.BEERLAND_IOS_BUNDLE_ID;
  const androidId = process.env.BEERLAND_ANDROID_PACKAGE;
  const validId = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
  if ([iosId, androidId].some((id) => id && !validId.test(id)))
    throw new Error(
      'App identifiers must be approved reverse-domain identifiers.',
    );
  return {
    ...config,
    ios: { ...config.ios, ...(iosId ? { bundleIdentifier: iosId } : {}) },
    android: {
      ...config.android,
      ...(androidId ? { package: androidId } : {}),
    },
  };
};
