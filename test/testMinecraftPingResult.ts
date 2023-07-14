/* eslint-disable no-unused-expressions */
import 'mocha';
import chai, {expect} from 'chai';
import {pingResult, pingUriResult} from '../src';
import chaiAsPromised from 'chai-as-promised';
import dotenv from 'dotenv';
import {IMinecraftData} from '../src/interfaces';
import {Result} from 'mharj-result';

dotenv.config();
const ifWeHaveEnv = process.env.MINECRAFT_SERVER && process.env.MINECRAFT_SERVER_PORT ? it : it.skip;
chai.use(chaiAsPromised);

describe('minecraft result', () => {
	ifWeHaveEnv('connect and get data', async function () {
		this.timeout(10000);
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const result: Result<IMinecraftData, Error> = await pingResult(MINECRAFT_SERVER, MINECRAFT_SERVER_PORT ? parseInt(MINECRAFT_SERVER_PORT, 10) : undefined);
		const data: IMinecraftData = result.unwrap();
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat', 'previewsChat');
		expect(data.description).to.have.all.keys('text', 'extra');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	ifWeHaveEnv('connect and get data with uri', async () => {
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const url = new URL('minecraft://' + MINECRAFT_SERVER + (MINECRAFT_SERVER_PORT ? ':' + parseInt(MINECRAFT_SERVER_PORT, 10) : ''));
		const result: Result<IMinecraftData, Error> = await pingUriResult(Promise.resolve(url));
		const data: IMinecraftData = result.unwrap();
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat', 'previewsChat');
		expect(data.description).to.have.all.keys('text', 'extra');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('should not connect', async () => {
		const res: Result<IMinecraftData, Error> = await pingResult('localhost', 26262);
		expect(res.isErr()).to.be.eq(true);
	}).timeout(5000);
	it('should not connect with small timeout', async () => {
		const res: Result<IMinecraftData, Error> = await pingResult('google.com', 26262, {timeout: 100});
		expect(res.isErr()).to.be.eq(true);
	}).timeout(1000);
});
