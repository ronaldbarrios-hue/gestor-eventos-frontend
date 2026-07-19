import { useEffect, useState, useCallback } from 'react';
import { pushApi } from '../api/push.js';

/* Hook para web push:
   - supported: el browser tiene Notification + PushManager + ServiceWorker
   - permission: 'default' | 'granted' | 'denied'
   - subscribed: ya hay una PushSubscription registrada para este browser
   - subscribe/unsubscribe/test/disable: acciones
*/

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePush() {
  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  const [permission, setPermission] = useState(() => (supported ? Notification.permission : 'denied'));
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    if (!supported) return;
    setPermission(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setSubscribed(Boolean(sub));
    } catch { setSubscribed(false); }
  }, [supported]);

  useEffect(() => { refresh(); }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!supported) throw new Error('Tu navegador no soporta notificaciones push.');
    setWorking(true);
    try {
      /* Registrá el SW si no está */
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      /* Pedimos permiso */
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Permiso de notificaciones rechazado.');

      /* VAPID public desde el backend */
      const { key } = await pushApi.vapidKey();
      if (!key) throw new Error('Servidor sin VAPID key configurada.');

      /* Subscribe */
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }

      /* Guardar en backend */
      const json = sub.toJSON();
      await pushApi.subscribe({
        endpoint: json.endpoint,
        keys    : json.keys,
        user_agent: navigator.userAgent.slice(0, 200),
      });
      setSubscribed(true);
    } finally { setWorking(false); }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await pushApi.unsubscribe(endpoint).catch(() => {});
      }
      setSubscribed(false);
    } finally { setWorking(false); }
  }, []);

  const test = useCallback(async () => {
    setWorking(true);
    try { return await pushApi.test(); }
    finally { setWorking(false); }
  }, []);

  return { supported, permission, subscribed, working, subscribe, unsubscribe, test, refresh };
}
