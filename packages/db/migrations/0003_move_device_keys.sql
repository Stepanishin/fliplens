-- Every existing anonymous user keeps their device: copy users.device_key into user_devices.
INSERT INTO "user_devices" ("device_key", "user_id", "created_at", "last_seen_at")
SELECT "device_key", "id", "created_at", "last_seen_at" FROM "users"
ON CONFLICT ("device_key") DO NOTHING;
