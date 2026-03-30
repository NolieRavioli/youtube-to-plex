---
title: MQTT / Home Assistant
parent: Integrations
nav_order: 4
---

# MQTT / Home Assistant Integration

This integration publishes labeled playlists and albums to Home Assistant over MQTT.

{: .note }
This is a specialized feature for home automation workflows built around the labels assigned inside the app.

---

## Example Use Case

Imagine you want your smart home to play a random jazz playlist.

With this integration you can:

1. Label several playlists with the category `Jazz`
2. Publish those items to Home Assistant as sensors
3. Expose all labels through a categories sensor
4. Let an automation choose one of the matching Plex items

---

## Prerequisites

1. A running MQTT broker such as Mosquitto
2. Home Assistant with MQTT configured
3. Playlists or albums with labels assigned in the app

---

## Configuration

### Step 1: Add Environment Variables

```sh
-e MQTT_BROKER_URL=mqtt://192.168.1.100:1883
-e MQTT_USERNAME=your_mqtt_username
-e MQTT_PASSWORD=your_mqtt_password
```

Or in Docker Compose:

```yaml
environment:
  - MQTT_BROKER_URL=mqtt://192.168.1.100:1883
  - MQTT_USERNAME=your_mqtt_username
  - MQTT_PASSWORD=your_mqtt_password
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MQTT_BROKER_URL` | Yes | - | MQTT broker URL |
| `MQTT_USERNAME` | No | - | MQTT username |
| `MQTT_PASSWORD` | No | - | MQTT password |
| `MQTT_TOPIC_PREFIX` | No | `youtube_music_to_plex` | Prefix for published topics |
| `MQTT_DRY_RUN` | No | `false` | Write a manifest without publishing |

### Step 2: Assign Labels

In the web interface:

1. Go to **Saved Items**
2. Select one or more playlists or albums
3. Assign a label

{: .important }
Only items with labels are published to MQTT.

---

## Published Topics

With the default topic prefix, messages are published to:

| Topic | Purpose |
|-------|---------|
| `homeassistant/sensor/{entity_id}/config` | Home Assistant discovery config |
| `youtube_music_to_plex/items/{item_id}/state` | Entity state and attributes |
| `homeassistant/sensor/youtube_music_to_plex_categories/config` | Categories discovery config |
| `youtube_music_to_plex/categories/state` | Categories list |

---

## Manual Sync

Trigger MQTT publishing manually:

```text
http://[IP-ADDRESS]:9030/api/sync/mqtt
```

---

## Dry Run Mode

Set:

```sh
-e MQTT_DRY_RUN=true
```

This writes `/app/config/mqtt_dry_run_manifest.json` so you can inspect the entity and topic layout before publishing to the broker.
