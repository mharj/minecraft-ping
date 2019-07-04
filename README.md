# minecraft-ping
## Minecraft server ping utility

Based on https://www.npmjs.com/package/minecraft-pinger javascript version.

```javascript
const data = await ping(); // localhost:25565
```

```javascript
const data = await ping('eu.mineplex.com');
```

```javascript
const data = await ping('eu.mineplex.com', 25565);
```

```javascript
const data = await pingUri('minecraft://eu.mineplex.com');
```

```javascript
const data = await pingUri('minecraft://eu.mineplex.com:25565');
```