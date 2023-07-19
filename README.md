# minecraft-ping

## Minecraft server ping utility

Based on https://www.npmjs.com/package/minecraft-pinger javascript version.

Hostname & Port object and URL can be provided as direct value, with Promise or callback function (sync or async).

```javascript
const data = await ping(); // localhost:25565
```

```javascript
const data = await ping(Promise.resolve({hostname: 'eu.mineplex.com'}));
```

```javascript
const data = await ping(() => {hostname: 'eu.mineplex.com', port: 25565});
```

```javascript
const data = await ping(() => Promise.resolve({hostname: 'eu.mineplex.com', port: 25565}), {timeout: 100}); // timeout 100ms
```

```javascript
const data = await pingUri('minecraft://eu.mineplex.com');
```

```javascript
const data = await pingUri(new URL('minecraft://eu.mineplex.com:25565'));
```

or using Result

```typescript
const result: Result<IMinecraftData, Error> = await pingUriResult('minecraft://eu.mineplex.com'); // or pingResult({server: 'eu.mineplex.com', port: 25565})
// with logic
if (result.isOk) {
	console.log(result.ok()); // IMinecraftData
} else {
	console.log(result.err().message); // Error message
}
// or with throw
const data: IMinecraftData = result.unwrap(); // throws error if Result is Error
```
