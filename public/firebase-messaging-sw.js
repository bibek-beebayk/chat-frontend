importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase
// TODO: Replace with your project's config
const firebaseConfig = {
    apiKey: "AIzaSyBiRh7NVaLQmQjagl8WN9olD9nOMQbo37A",
    authDomain: "rollin-community.firebaseapp.com",
    projectId: "rollin-community",
    storageBucket: "rollin-community.firebasestorage.app",
    messagingSenderId: "195206028710",
    appId: "1:195206028710:web:679e28b5500192f4284367"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // console.log("Payload content:", JSON.stringify(payload));

    // We rely on the OS (iOS/Android) to handle the 'notification' payload automatically.
    // Manually calling showNotification() here causes DUPLICATE notifications.
    // So we do NOTHING here, just log it.

    /*
    if (payload.notification) {
        return; 
    }
    const notificationTitle = payload.data.title || 'New Message';
    const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon || '/logo.png',
        data: {
            link: payload.data.link || '/'
        }
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
    */
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.', event.notification);
    event.notification.close();

    const link = event.notification.data.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Check if there's already a tab open with this URL
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.includes(link) && 'focus' in client)
                    return client.focus();
            }
            if (clientList.length > 0 && 'focus' in clientList[0]) {
                // Focus existing tab and navigate? Or just open new?
                // Simplest: open new if not found, or focus any and navigate
                return clients.openWindow(link);
            }
            if (clients.openWindow)
                return clients.openWindow(link);
        })
    );
});
