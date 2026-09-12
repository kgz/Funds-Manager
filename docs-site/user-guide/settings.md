# Settings

Choose where Funds Manager stores your data and apply database schema updates.

Open **Settings** from the sidebar.

::: warning No login on this screen
Settings is not protected by a username or password inside the app. Anyone who can reach your Funds Manager instance can change the database connection. Run it on a trusted network, or put it behind your own access control if it is exposed.
:::

![Settings Data storage section with PostgreSQL connection fields and saved connections](/screenshots/settings/storage.png)

## Data storage

External **PostgreSQL** is the supported backend today. Connect to your own server (Docker, homelab, or managed cloud).

1. Pick a saved connection or enter host, port, database, username, and password.
2. Click **Test connection** to check credentials without switching.
3. Click **Save & connect** to store the connection and point the running app at it (no restart needed when connect succeeds).

- **Effect:** all screens read and write through the database you connect here. Statements, transactions, categories, and plans all live in that PostgreSQL database.

::: warning TO COME
**Local on this computer** (single SQLite file) is not available yet. Use PostgreSQL for now.
:::

## Saved connections

Save profiles for different databases (for example homelab vs laptop). Pick one to load its fields, then **Save & connect** to activate it.

## Database migrations

Schema updates for your selected connection are listed here. When migrations are pending, review them and click **Run pending migrations**, then **Save & connect** again.

![Settings Database migrations section showing all migrations applied](/screenshots/settings/migrations.png)

## Diagnostics

The **Diagnostics** section at the bottom shows config file path and which database the app is using at runtime (config file vs environment override).

## Related

- [Guide: Getting started](/guide/getting-started) - install and first run
- [Guide: Local development](/guide/local-development) - run the stack locally for development
