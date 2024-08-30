import 'mocha';
import {srvRecordsResult} from '../src/index.js';

let expect: Chai.ExpectStatic;

describe('DnsSrv', function () {
	before(async function () {
		const chai = await import('chai');
		expect = chai.expect;
	});
	it('should give error if no srv record found', async function () {
		const data = await srvRecordsResult('_minecraft._tcp.eu.mineplex.com');
		expect(data.isErr).to.equal(true);
		expect(data.err()?.message).to.equal('querySrv ENOTFOUND _minecraft._tcp.eu.mineplex.com');
	});
});
