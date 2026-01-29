-- Make keys nullable to support Native Push (FCM) which doesn't use VAPID keys
ALTER TABLE push_subscriptions ALTER COLUMN keys DROP NOT NULL;
