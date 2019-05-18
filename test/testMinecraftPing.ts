/* tslint:disable:no-unused-expression */
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {describe, it} from 'mocha';
import {ping, pingUri} from '../src';
chai.use(chaiAsPromised);
describe('minecraft', () => {
	it('connect and get data', async () => {
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		if (!MINECRAFT_SERVER || !MINECRAFT_SERVER_PORT) {
			throw new Error('Missing MINECRAFT_SERVER env variable');
		}
		const data = await ping(MINECRAFT_SERVER, MINECRAFT_SERVER_PORT ? parseInt(MINECRAFT_SERVER_PORT, 10) : undefined);
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.have.all.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('connect and get data', async () => {
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		if (!MINECRAFT_SERVER) {
			throw new Error('Missing MINECRAFT_SERVER env variable');
		}
		const data = await pingUri('minecraft://' + MINECRAFT_SERVER + (MINECRAFT_SERVER_PORT ? ':' + parseInt(MINECRAFT_SERVER_PORT, 10) : ''));
		expect(data).not.to.be.null;
		expect(data).to.have.any.keys('description', 'players', 'version', 'ping');
		expect(data.description).to.have.any.keys('text');
		expect(data.players).to.have.all.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('eu.mineplex.com', async () => {
		const data = await pingUri('minecraft://eu.mineplex.com');
		expect(data).not.to.be.null;
		expect(data).to.have.any.keys('description', 'players', 'version', 'ping');
		expect(data.description).to.have.any.keys('text');
		expect(data.players).to.have.all.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('should not connect', async () => {
		await expect(ping('localhost', 26262)).to.eventually.be.rejectedWith(Error);
	}).timeout(5000);
});
