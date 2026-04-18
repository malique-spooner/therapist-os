import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const pwaEnabled = process.env.ENABLE_PWA === 'true';

export default withPWA({
  dest: 'public',
  register: pwaEnabled,
  skipWaiting: true,
  disable: !pwaEnabled,
})(nextConfig);
