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
const data = await ping('eu.mineplex.com', 25565, {timeout: 100}); // timeout 100ms
```

```javascript
const data = await pingUri('minecraft://eu.mineplex.com');
```

```javascript
const data = await pingUri('minecraft://eu.mineplex.com:25565');
```

or using Result
```typescript
const result: Result<IMinecraftData> = await pingUriResult('minecraft://eu.mineplex.com'); // or pingResult('eu.mineplex.com', 25565)
// with logic
if (result.isOk()) {
    console.log(result.Ok()); // IMinecraftData
} else {
    console.log(result.Err()?.message); // Error message
}
// or with throw
const data: IMinecraftData = result.unwrap(); // throws error if Result is Error
```