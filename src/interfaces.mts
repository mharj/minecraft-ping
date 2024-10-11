/**
 * Object with hostname and port
 * @example
 * {hostname: 'localhost', port: 25565}
 */
export interface IAddress {
	/**
	 * Hostname of the server
	 */
	hostname: string;
	/**
	 * Port of the server
	 */
	port: number;
}

export interface IHandshakeDescriptionData extends Record<string, unknown> {
	text: string;
	extra?: {
		color: string;
		text: string;
		bold: boolean;
		strikethrough: boolean;
		extra: {
			color: string;
			text: string;
		}[];
	}[];
}

/**
 * Server handshake player data
 */
export interface IHandshakePlayerData extends Record<string, unknown> {
	online: number;
	max: number;
	sample?: {name: string; id: string}[];
}

/**
 * Server handshake JSON payload
 */
export interface IHandshakeData extends Record<string, unknown> {
	description: IHandshakeDescriptionData;
	players: IHandshakePlayerData;
	version: {name: string; protocol: number};
	ping: number;
	modinfo?: {type: string; modList: string[]};
	favicon?: string;
}

export interface IMinecraftData extends IHandshakeData {
	ping: number;
}
