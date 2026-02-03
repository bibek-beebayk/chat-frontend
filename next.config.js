const withPWA = require("@ducanh2912/next-pwa").default({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: false, // Enable in dev for testing
    workboxOptions: {
        disableDevLogs: true,
        importScripts: ['/firebase-messaging-sw.js'],
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
}

module.exports = withPWA(nextConfig);
